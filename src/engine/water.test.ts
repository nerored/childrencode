import { describe, expect, test } from "bun:test";
import { cellKey } from "../domain/commands";
import type { Command, LevelSpec, Point } from "../domain/types";
import { simulate } from "./simulate";
import { frozenLane, isWaterBlocked } from "./water";

interface LevelOptions {
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
      width: 5,
      height: 5,
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

describe("frozenLane", () => {
  test("returns the lane x for the water cell in that row", () => {
    const level = makeLevel({ water: [{ x: 2, y: 1 }, { x: 4, y: 3 }] });

    expect(frozenLane(level, 1)).toBe(2);
    expect(frozenLane(level, 3)).toBe(4);
  });

  test("returns -1 for rows without a river or levels without water", () => {
    const level = makeLevel({ water: [{ x: 2, y: 1 }] });

    expect(frozenLane(level, 0)).toBe(-1);
    expect(frozenLane(level, 2)).toBe(-1);
    expect(frozenLane(makeLevel(), 1)).toBe(-1);
  });
});

describe("isWaterBlocked", () => {
  const level = makeLevel({ water: [{ x: 2, y: 1 }, { x: 3, y: 1 }] });
  const waterKeys = new Set((level.water ?? []).map(cellKey));

  test("lets the frozen lane through", () => {
    expect(isWaterBlocked(level, waterKeys, { x: 2, y: 1 })).toBe(false);
  });

  test("blocks an off-lane water cell", () => {
    expect(isWaterBlocked(level, waterKeys, { x: 3, y: 1 })).toBe(true);
  });

  test("leaves dry cells alone", () => {
    expect(isWaterBlocked(level, waterKeys, { x: 1, y: 1 })).toBe(false);
    expect(isWaterBlocked(level, waterKeys, { x: 4, y: 0 })).toBe(false);
  });
});

describe("simulate water rule", () => {
  test("an off-lane water cell stops the run with water and spends no step", () => {
    const level = makeLevel({
      start: { x: 2, y: 0, direction: "east" },
      target: { x: 4, y: 0 },
      water: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
    });

    const run = simulate(level, [forward(1)]);

    expect(run.failureReason).toBe("water");
    expect(run.steps).toBe(0);
    expect(run.trace).toEqual([]);
    expect(run.final).toEqual({ x: 2, y: 0, direction: "east" });
  });

  test("the frozen lane is walkable", () => {
    const level = makeLevel({
      target: { x: 1, y: 0 },
      water: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
    });

    const run = simulate(level, [forward(1)]);

    expect(run.completed).toBe(true);
    expect(run.failureReason).toBeUndefined();
    expect(run.steps).toBe(1);
    expect(run.final).toEqual({ x: 1, y: 0, direction: "east" });
  });
});
