import { describe, expect, test } from "bun:test";
import {
  DIRECTIONS,
  cellKey,
  countCommands,
  formatTextProgram,
  isCommandKind,
  oppositeDirection,
  stepPoint,
  turnDirection,
} from "./commands";
import type { Command, CommandKind } from "./types";

describe("DIRECTIONS", () => {
  test("uses screen coordinates with north pointing up", () => {
    expect(DIRECTIONS).toEqual({
      north: { dx: 0, dy: -1 },
      east: { dx: 1, dy: 0 },
      south: { dx: 0, dy: 1 },
      west: { dx: -1, dy: 0 },
    });
  });
});

describe("turnDirection", () => {
  test("turns left from every heading", () => {
    expect(turnDirection("north", "left")).toBe("west");
    expect(turnDirection("west", "left")).toBe("south");
    expect(turnDirection("south", "left")).toBe("east");
    expect(turnDirection("east", "left")).toBe("north");
  });

  test("turns right from every heading", () => {
    expect(turnDirection("north", "right")).toBe("east");
    expect(turnDirection("east", "right")).toBe("south");
    expect(turnDirection("south", "right")).toBe("west");
    expect(turnDirection("west", "right")).toBe("north");
  });
});

describe("oppositeDirection", () => {
  test("returns the heading directly behind each direction", () => {
    expect(oppositeDirection("north")).toBe("south");
    expect(oppositeDirection("east")).toBe("west");
    expect(oppositeDirection("south")).toBe("north");
    expect(oppositeDirection("west")).toBe("east");
  });
});

describe("stepPoint", () => {
  test("moves one cell in each direction", () => {
    const origin = { x: 2, y: 3 };
    expect(stepPoint(origin, "north")).toEqual({ x: 2, y: 2 });
    expect(stepPoint(origin, "east")).toEqual({ x: 3, y: 3 });
    expect(stepPoint(origin, "south")).toEqual({ x: 2, y: 4 });
    expect(stepPoint(origin, "west")).toEqual({ x: 1, y: 3 });
  });

  test("does not mutate the input point", () => {
    const origin = { x: 0, y: 0 };
    stepPoint(origin, "south");
    expect(origin).toEqual({ x: 0, y: 0 });
  });
});

describe("cellKey", () => {
  test("formats coordinates as x,y", () => {
    expect(cellKey({ x: 3, y: 4 })).toBe("3,4");
    expect(cellKey({ x: -2, y: 0 })).toBe("-2,0");
  });
});

describe("isCommandKind", () => {
  test("accepts every command kind", () => {
    const kinds: CommandKind[] = ["forward", "turn", "repeat", "if", "setVar", "changeVar"];
    for (const kind of kinds) {
      expect(isCommandKind(kind)).toBe(true);
    }
  });

  test("rejects unknown values", () => {
    expect(isCommandKind("jump")).toBe(false);
    expect(isCommandKind("")).toBe(false);
    expect(isCommandKind("Forward")).toBe(false);
  });
});

describe("countCommands", () => {
  test("counts every node without multiplying loop bodies", () => {
    const program: Command[] = [
      { kind: "forward", steps: 2 },
      {
        kind: "repeat",
        times: 3,
        body: [
          { kind: "turn", direction: "right" },
          { kind: "forward", steps: 1 },
        ],
      },
      {
        kind: "if",
        condition: { kind: "itemAhead" },
        then: [{ kind: "forward", steps: 1 }],
        else: [{ kind: "setVar", name: "coins", value: 1 }],
      },
    ];

    expect(countCommands(program)).toBe(7);
  });

  test("counts nested blocks and optional else branches", () => {
    const program: Command[] = [
      {
        kind: "if",
        condition: { kind: "pathAhead" },
        then: [
          {
            kind: "repeat",
            times: 2,
            body: [{ kind: "forward", steps: 1 }],
          },
        ],
      },
      { kind: "changeVar", name: "coins", delta: -1 },
    ];

    // if + repeat + forward + changeVar
    expect(countCommands(program)).toBe(4);
  });

  test("returns zero for an empty program", () => {
    expect(countCommands([])).toBe(0);
  });
});

describe("formatTextProgram", () => {
  test("renders commands, loops, conditions, and variables", () => {
    const program: Command[] = [
      { kind: "forward", steps: 3 },
      { kind: "turn", direction: "left" },
      {
        kind: "repeat",
        times: 2,
        body: [
          { kind: "forward", steps: 1 },
          { kind: "turn", direction: "right" },
        ],
      },
      {
        kind: "if",
        condition: { kind: "pathAhead" },
        then: [{ kind: "forward", steps: 1 }],
        else: [{ kind: "turn", direction: "right" }],
      },
      {
        kind: "if",
        condition: { kind: "varAtLeast", name: "coins", value: 2 },
        then: [
          { kind: "setVar", name: "coins", value: 0 },
          { kind: "changeVar", name: "coins", delta: 1 },
        ],
      },
    ];

    expect(formatTextProgram(program)).toBe(
      [
        "coder.forward(3)",
        "coder.turnLeft()",
        "repeat(2):",
        "  coder.forward(1)",
        "  coder.turnRight()",
        "if coder.pathAhead():",
        "  coder.forward(1)",
        "else:",
        "  coder.turnRight()",
        "if coins >= 2:",
        "  coins = 0",
        "  coins += 1",
      ].join("\n"),
    );
  });

  test("indents nested blocks by two spaces per level", () => {
    const program: Command[] = [
      { kind: "if", condition: { kind: "itemAhead" }, then: [
        { kind: "repeat", times: 2, body: [{ kind: "forward", steps: 1 }] },
      ] },
    ];

    expect(formatTextProgram(program)).toBe(
      [
        "if coder.itemAhead():",
        "  repeat(2):",
        "    coder.forward(1)",
      ].join("\n"),
    );
  });

  test("renders a backward move when the command carries the direction", () => {
    expect(
      formatTextProgram([{ kind: "forward", steps: 2, direction: "backward" }]),
    ).toBe("coder.backward(2)");
  });

  test("returns an empty string for an empty program", () => {
    expect(formatTextProgram([])).toBe("");
  });
});
