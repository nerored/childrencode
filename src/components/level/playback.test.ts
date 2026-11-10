import { describe, expect, test } from "bun:test";
import type { Command, LevelSpec, Point, RunResult } from "../../domain/types";
import { simulate } from "../../engine/simulate";
import { buildPlaybackFrames, PLAYBACK_END_DELAY_MS, PLAYBACK_STEP_MS } from "./playback";

interface LevelOptions {
  width?: number;
  height?: number;
  start?: LevelSpec["start"];
  target?: Point;
  items?: Point[];
  obstacles?: Point[];
  water?: Point[];
}

function makeLevel(options: LevelOptions = {}): LevelSpec {
  return {
    id: "s01-c01-k01-l01",
    sceneId: "scene-01",
    chapterId: "chapter-01",
    checkpointId: "checkpoint-01",
    index: 1,
    title: "Test level",
    brief: "Reach the target.",
    hint: "Use forward.",
    grid: {
      width: options.width ?? 5,
      height: options.height ?? 5,
      obstacles: options.obstacles ?? [],
    },
    start: options.start ?? { x: 0, y: 0, direction: "east" },
    goal: {
      kind: "rescued",
      items: options.items ?? [],
      target: options.target ?? { x: 4, y: 0 },
    },
    allowedCommands: ["forward", "turn", "repeat", "if", "setVar", "changeVar"],
    parCode: 2,
    parSteps: 2,
    standardAnswer: [{ kind: "forward", steps: 2 }],
    tutorial: [],
    water: options.water,
  };
}

const forward = (steps: number): Command => ({ kind: "forward", steps });
const right: Command = { kind: "turn", direction: "right" };

function run(level: LevelSpec, program: Command[]): RunResult {
  return simulate(level, program);
}

describe("playback contract", () => {
  test("exposes the stage timing constants", () => {
    expect(PLAYBACK_STEP_MS).toBe(280);
    expect(PLAYBACK_END_DELAY_MS).toBe(240);
  });
});

describe("buildPlaybackFrames", () => {
  test("start frame holds the start pose with every penguin waiting", () => {
    const level = makeLevel({ items: [{ x: 2, y: 0 }], target: { x: 4, y: 0 } });
    const frames = buildPlaybackFrames(level, run(level, [forward(4)]));

    expect(frames[0]).toMatchObject({
      index: 0,
      position: { x: 0, y: 0 },
      direction: "east",
      rescued: [],
      steps: 0,
      action: null,
      done: false,
    });
  });

  test("adds one frame per trace entry and follows the trace", () => {
    const level = makeLevel({ target: { x: 2, y: 0 } });
    const result = run(level, [forward(2)]);
    const frames = buildPlaybackFrames(level, result);

    expect(frames).toHaveLength(result.trace.length + 1);
    expect(frames.map((frame) => frame.position)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    expect(frames.map((frame) => frame.steps)).toEqual([0, 1, 2]);
  });

  test("turn-only frames keep the position and do not repeat visited cells", () => {
    const level = makeLevel({ start: { x: 1, y: 1, direction: "north" }, target: { x: 1, y: 0 } });
    const frames = buildPlaybackFrames(level, run(level, [right, right, right, right]));

    expect(new Set(frames.map((frame) => frame.direction))).toEqual(
      new Set(["north", "east", "south", "west"]),
    );
    expect(frames.every((frame) => frame.visited.join("|") === "1,1")).toBe(true);
  });

  test("rescues penguins progressively in first-visit order", () => {
    const level = makeLevel({
      items: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
      target: { x: 4, y: 0 },
    });
    const frames = buildPlaybackFrames(level, run(level, [forward(4)]));

    expect(frames[1].rescued).toEqual(["1,0"]);
    expect(frames[3].rescued).toEqual(["1,0", "3,0"]);
    expect(frames[4].rescued).toEqual(["1,0", "3,0"]);
  });

  test("a penguin on the start cell is never rescued by turning in place", () => {
    const level = makeLevel({ items: [{ x: 0, y: 0 }], target: { x: 4, y: 0 } });
    const frames = buildPlaybackFrames(level, run(level, [right, right, right, right]));

    expect(frames.every((frame) => frame.rescued.length === 0)).toBe(true);
  });

  test("a failed run ends on the last valid cell with done set", () => {
    const level = makeLevel({ obstacles: [{ x: 2, y: 0 }] });
    const frames = buildPlaybackFrames(level, run(level, [forward(4)]));
    const last = frames[frames.length - 1];

    expect(last.position).toEqual({ x: 1, y: 0 });
    expect(last.done).toBe(true);
  });

  test("an empty trace produces a single finished frame", () => {
    const level = makeLevel({ start: { x: 4, y: 0, direction: "east" }, target: { x: 4, y: 0 } });
    const frames = buildPlaybackFrames(level, run(level, []));

    expect(frames).toHaveLength(1);
    expect(frames[0].done).toBe(true);
  });

  test("marks only the final frame as done", () => {
    const level = makeLevel({ target: { x: 3, y: 0 } });
    const frames = buildPlaybackFrames(level, run(level, [forward(3)]));

    expect(frames.slice(0, -1).every((frame) => frame.done === false)).toBe(true);
    expect(frames[frames.length - 1].done).toBe(true);
  });
});
