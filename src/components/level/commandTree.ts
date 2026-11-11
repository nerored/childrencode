import type { Command } from "../../domain/types";

/** One step into a command tree: a child index or a branch name. */
export type ContainerSegment = number | "body" | "then" | "else";

/**
 * Location of a command list. An empty path is the program root; paths then
 * alternate a child index with a branch key, e.g. `[2, "body", 1, "then"]`.
 */
export type ContainerPath = ContainerSegment[];

/** A command inside a specific container list. */
export interface BlockAddress {
  container: ContainerPath;
  index: number;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function samePath(a: ContainerPath, b: ContainerPath): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((segment, index) => segment === b[index]);
}

function startsWithPath(path: ContainerPath, prefix: ContainerPath): boolean {
  return (
    prefix.length <= path.length &&
    prefix.every((segment, index) => path[index] === segment)
  );
}

function isBranchKey(value: unknown): value is "body" | "then" | "else" {
  return value === "body" || value === "then" || value === "else";
}

function branchOf(
  command: Command | undefined,
  branch: "body" | "then" | "else",
): Command[] | undefined {
  if (command === undefined) {
    return undefined;
  }
  if (branch === "body") {
    return command.kind === "repeat" ? command.body : undefined;
  }
  if (branch === "then") {
    return command.kind === "if" ? command.then : undefined;
  }
  return command.kind === "if" ? (command.else ?? []) : undefined;
}

/**
 * Resolve a container path to its command list. A missing `else` branch
 * resolves to an empty list as if it existed; all other malformed or
 * unreachable paths return `undefined`.
 */
export function getContainer(
  program: Command[],
  path: ContainerPath,
): Command[] | undefined {
  if (path.length % 2 !== 0) {
    return undefined;
  }

  let current = program;

  for (let depth = 0; depth < path.length; depth += 2) {
    const index = path[depth];
    const branch = path[depth + 1];

    if (!isInteger(index) || index < 0 || index >= current.length) {
      return undefined;
    }
    if (!isBranchKey(branch)) {
      return undefined;
    }

    const next = branchOf(current[index], branch);
    if (next === undefined) {
      return undefined;
    }
    current = next;
  }

  return current;
}

/** Return the command at an address, or `undefined` when it does not exist. */
export function getCommandAt(
  program: Command[],
  address: BlockAddress,
): Command | undefined {
  const container = getContainer(program, address.container);
  if (container === undefined) {
    return undefined;
  }
  if (!isInteger(address.index) || address.index < 0 || address.index >= container.length) {
    return undefined;
  }
  return container[address.index];
}

function removeAt(
  commands: Command[],
  path: ContainerPath,
  index: number,
): Command[] {
  if (path.length === 0) {
    return commands.filter((_, current) => current !== index);
  }

  const [slot, branch, ...rest] = path;
  if (!isInteger(slot) || slot < 0 || slot >= commands.length || !isBranchKey(branch)) {
    return commands;
  }

  const command = commands[slot];
  let next: Command;

  if (branch === "body" && command.kind === "repeat") {
    next = { ...command, body: removeAt(command.body, rest, index) };
  } else if (branch === "then" && command.kind === "if") {
    next = { ...command, then: removeAt(command.then, rest, index) };
  } else if (branch === "else" && command.kind === "if") {
    const nextElse = removeAt(command.else ?? [], rest, index);
    if (nextElse.length === 0) {
      const { else: _unused, ...withoutElse } = command;
      next = withoutElse;
    } else {
      next = { ...command, else: nextElse };
    }
  } else {
    return commands;
  }

  return commands.map((item, current) => (current === slot ? next : item));
}

function removeTailAt(
  commands: Command[],
  path: ContainerPath,
  index: number,
): Command[] {
  if (path.length === 0) {
    if (!isInteger(index) || index < 0 || index > commands.length) {
      return commands;
    }
    return commands.slice(0, index);
  }

  const [slot, branch, ...rest] = path;
  if (
    !isInteger(slot) ||
    slot < 0 ||
    slot >= commands.length ||
    !isBranchKey(branch)
  ) {
    return commands;
  }

  const command = commands[slot];
  let next: Command;

  if (branch === "body" && command.kind === "repeat") {
    next = { ...command, body: removeTailAt(command.body, rest, index) };
  } else if (branch === "then" && command.kind === "if") {
    next = { ...command, then: removeTailAt(command.then, rest, index) };
  } else if (branch === "else" && command.kind === "if") {
    const nextElse = removeTailAt(command.else ?? [], rest, index);
    if (nextElse.length === 0) {
      const { else: _unused, ...withoutElse } = command;
      next = withoutElse;
    } else {
      next = { ...command, else: nextElse };
    }
  } else {
    return commands;
  }

  return commands.map((item, current) => (current === slot ? next : item));
}

/**
 * Remove the command at `address`. Only the containers along the path are
 * rebuilt; unrelated commands keep their identity. An `if` whose `else`
 * branch becomes empty loses the `else` property.
 */
export function removeCommand(
  program: Command[],
  address: BlockAddress,
): Command[] {
  const container = getContainer(program, address.container);
  if (container === undefined) {
    return program;
  }
  if (!isInteger(address.index) || address.index < 0 || address.index >= container.length) {
    return program;
  }
  return removeAt(program, address.container, address.index);
}

function insertAt(
  commands: Command[],
  path: ContainerPath,
  index: number,
  command: Command,
): Command[] {
  if (path.length === 0) {
    const next = commands.slice();
    next.splice(index, 0, command);
    return next;
  }

  const [slot, branch, ...rest] = path;
  if (!isInteger(slot) || slot < 0 || slot >= commands.length || !isBranchKey(branch)) {
    return commands;
  }

  const current = commands[slot];
  let next: Command;

  if (branch === "body" && current.kind === "repeat") {
    next = { ...current, body: insertAt(current.body, rest, index, command) };
  } else if (branch === "then" && current.kind === "if") {
    next = { ...current, then: insertAt(current.then, rest, index, command) };
  } else if (branch === "else" && current.kind === "if") {
    next = { ...current, else: insertAt(current.else ?? [], rest, index, command) };
  } else {
    return commands;
  }

  return commands.map((item, currentSlot) => (currentSlot === slot ? next : item));
}

function insertManyAt(
  commands: Command[],
  path: ContainerPath,
  index: number,
  added: readonly Command[],
): Command[] {
  if (path.length === 0) {
    if (!isInteger(index) || index < 0 || index > commands.length) {
      return commands;
    }
    const next = commands.slice();
    next.splice(index, 0, ...added);
    return next;
  }

  const [slot, branch, ...rest] = path;
  if (
    !isInteger(slot) ||
    slot < 0 ||
    slot >= commands.length ||
    !isBranchKey(branch)
  ) {
    return commands;
  }

  const current = commands[slot];
  let next: Command;

  if (branch === "body" && current.kind === "repeat") {
    next = { ...current, body: insertManyAt(current.body, rest, index, added) };
  } else if (branch === "then" && current.kind === "if") {
    next = { ...current, then: insertManyAt(current.then, rest, index, added) };
  } else if (branch === "else" && current.kind === "if") {
    next = {
      ...current,
      else: insertManyAt(current.else ?? [], rest, index, added),
    };
  } else {
    return commands;
  }

  return commands.map((item, currentSlot) => (currentSlot === slot ? next : item));
}

/**
 * Insert `command` at `address` in pre-insertion coordinates. The index may
 * equal the container length (append). A missing `else` branch is created.
 */
export function insertCommand(
  program: Command[],
  address: BlockAddress,
  command: Command,
): Command[] {
  const container = getContainer(program, address.container);
  if (container === undefined) {
    return program;
  }
  if (
    !isInteger(address.index) ||
    address.index < 0 ||
    address.index > container.length
  ) {
    return program;
  }
  return insertAt(program, address.container, address.index, command);
}

/**
 * Return the command at `address` and every following sibling in its container.
 * This is the stack a middle block carries when it is dragged.
 */
export function getCommandTail(
  program: Command[],
  address: BlockAddress,
): Command[] {
  const container = getContainer(program, address.container);
  if (container === undefined) {
    return [];
  }
  if (
    !isInteger(address.index) ||
    address.index < 0 ||
    address.index >= container.length
  ) {
    return [];
  }
  return container.slice(address.index);
}

/**
 * Remove the command at `address` and every following sibling in its
 * container, returning a new tree.
 */
export function removeCommandTail(
  program: Command[],
  address: BlockAddress,
): Command[] {
  const container = getContainer(program, address.container);
  if (container === undefined) {
    return program;
  }
  if (
    !isInteger(address.index) ||
    address.index < 0 ||
    address.index >= container.length
  ) {
    return program;
  }
  return removeTailAt(program, address.container, address.index);
}

/**
 * Insert several commands at `address` in pre-insertion coordinates. The
 * index may equal the container length (append). A missing `else` branch is
 * created when the first command lands there.
 */
export function insertCommands(
  program: Command[],
  address: BlockAddress,
  added: readonly Command[],
): Command[] {
  if (added.length === 0) {
    return program;
  }
  const container = getContainer(program, address.container);
  if (container === undefined) {
    return program;
  }
  if (
    !isInteger(address.index) ||
    address.index < 0 ||
    address.index > container.length
  ) {
    return program;
  }
  return insertManyAt(program, address.container, address.index, added);
}

/**
 * True when a container lives inside the dragged block itself, i.e. `container`
 * starts with `[...ancestor.container, ancestor.index]` and is longer.
 */
export function isDescendantContainer(
  container: ContainerPath,
  ancestor: BlockAddress,
): boolean {
  const prefix: ContainerPath = [...ancestor.container, ancestor.index];
  return container.length > prefix.length && startsWithPath(container, prefix);
}

/**
 * Move a command between addresses. `to` is interpreted in pre-removal
 * coordinates, so dropping after an earlier sibling still lands where the
 * user pointed. Drops into the source block's own subtree are rejected.
 */
export function moveCommand(
  program: Command[],
  from: BlockAddress,
  to: BlockAddress,
): Command[] {
  const source = getCommandAt(program, from);
  if (source === undefined) {
    return program;
  }
  if (isDescendantContainer(to.container, from)) {
    return program;
  }

  const destination = getContainer(program, to.container);
  if (destination === undefined) {
    return program;
  }
  if (!isInteger(to.index) || to.index < 0 || to.index > destination.length) {
    return program;
  }

  const sameContainer = samePath(to.container, from.container);
  if (sameContainer && (to.index === from.index || to.index === from.index + 1)) {
    return program;
  }

  const removed = removeCommand(program, from);

  // Removing an earlier sibling shifts any later sibling index inside the
  // destination ancestor path, so adjust that numeric segment.
  let adjustedContainer = to.container;
  const depth = from.container.length;
  if (to.container.length > depth && startsWithPath(to.container, from.container)) {
    const segment = to.container[depth];
    if (isInteger(segment) && segment > from.index) {
      adjustedContainer = to.container.slice();
      adjustedContainer[depth] = segment - 1;
    }
  }

  let insertIndex = to.index;
  if (samePath(adjustedContainer, from.container) && insertIndex > from.index) {
    insertIndex -= 1;
  }

  return insertCommand(
    removed,
    { container: adjustedContainer, index: insertIndex },
    source,
  );
}

/**
 * Move a block and every following sibling as one stack. Destinations inside
 * any moved command, and slots at or below the source in the same container,
 * are rejected. Valid destinations are interpreted in pre-removal
 * coordinates; the source tail is removed before the stack is inserted.
 */
export function moveCommandStack(
  program: Command[],
  from: BlockAddress,
  to: BlockAddress,
): Command[] {
  const sourceContainer = getContainer(program, from.container);
  if (sourceContainer === undefined) {
    return program;
  }
  if (
    !isInteger(from.index) ||
    from.index < 0 ||
    from.index >= sourceContainer.length
  ) {
    return program;
  }
  const tail = sourceContainer.slice(from.index);
  const destination = getContainer(program, to.container);
  if (destination === undefined) {
    return program;
  }
  if (!isInteger(to.index) || to.index < 0 || to.index > destination.length) {
    return program;
  }
  if (
    samePath(from.container, to.container) &&
    to.index >= from.index
  ) {
    return program;
  }
  for (let offset = 0; offset < tail.length; offset += 1) {
    if (
      isDescendantContainer(to.container, {
        container: from.container,
        index: from.index + offset,
      })
    ) {
      return program;
    }
  }

  return insertCommands(removeCommandTail(program, from), to, tail);
}
