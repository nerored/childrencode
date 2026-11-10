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
 * A CSS-only 2.5D board: raised tiles, beveled obstacles, glowing props and a
 * direction-aware rover. The rover lives on one absolute overlay above the
 * grid, driven by the current playback frame.
 */
export default function GridStage({ level, frame = null }: GridStageProps) {
  const obstacleKeys = useMemo(
    () => new Set(level.grid.obstacles.map(cellKey)),
    [level.grid.obstacles],
  );
  const itemKeys = useMemo(() => new Set(level.goal.items.map(cellKey)), [level.goal.items]);
  const visitedKeys = useMemo(() => new Set(frame?.visited ?? []), [frame]);
  const collectedKeys = useMemo(() => new Set(frame?.collected ?? []), [frame]);

  const { width, height } = level.grid;
  const agent = frame?.position ?? level.start;
  const direction = frame?.direction ?? level.start.direction;
  const remainingItems = level.goal.items.length - collectedKeys.size;

  const gridStyle = {
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
    `${level.title}的场景`,
    `${width} 列 ${height} 行`,
    `起点在第 ${level.start.x + 1} 列第 ${level.start.y + 1} 行，面朝${DIRECTION_LABEL[level.start.direction]}`,
    `终点在第 ${level.goal.target.x + 1} 列第 ${level.goal.target.y + 1} 行`,
    level.goal.items.length > 0
      ? `需要收集 ${level.goal.items.length} 个道具，已收集 ${collectedKeys.size} 个`
      : "本关无需收集道具",
    frame !== null
      ? `小车在第 ${agent.x + 1} 列第 ${agent.y + 1} 行，面朝${DIRECTION_LABEL[direction]}`
      : "",
  ]
    .filter((part) => part.length > 0)
    .join("；");

  return (
    <section className="stage" aria-labelledby="stage-title">
      <header className="stage__header">
        <div>
          <p className="stage__label" id="stage-title">
            场景舞台
          </p>
          <p className="stage__meta">
            {width} × {height} 网格 · {DIRECTION_LABEL[direction]}向
            {level.goal.items.length > 0 ? ` · ${remainingItems} 个道具待收集` : ""}
          </p>
        </div>
        <span className="stage__badge">
          {level.goal.kind === "collect" ? "收集任务" : "抵达任务"}
        </span>
      </header>

      <div className="stage__floor">
        <div className="stage__grid" style={gridStyle} role="img" aria-label={ariaLabel}>
          {Array.from({ length: width * height }, (_, index) => {
            const x = index % width;
            const y = Math.floor(index / width);
            const key = `${x},${y}`;
            const isObstacle = obstacleKeys.has(key);
            const isItem = itemKeys.has(key);
            const isCollected = collectedKeys.has(key);
            const isTarget = level.goal.target.x === x && level.goal.target.y === y;
            const isVisited = visitedKeys.has(key);

            const classNames = ["stage__cell"];
            if (isObstacle) classNames.push("stage__cell--obstacle");
            if (isItem) classNames.push("stage__cell--item");
            if (isItem && isCollected) classNames.push("stage__cell--collected");
            if (isTarget) classNames.push("stage__cell--target");
            if (isVisited) classNames.push("stage__cell--visited");

            return (
              <div key={key} className={classNames.join(" ")} aria-hidden="true">
                {isObstacle && <span className="stage__rock" />}
                {isVisited && !isObstacle && <span className="stage__trail" />}
                {isTarget && <span className="stage__target" />}
                {isItem && <span className="stage__item" />}
              </div>
            );
          })}
          <span className="stage__agent-layer" aria-hidden="true">
            <span className="stage__agent-token" style={agentStyle}>
              <svg className="stage__agent-arrow" viewBox="0 0 24 24">
                <path d="M12 3 20 20.5 12 16.6 4 20.5Z" fill="currentColor" />
              </svg>
            </span>
          </span>
        </div>
      </div>

      <div className="stage__legend" aria-hidden="true">
        <span className="stage__legend-item">
          <span className="stage__legend-swatch stage__legend-swatch--agent" />
          小车
        </span>
        <span className="stage__legend-item">
          <span className="stage__legend-swatch stage__legend-swatch--item" />
          道具
        </span>
        <span className="stage__legend-item">
          <span className="stage__legend-swatch stage__legend-swatch--target" />
          终点
        </span>
        <span className="stage__legend-item">
          <span className="stage__legend-swatch stage__legend-swatch--obstacle" />
          障碍
        </span>
        <span className="stage__legend-item">
          <span className="stage__legend-swatch stage__legend-swatch--trail" />
          走过的路
        </span>
      </div>
    </section>
  );
}
