import { describe, expect, test } from "bun:test";
import type { LevelSpec, Point } from "../../../domain/types";
import type { StageFrame } from "../playback";
import {
  buildStageScene,
  CELL_SIZE,
  cellToWorld,
  directionToYaw,
  variantFor,
} from "./sceneModel";
import { DEFAULT_THEME, stageTheme } from "./theme";

interface LevelOptions {
  width?: number;
  height?: number;
  sceneId?: string;
  start?: LevelSpec["start"];
  target?: Point;
  items?: Point[];
  obstacles?: Point[];
  corners?: Point[];
  water?: Point[];
}

function makeLevel(options: LevelOptions = {}): LevelSpec {
  return {
    id: "s01-c01-k01-l01",
    sceneId: options.sceneId ?? "s01",
    chapterId: "s01-c01",
    checkpointId: "s01-c01-k01",
    index: 1,
    title: "Test level",
    brief: "Reach the target.",
    hint: "Use forward.",
    grid: {
      width: options.width ?? 5,
      height: options.height ?? 5,
      obstacles: options.obstacles ?? [],
      corners: options.corners ?? [],
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

function makeFrame(partial: Partial<StageFrame> = {}): StageFrame {
  return {
    index: 0,
    position: { x: 0, y: 0 },
    direction: "east",
    visited: ["0,0"],
    rescued: [],
    steps: 0,
    action: null,
    done: false,
    ...partial,
  };
}

describe("cellToWorld", () => {
  test("keeps a grid cell per unit and centers odd boards on the origin", () => {
    expect(CELL_SIZE).toBe(1);
    expect(cellToWorld(0, 0, 5, 5)).toEqual({ x: -2, z: -2 });
    expect(cellToWorld(2, 2, 5, 5)).toEqual({ x: 0, z: 0 });
    expect(cellToWorld(4, 4, 5, 5)).toEqual({ x: 2, z: 2 });
    expect(cellToWorld(0, 4, 5, 5)).toEqual({ x: -2, z: 2 });
  });

  test("straddles the origin for even boards", () => {
    expect(cellToWorld(0, 0, 6, 6)).toEqual({ x: -2.5, z: -2.5 });
    expect(cellToWorld(5, 5, 6, 6)).toEqual({ x: 2.5, z: 2.5 });
    expect(cellToWorld(2, 3, 6, 6)).toEqual({ x: -0.5, z: 0.5 });
    expect(cellToWorld(0, 0, 7, 5)).toEqual({ x: -3, z: -2 });
  });
});

describe("directionToYaw", () => {
  test("maps cardinal headings to radians around +Y", () => {
    expect(directionToYaw("south")).toBe(0);
    expect(directionToYaw("east")).toBeCloseTo(Math.PI / 2, 10);
    expect(directionToYaw("west")).toBeCloseTo(-Math.PI / 2, 10);
    expect(directionToYaw("north")).toBeCloseTo(Math.PI, 10);
  });
});

describe("variantFor", () => {
  test("is deterministic and always lands in 0..3", () => {
    for (let x = 0; x < 12; x += 1) {
      for (let y = 0; y < 12; y += 1) {
        for (const salt of [0, 1, 2, 3]) {
          const variant = variantFor(x, y, salt);
          expect(Number.isInteger(variant)).toBe(true);
          expect(variant).toBeGreaterThanOrEqual(0);
          expect(variant).toBeLessThanOrEqual(3);
          expect(variantFor(x, y, salt)).toBe(variant);
        }
      }
    }
  });

  test("spreads props across more than one variant", () => {
    const variants = new Set<number>();
    for (let x = 0; x < 8; x += 1) {
      for (let y = 0; y < 8; y += 1) {
        variants.add(variantFor(x, y));
      }
    }
    expect(variants.size).toBeGreaterThan(1);
  });
});

describe("stageTheme", () => {
  test("maps every scene (s01..s04) and falls back to the default", () => {
    expect(stageTheme("s01")).toBe(DEFAULT_THEME);
    expect(stageTheme("s02").sceneId).toBe("s02");
    expect(stageTheme("s02").landmark).toBe("tidegate");
    expect(stageTheme("s03").landmark).toBe("gears");
    expect(stageTheme("s04").landmark).toBe("lantern");
    expect(stageTheme("s99")).toBe(DEFAULT_THEME);
    expect(stageTheme("")).toBe(DEFAULT_THEME);
  });
});

describe("buildStageScene", () => {
  test("replicates water rows using the first-listed lane as the bridge", () => {
    const level = makeLevel({
      width: 5,
      height: 4,
      water: [
        { x: 3, y: 1 },
        { x: 1, y: 1 },
        { x: 0, y: 3 },
      ],
    });
    const scene = buildStageScene(level, null);

    const rowKinds = (y: number) =>
      scene.ground.filter((cell) => cell.y === y).map((cell) => cell.kind);

    // Lane 3 wins over the later entry at x=1: array order, not min(x).
    expect(rowKinds(1)).toEqual(["water", "water", "water", "bridge", "water"]);
    expect(rowKinds(3)).toEqual(["bridge", "water", "water", "water", "water"]);
    expect(rowKinds(0).every((kind) => kind === "ice")).toBe(true);
    expect(rowKinds(2).every((kind) => kind === "ice")).toBe(true);
  });

  test("emits row-major ground with exactly one entry per cell", () => {
    const level = makeLevel({ width: 4, height: 3, water: [{ x: 2, y: 1 }] });
    const scene = buildStageScene(level);

    expect(scene.ground).toHaveLength(12);
    scene.ground.forEach((cell, index) => {
      expect(cell.x).toBe(index % 4);
      expect(cell.y).toBe(Math.floor(index / 4));
      expect(cell.variant).toBeGreaterThanOrEqual(0);
      expect(cell.variant).toBeLessThanOrEqual(3);
    });
    expect(new Set(scene.ground.map((cell) => `${cell.x},${cell.y}`)).size).toBe(12);
  });

  test("frame 0 shows the start pose, only the start cell visited, every penguin waiting", () => {
    const level = makeLevel({
      items: [{ x: 1, y: 2 }, { x: 3, y: 2 }],
      start: { x: 0, y: 2, direction: "east" },
      target: { x: 4, y: 2 },
    });
    const scene = buildStageScene(
      level,
      makeFrame({
        index: 0,
        position: { x: 0, y: 2 },
        direction: "east",
        visited: ["0,2"],
      }),
    );

    expect(scene.agent).toEqual({ x: 0, y: 2, direction: "east", action: null });
    expect(scene.agent.action).toBeNull();
    expect(
      scene.ground.filter((cell) => cell.visited).map((cell) => `${cell.x},${cell.y}`),
    ).toEqual(["0,2"]);
    expect(scene.penguins.map((penguin) => penguin.collected)).toEqual([false, false]);
    expect(scene.totalPenguins).toBe(2);
    expect(scene.remainingPenguins).toBe(2);
  });

  test("a later frame moves the agent, grows visited cells and collects a penguin", () => {
    const level = makeLevel({
      items: [{ x: 1, y: 2 }, { x: 3, y: 2 }],
      start: { x: 0, y: 2, direction: "east" },
      target: { x: 4, y: 2 },
    });
    const scene = buildStageScene(
      level,
      makeFrame({
        index: 2,
        position: { x: 2, y: 2 },
        direction: "east",
        visited: ["0,2", "1,2", "2,2"],
        rescued: ["1,2"],
        steps: 2,
        action: "forward",
      }),
    );

    expect(scene.agent).toEqual({ x: 2, y: 2, direction: "east", action: "forward" });
    expect(
      scene.ground.filter((cell) => cell.visited).map((cell) => `${cell.x},${cell.y}`),
    ).toEqual(["0,2", "1,2", "2,2"]);
    expect(scene.penguins.map((penguin) => penguin.collected)).toEqual([true, false]);
    expect(scene.remainingPenguins).toBe(1);
  });

  test("a penguin standing on the start cell stays unresolved while rescued is empty", () => {
    const level = makeLevel({
      items: [{ x: 0, y: 0 }],
      start: { x: 0, y: 0, direction: "east" },
      target: { x: 4, y: 0 },
    });
    const scene = buildStageScene(
      level,
      makeFrame({ position: { x: 0, y: 0 }, visited: ["0,0"], rescued: [] }),
    );

    expect(scene.penguins[0].collected).toBe(false);
    expect(scene.remainingPenguins).toBe(1);
  });

  test("renders the untouched start pose when no frame is supplied", () => {
    const level = makeLevel({
      start: { x: 1, y: 3, direction: "west" },
      items: [{ x: 2, y: 3 }],
      target: { x: 4, y: 3 },
    });
    const scene = buildStageScene(level);

    expect(scene.agent).toEqual({ x: 1, y: 3, direction: "west", action: null });
    expect(scene.ground.every((cell) => cell.visited === false)).toBe(true);
    expect(scene.penguins[0].collected).toBe(false);
    expect(scene.remainingPenguins).toBe(1);
    expect(scene.totalPenguins).toBe(1);
  });

  test("copies obstacles, corners, penguins and the base from the level", () => {
    const level = makeLevel({
      sceneId: "s02",
      obstacles: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
      corners: [{ x: 0, y: 0 }],
      items: [{ x: 3, y: 1 }],
      target: { x: 4, y: 4 },
    });
    const scene = buildStageScene(level);

    expect(scene.theme).toBe(stageTheme("s02"));
    expect(scene.trees.map((tree) => ({ x: tree.x, y: tree.y }))).toEqual(level.grid.obstacles);
    expect(scene.corners.map((corner) => ({ x: corner.x, y: corner.y }))).toEqual(
      level.grid.corners,
    );
    expect(scene.penguins.map((penguin) => `${penguin.x},${penguin.y}`)).toEqual(["3,1"]);
    expect(scene.base).toEqual(level.goal.target);
    for (const prop of [...scene.trees, ...scene.corners, ...scene.penguins]) {
      expect(prop.variant).toBeGreaterThanOrEqual(0);
      expect(prop.variant).toBeLessThanOrEqual(3);
    }
  });

  test("does not mutate the level or frame and never shares input objects", () => {
    const level = makeLevel({
      width: 4,
      height: 4,
      obstacles: [{ x: 1, y: 1 }],
      corners: [{ x: 3, y: 3 }],
      items: [{ x: 1, y: 2 }],
      target: { x: 0, y: 3 },
      water: [{ x: 1, y: 3 }, { x: 0, y: 3 }],
    });
    const frame = makeFrame({
      index: 3,
      position: { x: 1, y: 2 },
      direction: "south",
      visited: ["0,0", "1,0", "1,1", "1,2"],
      rescued: ["1,2"],
      steps: 3,
      action: "forward",
      done: false,
    });
    const levelBefore = JSON.stringify(level);
    const frameBefore = JSON.stringify(frame);

    const scene = buildStageScene(level, frame);

    expect(JSON.stringify(level)).toBe(levelBefore);
    expect(JSON.stringify(frame)).toBe(frameBefore);
    expect(scene.trees[0]).not.toBe(level.grid.obstacles[0]);
    expect(scene.corners[0]).not.toBe(level.grid.corners?.[0]);
    expect(scene.penguins[0]).not.toBe(level.goal.items[0]);
    expect(scene.base).not.toBe(level.goal.target);
  });
});
