import type { ChapterSpec, LevelSpec, ScenePack, SceneSpec, WorldSpec } from "../domain/types";
import { GEARS } from "./scenes/gears";
import { MIST } from "./scenes/mist";
import { TIDE } from "./scenes/tide";
import { WINDMILL } from "./scenes/windmill";

const PACKS: ScenePack[] = [WINDMILL, TIDE, GEARS, MIST];

function buildLevels(packs: ScenePack[]): Record<string, LevelSpec> {
  const levels: Record<string, LevelSpec> = {};
  for (const pack of packs) {
    for (const level of pack.levels) {
      levels[level.id] = level;
    }
  }
  return levels;
}

/** Root content document built from the four scene packs. */
export const WORLD: WorldSpec = {
  id: "childrencode-world",
  title: "ChildrenCode 少儿编程学习岛",
  locale: "zh-CN",
  version: "1.0.0",
  scenes: [WINDMILL.scene, TIDE.scene, GEARS.scene, MIST.scene],
  levels: buildLevels(PACKS),
};

/** Levels flattened in scene, chapter, checkpoint, and level index order. */
const ORDERED_LEVELS: LevelSpec[] = (() => {
  const result: LevelSpec[] = [];
  for (const scene of WORLD.scenes) {
    const chapters = [...scene.chapters].sort((a, b) => a.order - b.order);
    for (const chapter of chapters) {
      const checkpoints = [...chapter.checkpoints].sort((a, b) => a.order - b.order);
      for (const checkpoint of checkpoints) {
        const levels = checkpoint.levelIds
          .map((levelId) => WORLD.levels[levelId])
          .filter((level): level is LevelSpec => level !== undefined)
          .sort((a, b) => a.index - b.index);
        result.push(...levels);
      }
    }
  }
  return result;
})();

/** Every level in the world, flattened in play order. */
export function allLevels(): LevelSpec[] {
  return [...ORDERED_LEVELS];
}

/** Look up one level by id. */
export function findLevel(id: string): LevelSpec | undefined {
  return Object.prototype.hasOwnProperty.call(WORLD.levels, id) ? WORLD.levels[id] : undefined;
}

/** Look up one scene by id. */
export function findScene(id: string): SceneSpec | undefined {
  return WORLD.scenes.find((scene) => scene.id === id);
}

/** Look up one chapter by id, across every scene. */
export function findChapter(id: string): ChapterSpec | undefined {
  for (const scene of WORLD.scenes) {
    const chapter = scene.chapters.find((candidate) => candidate.id === id);
    if (chapter !== undefined) {
      return chapter;
    }
  }
  return undefined;
}

/** Id of the level that follows `id` in world order, or undefined at the end. */
export function nextLevelIdInWorld(id: string): string | undefined {
  const index = ORDERED_LEVELS.findIndex((level) => level.id === id);
  if (index === -1) {
    return undefined;
  }
  return ORDERED_LEVELS[index + 1]?.id;
}
