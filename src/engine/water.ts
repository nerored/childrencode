import type { LevelSpec, Point } from "../domain/types";

/** X of the frozen lane crossing row `y`, or -1 when the row has no river. */
export function frozenLane(level: LevelSpec, y: number): number {
  for (const cell of level.water ?? []) {
    if (cell.y === y) {
      return cell.x;
    }
  }
  return -1;
}

/** True when `point` is open water rather than a cell of the frozen lane. */
export function isWaterBlocked(level: LevelSpec, waterKeys: ReadonlySet<string>, point: Point): boolean {
  const key = point.x + "," + point.y;
  if (!waterKeys.has(key)) {
    return false;
  }
  return frozenLane(level, point.y) !== point.x;
}
