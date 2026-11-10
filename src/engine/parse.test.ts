import { describe, expect, test } from "bun:test";
import { formatTextProgram } from "../domain/commands";
import type { Command } from "../domain/types";
import { parseTextProgram } from "./parse";

describe("parseTextProgram", () => {
  test("parses movement, turns, and variables", () => {
    const result = parseTextProgram(
      [
        "coins = 3",
        "coins += 2",
        "coder.forward(2)",
        "coder.turnLeft()",
        "coder.turnRight()",
      ].join("\n"),
    );

    expect(result.error).toBeUndefined();
    expect(result.program).toEqual([
      { kind: "setVar", name: "coins", value: 3 },
      { kind: "changeVar", name: "coins", delta: 2 },
      { kind: "forward", steps: 2 },
      { kind: "turn", direction: "left" },
      { kind: "turn", direction: "right" },
    ]);
  });

  test("ignores blank lines, comments, and trailing comments", () => {
    const result = parseTextProgram(
      ["// move east", "", "coder.forward(1) // one step", "   ", "coder.turnRight()", "// done"].join("\n"),
    );

    expect(result.error).toBeUndefined();
    expect(result.program).toEqual([
      { kind: "forward", steps: 1 },
      { kind: "turn", direction: "right" },
    ]);
  });

  test("parses path and item conditions", () => {
    const result = parseTextProgram(
      [
        "if coder.pathAhead():",
        "  coder.forward(1)",
        "if coder.itemAhead():",
        "  coder.forward(1)",
      ].join("\n"),
    );

    expect(result.error).toBeUndefined();
    expect(result.program).toEqual([
      {
        kind: "if",
        condition: { kind: "pathAhead" },
        then: [{ kind: "forward", steps: 1 }],
      },
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [{ kind: "forward", steps: 1 }],
      },
    ]);
  });

  test("parses nested blocks and else branches", () => {
    const result = parseTextProgram(
      [
        "repeat(2):",
        "  if coder.pathAhead():",
        "    coder.forward(1)",
        "  else:",
        "    coder.turnLeft()",
        "  coins += 1",
      ].join("\n"),
    );

    expect(result.error).toBeUndefined();
    expect(result.program).toEqual([
      {
        kind: "repeat",
        times: 2,
        body: [
          {
            kind: "if",
            condition: { kind: "pathAhead" },
            then: [{ kind: "forward", steps: 1 }],
            else: [{ kind: "turn", direction: "left" }],
          },
          { kind: "changeVar", name: "coins", delta: 1 },
        ],
      },
    ]);
  });

  test("parses variable comparisons with negative numbers", () => {
    const result = parseTextProgram(
      [
        "if coins >= 2:",
        "  coins += -1",
        "if lives >= -1:",
        "  lives = -2",
      ].join("\n"),
    );

    expect(result.error).toBeUndefined();
    expect(result.program).toEqual([
      {
        kind: "if",
        condition: { kind: "varAtLeast", name: "coins", value: 2 },
        then: [{ kind: "changeVar", name: "coins", delta: -1 }],
      },
      {
        kind: "if",
        condition: { kind: "varAtLeast", name: "lives", value: -1 },
        then: [{ kind: "setVar", name: "lives", value: -2 }],
      },
    ]);
  });

  test("round-trips formatTextProgram output", () => {
    const program: Command[] = [
      { kind: "forward", steps: 3 },
      { kind: "turn", direction: "left" },
      {
        kind: "repeat",
        times: 2,
        body: [
          { kind: "forward", steps: 1 },
          {
            kind: "if",
            condition: { kind: "itemAhead" },
            then: [{ kind: "forward", steps: 1 }],
            else: [{ kind: "turn", direction: "right" }],
          },
        ],
      },
      {
        kind: "if",
        condition: { kind: "varAtLeast", name: "coins", value: 2 },
        then: [
          { kind: "setVar", name: "coins", value: 0 },
          { kind: "changeVar", name: "coins", delta: -1 },
        ],
      },
      { kind: "setVar", name: "lives", value: -1 },
    ];

    const result = parseTextProgram(formatTextProgram(program));

    expect(result.error).toBeUndefined();
    expect(result.program).toEqual(program);
  });

  test("returns an empty program for empty input", () => {
    const result = parseTextProgram("");
    expect(result.error).toBeUndefined();
    expect(result.program).toEqual([]);
  });

  describe("errors", () => {
    test("reports unknown syntax with its line number", () => {
      const result = parseTextProgram("coder.forward(1)\ncoder.jump()");
      expect(result.program).toEqual([]);
      expect(result.error).toBe("Line 2: unknown syntax: coder.jump()");
    });

    test("reports bad indentation", () => {
      const result = parseTextProgram("repeat(2):\n   coder.forward(1)");
      expect(result.program).toEqual([]);
      expect(result.error).toBe("Line 2: indentation must use 2 spaces per level");
    });

    test("reports tab indentation", () => {
      const result = parseTextProgram("repeat(2):\n\tcoder.forward(1)");
      expect(result.error).toBe("Line 2: indentation must use spaces");
    });

    test("reports a top-level indent", () => {
      const result = parseTextProgram("  coder.forward(1)");
      expect(result.error).toBe("Line 1: unexpected indentation");
    });

    test("reports a missing loop body", () => {
      const result = parseTextProgram("repeat(2):");
      expect(result.error).toBe("Line 1: missing body for repeat");
    });

    test("reports a missing if body", () => {
      const result = parseTextProgram("if coder.pathAhead():");
      expect(result.error).toBe("Line 1: missing body for if");
    });

    test("reports a missing else body", () => {
      const result = parseTextProgram(["if coder.pathAhead():", "  coder.forward(1)", "else:"].join("\n"));
      expect(result.error).toBe("Line 3: missing body for else");
    });

    test("reports an else without a matching if", () => {
      const result = parseTextProgram("else:\n  coder.forward(1)");
      expect(result.error).toBe("Line 1: 'else:' without a matching 'if'");
    });

    test("reports malformed forward arguments as unknown syntax", () => {
      const result = parseTextProgram("coder.forward(two)");
      expect(result.error).toBe("Line 1: unknown syntax: coder.forward(two)");
    });
  });
});
