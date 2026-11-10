import type {
  ChapterSpec,
  CheckpointSpec,
  LevelSpec,
  SceneSpec,
  WorldSpec,
} from "../../domain/types";
import { getStars } from "../../state/progress";
import type { StoredProgress } from "../../state/progress";

/** Aggregated progress for any group of levels. */
export interface ProgressSummary {
  /** Stars earned across the group. */
  stars: number;
  /** Stars available across the group (three per level). */
  maxStars: number;
  /** Levels with at least one star. */
  completed: number;
  /** Total levels in the group. */
  total: number;
  /** `stars / maxStars`, clamped to 0..1. */
  starRatio: number;
  /** `completed / total`, clamped to 0..1. */
  completionRatio: number;
}

function emptySummary(): ProgressSummary {
  return {
    stars: 0,
    maxStars: 0,
    completed: 0,
    total: 0,
    starRatio: 0,
    completionRatio: 0,
  };
}

/** Summarize an arbitrary collection of level ids without double counting. */
export function summarizeLevelIds(
  progress: StoredProgress,
  levelIds: Iterable<string>,
): ProgressSummary {
  const seen = new Set<string>();
  let stars = 0;
  let completed = 0;

  for (const levelId of levelIds) {
    if (seen.has(levelId)) continue;
    seen.add(levelId);
    const earned = getStars(progress, levelId);
    stars += earned;
    if (earned > 0) completed += 1;
  }

  const total = seen.size;
  const maxStars = total * 3;

  return {
    stars,
    maxStars,
    completed,
    total,
    starRatio: maxStars === 0 ? 0 : stars / maxStars,
    completionRatio: total === 0 ? 0 : completed / total,
  };
}

/** Summarize every level that belongs to a checkpoint. */
export function summarizeCheckpoint(
  progress: StoredProgress,
  checkpoint: CheckpointSpec,
): ProgressSummary {
  return summarizeLevelIds(progress, checkpoint.levelIds);
}

/** Summarize every level that belongs to a chapter. */
export function summarizeChapter(
  progress: StoredProgress,
  chapter: ChapterSpec,
): ProgressSummary {
  return summarizeLevelIds(
    progress,
    chapter.checkpoints.flatMap((checkpoint) => checkpoint.levelIds),
  );
}

/** Summarize every level that belongs to a scene. */
export function summarizeScene(progress: StoredProgress, scene: SceneSpec): ProgressSummary {
  return summarizeLevelIds(
    progress,
    scene.chapters.flatMap((chapter) =>
      chapter.checkpoints.flatMap((checkpoint) => checkpoint.levelIds),
    ),
  );
}

/** Summarize a set of levels. */
export function summarizeLevels(
  progress: StoredProgress,
  levels: readonly LevelSpec[],
): ProgressSummary {
  return summarizeLevelIds(
    progress,
    levels.map((level) => level.id),
  );
}

/** Summarize the complete world, including any level not listed on a map. */
export function summarizeWorld(progress: StoredProgress, world: WorldSpec): ProgressSummary {
  if (Object.keys(world.levels).length === 0) return emptySummary();
  return summarizeLevelIds(progress, Object.keys(world.levels));
}
