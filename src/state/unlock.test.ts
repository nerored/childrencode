import { describe, expect, test } from "bun:test";
import type { ChapterSpec, LevelSpec, SceneSpec } from "../domain/types";
import { WORLD } from "../content/world";
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

function emptyProgress(): StoredProgress {
  return { version: 1, starsByLevel: {}, updatedAt: "2026-01-01T00:00:00.000Z" };
}

function byOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

function chapterLevelIds(chapter: ChapterSpec): string[] {
  return byOrder(chapter.checkpoints).flatMap((checkpoint) =>
    [...checkpoint.levelIds].sort(
      (a, b) => (WORLD.levels[a]?.index ?? 0) - (WORLD.levels[b]?.index ?? 0),
    ),
  );
}

function sceneLevelIds(scene: SceneSpec): string[] {
  return byOrder(scene.chapters).flatMap(chapterLevelIds);
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

const scenes = byOrder(WORLD.scenes);
const firstScene = scenes[0]!;
const secondScene = scenes[1]!;
const firstChapters = byOrder(firstScene.chapters);
const firstChapter = firstChapters[0]!;
const secondChapter = firstChapters[1]!;
const firstChapterIds = chapterLevelIds(firstChapter);
const secondChapterIds = chapterLevelIds(secondChapter);
const firstSceneIds = sceneLevelIds(firstScene);
const secondSceneFirstId = sceneLevelIds(secondScene)[0]!;

describe("isChapterUnlocked", () => {
  test("opens the first chapter and requires 15 of 24 stars for the second", () => {
    const empty = emptyProgress();
    expect(isChapterUnlocked(empty, firstScene, firstChapter)).toBe(true);
    expect(isChapterUnlocked(empty, firstScene, secondChapter)).toBe(false);

    let fourteen = recordMany(
      empty,
      firstChapterIds.slice(0, 4).map((levelId): [string, StarRating] => [levelId, 3]),
    );
    fourteen = recordResult(fourteen, firstChapterIds[4]!, 2);
    expect(chapterStars(fourteen, firstChapter)).toBe(14);
    expect(isChapterUnlocked(fourteen, firstScene, secondChapter)).toBe(false);

    const fifteen = recordResult(fourteen, firstChapterIds[4]!, 3);
    expect(chapterStars(fifteen, firstChapter)).toBe(15);
    expect(isChapterUnlocked(fifteen, firstScene, secondChapter)).toBe(true);
  });

  test("counts at most 24 chapter stars", () => {
    const perfect = recordMany(
      emptyProgress(),
      firstChapterIds.map((levelId): [string, StarRating] => [levelId, 3]),
    );
    expect(chapterStars(perfect, firstChapter)).toBe(24);
    expect(isChapterUnlocked(perfect, firstScene, secondChapter)).toBe(true);
  });
});

describe("isSceneUnlocked", () => {
  test("opens the first scene and requires 29 of 48 stars for the second", () => {
    const empty = emptyProgress();
    expect(isSceneUnlocked(empty, WORLD, firstScene)).toBe(true);
    expect(isSceneUnlocked(empty, WORLD, secondScene)).toBe(false);

    let twentyEight = recordMany(
      empty,
      firstSceneIds.slice(0, 9).map((levelId): [string, StarRating] => [levelId, 3]),
    );
    twentyEight = recordResult(twentyEight, firstSceneIds[9]!, 1);
    expect(sceneStars(twentyEight, firstScene)).toBe(28);
    expect(isSceneUnlocked(twentyEight, WORLD, secondScene)).toBe(false);

    const twentyNine = recordResult(twentyEight, firstSceneIds[9]!, 2);
    expect(sceneStars(twentyNine, firstScene)).toBe(29);
    expect(isSceneUnlocked(twentyNine, WORLD, secondScene)).toBe(true);
  });

  test("counts at most 48 scene stars", () => {
    const perfect = recordMany(
      emptyProgress(),
      firstSceneIds.map((levelId): [string, StarRating] => [levelId, 3]),
    );
    expect(sceneStars(perfect, firstScene)).toBe(48);
    expect(isSceneUnlocked(perfect, WORLD, secondScene)).toBe(true);
  });
});

describe("isLevelUnlocked", () => {
  test("unlocks levels sequentially inside a chapter", () => {
    const empty = emptyProgress();
    expect(isLevelUnlocked(empty, WORLD, firstChapterIds[0]!)).toBe(true);
    expect(isLevelUnlocked(empty, WORLD, firstChapterIds[1]!)).toBe(false);
    expect(isLevelUnlocked(empty, WORLD, firstChapterIds[2]!)).toBe(false);

    const zeroStars = recordResult(empty, firstChapterIds[0]!, 0);
    expect(isLevelUnlocked(zeroStars, WORLD, firstChapterIds[1]!)).toBe(false);

    const oneStar = recordResult(empty, firstChapterIds[0]!, 1);
    expect(isLevelUnlocked(oneStar, WORLD, firstChapterIds[1]!)).toBe(true);
    expect(isLevelUnlocked(oneStar, WORLD, firstChapterIds[2]!)).toBe(false);
  });

  test("keeps the second chapter closed until the 15-star gate is met", () => {
    const empty = emptyProgress();
    expect(isLevelUnlocked(empty, WORLD, secondChapterIds[0]!)).toBe(false);

    const gated = recordMany(
      empty,
      firstChapterIds.slice(0, 5).map((levelId): [string, StarRating] => [levelId, 3]),
    );
    expect(chapterStars(gated, firstChapter)).toBe(15);
    expect(isLevelUnlocked(gated, WORLD, secondChapterIds[0]!)).toBe(true);
    expect(isLevelUnlocked(gated, WORLD, secondChapterIds[1]!)).toBe(false);

    const afterFirst = recordResult(gated, secondChapterIds[0]!, 1);
    expect(isLevelUnlocked(afterFirst, WORLD, secondChapterIds[1]!)).toBe(true);
  });

  test("keeps the second scene closed until the 29-star gate is met", () => {
    let progress = recordMany(
      emptyProgress(),
      firstSceneIds.slice(0, 9).map((levelId): [string, StarRating] => [levelId, 3]),
    );
    progress = recordResult(progress, firstSceneIds[9]!, 1);
    expect(sceneStars(progress, firstScene)).toBe(28);
    expect(isLevelUnlocked(progress, WORLD, secondSceneFirstId)).toBe(false);

    const unlocked = recordResult(progress, firstSceneIds[9]!, 2);
    expect(sceneStars(unlocked, firstScene)).toBe(29);
    expect(isLevelUnlocked(unlocked, WORLD, secondSceneFirstId)).toBe(true);
  });

  test("rejects unknown levels", () => {
    expect(isLevelUnlocked(emptyProgress(), WORLD, "missing-level")).toBe(false);
  });
});

describe("nextLevelId", () => {
  test("returns the next level only once the current one earns a star", () => {
    const empty = emptyProgress();
    expect(nextLevelId(empty, WORLD, firstChapterIds[0]!)).toBeUndefined();

    const afterFirst = recordResult(empty, firstChapterIds[0]!, 1);
    expect(nextLevelId(afterFirst, WORLD, firstChapterIds[0]!)).toBe(firstChapterIds[1]!);
  });

  test("stops at the end of a chapter until the next chapter unlocks", () => {
    const sevenDone = recordMany(
      emptyProgress(),
      firstChapterIds.slice(0, 7).map((levelId): [string, StarRating] => [levelId, 1]),
    );
    expect(nextLevelId(sevenDone, WORLD, firstChapterIds[6]!)).toBe(firstChapterIds[7]!);
    expect(nextLevelId(sevenDone, WORLD, firstChapterIds[7]!)).toBeUndefined();

    const perfectChapter = recordMany(
      emptyProgress(),
      firstChapterIds.map((levelId): [string, StarRating] => [levelId, 3]),
    );
    expect(nextLevelId(perfectChapter, WORLD, firstChapterIds[7]!)).toBe(secondChapterIds[0]!);
  });

  test("returns undefined at the end of a scene and for unknown levels", () => {
    const perfectScene = recordMany(
      emptyProgress(),
      firstSceneIds.map((levelId): [string, StarRating] => [levelId, 3]),
    );
    expect(nextLevelId(perfectScene, WORLD, firstSceneIds[firstSceneIds.length - 1]!)).toBeUndefined();
    expect(nextLevelId(emptyProgress(), WORLD, "missing-level")).toBeUndefined();
  });
});

describe("resetProgress", () => {
  test("clears saved stars and returns the initial unlocked state", () => {
    const storage = new MemoryStorage();
    const saved = recordMany(
      emptyProgress(),
      firstChapterIds.slice(0, 4).map((levelId): [string, StarRating] => [levelId, 3]),
    );
    saveProgress(saved, storage);

    const reset = resetProgress(storage);

    expect(reset.version).toBe(1);
    expect(reset.starsByLevel).toEqual({});
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadProgress(storage).starsByLevel).toEqual({});
    expect(getStars(reset, firstChapterIds[0]!)).toBe(0);
    expect(isLevelUnlocked(reset, WORLD, firstChapterIds[0]!)).toBe(true);
    expect(isLevelUnlocked(reset, WORLD, firstChapterIds[1]!)).toBe(false);
  });

  test("returns a fresh empty state without storage", () => {
    const reset = resetProgress();
    expect(reset.version).toBe(1);
    expect(reset.starsByLevel).toEqual({});
  });
});
