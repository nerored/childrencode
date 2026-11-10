import { describe, expect, test } from "bun:test";
import type { ChapterSpec, LevelSpec, SceneSpec, WorldSpec } from "../domain/types";
import {
  STORAGE_KEY,
  chapterStars,
  getStars,
  isChapterUnlocked,
  isLevelUnlocked,
  isSceneUnlocked,
  loadProgress,
  nextLevelId,
  recordResult,
  resetProgress,
  saveProgress,
  sceneStars,
} from "./progress";
import type { StarRating, StoredProgress } from "./progress";

/** Minimal in-memory stand-in for the browser Storage API. */
class MemoryStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

const BASICS_IDS = Array.from({ length: 8 }, (_, index) => `m-b-${index + 1}`);
const LOOPS_IDS = Array.from({ length: 8 }, (_, index) => `m-l-${index + 1}`);
const BRANCH_IDS = ["br-1", "br-2"];
const MOVEMENT_IDS = [...BASICS_IDS, ...LOOPS_IDS];

function makeLevel(
  id: string,
  sceneId: string,
  chapterId: string,
  checkpointId: string,
  index: number,
): LevelSpec {
  return {
    id,
    sceneId,
    chapterId,
    checkpointId,
    index,
    title: id,
    brief: "",
    hint: "",
    grid: { width: 3, height: 3, obstacles: [] },
    start: { x: 0, y: 0, direction: "north" },
    goal: { kind: "reach", items: [], target: { x: 2, y: 2 } },
    allowedCommands: ["forward"],
    parCode: 1,
    parSteps: 2,
    standardAnswer: [],
    tutorial: [],
  };
}

function makeChapter(
  id: string,
  sceneId: string,
  order: number,
  starGate: number,
  checkpointId: string,
  levelIds: string[],
): ChapterSpec {
  return {
    id,
    sceneId,
    name: id,
    order,
    starGate,
    checkpoints: [{ id: checkpointId, chapterId: id, name: checkpointId, order: 0, levelIds }],
  };
}

const basicsChapter = makeChapter("basics", "movement", 0, 0, "cp-basics", BASICS_IDS);
const loopsChapter = makeChapter("loops", "movement", 1, 15, "cp-loops", LOOPS_IDS);
const movementScene: SceneSpec = {
  id: "movement",
  name: "Movement",
  theme: "movement",
  conceptFocus: "movement",
  order: 0,
  chapters: [basicsChapter, loopsChapter],
};

const ifsChapter = makeChapter("ifs", "branching", 0, 0, "cp-ifs", BRANCH_IDS);
const branchingScene: SceneSpec = {
  id: "branching",
  name: "Branching",
  theme: "conditions",
  conceptFocus: "branching",
  order: 1,
  chapters: [ifsChapter],
};

const allLevels: LevelSpec[] = [
  ...BASICS_IDS.map((id, index) => makeLevel(id, "movement", "basics", "cp-basics", index)),
  ...LOOPS_IDS.map((id, index) => makeLevel(id, "movement", "loops", "cp-loops", index)),
  ...BRANCH_IDS.map((id, index) => makeLevel(id, "branching", "ifs", "cp-ifs", index)),
];

const world: WorldSpec = {
  id: "test-world",
  title: "Test World",
  locale: "zh-CN",
  version: "1.0.0",
  scenes: [movementScene, branchingScene],
  levels: Object.fromEntries(allLevels.map((level): [string, LevelSpec] => [level.id, level])),
};

/** Single-scene world used to exercise checkpoint/index ordering directly. */
function makeMiniWorld(entries: Array<{ id: string; index: number }>): WorldSpec {
  const levelIds = entries.map((entry) => entry.id);
  const chapter = makeChapter("mini-ch", "mini", 0, 0, "mini-cp", levelIds);
  const levels = entries.map((entry) => makeLevel(entry.id, "mini", "mini-ch", "mini-cp", entry.index));
  return {
    id: "mini",
    title: "Mini",
    locale: "zh-CN",
    version: "1.0.0",
    scenes: [
      {
        id: "mini",
        name: "Mini",
        theme: "mini",
        conceptFocus: "movement",
        order: 0,
        chapters: [chapter],
      },
    ],
    levels: Object.fromEntries(levels.map((level): [string, LevelSpec] => [level.id, level])),
  };
}

function emptyState(): StoredProgress {
  return loadProgress(new MemoryStorage());
}

function recordMany(
  progress: StoredProgress,
  entries: Array<[string, StarRating]>,
): StoredProgress {
  return entries.reduce(
    (current, [levelId, stars]) => recordResult(current, levelId, stars),
    progress,
  );
}

function allAt(levelIds: string[], stars: StarRating): Array<[string, StarRating]> {
  return levelIds.map((levelId) => [levelId, stars]);
}

describe("loadProgress", () => {
  test("returns an empty v1 state when no value is stored", () => {
    const progress = loadProgress(new MemoryStorage());
    expect(progress.version).toBe(1);
    expect(progress.starsByLevel).toEqual({});
    expect(typeof progress.updatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(progress.updatedAt))).toBe(false);
  });

  test("tolerates corrupt JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{ this is not json");
    const progress = loadProgress(storage);
    expect(progress.version).toBe(1);
    expect(progress.starsByLevel).toEqual({});
    expect(typeof progress.updatedAt).toBe("string");
  });

  test("tolerates unknown versions and drops invalid star values", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, starsByLevel: { "m-b-1": 3 }, updatedAt: "2026-01-01T00:00:00.000Z" }),
    );
    expect(loadProgress(storage).starsByLevel).toEqual({});

    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        starsByLevel: { valid: 1, tooMany: 4, negative: -1, fractional: 2.5, text: "3" },
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    expect(loadProgress(storage).starsByLevel).toEqual({ valid: 1 });
  });

  test("returns an empty state when storage access throws", () => {
    const throwing = {
      getItem(): string | null {
        throw new Error("storage blocked");
      },
    };
    expect(loadProgress(throwing).starsByLevel).toEqual({});
  });
});

describe("saveProgress", () => {
  test("round-trips through storage", () => {
    const storage = new MemoryStorage();
    const progress = recordResult(emptyState(), "m-b-1", 2);

    saveProgress(progress, storage);

    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(progress));
    expect(loadProgress(storage)).toEqual(progress);
  });

  test("ignores storage write failures", () => {
    const throwing = {
      setItem(): void {
        throw new Error("quota exceeded");
      },
    };
    expect(() => saveProgress(emptyState(), throwing)).not.toThrow();
  });
});

describe("recordResult", () => {
  test("keeps the maximum stars and returns a new object", () => {
    const base = recordResult(emptyState(), "m-b-1", 1);
    const improved = recordResult(base, "m-b-1", 3);

    expect(getStars(improved, "m-b-1")).toBe(3);
    expect(getStars(base, "m-b-1")).toBe(1);
    expect(improved).not.toBe(base);

    const lowered = recordResult(improved, "m-b-1", 2);
    expect(getStars(lowered, "m-b-1")).toBe(3);
    expect(lowered).not.toBe(improved);
    expect(Number.isNaN(Date.parse(lowered.updatedAt))).toBe(false);
  });

  test("treats unsolved levels as zero stars", () => {
    expect(getStars(emptyState(), "m-b-1")).toBe(0);
    expect(getStars(recordResult(emptyState(), "m-b-1", 0), "m-b-1")).toBe(0);
  });
});

describe("star totals", () => {
  test("sums chapter stars with a maximum of 24", () => {
    expect(chapterStars(emptyState(), basicsChapter)).toBe(0);
    const perfect = recordMany(emptyState(), allAt(BASICS_IDS, 3));
    expect(chapterStars(perfect, basicsChapter)).toBe(24);
  });

  test("sums scene stars with a maximum of 48", () => {
    const perfect = recordMany(emptyState(), allAt(MOVEMENT_IDS, 3));
    expect(sceneStars(perfect, movementScene)).toBe(48);
  });
});

describe("isChapterUnlocked", () => {
  test("opens the first chapter and gates later ones at 15 of 24 stars", () => {
    const empty = emptyState();
    expect(isChapterUnlocked(empty, movementScene, basicsChapter)).toBe(true);
    expect(isChapterUnlocked(empty, movementScene, loopsChapter)).toBe(false);

    const fourteen = recordMany(empty, [
      ["m-b-1", 3],
      ["m-b-2", 3],
      ["m-b-3", 3],
      ["m-b-4", 3],
      ["m-b-5", 2],
    ]);
    expect(chapterStars(fourteen, basicsChapter)).toBe(14);
    expect(isChapterUnlocked(fourteen, movementScene, loopsChapter)).toBe(false);

    const fifteen = recordResult(fourteen, "m-b-5", 3);
    expect(chapterStars(fifteen, basicsChapter)).toBe(15);
    expect(isChapterUnlocked(fifteen, movementScene, loopsChapter)).toBe(true);
  });
});

describe("isSceneUnlocked", () => {
  test("opens the first scene and gates later ones at 29 of 48 stars", () => {
    const empty = emptyState();
    expect(isSceneUnlocked(empty, world, movementScene)).toBe(true);
    expect(isSceneUnlocked(empty, world, branchingScene)).toBe(false);

    let twentyEight = recordMany(empty, allAt(MOVEMENT_IDS.slice(0, 9), 3));
    twentyEight = recordResult(twentyEight, MOVEMENT_IDS[9]!, 1);
    expect(sceneStars(twentyEight, movementScene)).toBe(28);
    expect(isSceneUnlocked(twentyEight, world, branchingScene)).toBe(false);

    const twentyNine = recordResult(twentyEight, MOVEMENT_IDS[9]!, 2);
    expect(sceneStars(twentyNine, movementScene)).toBe(29);
    expect(isSceneUnlocked(twentyNine, world, branchingScene)).toBe(true);
  });
});

describe("isLevelUnlocked", () => {
  test("unlocks levels sequentially as the previous one earns a star", () => {
    const empty = emptyState();
    expect(isLevelUnlocked(empty, world, "m-b-1")).toBe(true);
    expect(isLevelUnlocked(empty, world, "m-b-2")).toBe(false);

    const zeroStars = recordResult(empty, "m-b-1", 0);
    expect(isLevelUnlocked(zeroStars, world, "m-b-2")).toBe(false);

    const oneStar = recordResult(empty, "m-b-1", 1);
    expect(isLevelUnlocked(oneStar, world, "m-b-2")).toBe(true);
    expect(isLevelUnlocked(oneStar, world, "m-b-3")).toBe(false);
  });

  test("requires the chapter gate before its first level opens", () => {
    const empty = emptyState();
    expect(isLevelUnlocked(empty, world, "m-l-1")).toBe(false);

    const gated = recordMany(empty, allAt(BASICS_IDS, 3));
    expect(isLevelUnlocked(gated, world, "m-l-1")).toBe(true);
    expect(isLevelUnlocked(gated, world, "m-l-2")).toBe(false);
  });

  test("rejects unknown levels", () => {
    expect(isLevelUnlocked(emptyState(), world, "missing")).toBe(false);
  });

  test("falls back to checkpoint order when level indexes are missing", () => {
    const mini = makeMiniWorld([
      { id: "fallback-1", index: Number.NaN },
      { id: "fallback-2", index: Number.NaN },
      { id: "fallback-3", index: Number.NaN },
    ]);
    const empty = emptyState();
    expect(isLevelUnlocked(empty, mini, "fallback-1")).toBe(true);
    expect(isLevelUnlocked(empty, mini, "fallback-2")).toBe(false);

    const afterFirst = recordResult(empty, "fallback-1", 1);
    expect(isLevelUnlocked(afterFirst, mini, "fallback-2")).toBe(true);
  });

  test("uses level index order inside a checkpoint", () => {
    const mini = makeMiniWorld([
      { id: "indexed-3", index: 2 },
      { id: "indexed-1", index: 0 },
      { id: "indexed-2", index: 1 },
    ]);
    const empty = emptyState();
    expect(isLevelUnlocked(empty, mini, "indexed-1")).toBe(true);
    expect(isLevelUnlocked(empty, mini, "indexed-2")).toBe(false);

    const passed = recordResult(empty, "indexed-1", 1);
    expect(nextLevelId(passed, mini, "indexed-1")).toBe("indexed-2");
  });
});

describe("nextLevelId", () => {
  test("returns the next unlocked level and undefined when none is open", () => {
    const empty = emptyState();
    expect(nextLevelId(empty, world, "m-b-1")).toBeUndefined();

    const afterOne = recordResult(empty, "m-b-1", 1);
    expect(nextLevelId(afterOne, world, "m-b-1")).toBe("m-b-2");

    const afterSeven = recordMany(empty, allAt(BASICS_IDS.slice(0, 7), 1));
    expect(nextLevelId(afterSeven, world, "m-b-7")).toBe("m-b-8");
    expect(nextLevelId(afterSeven, world, "m-b-8")).toBeUndefined();
  });

  test("crosses into the next chapter once its gate is met", () => {
    const perfectBasics = recordMany(emptyState(), allAt(BASICS_IDS, 3));
    expect(nextLevelId(perfectBasics, world, "m-b-8")).toBe("m-l-1");
  });

  test("returns undefined at the end of the scene or for unknown levels", () => {
    const empty = emptyState();
    expect(nextLevelId(empty, world, "br-2")).toBeUndefined();
    expect(nextLevelId(empty, world, "missing")).toBeUndefined();
  });
});

describe("resetProgress", () => {
  test("clears a saved document and returns an empty state", () => {
    const storage = new MemoryStorage();
    saveProgress(recordResult(emptyState(), "m-b-1", 3), storage);

    const reset = resetProgress(storage);

    expect(reset.version).toBe(1);
    expect(reset.starsByLevel).toEqual({});
    expect(typeof reset.updatedAt).toBe("string");
    expect(loadProgress(storage).starsByLevel).toEqual({});
  });

  test("returns an empty state without storage", () => {
    const reset = resetProgress();
    expect(reset.version).toBe(1);
    expect(reset.starsByLevel).toEqual({});
  });
});
