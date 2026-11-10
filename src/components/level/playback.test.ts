import { describe, expect, test } from "bun:test";
import type { Command, LevelSpec, Point } from "../../domain/types";
import { simulate } from "../../engine/simulate";
import {
  buildPlaybackFrames,
  PLAYBACK_END_DELAY_MS,
  PLAYBACK_STEP_MS,
} from "./playback";

interface LevelOptions {
  width?: number;
  height?: number;
  start?: LevelSpec["start"];
  target?: Point;
  items?: Point[];
  obstacles?: Point[];
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
      kind: "collect",
      items: options.items ?? [],
      target: options.target ?? { x: 4, y: 0 },
    },
    allowedCommands: ["forward", "turn", "repeat", "if", "setVar", "changeVar"],
    parCode: 2,
    parSteps: 2,
    standardAnswer: [{ kind: "forward", steps: 2 }],
    tutorial: [],
  };
}

const forward = (steps: number): Command => ({ kind: "forward", steps });
const left: Command = { kind: "turn", direction: "left" };
const right: Command = { kind: "turn", direction: "right" };
const setVar: Command = { kind: "setVar", name: "score", value: 1 };

describe("playback contract", () => {
  test("exposes the stage timing constants", () => {
    expect(PLAYBACK_STEP_MS).toBe(280);
    expect(PLAYBACK_END_DELAY_MS).toBe(240);
  });
});

describe("buildPlaybackFrames", () => {
  test("start frame holds the start pose with no collected items", () => {
    const level = makeLevel({
      start: { x: 1, y: 1, direction: "north" },
      target: { x: 4, y: 4 },
    });
    const run = simulate(level, []);
    const frames = buildPlaybackFrames(level, run);

    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual({
      index: 0,
      position: { x: 1, y: 1 },
      direction: "north",
      visited: ["1,1"],
      collected: [],
      steps: 0,
      action: null,
      done: true,
    });
  });

  test("adds one frame per forward step and follows the trace", () => {
    const level = makeLevel({ target: { x: 3, y: 0 } });
    const run = simulate(level, [forward(3)]);
    const frames = buildPlaybackFrames(level, run);

    expect(frames).toHaveLength(4);
    expect(frames.map((frame) => frame.steps)).toEqual([0, 1, 2, 3]);
    expect(frames.map((frame) => frame.position)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
    expect(frames.map((frame) => frame.action)).toEqual([
      null,
      "forward",
      "forward",
      "forward",
    ]);
    expect(frames[3].visited).toEqual(["0,0", "1,0", "2,0", "3,0"]);
  });

  test("turn-only frames keep the position and do not duplicate visited cells", () => {
    const level = makeLevel({
      start: { x: 1, y: 1, direction: "north" },
      target: { x: 1, y: 1 },
    });
    const run = simulate(level, [right, right]);
    const frames = buildPlaybackFrames(level, run);

    expect(run.trace).toHaveLength(2);
    expect(frames).toHaveLength(3);
    expect(frames[1].position).toEqual({ x: 1, y: 1 });
    expect(frames[1].direction).toBe("east");
    expect(frames[1].action).toBe("turn-right");
    expect(frames[2].position).toEqual({ x: 1, y: 1 });
    expect(frames[2].direction).toBe("south");
    expect(frames[2].action).toBe("turn-right");
    expect(frames[1].visited).toEqual(["1,1"]);
    expect(frames[2].visited).toEqual(["1,1"]);
  });

  test("collects items progressively in sorted key order", () => {
    const level = makeLevel({
      target: { x: 2, y: 0 },
      items: [
        { x: 2, y: 0 },
        { x: 1, y: 0 },
      ],
    });
    const run = simulate(level, [forward(2)]);
    const frames = buildPlaybackFrames(level, run);

    expect(frames).toHaveLength(3);
    expect(frames[0].collected).toEqual([]);
    expect(frames[1].collected).toEqual(["1,0"]);
    expect(frames[2].collected).toEqual(["1,0", "2,0"]);
    expect(frames[2].collected).toEqual(run.collected);
  });

  test("a failed run ends on the last valid cell with done set", () => {
    const level = makeLevel({
      target: { x: 4, y: 0 },
      obstacles: [{ x: 2, y: 0 }],
    });
    const run = simulate(level, [forward(3)]);
    const frames = buildPlaybackFrames(level, run);

    expect(run.completed).toBe(false);
    expect(run.failureReason).toBe("obstacle");
    expect(frames).toHaveLength(2);
    expect(frames[1].position).toEqual({ x: 1, y: 0 });
    expect(frames[1].direction).toBe("east");
    expect(frames[1].steps).toBe(1);
    expect(frames[1].done).toBe(true);
  });

  test("an empty trace produces a single finished frame", () => {
    const level = makeLevel({ start: { x: 2, y: 2, direction: "west" } });
    const run = simulate(level, [setVar]);
    const frames = buildPlaybackFrames(level, run);

    expect(run.trace).toHaveLength(0);
    expect(frames).toHaveLength(1);
    expect(frames[0].position).toEqual({ x: 2, y: 2 });
    expect(frames[0].direction).toBe("west");
    expect(frames[0].steps).toBe(0);
    expect(frames[0].action).toBeNull();
    expect(frames[0].done).toBe(true);
  });

  test("marks only the final frame as done", () => {
    const level = makeLevel({ target: { x: 2, y: 0 } });
    const run = simulate(level, [forward(2)]);
    const frames = buildPlaybackFrames(level, run);

    expect(frames.map((frame) => frame.done)).toEqual([false, false, true]);
  });
});
