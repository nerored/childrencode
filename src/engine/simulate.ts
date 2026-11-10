import { cellKey, stepPoint, turnDirection } from "../domain/commands";
import type { Command, Condition, Direction, LevelSpec, Point, RunResult } from "../domain/types";
import { isWaterBlocked } from "./water";

/** Hard ceiling on movement and turn actions in a single run. */
const MAX_ACTIONS = 1000;

/** Hard ceiling on iterations of one `repeat` command. */
const MAX_REPEAT = 100;

/** Floor a count and clamp it to zero; non-finite values count as zero. */
function nonNegativeInteger(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return 0;
  }
  return Math.floor(value);
}

/**
 * Run a program against a level and report the full result.
 *
 * The agent starts on `level.start` facing `level.start.direction`. North is
 * screen-up (`y - 1`). A forward command moves one cell at a time; every
 * entered cell and every turn costs one step. A blocked move stops the run
 * immediately and leaves the agent on the last valid cell. At most 1000 steps
 * may execute; the 1001st is refused with `max-steps`.
 */
export function simulate(level: LevelSpec, program: Command[]): RunResult {
  const width = level.grid.width;
  const height = level.grid.height;
  const obstacleKeys = new Set(level.grid.obstacles.map(cellKey));
  const waterKeys = new Set((level.water ?? []).map(cellKey));
  const itemKeys = new Set(level.goal.items.map(cellKey));
  const collected = new Set<string>();
  const vars: Record<string, number> = {};
  const trace: RunResult["trace"] = [];

  let position: Point = { x: level.start.x, y: level.start.y };
  let direction: Direction = level.start.direction;
  let steps = 0;
  let failureReason: RunResult["failureReason"];

  const inside = (point: Point): boolean =>
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < width &&
    point.y < height;

  const isObstacle = (point: Point): boolean => obstacleKeys.has(cellKey(point));

  const nextCell = (): Point => stepPoint(position, direction);

  /** Reserve one action; returns false (and fails the run) at the cap. */
  const spendStep = (): boolean => {
    if (steps >= MAX_ACTIONS) {
      failureReason = "max-steps";
      return false;
    }
    steps += 1;
    return true;
  };

  const conditionHolds = (condition: Condition): boolean => {
    switch (condition.kind) {
      case "pathAhead": {
        const next = nextCell();
        return inside(next) && !isObstacle(next);
      }
      case "itemAhead": {
        const key = cellKey(nextCell());
        return itemKeys.has(key) && !collected.has(key);
      }
      case "varAtLeast":
        return (vars[condition.name] ?? 0) >= condition.value;
    }
  };

  /** Execute a command list; returns false as soon as the run must stop. */
  const execute = (commands: Command[]): boolean => {
    for (const command of commands) {
      if (failureReason !== undefined) {
        return false;
      }

      switch (command.kind) {
        case "forward": {
          const count = nonNegativeInteger(command.steps);
          for (let i = 0; i < count; i += 1) {
            const next = nextCell();
            if (!inside(next)) {
              failureReason = "out-of-bounds";
              return false;
            }
            if (isObstacle(next)) {
              failureReason = "obstacle";
              return false;
            }
            if (isWaterBlocked(level, waterKeys, next)) {
              failureReason = "water";
              return false;
            }
            if (!spendStep()) {
              return false;
            }
            position = next;
            trace.push({ action: "forward", position: { ...position }, direction });
            const key = cellKey(position);
            if (itemKeys.has(key)) {
              collected.add(key);
            }
          }
          break;
        }

        case "turn": {
          if (!spendStep()) {
            return false;
          }
          direction = turnDirection(direction, command.direction);
          trace.push({
            action: command.direction === "left" ? "turn-left" : "turn-right",
            position: { ...position },
            direction,
          });
          break;
        }

        case "repeat": {
          const times = Math.min(MAX_REPEAT, nonNegativeInteger(command.times));
          for (let i = 0; i < times; i += 1) {
            if (!execute(command.body)) {
              return false;
            }
          }
          break;
        }

        case "if": {
          const branch = conditionHolds(command.condition) ? command.then : command.else;
          if (branch !== undefined && !execute(branch)) {
            return false;
          }
          break;
        }

        case "setVar":
          vars[command.name] = command.value;
          break;

        case "changeVar":
          vars[command.name] = (vars[command.name] ?? 0) + command.delta;
          break;
      }
    }

    return true;
  };

  execute(program);

  if (failureReason === undefined) {
    const target: Point | undefined = level.goal.target;
    const reachedTarget = target === undefined || (position.x === target.x && position.y === target.y);
    const collectedAll = [...itemKeys].every((key) => collected.has(key));
    if (!reachedTarget || !collectedAll) {
      failureReason = "incomplete";
    }
  }

  const result: RunResult = {
    completed: failureReason === undefined,
    collected: [...collected].sort(),
    steps,
    trace,
    final: { ...position, direction },
    vars: { ...vars },
  };

  if (failureReason !== undefined) {
    result.failureReason = failureReason;
  }

  return result;
}
