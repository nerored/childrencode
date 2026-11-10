import { describe, expect, test } from "bun:test";
import type { Command, LevelSpec, Point } from "../domain/types";
import { simulate } from "./simulate";

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
const left: Command = { kind: "turn", direction: "left" };
const right: Command = { kind: "turn", direction: "right" };

describe("simulate", () => {
  test("moves forward one cell at a time and records each step", () => {
    const level = makeLevel({ target: { x: 3, y: 0 } });
    const run = simulate(level, [forward(3)]);

    expect(run.completed).toBe(true);
    expect(run.failureReason).toBeUndefined();
    expect(run.steps).toBe(3);
    expect(run.final).toEqual({ x: 3, y: 0, direction: "east" });
    expect(run.trace).toEqual([
      { action: "forward", position: { x: 1, y: 0 }, direction: "east" },
      { action: "forward", position: { x: 2, y: 0 }, direction: "east" },
      { action: "forward", position: { x: 3, y: 0 }, direction: "east" },
    ]);
  });

  test("turns rotate 90 degrees and cost one step each", () => {
    const level = makeLevel({
      start: { x: 1, y: 1, direction: "north" },
      target: { x: 2, y: 1 },
    });
    const run = simulate(level, [right, forward(1)]);

    expect(run.completed).toBe(true);
    expect(run.steps).toBe(2);
    expect(run.final).toEqual({ x: 2, y: 1, direction: "east" });
    expect(run.trace.map((entry) => entry.action)).toEqual(["turn-right", "forward"]);

    const turnedLeft = simulate(level, [left]);
    expect(turnedLeft.final.direction).toBe("west");
    expect(turnedLeft.steps).toBe(1);
  });

  test("collects items on entered cells and returns sorted cell keys", () => {
    const level = makeLevel({
      target: { x: 2, y: 0 },
      items: [
        { x: 2, y: 0 },
        { x: 1, y: 0 },
      ],
    });
    const run = simulate(level, [forward(2)]);

    expect(run.completed).toBe(true);
    expect(run.collected).toEqual(["1,0", "2,0"]);
  });

  test("is incomplete while an item remains uncollected", () => {
    const level = makeLevel({
      target: { x: 1, y: 0 },
      items: [{ x: 3, y: 0 }],
    });
    const run = simulate(level, [forward(1)]);

    expect(run.completed).toBe(false);
    expect(run.failureReason).toBe("incomplete");
  });

  test("stops on an obstacle and stays on the last valid cell", () => {
    const level = makeLevel({
      target: { x: 4, y: 0 },
      obstacles: [{ x: 2, y: 0 }],
    });
    const run = simulate(level, [forward(3)]);

    expect(run.completed).toBe(false);
    expect(run.failureReason).toBe("obstacle");
    expect(run.steps).toBe(1);
    expect(run.final).toEqual({ x: 1, y: 0, direction: "east" });
    expect(run.trace).toHaveLength(1);
  });

  test("stops at the edge without leaving the grid", () => {
    const level = makeLevel({ start: { x: 3, y: 0, direction: "east" } });
    const run = simulate(level, [forward(5)]);

    expect(run.completed).toBe(false);
    expect(run.failureReason).toBe("out-of-bounds");
    expect(run.steps).toBe(1);
    expect(run.final).toEqual({ x: 4, y: 0, direction: "east" });
    expect(run.trace).toHaveLength(1);
  });

  test("repeats a body and ignores non-positive counts", () => {
    const level = makeLevel({ target: { x: 3, y: 0 } });
    const run = simulate(level, [{ kind: "repeat", times: 3, body: [forward(1)] }]);

    expect(run.completed).toBe(true);
    expect(run.steps).toBe(3);

    const skipped = simulate(level, [{ kind: "repeat", times: 0, body: [forward(1)] }]);
    expect(skipped.steps).toBe(0);
    expect(skipped.failureReason).toBe("incomplete");
  });

  test("caps repeat iterations at 100", () => {
    const level = makeLevel({ start: { x: 0, y: 0, direction: "north" } });
    const run = simulate(level, [{ kind: "repeat", times: 150, body: [right] }]);

    expect(run.steps).toBe(100);
    expect(run.trace).toHaveLength(100);
    expect(run.final.direction).toBe("north");
    expect(run.failureReason).toBe("incomplete");
  });

  test("runs nested repeat bodies", () => {
    const level = makeLevel({ target: { x: 4, y: 0 } });
    const run = simulate(level, [
      { kind: "repeat", times: 2, body: [{ kind: "repeat", times: 2, body: [forward(1)] }] },
    ]);

    expect(run.completed).toBe(true);
    expect(run.steps).toBe(4);
  });

  test("runs the then branch when the path ahead is open", () => {
    const level = makeLevel({ target: { x: 1, y: 0 } });
    const run = simulate(level, [
      { kind: "if", condition: { kind: "pathAhead" }, then: [forward(1)], else: [right] },
    ]);

    expect(run.completed).toBe(true);
    expect(run.steps).toBe(1);
    expect(run.final).toEqual({ x: 1, y: 0, direction: "east" });
  });

  test("takes the else branch when the path ahead is blocked", () => {
    const level = makeLevel({
      start: { x: 4, y: 0, direction: "east" },
      target: { x: 4, y: 0 },
    });
    const run = simulate(level, [
      { kind: "if", condition: { kind: "pathAhead" }, then: [forward(1)], else: [left] },
    ]);

    expect(run.completed).toBe(true);
    expect(run.steps).toBe(1);
    expect(run.final.direction).toBe("north");
  });

  test("tests itemAhead against uncollected items", () => {
    const level = makeLevel({
      target: { x: 1, y: 0 },
      items: [{ x: 1, y: 0 }],
    });
    const run = simulate(level, [
      { kind: "if", condition: { kind: "itemAhead" }, then: [forward(1)], else: [right] },
    ]);

    expect(run.completed).toBe(true);
    expect(run.collected).toEqual(["1,0"]);
  });

  test("sets and changes variables and branches on their values", () => {
    const level = makeLevel({ target: { x: 1, y: 0 } });
    const run = simulate(level, [
      { kind: "setVar", name: "coins", value: 2 },
      {
        kind: "if",
        condition: { kind: "varAtLeast", name: "coins", value: 2 },
        then: [{ kind: "changeVar", name: "coins", delta: -1 }],
        else: [{ kind: "setVar", name: "coins", value: 0 }],
      },
      forward(1),
    ]);

    expect(run.completed).toBe(true);
    expect(run.vars).toEqual({ coins: 1 });
  });

  test("treats unset variables as zero when evaluating varAtLeast", () => {
    const level = makeLevel({ start: { x: 0, y: 0, direction: "east" }, target: { x: 0, y: 0 } });
    const run = simulate(level, [
      { kind: "changeVar", name: "coins", delta: 5 },
      {
        kind: "if",
        condition: { kind: "varAtLeast", name: "lives", value: 1 },
        then: [right],
        else: [{ kind: "setVar", name: "lives", value: 1 }],
      },
    ]);

    expect(run.completed).toBe(true);
    expect(run.vars).toEqual({ coins: 5, lives: 1 });
    expect(run.steps).toBe(0);
  });

  test("fails with max-steps after 1000 executed actions", () => {
    const level = makeLevel({ start: { x: 0, y: 0, direction: "north" } });
    const run = simulate(level, [
      { kind: "repeat", times: 100, body: Array.from({ length: 11 }, () => right) },
    ]);

    expect(run.completed).toBe(false);
    expect(run.failureReason).toBe("max-steps");
    expect(run.steps).toBe(1000);
    expect(run.trace).toHaveLength(1000);
  });

  test("allows exactly 1000 executed actions", () => {
    const level = makeLevel({ start: { x: 0, y: 0, direction: "north" } });
    const run = simulate(level, [
      { kind: "repeat", times: 100, body: Array.from({ length: 10 }, () => right) },
    ]);

    expect(run.failureReason).toBe("incomplete");
    expect(run.steps).toBe(1000);
    expect(run.trace).toHaveLength(1000);
  });

  test("returns a final position and direction even after a failure", () => {
    const level = makeLevel({ obstacles: [{ x: 1, y: 0 }] });
    const run = simulate(level, [forward(1), forward(1)]);

    expect(run.final).toEqual({ x: 0, y: 0, direction: "east" });
    expect(run.failureReason).toBe("obstacle");
  });

  test("rescues penguins and requires every penguin before the target counts", () => {
    const level = makeLevel({
      target: { x: 4, y: 0 },
      items: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
    });

    const partial = simulate(makeLevel({ target: { x: 4, y: 0 }, items: [{ x: 1, y: 0 }, { x: 3, y: 0 }] }), [forward(2)]);
    expect(partial.collected).toEqual(["1,0"]);
    expect(partial.completed).toBe(false);
    expect(partial.failureReason).toBe("incomplete");

    const rescued = simulate(
      makeLevel({ target: { x: 2, y: 0 }, items: [{ x: 1, y: 0 }, { x: 3, y: 0 }] }),
      [forward(3), left, left, forward(1)],
    );
    expect(rescued.completed).toBe(true);
    expect(rescued.collected).toEqual(["1,0", "3,0"]);

    const all = simulate(
      makeLevel({ target: { x: 3, y: 0 }, items: [{ x: 1, y: 0 }, { x: 3, y: 0 }] }),
      [forward(3)],
    );
    expect(all.completed).toBe(true);
    expect(all.collected).toEqual(["1,0", "3,0"]);
  });

  test("water stops a step that leaves the frozen lane", () => {
    const blocked = simulate(
      makeLevel({ target: { x: 4, y: 4 }, water: [{ x: 0, y: 0 }, { x: 1, y: 0 }] }),
      [forward(1), forward(1)],
    );
    expect(blocked.failureReason).toBe("water");
    expect(blocked.steps).toBe(0);
    expect(blocked.trace).toEqual([]);
  });
});
