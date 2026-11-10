import { cellKey, stepPoint } from "../domain/commands";
import type { LevelSpec, Point, ScenePack } from "../domain/types";
import { codeLength } from "./score";
import { simulate } from "./simulate";

const LEVEL_ID_PATTERN = /^s\d{2}-c\d{2}-k\d{2}-l\d{2}$/;
const MIN_GRID = 5;
const MAX_GRID = 8;

function isInsideGrid(level: LevelSpec, point: Point): boolean {
  return (
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < level.grid.width &&
    point.y < level.grid.height
  );
}

function isNonEmpty(text: unknown): boolean {
  return typeof text === "string" && text.trim().length > 0;
}

/** Flood fill through non-obstacle cells starting at the level's start cell. */
function reachableCells(level: LevelSpec): Set<string> {
  const obstacles = new Set(level.grid.obstacles.map(cellKey));
  const visited = new Set<string>();
  const start: Point = { x: level.start.x, y: level.start.y };

  if (!isInsideGrid(level, start)) {
    return visited;
  }

  const queue: Point[] = [start];
  visited.add(cellKey(start));

  while (queue.length > 0) {
    const current = queue.shift() as Point;
    for (const direction of ["north", "east", "south", "west"] as const) {
      const next = stepPoint(current, direction);
      if (!isInsideGrid(level, next)) {
        continue;
      }
      const key = cellKey(next);
      if (visited.has(key) || obstacles.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push(next);
    }
  }

  return visited;
}

/**
 * Validate one level definition and return human-readable problems.
 * An empty array means the level is well formed and its standard answer works.
 */
export function validateLevel(level: LevelSpec): string[] {
  const errors: string[] = [];

  if (!LEVEL_ID_PATTERN.test(level.id)) {
    errors.push(`id must match sNN-cNN-kNN-lNN (found "${level.id}")`);
  }

  if (!Number.isInteger(level.grid.width) || level.grid.width < MIN_GRID || level.grid.width > MAX_GRID) {
    errors.push(`grid width must be between ${MIN_GRID} and ${MAX_GRID} (found ${level.grid.width})`);
  }

  if (!Number.isInteger(level.grid.height) || level.grid.height < MIN_GRID || level.grid.height > MAX_GRID) {
    errors.push(`grid height must be between ${MIN_GRID} and ${MAX_GRID} (found ${level.grid.height})`);
  }

  if (!isInsideGrid(level, level.start)) {
    errors.push(`start ${cellKey(level.start)} must be inside the grid`);
  }

  if (!isInsideGrid(level, level.goal.target)) {
    errors.push(`target ${cellKey(level.goal.target)} must be inside the grid`);
  }

  const obstacleKeys = new Set(level.grid.obstacles.map(cellKey));
  if (obstacleKeys.has(cellKey(level.start))) {
    errors.push(`start ${cellKey(level.start)} must not be an obstacle`);
  }

  for (const item of level.goal.items) {
    if (!isInsideGrid(level, item)) {
      errors.push(`item ${cellKey(item)} must be inside the grid`);
    }
  }

  for (const obstacle of level.grid.obstacles) {
    if (!isInsideGrid(level, obstacle)) {
      errors.push(`obstacle ${cellKey(obstacle)} must be inside the grid`);
    }
  }

  if (!isNonEmpty(level.brief)) {
    errors.push("brief must not be empty");
  }
  if (!isNonEmpty(level.title)) {
    errors.push("title must not be empty");
  }
  if (!isNonEmpty(level.hint)) {
    errors.push("hint must not be empty");
  }

  if (level.standardAnswer.length === 0) {
    errors.push("standardAnswer must not be empty");
  }

  const run = simulate(level, level.standardAnswer);
  if (!run.completed) {
    errors.push(`standardAnswer does not complete the level (${run.failureReason ?? "incomplete"})`);
  }

  const expectedCode = codeLength(level.standardAnswer);
  if (level.parCode !== expectedCode) {
    errors.push(`parCode must equal the standardAnswer code length (expected ${expectedCode}, found ${level.parCode})`);
  }

  if (level.parSteps !== run.steps) {
    errors.push(`parSteps must equal the standardAnswer step count (expected ${run.steps}, found ${level.parSteps})`);
  }

  const reachable = reachableCells(level);
  for (const item of level.goal.items) {
    if (!reachable.has(cellKey(item))) {
      errors.push(`item ${cellKey(item)} is not reachable from start`);
    }
  }

  return errors;
}

/**
 * Validate a scene pack: chapter/checkpoint shape, level ids unique and owned
 * by the right checkpoint, and every referenced level itself valid.
 */
export function validateScene(pack: ScenePack): string[] {
  const errors: string[] = [];
  const { scene, levels } = pack;

  if (scene.chapters.length !== 2) {
    errors.push(`scene must have exactly 2 chapters (found ${scene.chapters.length})`);
  }

  const levelsById = new Map<string, LevelSpec>();
  for (const level of levels) {
    if (levelsById.has(level.id)) {
      errors.push(`level id "${level.id}" is duplicated in the scene pack`);
    } else {
      levelsById.set(level.id, level);
    }
  }

  const seenLevelIds = new Set<string>();
  const referencedLevelIds = new Set<string>();

  for (const chapter of scene.chapters) {
    if (chapter.sceneId !== scene.id) {
      errors.push(`chapter "${chapter.id}" does not belong to scene "${scene.id}"`);
    }
    if (chapter.checkpoints.length !== 4) {
      errors.push(`chapter "${chapter.id}" must have exactly 4 checkpoints (found ${chapter.checkpoints.length})`);
    }

    for (const checkpoint of chapter.checkpoints) {
      if (checkpoint.chapterId !== chapter.id) {
        errors.push(`checkpoint "${checkpoint.id}" does not belong to chapter "${chapter.id}"`);
      }
      if (checkpoint.levelIds.length !== 2) {
        errors.push(`checkpoint "${checkpoint.id}" must have exactly 2 level ids (found ${checkpoint.levelIds.length})`);
      }

      for (const levelId of checkpoint.levelIds) {
        if (seenLevelIds.has(levelId)) {
          errors.push(`level id "${levelId}" is referenced more than once`);
        }
        seenLevelIds.add(levelId);
        referencedLevelIds.add(levelId);

        const level = levelsById.get(levelId);
        if (level === undefined) {
          errors.push(`level "${levelId}" from checkpoint "${checkpoint.id}" is missing from the scene pack`);
          continue;
        }
        if (level.checkpointId !== checkpoint.id) {
          errors.push(`level "${levelId}" does not belong to checkpoint "${checkpoint.id}"`);
        }
        if (level.chapterId !== chapter.id) {
          errors.push(`level "${levelId}" does not belong to chapter "${chapter.id}"`);
        }
        if (level.sceneId !== scene.id) {
          errors.push(`level "${levelId}" does not belong to scene "${scene.id}"`);
        }
      }
    }
  }

  for (const level of levels) {
    if (!referencedLevelIds.has(level.id)) {
      errors.push(`level "${level.id}" is not referenced by any checkpoint`);
    }
    for (const error of validateLevel(level)) {
      errors.push(`level "${level.id}": ${error}`);
    }
  }

  return errors;
}
