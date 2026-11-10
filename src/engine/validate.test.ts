import { describe, expect, test } from "bun:test";
import type {
  ChapterSpec,
  CheckpointSpec,
  LevelSpec,
  ScenePack,
  SceneSpec,
} from "../domain/types";
import { validateLevel, validateScene } from "./validate";

function makeLevel(overrides: Partial<LevelSpec> = {}): LevelSpec {
  return {
    id: "s01-c01-k01-l01",
    sceneId: "scene-01",
    chapterId: "chapter-01",
    checkpointId: "checkpoint-01",
    index: 1,
    title: "Collect the gem",
    brief: "Walk east twice.",
    hint: "Use forward(2).",
    grid: { width: 5, height: 5, obstacles: [] },
    start: { x: 0, y: 0, direction: "east" },
    goal: {
      kind: "rescued",
      items: [{ x: 1, y: 0 }],
      target: { x: 2, y: 0 },
    },
    allowedCommands: ["forward"],
    parCode: 2,
    parSteps: 2,
    standardAnswer: [{ kind: "forward", steps: 2 }],
    tutorial: [],
    ...overrides,
  };
}

function makeScenePack(): ScenePack {
  const chapters: ChapterSpec[] = [];
  const levels: LevelSpec[] = [];

  for (let c = 1; c <= 2; c += 1) {
    const chapterId = `chapter-0${c}`;
    const checkpoints: CheckpointSpec[] = [];

    for (let k = 1; k <= 4; k += 1) {
      const checkpointId = `checkpoint-${c}-${k}`;
      const levelIds: string[] = [];

      for (let l = 1; l <= 2; l += 1) {
        const id = `s01-c0${c}-k0${k}-l0${l}`;
        levelIds.push(id);
        levels.push(makeLevel({ id, chapterId, checkpointId, index: l }));
      }

      checkpoints.push({
        id: checkpointId,
        chapterId,
        name: `Checkpoint ${k}`,
        order: k,
        levelIds,
      });
    }

    chapters.push({
      id: chapterId,
      sceneId: "scene-01",
      name: `Chapter ${c}`,
      order: c,
      starGate: 0,
      checkpoints,
    });
  }

  const scene: SceneSpec = {
    id: "scene-01",
    name: "Test scene",
    theme: "test",
    conceptFocus: "movement",
    order: 1,
    chapters,
  };

  return { scene, levels };
}

describe("validateLevel", () => {
  test("accepts a well-formed level", () => {
    expect(validateLevel(makeLevel())).toEqual([]);
  });

  test("rejects a malformed level id", () => {
    const errors = validateLevel(makeLevel({ id: "level-1" }));
    expect(errors.some((error) => error.includes("id must match sNN-cNN-kNN-lNN"))).toBe(true);
  });

  test("rejects grid dimensions outside 5-8", () => {
    const errors = validateLevel(makeLevel({ grid: { width: 4, height: 9, obstacles: [] } }));
    expect(errors.some((error) => error.includes("grid width must be between 5 and 8"))).toBe(true);
    expect(errors.some((error) => error.includes("grid height must be between 5 and 8"))).toBe(true);
  });

  test("rejects a start outside the grid", () => {
    const errors = validateLevel(makeLevel({ start: { x: -1, y: 0, direction: "east" } }));
    expect(errors.some((error) => error.includes("start") && error.includes("inside the grid"))).toBe(true);
  });

  test("rejects a start on an obstacle", () => {
    const errors = validateLevel(
      makeLevel({ grid: { width: 5, height: 5, obstacles: [{ x: 0, y: 0 }] } }),
    );
    expect(errors.some((error) => error.includes("start 0,0 must not be an obstacle"))).toBe(true);
  });

  test("rejects items and obstacles outside the grid", () => {
    const errors = validateLevel(
      makeLevel({
        grid: { width: 5, height: 5, obstacles: [{ x: 7, y: 0 }] },
        goal: { kind: "rescued", items: [{ x: 5, y: 0 }], target: { x: 2, y: 0 } },
      }),
    );
    expect(errors.some((error) => error.includes("item 5,0 must be inside the grid"))).toBe(true);
    expect(errors.some((error) => error.includes("obstacle 7,0 must be inside the grid"))).toBe(true);
  });

  test("rejects empty copy fields", () => {
    const errors = validateLevel(makeLevel({ title: "  ", brief: "", hint: "" }));
    expect(errors).toContain("title must not be empty");
    expect(errors).toContain("brief must not be empty");
    expect(errors).toContain("hint must not be empty");
  });

  test("rejects an empty standard answer", () => {
    const errors = validateLevel(makeLevel({ standardAnswer: [] }));
    expect(errors).toContain("standardAnswer must not be empty");
    expect(errors.some((error) => error.includes("standardAnswer does not complete"))).toBe(true);
  });

  test("rejects a standard answer that does not complete the level", () => {
    const errors = validateLevel(makeLevel({ standardAnswer: [{ kind: "forward", steps: 1 }] }));
    expect(errors.some((error) => error.includes("standardAnswer does not complete"))).toBe(true);
  });

  test("rejects mismatched par values", () => {
    const errors = validateLevel(makeLevel({ parCode: 99, parSteps: 99 }));
    expect(errors.some((error) => error.includes("parCode must equal"))).toBe(true);
    expect(errors.some((error) => error.includes("parSteps must equal"))).toBe(true);
  });

  test("rejects items unreachable through non-obstacle cells", () => {
    const errors = validateLevel(
      makeLevel({
        grid: {
          width: 5,
          height: 5,
          obstacles: [
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 1, y: 2 },
            { x: 1, y: 3 },
            { x: 1, y: 4 },
          ],
        },
        goal: { kind: "rescued", items: [{ x: 4, y: 4 }], target: { x: 4, y: 4 } },
      }),
    );
    expect(errors.some((error) => error.includes("penguin 4,4 is not reachable"))).toBe(true);
  });
});

describe("validateScene", () => {
  test("accepts a complete scene pack", () => {
    expect(validateScene(makeScenePack())).toEqual([]);
  });

  test("rejects scenes without exactly two chapters", () => {
    const pack = makeScenePack();
    pack.scene.chapters.pop();
    const errors = validateScene(pack);
    expect(errors.some((error) => error.includes("exactly 2 chapters"))).toBe(true);
  });

  test("rejects chapters without exactly four checkpoints", () => {
    const pack = makeScenePack();
    pack.scene.chapters[0].checkpoints.pop();
    const errors = validateScene(pack);
    expect(errors.some((error) => error.includes("exactly 4 checkpoints"))).toBe(true);
  });

  test("rejects checkpoints without exactly two level ids", () => {
    const pack = makeScenePack();
    pack.scene.chapters[0].checkpoints[0].levelIds.pop();
    const errors = validateScene(pack);
    expect(errors.some((error) => error.includes("exactly 2 level ids"))).toBe(true);
  });

  test("rejects duplicate level ids across checkpoints", () => {
    const pack = makeScenePack();
    const first = pack.scene.chapters[0].checkpoints[0];
    const second = pack.scene.chapters[0].checkpoints[1];
    second.levelIds[0] = first.levelIds[0];
    const errors = validateScene(pack);
    expect(errors.some((error) => error.includes("referenced more than once"))).toBe(true);
  });

  test("rejects levels owned by the wrong checkpoint", () => {
    const pack = makeScenePack();
    const first = pack.scene.chapters[0].checkpoints[0];
    const level = pack.levels.find((candidate) => candidate.id === first.levelIds[0]);
    expect(level).toBeDefined();
    if (level !== undefined) {
      level.checkpointId = "checkpoint-other";
    }
    const errors = validateScene(pack);
    expect(errors.some((error) => error.includes("does not belong to checkpoint"))).toBe(true);
  });

  test("rejects level ids referenced by a checkpoint but missing from the pack", () => {
    const pack = makeScenePack();
    pack.scene.chapters[0].checkpoints[0].levelIds[0] = "s01-c01-k01-l99";
    const errors = validateScene(pack);
    expect(errors.some((error) => error.includes("missing from the scene pack"))).toBe(true);
  });
});
