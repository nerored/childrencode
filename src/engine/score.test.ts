import { describe, expect, test } from "bun:test";
import type { Command, LevelSpec, Point } from "../domain/types";
import { codeLength, scoreRun } from "./score";
import { simulate } from "./simulate";

interface LevelOptions {
  target?: Point;
  items?: Point[];
  parCode?: number;
  parSteps?: number;
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
    grid: { width: 5, height: 5, obstacles: [] },
    start: { x: 0, y: 0, direction: "east" },
    goal: {
      kind: "rescued",
      items: options.items ?? [],
      target: options.target ?? { x: 2, y: 0 },
    },
    allowedCommands: ["forward", "turn", "repeat", "if", "setVar", "changeVar"],
    parCode: options.parCode ?? 2,
    parSteps: options.parSteps ?? 2,
    standardAnswer: [{ kind: "forward", steps: 2 }],
    tutorial: [],
  };
}

describe("codeLength", () => {
  test("counts the start event plus every command node", () => {
    const program: Command[] = [
      { kind: "forward", steps: 2 },
      { kind: "repeat", times: 3, body: [{ kind: "turn", direction: "right" }] },
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [{ kind: "forward", steps: 1 }],
        else: [{ kind: "changeVar", name: "n", delta: 1 }],
      },
    ];

    // start + forward + repeat + turn + if + forward + changeVar
    expect(codeLength(program)).toBe(7);
  });

  test("counts one for an empty program", () => {
    expect(codeLength([])).toBe(1);
  });
});

describe("scoreRun", () => {
  test("awards three stars for completing within both pars", () => {
    const level = makeLevel({
      target: { x: 2, y: 0 },
      items: [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
      parCode: 2,
      parSteps: 2,
    });
    const program: Command[] = [{ kind: "forward", steps: 2 }];
    const run = simulate(level, program);
    const score = scoreRun(level, program, run);

    expect(score.levelId).toBe(level.id);
    expect(score.completed).toBe(true);
    expect(score.codeLength).toBe(2);
    expect(score.steps).toBe(2);
    expect(score.stars).toBe(3);
    expect(score.collectedItemIds).toEqual(["1,0", "2,0"]);
    expect(score.unpassableReason).toBeUndefined();
  });

  test("drops the code star when the program exceeds parCode", () => {
    const level = makeLevel({ parCode: 1, parSteps: 2 });
    const program: Command[] = [{ kind: "forward", steps: 2 }];
    const run = simulate(level, program);

    expect(scoreRun(level, program, run).stars).toBe(2);
  });

  test("drops the step star when the run exceeds parSteps", () => {
    const level = makeLevel({ parCode: 2, parSteps: 1 });
    const program: Command[] = [{ kind: "forward", steps: 2 }];
    const run = simulate(level, program);

    expect(scoreRun(level, program, run).stars).toBe(2);
  });

  test("awards one star when both pars are exceeded", () => {
    const level = makeLevel({ parCode: 1, parSteps: 1 });
    const program: Command[] = [{ kind: "forward", steps: 2 }];
    const run = simulate(level, program);

    expect(scoreRun(level, program, run).stars).toBe(1);
  });

  test("failed runs score zero stars and carry the failure reason", () => {
    const level = makeLevel({ parCode: 99, parSteps: 99 });
    const program: Command[] = [{ kind: "forward", steps: 10 }];
    const run = simulate(level, program);
    const score = scoreRun(level, program, run);

    expect(score.completed).toBe(false);
    expect(score.stars).toBe(0);
    expect(score.steps).toBe(run.steps);
    expect(score.unpassableReason).toBe("out-of-bounds");
  });

  test("incomplete runs score zero stars", () => {
    const level = makeLevel({ parCode: 1, parSteps: 0 });
    const program: Command[] = [];
    const run = simulate(level, program);
    const score = scoreRun(level, program, run);

    expect(run.failureReason).toBe("incomplete");
    expect(score.completed).toBe(false);
    expect(score.stars).toBe(0);
    expect(score.unpassableReason).toBe("incomplete");
  });
});
