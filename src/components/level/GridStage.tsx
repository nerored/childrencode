import { useMemo } from "react";
import type { CSSProperties } from "react";
import { cellKey } from "../../domain/commands";
import type { Direction, LevelSpec } from "../../domain/types";
import type { StageFrame } from "./playback";

export interface GridStageProps {
  level: LevelSpec;
  frame?: StageFrame | null;
}

const DIRECTION_LABEL: Record<Direction, string> = {
  north: "北",
  east: "东",
  south: "南",
  west: "西",
};

const AGENT_ROTATION: Record<Direction, string> = {
  north: "0deg",
  east: "90deg",
  south: "180deg",
  west: "270deg",
};

/**
 * A CSS-only 3D ice stage. The grid is a rotated plane holding flat terrain
 * tiles plus counter-rotated props (trees, penguins, igloo, coder). The coder
 * sits on one absolute overlay above the plane and moves with a CSS transition.
 */
export default function GridStage({ level, frame = null }: GridStageProps) {
  const obstacleKeys = useMemo(
    () => new Set(level.grid.obstacles.map(cellKey)),
    [level.grid.obstacles],
  );
  const cornerKeys = useMemo(
    () => new Set((level.grid.corners ?? []).map(cellKey)),
    [level.grid.corners],
  );
  const itemKeys = useMemo(() => new Set(level.goal.items.map(cellKey)), [level.goal.items]);
  const laneByRow = useMemo(() => {
    const lanes = new Map<number, number>();
    for (const cell of level.water ?? []) {
      if (!lanes.has(cell.y)) {
        lanes.set(cell.y, cell.x);
      }
    }
    return lanes;
  }, [level.water]);
  const waterKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [y, lane] of laneByRow) {
      for (let x = 0; x < level.grid.width; x += 1) {
        if (x !== lane) {
          keys.add(x + "," + y);
        }
      }
    }
    return keys;
  }, [laneByRow, level.grid.width]);
  const visitedKeys = useMemo(() => new Set(frame?.visited ?? []), [frame]);
  const collectedKeys = useMemo(() => new Set(frame?.rescued ?? []), [frame]);

  const { width, height } = level.grid;
  const agent = frame?.position ?? level.start;
  const direction = frame?.direction ?? level.start.direction;
  const remainingItems = level.goal.items.length - collectedKeys.size;

  const stageStyle = {
    "--stage-cols": width,
    "--stage-rows": height,
    "--stage-ratio": `${width} / ${height}`,
  } as CSSProperties;

  const agentStyle = {
    "--agent-x": agent.x,
    "--agent-y": agent.y,
    "--agent-rotation": AGENT_ROTATION[direction],
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
  ]
    .filter((part) => part.length > 0)
    .join("；");

  return (
    <section className="stage" aria-labelledby="stage-title">
      <header className="stage__header">
        <div>
          <p className="stage__label" id="stage-title">
            冰面舞台
          </p>
          <p className="stage__meta">
            {width} × {height} 冰面网格 · {DIRECTION_LABEL[direction]}向
            {level.goal.items.length > 0 ? ` · 还剩 ${remainingItems} 只企鹅` : ""}
          </p>
        </div>
        <span className="stage__badge">救援任务</span>
      </header>

      <div className="stage__floor">
        <div className="stage__plane" style={stageStyle} role="img" aria-label={ariaLabel}>
          <div className="stage__grid">
            {Array.from({ length: width * height }, (_, index) => {
              const x = index % width;
              const y = Math.floor(index / width);
              const key = `${x},${y}`;
              const isObstacle = obstacleKeys.has(key);
              const isCorner = cornerKeys.has(key);
              const isItem = itemKeys.has(key);
              const isCollected = collectedKeys.has(key);
              const isTarget = level.goal.target.x === x && level.goal.target.y === y;
              const isVisited = visitedKeys.has(key);
              const isWater = waterKeys.has(key);
              const isBridge = laneByRow.get(y) === x;

              const classNames = ["stage__cell"];
              if (isObstacle) classNames.push("stage__cell--obstacle");
              if (isCorner) classNames.push("stage__cell--corner");
              if (isWater) classNames.push("stage__cell--water");
              if (isBridge) classNames.push("stage__cell--bridge");
              if (isItem) classNames.push("stage__cell--item");
              if (isItem && isCollected) classNames.push("stage__cell--collected");
              if (isTarget) classNames.push("stage__cell--target");
              if (isVisited) classNames.push("stage__cell--visited");

              return (
                <div key={key} className={classNames.join(" ")} aria-hidden="true">
                  {isCorner && <span className="stage__corner" />}
                  {isTarget && (
                    <span className="stage__base">
                      <span className="stage__base-dome" />
                      <span className="stage__base-door" />
                    </span>
                  )}
                  {isItem && !isCollected && (
                    <span className="stage__penguin">
                      <svg className="stage__penguin-art" viewBox="0 0 24 30" aria-hidden="true">
                        <ellipse className="stage__penguin-feet" cx="7.6" cy="27.4" rx="4" ry="2.2" />
                        <ellipse className="stage__penguin-feet" cx="16.4" cy="27.4" rx="4" ry="2.2" />
                        <ellipse className="stage__penguin-body" cx="12" cy="15" rx="9" ry="11" />
                        <ellipse className="stage__penguin-belly" cx="12" cy="17" rx="6.1" ry="8" />
                        <circle className="stage__penguin-eye" cx="8.8" cy="9.6" r="1.5" />
                        <circle className="stage__penguin-eye" cx="15.2" cy="9.6" r="1.5" />
                        <circle className="stage__penguin-pupil" cx="8.8" cy="9.8" r="0.7" />
                        <circle className="stage__penguin-pupil" cx="15.2" cy="9.8" r="0.7" />
                        <path className="stage__penguin-beak" d="M10.3 12.3 12 15.3 13.7 12.3Z" />
                      </svg>
                    </span>
                  )}
                  {isItem && isCollected && <span className="stage__rescue" />}
                  {isObstacle && (
                    <span className="stage__tree">
                      <span className="stage__tree-trunk" />
                      <span className="stage__tree-canopy stage__tree-canopy--low" />
                      <span className="stage__tree-canopy stage__tree-canopy--mid" />
                      <span className="stage__tree-canopy stage__tree-canopy--top" />
                    </span>
                  )}
                  {/* The frozen lane is the last layer in its cell: a tree must never bury the crossing. */}
                  {isBridge && <span className="stage__bridge" />}
                </div>
              );
            })}
          </div>

          <span className="stage__agent" style={agentStyle} aria-hidden="true">
            <span className="stage__coder-shadow" />
            <span className="stage__agent-cue" />
            <span className="stage__coder">
              <span className="stage__coder-feet">
                <span />
                <span />
              </span>
              <span className="stage__coder-body">
                <span className="stage__coder-visor" />
              </span>
            </span>
          </span>
        </div>
      </div>

      <div className="stage__legend" aria-hidden="true">
        <span className="stage__legend-item">
          <span className="stage__legend-swatch stage__legend-swatch--penguin" />
          企鹅
        </span>
        <span className="stage__legend-item">
          <span className="stage__legend-swatch stage__legend-swatch--road" />
          冰面道路
        </span>
        <span className="stage__legend-item">
          <span className="stage__legend-swatch stage__legend-swatch--water" />
          水面
        </span>
        <span className="stage__legend-item">
          <span className="stage__legend-swatch stage__legend-swatch--tree" />
          树林
        </span>
        <span className="stage__legend-item">
          <span className="stage__legend-swatch stage__legend-swatch--base" />
          救援基地
        </span>
      </div>
    </section>
  );
}