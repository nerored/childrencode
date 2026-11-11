import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Direction, LevelSpec } from "../../domain/types";
import GridStage from "./GridStage";
import type { StageFrame } from "./playback";
import { StageScene } from "./stage3d/stageScene";

export interface Stage3DProps {
  level: LevelSpec;
  frame?: StageFrame | null;
}

const DIRECTION_LABEL: Record<Direction, string> = {
  north: "北",
  east: "东",
  south: "南",
  west: "西",
};

export default function Stage3D({ level, frame = null }: Stage3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<StageScene | null>(null);
  const [fallback, setFallback] = useState(false);
  const collectedKeys = useMemo(() => new Set(frame?.rescued ?? []), [frame]);
  const agent = frame?.position ?? level.start;
  const direction = frame?.direction ?? level.start.direction;
  const remainingItems = level.goal.items.length - collectedKeys.size;
  const { width, height } = level.grid;
  const viewportStyle = {
    "--stage-ratio": `${width} / ${height}`,
  } as CSSProperties;

  const ariaLabel = [
    `${level.title}的冰面救援舞台`,
    `${width} 列 ${height} 行`,
    `起点在第 ${level.start.x + 1} 列第 ${level.start.y + 1} 行，面朝${DIRECTION_LABEL[level.start.direction]}`,
    `救援基地在第 ${level.goal.target.x + 1} 列第 ${level.goal.target.y + 1} 行`,
    level.goal.items.length > 0
      ? `企鹅还剩 ${remainingItems} 只，已救援 ${collectedKeys.size} 只`
      : "本关无需救援企鹅",
    `程序员在第 ${agent.x + 1} 列第 ${agent.y + 1} 行，面朝${DIRECTION_LABEL[direction]}`,
  ].join("；");

  useEffect(() => {
    setFallback(false);
  }, [level.id]);

  useEffect(() => {
    if (fallback || canvasRef.current === null) return;
    const canvas = canvasRef.current;
    let scene: StageScene;
    try {
      scene = new StageScene(canvas);
      sceneRef.current = scene;
      scene.setLevel(level, frame);
    } catch {
      sceneRef.current?.dispose();
      sceneRef.current = null;
      setFallback(true);
      return;
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      scene.dispose();
      sceneRef.current = null;
      setFallback(true);
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      scene.dispose();
      if (sceneRef.current === scene) sceneRef.current = null;
    };
  }, [fallback, level.id]);

  useEffect(() => {
    if (!fallback) sceneRef.current?.setFrame(frame);
  }, [fallback, frame]);

  if (fallback) return <GridStage level={level} frame={frame} />;

  return (
    <section className="stage stage--3d" aria-labelledby="stage-title">
      <header className="stage__header">
        <div>
          <p className="stage__label" id="stage-title">冰面舞台</p>
          <p className="stage__meta">
            {width} × {height} 冰面网格 · {DIRECTION_LABEL[direction]}向
            {level.goal.items.length > 0 ? ` · 还剩 ${remainingItems} 只企鹅` : ""}
          </p>
        </div>
        <span className="stage__badge">救援任务</span>
      </header>

      <div className="stage__floor stage__floor--3d">
        <div className="stage__viewport" style={viewportStyle}>
          <canvas key={level.id} ref={canvasRef} className="stage__canvas" role="img" aria-label={ariaLabel} />
          <div className="stage-hud" aria-label="相机控制">
            <button type="button" className="stage-hud__button" aria-label="向左旋转视角" onClick={() => sceneRef.current?.orbitBy(-Math.PI / 8)}>↶</button>
            <button type="button" className="stage-hud__button" aria-label="向右旋转视角" onClick={() => sceneRef.current?.orbitBy(Math.PI / 8)}>↷</button>
            <button type="button" className="stage-hud__button" aria-label="放大" onClick={() => sceneRef.current?.zoomBy(0.82)}>＋</button>
            <button type="button" className="stage-hud__button" aria-label="缩小" onClick={() => sceneRef.current?.zoomBy(1.22)}>−</button>
            <button type="button" className="stage-hud__button" aria-label="重置视角" onClick={() => sceneRef.current?.resetCamera()}>⌂</button>
          </div>
          <p className="stage-hud__hint">拖动旋转 · 滚轮缩放</p>
        </div>
      </div>

      <div className="stage__legend" aria-hidden="true">
        <span className="stage__legend-item"><span className="stage__legend-swatch stage__legend-swatch--penguin" />企鹅</span>
        <span className="stage__legend-item"><span className="stage__legend-swatch stage__legend-swatch--road" />冰面道路</span>
        <span className="stage__legend-item"><span className="stage__legend-swatch stage__legend-swatch--water" />水面</span>
        <span className="stage__legend-item"><span className="stage__legend-swatch stage__legend-swatch--tree" />树林</span>
        <span className="stage__legend-item"><span className="stage__legend-swatch stage__legend-swatch--base" />救援基地</span>
      </div>
    </section>
  );
}
