import { describe, expect, test } from "bun:test";
import type { CheckpointSpec, SceneSpec } from "../domain/types";
import { scoreRun } from "../engine/score";
import { simulate } from "../engine/simulate";
import { validateLevel } from "../engine/validate";
import {
  WORLD,
  allLevels,
  findChapter,
  findLevel,
  findScene,
  nextLevelIdInWorld,
} from "./world";

const SCENE_NAMES = ["风车原野", "潮汐回廊", "齿轮工坊", "雾林岔路"];

const TENCENT_SCENE_NAMES = [
  "南极科考",
  "南极危机",
  "雨林守护",
  "火山探秘",
  "草原重生",
  "海洋卫士",
  "城市绿洲",
  "能源新纪元",
  "未来保卫战",
  "时空恢复",
  "星际征途",
];

function chapterLevelIds(scene: SceneSpec, chapterId: string): string[] {
  return scene.chapters
    .filter((chapter) => chapter.id === chapterId)
    .flatMap((chapter) => chapter.checkpoints.flatMap((checkpoint) => checkpoint.levelIds));
}

function allCheckpoints(scene: SceneSpec): CheckpointSpec[] {
  return scene.chapters.flatMap((chapter) => chapter.checkpoints);
}

describe("WORLD", () => {
  test("composes four scenes, eight chapters, 32 checkpoints, and 64 levels", () => {
    expect(WORLD.id).toBe("childrencode-world");
    expect(WORLD.title).toBe("ChildrenCode 少儿编程学习岛");
    expect(WORLD.locale).toBe("zh-CN");
    expect(WORLD.version).toBe("1.0.0");

    expect(WORLD.scenes).toHaveLength(4);
    expect(WORLD.scenes.flatMap((scene) => scene.chapters)).toHaveLength(8);
    expect(WORLD.scenes.flatMap(allCheckpoints)).toHaveLength(32);
    expect(allLevels()).toHaveLength(64);
    expect(Object.keys(WORLD.levels)).toHaveLength(64);
  });

  test("every chapter has four checkpoints and eight levels", () => {
    for (const scene of WORLD.scenes) {
      for (const chapter of scene.chapters) {
        expect(chapter.checkpoints).toHaveLength(4);
        expect(chapterLevelIds(scene, chapter.id)).toHaveLength(8);
        expect(allLevels().filter((level) => level.chapterId === chapter.id)).toHaveLength(8);
      }
    }
  });

  test("every checkpoint has exactly two level ids", () => {
    for (const scene of WORLD.scenes) {
      for (const checkpoint of allCheckpoints(scene)) {
        expect(checkpoint.levelIds).toHaveLength(2);
      }
    }
  });

  test("all scene, chapter, checkpoint, and level ids are unique", () => {
    const ids: string[] = [];
    for (const scene of WORLD.scenes) {
      ids.push(scene.id);
      for (const chapter of scene.chapters) {
        ids.push(chapter.id);
        for (const checkpoint of chapter.checkpoints) {
          ids.push(checkpoint.id);
        }
      }
    }
    ids.push(...allLevels().map((level) => level.id));

    expect(ids).toHaveLength(108);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every level's scene, chapter, and checkpoint resolve", () => {
    const problems: string[] = [];

    for (const level of allLevels()) {
      const scene = findScene(level.sceneId);
      if (scene === undefined) {
        problems.push(`${level.id}: scene "${level.sceneId}" does not resolve`);
      }

      const chapter = findChapter(level.chapterId);
      if (chapter === undefined) {
        problems.push(`${level.id}: chapter "${level.chapterId}" does not resolve`);
      } else {
        if (chapter.sceneId !== level.sceneId) {
          problems.push(`${level.id}: chapter "${chapter.id}" belongs to scene "${chapter.sceneId}"`);
        }
        const checkpoint = chapter.checkpoints.find(
          (candidate) => candidate.id === level.checkpointId,
        );
        if (checkpoint === undefined) {
          problems.push(`${level.id}: checkpoint "${level.checkpointId}" does not resolve`);
        } else if (!checkpoint.levelIds.includes(level.id)) {
          problems.push(`${level.id}: checkpoint "${checkpoint.id}" does not list the level`);
        }
      }

      if (findLevel(level.id) !== level) {
        problems.push(`${level.id}: findLevel does not return the level`);
      }
    }

    expect(problems).toEqual([]);
  });

  test("every scene name is a ChildrenCode name and not a Tencent scene name", () => {
    const names = WORLD.scenes.map((scene) => scene.name);
    expect(new Set(names).size).toBe(names.length);

    for (const name of names) {
      expect(SCENE_NAMES).toContain(name);
      expect(TENCENT_SCENE_NAMES).not.toContain(name);
    }
  });
});

describe("world content integrity", () => {
  test("validateLevel returns no errors for all 64 levels", () => {
    const failures = allLevels().flatMap((level) =>
      validateLevel(level).map((error) => `${level.id}: ${error}`),
    );

    expect(failures).toEqual([]);
  });

  test("standardAnswer completes with three stars for all 64 levels", () => {
    const failures: string[] = [];

    for (const level of allLevels()) {
      const run = simulate(level, level.standardAnswer);
      const score = scoreRun(level, level.standardAnswer, run);
      if (!run.completed) {
        failures.push(`${level.id}: ${run.failureReason ?? "incomplete"}`);
      } else if (score.stars !== 3) {
        failures.push(`${level.id}: ${score.stars} stars (${score.codeLength} code, ${score.steps} steps)`);
      }
    }

    expect(failures).toEqual([]);
  });

  test("lookup helpers follow world order", () => {
    const levels = allLevels();
    expect(levels[0]?.id).toBe("s01-c01-k01-l01");

    for (let i = 0; i < levels.length - 1; i += 1) {
      expect(nextLevelIdInWorld(levels[i]!.id)).toBe(levels[i + 1]!.id);
    }

    expect(nextLevelIdInWorld(levels[levels.length - 1]!.id)).toBeUndefined();
    expect(nextLevelIdInWorld("missing-level")).toBeUndefined();
    expect(findLevel("missing-level")).toBeUndefined();
    expect(findScene("missing-scene")).toBeUndefined();
    expect(findChapter("missing-chapter")).toBeUndefined();
  });
});
