import { countCommands } from "../domain/commands";
import type { Command, LevelSpec, RunResult, Score } from "../domain/types";

/**
 * Code length is the start event plus every command node in the program.
 * Loop bodies and both branches of an `if` count once, not per iteration.
 */
export function codeLength(program: Command[]): number {
  return 1 + countCommands(program);
}

/**
 * Turn a finished run into a score.
 *
 * One star for completing the level, one for staying within the par code
 * length, and one for staying within the par step count. Failed runs always
 * score zero stars and carry the run's failure reason.
 */
export function scoreRun(level: LevelSpec, program: Command[], run: RunResult): Score {
  const length = codeLength(program);
  const completed = run.completed;
  const stars =
    (completed ? 1 : 0) +
    (completed && length <= level.parCode ? 1 : 0) +
    (completed && run.steps <= level.parSteps ? 1 : 0);

  return {
    levelId: level.id,
    completed,
    codeLength: length,
    steps: run.steps,
    stars: stars as Score["stars"],
    collectedItemIds: [...run.collected],
    unpassableReason: run.failureReason,
  };
}
