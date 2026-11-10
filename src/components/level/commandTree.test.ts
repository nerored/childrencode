import { describe, expect, test } from "bun:test";
import type { Command } from "../../domain/types";
import {
  getCommandAt,
  getContainer,
  insertCommand,
  isDescendantContainer,
  moveCommand,
  removeCommand,
} from "./commandTree";
import type { BlockAddress, ContainerPath } from "./commandTree";

function forward(steps = 1): Command {
  return { kind: "forward", steps };
}

function turn(direction: "left" | "right" = "right"): Command {
  return { kind: "turn", direction };
}

function repeat(times: number, body: Command[]): Command {
  return { kind: "repeat", times, body };
}

function ifCmd(then: Command[], elseBranch?: Command[]): Command {
  return elseBranch === undefined
    ? { kind: "if", condition: { kind: "pathAhead" }, then }
    : { kind: "if", condition: { kind: "pathAhead" }, then, else: elseBranch };
}

function address(container: ContainerPath, index: number): BlockAddress {
  return { container, index };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

describe("getContainer / getCommandAt", () => {
  const program: Command[] = [
    forward(2),
    repeat(3, [turn("left"), ifCmd([forward(1)], [turn("right")])]),
    turn("right"),
  ];

  test("resolves the root, repeat body, and nested if branches", () => {
    expect(getContainer(program, [])).toBe(program);
    expect(getContainer(program, [1, "body"])).toBe(
      (program[1] as Extract<Command, { kind: "repeat" }>).body,
    );

    const nested = getContainer(program, [1, "body", 1, "then"]);
    expect(nested).toEqual([forward(1)]);
    expect(getCommandAt(program, address([1, "body", 1, "else"], 0))).toEqual(
      turn("right"),
    );
  });

  test("treats a missing else branch as an empty list", () => {
    const loop = repeat(2, [forward(1)]);
    expect(getContainer([loop], [0, "else"])).toBeUndefined();
    const branch = ifCmd([forward(1)]);
    expect(getContainer([branch], [0, "else"])).toEqual([]);
    expect(getContainer([branch], [0, "then"])).toEqual([forward(1)]);
  });

  test("rejects invalid or unreachable paths", () => {
    expect(getContainer(program, [0])).toBeUndefined();
    expect(getContainer(program, ["body"] as unknown as ContainerPath)).toBeUndefined();
    expect(getContainer(program, [0, "body"])).toBeUndefined();
    expect(getContainer(program, [1, "then"])).toBeUndefined();
    expect(getContainer(program, [99, "body"])).toBeUndefined();
    expect(getContainer(program, [-1, "body"])).toBeUndefined();
    expect(getContainer(program, [0.5, "body"])).toBeUndefined();
    expect(getContainer(program, [1, "body", 0])).toBeUndefined();
    expect(getCommandAt(program, address([], 3))).toBeUndefined();
    expect(getCommandAt(program, address([], -1))).toBeUndefined();
  });
});

describe("insertCommand", () => {
  test("inserts at the start and end of the root", () => {
    const program = [forward(1), turn("left")];
    expect(insertCommand(program, address([], 0), turn("right"))).toEqual([
      turn("right"),
      forward(1),
      turn("left"),
    ]);
    expect(insertCommand(program, address([], 2), repeat(2, []))).toEqual([
      forward(1),
      turn("left"),
      repeat(2, []),
    ]);
  });

  test("inserts at index 0 and the end of a nested repeat body", () => {
    const program = [forward(1), repeat(2, [turn("left")])];
    const first = insertCommand(program, address([1, "body"], 0), forward(3));
    expect(getContainer(first, [1, "body"])).toEqual([forward(3), turn("left")]);

    const last = insertCommand(program, address([1, "body"], 1), forward(4));
    expect(getContainer(last, [1, "body"])).toEqual([turn("left"), forward(4)]);
  });

  test("creates a missing else branch before inserting", () => {
    const program = [ifCmd([forward(1)])];
    const next = insertCommand(program, address([0, "else"], 0), turn("right"));
    const branch = next[0] as Extract<Command, { kind: "if" }>;
    expect(branch.else).toEqual([turn("right")]);
    expect(branch.then).toEqual([forward(1)]);
  });

  test("supports deep then/body paths", () => {
    const program = [repeat(2, [ifCmd([forward(1)])])];
    const next = insertCommand(program, address([0, "body", 0, "then"], 1), turn("left"));
    expect(getContainer(next, [0, "body", 0, "then"])).toEqual([
      forward(1),
      turn("left"),
    ]);
  });

  test("returns the input unchanged for invalid addresses", () => {
    const program = [forward(1), repeat(2, [])];
    expect(insertCommand(program, address([], 3), turn("left"))).toBe(program);
    expect(insertCommand(program, address([], -1), turn("left"))).toBe(program);
    expect(insertCommand(program, address([0, "body"], 0), turn("left"))).toBe(program);
    expect(insertCommand(program, address([1, "else"], 0), turn("left"))).toBe(program);
  });
});

describe("removeCommand", () => {
  test("removes the only child of a repeat body and keeps the repeat", () => {
    const program = [forward(1), repeat(2, [turn("left")]), turn("right")];
    const next = removeCommand(program, address([1, "body"], 0));

    expect(next[1]).toEqual(repeat(2, []));
    expect(next[0]).toBe(program[0]);
    expect(next[2]).toBe(program[2]);
  });

  test("removes a command from then and keeps an empty list", () => {
    const program = [ifCmd([forward(1)], [turn("left")])];
    const next = removeCommand(program, address([0, "then"], 0));
    const branch = next[0] as Extract<Command, { kind: "if" }>;

    expect(branch.then).toEqual([]);
    expect(branch.else).toEqual([turn("left")]);
  });

  test("drops the else property when its last child is removed", () => {
    const program = [forward(1), ifCmd([turn("left")], [forward(2)])];
    const next = removeCommand(program, address([1, "else"], 0));
    const branch = next[1] as Extract<Command, { kind: "if" }>;

    expect("else" in branch).toBe(false);
    expect(branch.then).toBe((program[1] as Extract<Command, { kind: "if" }>).then);
    expect(branch.kind).toBe("if");
  });

  test("returns the input unchanged for missing commands", () => {
    const program = [forward(1), repeat(2, [])];
    expect(removeCommand(program, address([], 2))).toBe(program);
    expect(removeCommand(program, address([1, "body"], 0))).toBe(program);
    expect(removeCommand(program, address([0, "then"], 0))).toBe(program);
  });
});

describe("moveCommand", () => {
  test("reorders within one container, including downward moves", () => {
    const program = [forward(1), turn("left"), turn("right")];

    const movedUp = moveCommand(program, address([], 1), address([], 0));
    expect(movedUp).toEqual([turn("left"), forward(1), turn("right")]);

    // Downward via the slot after the next item (index + 2).
    const movedDown = moveCommand(program, address([], 0), address([], 2));
    expect(movedDown).toEqual([turn("left"), forward(1), turn("right")]);

    expect(moveCommand(program, address([], 2), address([], 1))).toEqual([
      forward(1),
      turn("right"),
      turn("left"),
    ]);
  });

  test("treats the source and following slot as no-ops", () => {
    const program = [forward(1), turn("left")];
    expect(moveCommand(program, address([], 0), address([], 0))).toBe(program);
    expect(moveCommand(program, address([], 0), address([], 1))).toBe(program);
    expect(moveCommand(program, address([], 1), address([], 2))).toBe(program);
  });

  test("appends after removing an earlier sibling", () => {
    const program = [forward(1), turn("left"), turn("right")];
    const next = moveCommand(program, address([], 0), address([], 3));
    expect(next).toEqual([turn("left"), turn("right"), forward(1)]);
    expect(next).not.toBe(program);
  });

  test("moves a root command into a repeat body and shifts the repeat index", () => {
    const program = [forward(1), repeat(3, [turn("left"), turn("right")])];
    const next = moveCommand(program, address([], 0), address([1, "body"], 1));

    expect(next).toHaveLength(1);
    expect(next[0].kind).toBe("repeat");
    expect(getContainer(next, [0, "body"])).toEqual([
      turn("left"),
      forward(1),
      turn("right"),
    ]);
  });

  test("moves a nested command back out to the root", () => {
    const program: Command[] = [
      repeat(2, [forward(1), turn("left")]),
      turn("right"),
    ];
    const next = moveCommand(program, address([0, "body"], 0), address([], 0));

    expect(next[0]).toEqual(forward(1));
    expect(getContainer(next, [1, "body"])).toEqual([turn("left")]);
  });

  test("adjusts a destination ancestor when an earlier root sibling is removed", () => {
    const program: Command[] = [forward(1), turn("left"), ifCmd([turn("right")])];
    const next = moveCommand(program, address([], 0), address([2, "then"], 0));

    expect(next).toHaveLength(2);
    expect(next[1].kind).toBe("if");
    expect(getContainer(next, [1, "then"])).toEqual([forward(1), turn("right")]);
  });

  test("does not shift unrelated destination containers", () => {
    const program: Command[] = [
      repeat(2, [forward(1), turn("left")]),
      repeat(2, [turn("right")]),
    ];
    const next = moveCommand(
      program,
      address([0, "body"], 0),
      address([1, "body"], 1),
    );

    expect(getContainer(next, [0, "body"])).toEqual([turn("left")]);
    expect(getContainer(next, [1, "body"])).toEqual([turn("right"), forward(1)]);
  });

  test("reorders inside a nested branch", () => {
    const program = [forward(1), repeat(2, [turn("left"), turn("right")])];
    const next = moveCommand(
      program,
      address([1, "body"], 1),
      address([1, "body"], 0),
    );
    expect(getContainer(next, [1, "body"])).toEqual([turn("right"), turn("left")]);
  });

  test("rejects drops into the dragged block's own subtree", () => {
    const program = [repeat(2, [forward(1)]), turn("left")];
    expect(moveCommand(program, address([], 0), address([0, "body"], 0))).toBe(program);

    const nested = [repeat(2, [ifCmd([forward(1)])])];
    expect(
      moveCommand(nested, address([0, "body"], 0), address([0, "body", 0, "then"], 0)),
    ).toBe(nested);
  });

  test("returns the input for missing sources or invalid targets", () => {
    const program = [forward(1), repeat(2, [])];
    expect(moveCommand(program, address([], 5), address([], 0))).toBe(program);
    expect(moveCommand(program, address([], 0), address([0, "body"], 0))).toBe(program);
    expect(moveCommand(program, address([], 0), address([1, "body"], 1))).toBe(program);
    expect(moveCommand(program, address([], 0), address([], 99))).toBe(program);
  });
});

describe("isDescendantContainer", () => {
  test("recognizes deeper containers under a dragged block", () => {
    expect(isDescendantContainer([0, "body"], address([], 0))).toBe(true);
    expect(isDescendantContainer([2, "body", 1, "then"], address([], 2))).toBe(true);
    expect(
      isDescendantContainer([3, "body", 0, "then"], address([3, "body"], 0)),
    ).toBe(true);
  });

  test("rejects siblings, ancestors, and the same container", () => {
    expect(isDescendantContainer([1, "body"], address([], 0))).toBe(false);
    expect(isDescendantContainer([], address([], 0))).toBe(false);
    expect(isDescendantContainer([0, "body"], address([0, "body"], 0))).toBe(false);
    expect(isDescendantContainer([1, "then"], address([], 0))).toBe(false);
  });
});

describe("immutability", () => {
  test("mutators never mutate the input tree and preserve unrelated nodes", () => {
    const program = deepFreeze<Command[]>([
      forward(1),
      repeat(2, [turn("left"), ifCmd([forward(2)], [turn("right")])]),
      turn("right"),
    ]);
    const snapshot = JSON.stringify(program);

    const inserted = insertCommand(program, address([1, "body", 1, "then"], 0), forward(9));
    const removed = removeCommand(program, address([1, "body", 1, "else"], 0));
    const moved = moveCommand(program, address([], 0), address([1, "body"], 2));

    expect(JSON.stringify(program)).toBe(snapshot);
    expect(inserted).not.toBe(program);
    expect(removed).not.toBe(program);
    expect(moved).not.toBe(program);

    expect(inserted[0]).toBe(program[0]);
    expect(inserted[2]).toBe(program[2]);
    expect(getContainer(inserted, [1, "body", 1, "then"])).toEqual([
      forward(9),
      forward(2),
    ]);
    expect(removed[0]).toBe(program[0]);
    expect((removed[1] as Extract<Command, { kind: "repeat" }>).body[1]).not.toBe(
      (program[1] as Extract<Command, { kind: "repeat" }>).body[1],
    );
  });
});
