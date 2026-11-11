import type { Command, Condition } from "../domain/types";

interface TextLine {
  line: number;
  depth: number;
  text: string;
}

class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

const FORWARD = /^coder\.forward\(\s*(-?\d+)\s*\)$/;
const BACKWARD = /^coder\.backward\(\s*(-?\d+)\s*\)$/;
const REPEAT = /^repeat\(\s*(-?\d+)\s*\):$/;
const IF_VAR = /^if\s+([A-Za-z_][A-Za-z0-9_]*)\s*>=\s*(-?\d+):$/;
const CHANGE_VAR = /^([A-Za-z_][A-Za-z0-9_]*)\s*\+=\s*(-?\d+)$/;
const SET_VAR = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(-?\d+)$/;

function tokenize(source: string): TextLine[] | string {
  const lines: TextLine[] = [];
  const rawLines = source.split(/\r?\n/);

  for (let i = 0; i < rawLines.length; i += 1) {
    const line = i + 1;
    const withoutComment = rawLines[i].split("//")[0];
    const trimmed = withoutComment.replace(/\s+$/, "");
    if (trimmed.trim().length === 0) {
      continue;
    }

    const leading = /^[ \t]*/.exec(trimmed)?.[0] ?? "";
    if (leading.includes("\t")) {
      return `Line ${line}: indentation must use spaces`;
    }
    if (leading.length % 2 !== 0) {
      return `Line ${line}: indentation must use 2 spaces per level`;
    }

    const text = trimmed.slice(leading.length);
    if (text.length === 0) {
      continue;
    }

    lines.push({ line, depth: leading.length / 2, text });
  }

  return lines;
}

/**
 * Parse the Python-like text DSL documented by `formatTextProgram`.
 *
 * On success the result holds the command tree; on failure `program` is empty
 * and `error` names the offending line.
 */
export function parseTextProgram(source: string): { program: Command[]; error?: string } {
  const tokenized = tokenize(source);
  if (typeof tokenized === "string") {
    return { program: [], error: tokenized };
  }

  const lines = tokenized;
  let index = 0;

  function fail(line: number, message: string): never {
    throw new ParseError(`Line ${line}: ${message}`);
  }

  const toInt = (value: string, line: number): number => {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
      fail(line, `number out of range: ${value}`);
    }
    return parsed;
  };

  function parseBlock(depth: number): Command[] {
    const commands: Command[] = [];

    while (index < lines.length) {
      const current = lines[index];
      if (current.depth < depth) {
        break;
      }
      if (current.depth > depth) {
        fail(current.line, "unexpected indentation");
      }
      commands.push(parseStatement(depth));
    }

    return commands;
  }

  function parseBody(depth: number, header: TextLine, label: string): Command[] {
    const next = lines[index];
    if (next === undefined || next.depth <= depth) {
      fail(header.line, `missing body for ${label}`);
    }
    if (next.depth > depth + 1) {
      fail(next.line, "unexpected indentation");
    }
    return parseBlock(depth + 1);
  }

  function parseCondition(text: string, line: number): Condition | undefined {
    if (text === "if coder.pathAhead():") {
      return { kind: "pathAhead" };
    }
    if (text === "if coder.itemAhead():") {
      return { kind: "itemAhead" };
    }
    const comparison = IF_VAR.exec(text);
    if (comparison !== null) {
      return {
        kind: "varAtLeast",
        name: comparison[1],
        value: toInt(comparison[2], line),
      };
    }
    return undefined;
  }

  function parseStatement(depth: number): Command {
    const current = lines[index];
    if (current.depth !== depth) {
      fail(current.line, "unexpected indentation");
    }
    const text = current.text;

    const forward = FORWARD.exec(text);
    if (forward !== null) {
      index += 1;
      return { kind: "forward", steps: toInt(forward[1], current.line) };
    }

    const backward = BACKWARD.exec(text);
    if (backward !== null) {
      index += 1;
      return {
        kind: "forward",
        steps: toInt(backward[1], current.line),
        direction: "backward",
      };
    }

    if (text === "coder.turnLeft()") {
      index += 1;
      return { kind: "turn", direction: "left" };
    }

    if (text === "coder.turnRight()") {
      index += 1;
      return { kind: "turn", direction: "right" };
    }

    const repeat = REPEAT.exec(text);
    if (repeat !== null) {
      const times = toInt(repeat[1], current.line);
      index += 1;
      const body = parseBody(depth, current, "repeat");
      return { kind: "repeat", times, body };
    }

    const condition = parseCondition(text, current.line);
    if (condition !== undefined) {
      index += 1;
      const then = parseBody(depth, current, "if");
      let elseBranch: Command[] | undefined;
      const next = lines[index];
      if (next !== undefined && next.depth === depth && next.text === "else:") {
        index += 1;
        elseBranch = parseBody(depth, next, "else");
      }
      return elseBranch === undefined
        ? { kind: "if", condition, then }
        : { kind: "if", condition, then, else: elseBranch };
    }

    if (text === "else:") {
      fail(current.line, "'else:' without a matching 'if'");
    }

    const change = CHANGE_VAR.exec(text);
    if (change !== null) {
      index += 1;
      return { kind: "changeVar", name: change[1], delta: toInt(change[2], current.line) };
    }

    const set = SET_VAR.exec(text);
    if (set !== null) {
      index += 1;
      return { kind: "setVar", name: set[1], value: toInt(set[2], current.line) };
    }

    fail(current.line, `unknown syntax: ${text}`);
  }

  try {
    const program = parseBlock(0);
    return { program };
  } catch (error) {
    if (error instanceof ParseError) {
      return { program: [], error: error.message };
    }
    throw error;
  }
}
