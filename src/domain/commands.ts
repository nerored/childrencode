import type { Command, CommandKind, Condition, Direction, Point } from "./types";

/** Unit movement vectors for every heading, in screen coordinates. */
export const DIRECTIONS: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  south: { dx: 0, dy: 1 },
  west: { dx: -1, dy: 0 },
};

const TURN_ORDER: readonly Direction[] = ["north", "east", "south", "west"];

/** Rotate a heading 90 degrees left or right. */
export function turnDirection(direction: Direction, turn: "left" | "right"): Direction {
  const index = TURN_ORDER.indexOf(direction);
  const offset = turn === "left" ? -1 : 1;
  return TURN_ORDER[(index + offset + TURN_ORDER.length) % TURN_ORDER.length];
}

/** Return the heading directly behind `direction`. */
export function oppositeDirection(direction: Direction): Direction {
  return TURN_ORDER[(TURN_ORDER.indexOf(direction) + 2) % TURN_ORDER.length];
}

/** Return the adjacent cell one step in the given direction. */
export function stepPoint(point: Point, direction: Direction): Point {
  const { dx, dy } = DIRECTIONS[direction];
  return { x: point.x + dx, y: point.y + dy };
}

/** Stable map key for a cell, formatted exactly as "x,y". */
export function cellKey(point: Point): string {
  return `${point.x},${point.y}`;
}

const COMMAND_KINDS: readonly CommandKind[] = [
  "forward",
  "turn",
  "repeat",
  "if",
  "setVar",
  "changeVar",
];

/** Narrow an arbitrary string to a known command discriminant. */
export function isCommandKind(value: string): value is CommandKind {
  return (COMMAND_KINDS as readonly string[]).includes(value);
}

/**
 * Count every command node in a program, including both branches of an `if`
 * and the body of a `repeat`. Loop iterations are not multiplied.
 */
export function countCommands(commands: Command[]): number {
  let count = 0;
  for (const command of commands) {
    count += 1;
    if (command.kind === "repeat") {
      count += countCommands(command.body);
    } else if (command.kind === "if") {
      count += countCommands(command.then);
      if (command.else) {
        count += countCommands(command.else);
      }
    }
  }
  return count;
}

function formatCondition(condition: Condition): string {
  switch (condition.kind) {
    case "pathAhead":
      return "coder.pathAhead()";
    case "itemAhead":
      return "coder.itemAhead()";
    case "varAtLeast":
      return `${condition.name} >= ${condition.value}`;
  }
}

function formatCommands(commands: Command[], depth: number): string[] {
  const indent = "  ".repeat(depth);
  const lines: string[] = [];

  for (const command of commands) {
    switch (command.kind) {
      case "forward":
        lines.push(
          `${indent}coder.${command.direction === "backward" ? "backward" : "forward"}(${command.steps})`,
        );
        break;
      case "turn":
        lines.push(`${indent}coder.${command.direction === "left" ? "turnLeft" : "turnRight"}()`);
        break;
      case "repeat":
        lines.push(`${indent}repeat(${command.times}):`);
        lines.push(...formatCommands(command.body, depth + 1));
        break;
      case "if":
        lines.push(`${indent}if ${formatCondition(command.condition)}:`);
        lines.push(...formatCommands(command.then, depth + 1));
        if (command.else) {
          lines.push(`${indent}else:`);
          lines.push(...formatCommands(command.else, depth + 1));
        }
        break;
      case "setVar":
        lines.push(`${indent}${command.name} = ${command.value}`);
        break;
      case "changeVar":
        lines.push(`${indent}${command.name} += ${command.delta}`);
        break;
    }
  }

  return lines;
}

/** Render a program as the Python-like DSL used by the text track. */
export function formatTextProgram(program: Command[]): string {
  return formatCommands(program, 0).join("\n");
}
