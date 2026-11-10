/**
 * Shared domain contract for childrencode.
 *
 * Coordinates use screen space: x grows east, y grows south. The grid origin is
 * the top-left cell, so north is y - 1 and south is y + 1.
 */

/** Cardinal heading of the coder. */
export type Direction = "north" | "east" | "south" | "west";

/** A cell on the level grid. */
export interface Point {
  x: number;
  y: number;
}

/** Runtime check performed by an `if` command. */
export type Condition =
  | { kind: "pathAhead" }
  | { kind: "itemAhead" }
  | { kind: "varAtLeast"; name: string; value: number };

/** A single node in a visual or text program. */
export type Command =
  | { kind: "forward"; steps: number }
  | { kind: "turn"; direction: "left" | "right" }
  | { kind: "repeat"; times: number; body: Command[] }
  | { kind: "if"; condition: Condition; then: Command[]; else?: Command[] }
  | { kind: "setVar"; name: string; value: number }
  | { kind: "changeVar"; name: string; delta: number };

/** Discriminant values of {@link Command}. */
export type CommandKind = Command["kind"];

/** Board geometry for a level: size plus tree obstacles and corner markers. */
export interface GridSpec {
  width: number;
  height: number;
  obstacles: Point[];
  /** Corner markers drawn as scenery only; never block movement. */
  corners?: Point[];
}

/**
 * Win condition: rescue every penguin on `items`, then reach `target`.
 * `items` holds penguin cells; the coder rescues a penguin by entering its cell.
 */
export interface Goal {
  kind: "rescued";
  items: Point[];
  target: Point;
}

/** One tutorial bubble shown around the level screen. */
export interface TutorialStep {
  text: string;
  highlight?: "palette" | "run" | "grid";
}

/** Complete definition of a playable level. */
export interface LevelSpec {
  id: string;
  sceneId: string;
  chapterId: string;
  checkpointId: string;
  index: number;
  title: string;
  brief: string;
  hint: string;
  grid: GridSpec;
  start: Point & { direction: Direction };
  goal: Goal;
  allowedCommands: CommandKind[];
  parCode: number;
  parSteps: number;
  standardAnswer: Command[];
  tutorial: TutorialStep[];
  /** Cells drawn as a frozen river that crosses the map under the ice road. */
  water?: Point[];
}

/** A named group of levels shown as a checkpoint on the map. */
export interface CheckpointSpec {
  id: string;
  chapterId: string;
  name: string;
  order: number;
  levelIds: string[];
}

/** A chapter inside a scene. */
export interface ChapterSpec {
  id: string;
  sceneId: string;
  name: string;
  order: number;
  starGate: number;
  checkpoints: CheckpointSpec[];
}

/** A themed scene grouping chapters by a programming concept. */
export interface SceneSpec {
  id: string;
  name: string;
  theme: string;
  conceptFocus: "movement" | "loops" | "variables-conditions" | "branching";
  order: number;
  chapters: ChapterSpec[];
}

/** Root content document: all scenes plus every level keyed by id. */
export interface WorldSpec {
  id: string;
  title: string;
  locale: "zh-CN";
  version: string;
  scenes: SceneSpec[];
  levels: Record<string, LevelSpec>;
}

/** Outcome of executing a program against a level. */
export interface RunResult {
  completed: boolean;
  /** Penguin cells rescued so far, sorted `"x,y"` keys. */
  collected: string[];
  steps: number;
  trace: Array<{ action: string; position: Point; direction: Direction }>;
  failureReason?: "out-of-bounds" | "obstacle" | "max-steps" | "incomplete" | "water";
  final: Point & { direction: Direction };
  vars: Record<string, number>;
}

/** Star rating and metrics for one completed (or failed) attempt. */
export interface Score {
  levelId: string;
  completed: boolean;
  codeLength: number;
  steps: number;
  stars: 0 | 1 | 2 | 3;
  collectedItemIds: string[];
  unpassableReason?: string;
}

/** Scene plus the levels that belong to it, for handing to a scene screen. */
export interface ScenePack {
  scene: SceneSpec;
  levels: LevelSpec[];
}
