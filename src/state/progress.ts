/**
 * Persistent player progress and unlock rules.
 *
 * Progress is a tiny versioned document stored as JSON. It only tracks the best
 * star rating per level; every unlock decision is derived from those stars so a
 * corrupted or outdated document can always be treated as empty.
 */

import type { ChapterSpec, SceneSpec, WorldSpec } from "../domain/types";

/** localStorage key holding the serialized {@link StoredProgress}. */
export const STORAGE_KEY = "childrencode.progress.v1";

/** One to three stars per level; zero means the level was never solved. */
export type StarRating = StoredProgress["starsByLevel"][string];

/** Versioned snapshot persisted to storage. */
export interface StoredProgress {
  version: 1;
  starsByLevel: Record<string, 0 | 1 | 2 | 3>;
  updatedAt: string;
}

/** Stars needed in the previous chapter to open the next one. */
const DEFAULT_CHAPTER_STAR_GATE = 15;
/** Stars needed in the previous scene to open the next one. */
const DEFAULT_SCENE_STAR_GATE = 29;

function nowIso(): string {
  return new Date().toISOString();
}

function emptyProgress(): StoredProgress {
  return { version: 1, starsByLevel: {}, updatedAt: nowIso() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStarRating(value: unknown): value is 0 | 1 | 2 | 3 {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3;
}

function clampStars(stars: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(stars)) return 0;
  return Math.min(3, Math.max(0, Math.trunc(stars))) as 0 | 1 | 2 | 3;
}

function readStorage(storage?: Pick<Storage, "getItem">): Pick<Storage, "getItem"> | undefined {
  if (storage) return storage;
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function writeStorage(storage?: Pick<Storage, "setItem">): Pick<Storage, "setItem"> | undefined {
  if (storage) return storage;
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** Read progress, falling back to an empty v1 document for any bad input. */
export function loadProgress(storage?: Pick<Storage, "getItem">): StoredProgress {
  const target = readStorage(storage);
  if (!target) return emptyProgress();

  let raw: string | null;
  try {
    raw = target.getItem(STORAGE_KEY);
  } catch {
    return emptyProgress();
  }
  if (raw === null) return emptyProgress();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }

  if (!isRecord(parsed) || parsed.version !== 1) return emptyProgress();

  const entries: Array<[string, 0 | 1 | 2 | 3]> = [];
  if (isRecord(parsed.starsByLevel)) {
    for (const [levelId, value] of Object.entries(parsed.starsByLevel)) {
      if (isStarRating(value)) entries.push([levelId, value]);
    }
  }

  return {
    version: 1,
    starsByLevel: Object.fromEntries(entries) as Record<string, 0 | 1 | 2 | 3>,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : nowIso(),
  };
}

/** Persist progress. Storage failures are ignored because play must not crash. */
export function saveProgress(progress: StoredProgress, storage?: Pick<Storage, "setItem">): void {
  const target = writeStorage(storage);
  if (!target) return;
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage may be unavailable (private mode, quota); keep playing regardless.
  }
}

/** Merge a result into progress, keeping the best stars ever earned per level. */
export function recordResult(
  progress: StoredProgress,
  levelId: string,
  stars: StarRating,
): StoredProgress {
  const next = Math.max(getStars(progress, levelId), clampStars(stars)) as 0 | 1 | 2 | 3;

  const entries: Array<[string, 0 | 1 | 2 | 3]> = Object.entries(progress.starsByLevel).map(
    ([id, value]) => [id, value],
  );
  entries.push([levelId, next]);

  return {
    version: 1,
    starsByLevel: Object.fromEntries(entries) as Record<string, 0 | 1 | 2 | 3>,
    updatedAt: nowIso(),
  };
}

/** Best rating for a level, or 0 when it was never solved. */
export function getStars(progress: StoredProgress, levelId: string): 0 | 1 | 2 | 3 {
  const value = progress.starsByLevel[levelId];
  return isStarRating(value) ? value : 0;
}

function sumStars(progress: StoredProgress, levelIds: Iterable<string>): number {
  const seen = new Set<string>();
  let total = 0;
  for (const levelId of levelIds) {
    if (seen.has(levelId)) continue;
    seen.add(levelId);
    total += getStars(progress, levelId);
  }
  return total;
}

/** Total stars earned across every level in a chapter. */
export function chapterStars(progress: StoredProgress, chapter: ChapterSpec): number {
  return sumStars(
    progress,
    chapter.checkpoints.flatMap((checkpoint) => checkpoint.levelIds),
  );
}

/** Total stars earned across every level in a scene. */
export function sceneStars(progress: StoredProgress, scene: SceneSpec): number {
  return sumStars(
    progress,
    scene.chapters.flatMap((chapter) => chapter.checkpoints.flatMap((checkpoint) => checkpoint.levelIds)),
  );
}

/** First chapter is open; later chapters need enough stars in the previous one. */
export function isChapterUnlocked(
  progress: StoredProgress,
  scene: SceneSpec,
  chapter: ChapterSpec,
): boolean {
  const ordered = [...scene.chapters].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((candidate) => candidate.id === chapter.id);
  if (index === 0) return true;
  if (index < 0) return false;

  const previous = ordered[index - 1];
  if (!previous) return false;
  const gate = chapter.starGate ?? DEFAULT_CHAPTER_STAR_GATE;
  return chapterStars(progress, previous) >= gate;
}

/** First scene is open; later scenes need enough stars in the previous scene. */
export function isSceneUnlocked(
  progress: StoredProgress,
  world: WorldSpec,
  scene: SceneSpec,
): boolean {
  const ordered = [...world.scenes].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((candidate) => candidate.id === scene.id);
  if (index === 0) return true;
  if (index < 0) return false;

  const previous = ordered[index - 1];
  if (!previous) return false;
  return sceneStars(progress, previous) >= DEFAULT_SCENE_STAR_GATE;
}

/**
 * Level ids in play order: chapter checkpoints sorted by order, levels sorted
 * by `LevelSpec.index` when available (listed order otherwise), then any
 * unlisted chapter levels by index.
 */
function orderedChapterLevelIds(world: WorldSpec, chapter: ChapterSpec): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const checkpoints = [...chapter.checkpoints].sort((a, b) => a.order - b.order);
  for (const checkpoint of checkpoints) {
    const ids = [...checkpoint.levelIds];
    const hasIndexes = ids.every((id) => Number.isFinite(world.levels[id]?.index));
    if (hasIndexes) {
      ids.sort((a, b) => world.levels[a]!.index - world.levels[b]!.index);
    }
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
  }

  const remaining = Object.values(world.levels)
    .filter((level) => level.chapterId === chapter.id && !seen.has(level.id))
    .sort((a, b) => {
      const aIndex = Number.isFinite(a.index) ? a.index : Number.MAX_SAFE_INTEGER;
      const bIndex = Number.isFinite(b.index) ? b.index : Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex || a.id.localeCompare(b.id);
    });
  for (const level of remaining) {
    if (seen.has(level.id)) continue;
    seen.add(level.id);
    ordered.push(level.id);
  }

  return ordered;
}

function orderedSceneLevelIds(world: WorldSpec, scene: SceneSpec): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const chapter of [...scene.chapters].sort((a, b) => a.order - b.order)) {
    for (const id of orderedChapterLevelIds(world, chapter)) {
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
  }
  return ordered;
}

/**
 * A level is open when its scene and chapter are open, and either it is the
 * first level of the chapter or the previous level has at least one star.
 */
export function isLevelUnlocked(
  progress: StoredProgress,
  world: WorldSpec,
  levelId: string,
): boolean {
  const level = world.levels[levelId];
  if (!level) return false;

  const scene =
    world.scenes.find((candidate) => candidate.id === level.sceneId) ??
    world.scenes.find((candidate) => candidate.chapters.some((chapter) => chapter.id === level.chapterId));
  if (!scene) return false;

  const chapter = scene.chapters.find((candidate) => candidate.id === level.chapterId);
  if (!chapter) return false;

  if (!isSceneUnlocked(progress, world, scene)) return false;
  if (!isChapterUnlocked(progress, scene, chapter)) return false;

  const ordered = orderedChapterLevelIds(world, chapter);
  const index = ordered.indexOf(levelId);
  if (index < 0) return Number.isFinite(level.index) && level.index <= 0;
  if (index === 0) return true;

  const previous = ordered[index - 1];
  return previous !== undefined && getStars(progress, previous) > 0;
}

/**
 * Next playable level after `levelId` in scene/chapter/checkpoint/index order.
 * Locked levels are skipped; undefined means the scene has no next level.
 */
export function nextLevelId(
  progress: StoredProgress,
  world: WorldSpec,
  levelId: string,
): string | undefined {
  const level = world.levels[levelId];
  if (!level) return undefined;

  const scene = world.scenes.find((candidate) => candidate.id === level.sceneId);
  if (!scene) return undefined;

  const ordered = orderedSceneLevelIds(world, scene);
  const index = ordered.indexOf(levelId);
  if (index < 0) return undefined;

  for (let next = index + 1; next < ordered.length; next += 1) {
    const candidate = ordered[next];
    if (candidate && isLevelUnlocked(progress, world, candidate)) return candidate;
  }
  return undefined;
}

/** Clear saved progress and return a fresh document. */
export function resetProgress(
  storage?: Pick<Storage, "setItem"> & Partial<Pick<Storage, "removeItem">>,
): StoredProgress {
  const progress = emptyProgress();
  if (storage) {
    try {
      if (typeof storage.removeItem === "function") {
        storage.removeItem(STORAGE_KEY);
        return progress;
      }
    } catch {
      // Fall through to writing an empty snapshot.
    }
  }
  saveProgress(progress, storage);
  return progress;
}
