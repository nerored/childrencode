import { describe, expect, test } from "bun:test";
import type { ChapterSpec, LevelSpec, SceneSpec } from "../domain/types";
import { codeLength, scoreRun } from "../engine/score";
import { simulate } from "../engine/simulate";
import { validateLevel } from "../engine/validate";
import { WORLD, allLevels } from "./world";


/** Only Han characters count toward the 4-8 character title rule. */
const TITLE_PATTERN = /^[\u4e00-\u9fff]{4,8}$/;

function chapterLevels(chapter: ChapterSpec): LevelSpec[] {
  return chapter.checkpoints.flatMap((checkpoint) =>
    checkpoint.levelIds
      .map((levelId) => WORLD.levels[levelId])
      .filter((level): level is LevelSpec => level !== undefined),
  );
}

function sceneLevels(scene: SceneSpec): LevelSpec[] {
  return scene.chapters.flatMap(chapterLevels);
}

describe("world levels", () => {
  test("WORLD contains exactly 64 levels", () => {
    expect(allLevels()).toHaveLength(64);
    expect(Object.keys(WORLD.levels)).toHaveLength(64);
  });

  test("every level passes validateLevel with no errors", () => {
    const failures = allLevels().flatMap((level) =>
      validateLevel(level).map((error) => `${level.id}: ${error}`),
    );

    expect(failures).toEqual([]);
  });

  test("every standardAnswer completes and earns three stars", () => {
    const failures: string[] = [];

    for (const level of allLevels()) {
      const run = simulate(level, level.standardAnswer);
      const score = scoreRun(level, level.standardAnswer, run);
      if (!run.completed) {
        failures.push(`${level.id}: standardAnswer did not complete (${run.failureReason ?? "incomplete"})`);
      } else if (score.stars !== 3) {
        failures.push(`${level.id}: standardAnswer earned ${score.stars} stars`);
      }
    }

    expect(failures).toEqual([]);
  });

  test("parCode and parSteps exactly match the standard answer", () => {
    const failures: string[] = [];

    for (const level of allLevels()) {
      const expectedCode = codeLength(level.standardAnswer);
      const expectedSteps = simulate(level, level.standardAnswer).steps;
      if (level.parCode !== expectedCode) {
        failures.push(`${level.id}: parCode ${level.parCode} !== ${expectedCode}`);
      }
      if (level.parSteps !== expectedSteps) {
        failures.push(`${level.id}: parSteps ${level.parSteps} !== ${expectedSteps}`);
      }
    }

    expect(failures).toEqual([]);
  });

  test("every level title is 4-8 Chinese characters", () => {
    const failures = allLevels()
      .filter((level) => !TITLE_PATTERN.test(level.title))
      .map((level) => `${level.id}: "${level.title}"`);

    expect(failures).toEqual([]);
  });

  test("the two levels inside every checkpoint have different titles", () => {
    const failures: string[] = [];

    for (const scene of WORLD.scenes) {
      for (const chapter of scene.chapters) {
        for (const checkpoint of chapter.checkpoints) {
          const titles = checkpoint.levelIds.map((levelId) => WORLD.levels[levelId]?.title);
          if (titles.length !== 2 || titles[0] === titles[1]) {
            failures.push(`${checkpoint.id}: ${JSON.stringify(titles)}`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });

  test("every level and scene title is unique inside the project", () => {
    const seen = new Set<string>();
    const failures: string[] = [];

    for (const scene of WORLD.scenes) {
      if (seen.has(scene.name)) failures.push(`scene ${scene.id}: "${scene.name}"`);
      seen.add(scene.name);
      for (const chapter of scene.chapters) {
        for (const level of chapterLevels(chapter)) {
          if (seen.has(level.title)) failures.push(`level ${level.id}: "${level.title}"`);
          seen.add(level.title);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  test("every scene has two chapters and sixteen levels", () => {
    const failures: string[] = [];

    for (const scene of WORLD.scenes) {
      if (scene.chapters.length !== 2) {
        failures.push(`${scene.id}: ${scene.chapters.length} chapters`);
      }
      const levels = sceneLevels(scene);
      if (levels.length !== 16) {
        failures.push(`${scene.id}: ${levels.length} levels`);
      }
    }

    expect(failures).toEqual([]);
  });

  test("every chapter has four checkpoints and eight levels", () => {
    const failures: string[] = [];

    for (const scene of WORLD.scenes) {
      for (const chapter of scene.chapters) {
        if (chapter.checkpoints.length !== 4) {
          failures.push(`${chapter.id}: ${chapter.checkpoints.length} checkpoints`);
        }
        const levels = chapterLevels(chapter);
        if (levels.length !== 8) {
          failures.push(`${chapter.id}: ${levels.length} levels`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
