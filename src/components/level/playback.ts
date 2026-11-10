import { cellKey } from "../../domain/commands";
import type { Direction, LevelSpec, Point, RunResult } from "../../domain/types";

/**
 * One still frame of a run: where the rover is, how it faces, and what the
 * board has accumulated by that point. Frame 0 is the start pose, so a run
 * with N trace entries produces N + 1 frames.
 */
export interface StageFrame {
  index: number;
  position: Point;
  direction: Direction;
  visited: string[];
  rescued: string[];
  steps: number;
  action: string | null;
  done: boolean;
}

/** Delay between two playback frames. */
export const PLAYBACK_STEP_MS = 280;

/** Pause on the final frame before the result modal opens. */
export const PLAYBACK_END_DELAY_MS = 240;

/**
 * Derive playback frames from a simulated run.
 *
 * Visited cells keep first-visit order with the start cell first. Collected
 * items are counted from cells the trace actually enters (never from the start
 * cell, and never from the run's global `collected` list), so the stage fills
 * in progressively even when the run ends early.
 */
export function buildPlaybackFrames(level: LevelSpec, run: RunResult): StageFrame[] {
  const itemKeys = new Set(level.goal.items.map(cellKey));
  const startKey = cellKey(level.start);
  const visited: string[] = [startKey];
  const visitedKeys = new Set(visited);
  const collected = new Set<string>();

  const frames: StageFrame[] = [
    {
      index: 0,
      position: { x: level.start.x, y: level.start.y },
      direction: level.start.direction,
      visited: [...visited],
      rescued: [],
      steps: 0,
      action: null,
      done: run.trace.length === 0,
    },
  ];

  for (let i = 0; i < run.trace.length; i += 1) {
    const entry = run.trace[i];
    const key = cellKey(entry.position);

    if (!visitedKeys.has(key)) {
      visitedKeys.add(key);
      visited.push(key);
    }

    // Only a forward action enters a cell. Turns repeat the current cell and
    // must not retroactively collect an item that sits on the start cell.
    if (entry.action === "forward" && key !== startKey && itemKeys.has(key)) {
      collected.add(key);
    }

    frames.push({
      index: i + 1,
      position: { ...entry.position },
      direction: entry.direction,
      visited: [...visited],
      rescued: [...collected].sort(),
      steps: i + 1,
      action: entry.action,
      done: i + 1 === run.trace.length,
    });
  }

  return frames;
}
