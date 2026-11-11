import { cellKey } from "../../../domain/commands";
import type { Direction, LevelSpec, Point } from "../../../domain/types";
import type { StageFrame } from "../playback";
import { type StageTheme, stageTheme } from "./theme";

/** World units covered by one grid cell. */
export const CELL_SIZE = 1;

/** Terrain tile kinds the 3D ground builder knows how to draw. */
export type StageGroundKind = "ice" | "water" | "bridge";

/** One terrain tile in grid coordinates. */
export interface StageGround {
  x: number;
  y: number;
  kind: StageGroundKind;
  visited: boolean;
  variant: number;
}

/** A decorative or blocking prop placed on one cell. */
export interface StageProp {
  x: number;
  y: number;
  variant: number;
}

/** A penguin prop that may already have been rescued by the current frame. */
export interface StagePenguin extends StageProp {
  collected: boolean;
}

/** Everything the renderer needs to rebuild the stage for one frame. */
export interface StageSceneSpec {
  width: number;
  height: number;
  theme: StageTheme;
  ground: StageGround[];
  trees: StageProp[];
  corners: StageProp[];
  penguins: StagePenguin[];
  base: Point;
  agent: Point & { direction: Direction; action: string | null };
  remainingPenguins: number;
  totalPenguins: number;
}

/**
 * Map a grid cell to world space. The grid's center sits on the world origin,
 * so an odd-sized board has a cell at (0, 0) and an even-sized board straddles
 * the origin between its four middle cells.
 */
export function cellToWorld(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; z: number } {
  return {
    x: (x - (width - 1) / 2) * CELL_SIZE,
    z: (y - (height - 1) / 2) * CELL_SIZE,
  };
}

const YAW_BY_DIRECTION: Record<Direction, number> = {
  east: Math.PI / 2,
  south: 0,
  west: -Math.PI / 2,
  north: Math.PI,
};

/** Yaw around +Y that turns a +Z-facing model toward `direction`. */
export function directionToYaw(direction: Direction): number {
  return YAW_BY_DIRECTION[direction];
}

/**
 * Deterministic 0..3 variation index for a cell. Same coordinates + salt
 * always produce the same variant, so props keep their look across frames.
 */
export function variantFor(x: number, y: number, salt = 0): number {
  let hash = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(salt, 0x9e3779b1);
  hash = Math.imul(hash ^ (hash >>> 15), 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) % 4;
}

/**
 * Build the renderer-agnostic scene for one level and playback frame.
 *
 * Water follows GridStage's lane rule: the first water entry for a row picks
 * the bridge column, the rest of that row is open water. Passing no frame
 * renders the untouched start pose with nothing visited or rescued.
 */
export function buildStageScene(
  level: LevelSpec,
  frame: StageFrame | null = null,
): StageSceneSpec {
  const { width, height } = level.grid;
  const theme = stageTheme(level.sceneId);

  const laneByRow = new Map<number, number>();
  for (const cell of level.water ?? []) {
    if (!laneByRow.has(cell.y)) {
      laneByRow.set(cell.y, cell.x);
    }
  }

  const visitedKeys = new Set(frame?.visited ?? []);
  const rescuedKeys = new Set(frame?.rescued ?? []);

  const ground: StageGround[] = [];
  for (let y = 0; y < height; y += 1) {
    const lane = laneByRow.get(y);
    for (let x = 0; x < width; x += 1) {
      const kind: StageGroundKind =
        lane === undefined ? "ice" : x === lane ? "bridge" : "water";
      ground.push({
        x,
        y,
        kind,
        visited: visitedKeys.has(cellKey({ x, y })),
        variant: variantFor(x, y),
      });
    }
  }

  const trees: StageProp[] = level.grid.obstacles.map((point) => ({
    x: point.x,
    y: point.y,
    variant: variantFor(point.x, point.y, 1),
  }));

  const corners: StageProp[] = (level.grid.corners ?? []).map((point) => ({
    x: point.x,
    y: point.y,
    variant: variantFor(point.x, point.y, 2),
  }));

  const penguins: StagePenguin[] = level.goal.items.map((point) => ({
    x: point.x,
    y: point.y,
    variant: variantFor(point.x, point.y, 3),
    collected: rescuedKeys.has(cellKey(point)),
  }));

  const totalPenguins = level.goal.items.length;
  const collectedPenguins = penguins.filter((penguin) => penguin.collected).length;

  const agent: StageSceneSpec["agent"] = frame
    ? {
        x: frame.position.x,
        y: frame.position.y,
        direction: frame.direction,
        action: frame.action,
      }
    : {
        x: level.start.x,
        y: level.start.y,
        direction: level.start.direction,
        action: null,
      };

  return {
    width,
    height,
    theme,
    ground,
    trees,
    corners,
    penguins,
    base: { x: level.goal.target.x, y: level.goal.target.y },
    agent,
    remainingPenguins: totalPenguins - collectedPenguins,
    totalPenguins,
  };
}
