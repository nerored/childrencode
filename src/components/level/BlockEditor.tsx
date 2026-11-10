import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { countCommands } from "../../domain/commands";
import type { Command, CommandKind, Condition, LevelSpec } from "../../domain/types";
import {
  insertCommand,
  isDescendantContainer,
  moveCommand,
  removeCommand,
} from "./commandTree";
import type { BlockAddress, ContainerPath } from "./commandTree";
import { pickSnap } from "./blockGraph";
import type { SnapTarget } from "./blockGraph";

export interface BlockEditorProps {
  level: LevelSpec;
  program: Command[];
  onChange(program: Command[]): void;
}

interface PaletteEntry {
  key: string;
  label: string;
  glyph: string;
  create(): Command;
}

const KIND_GLYPH: Record<CommandKind, string> = {
  forward: "→",
  turn: "↻",
  repeat: "⟳",
  if: "?",
  setVar: "=",
  changeVar: "+",
};

function describeCondition(condition: Condition): string {
  switch (condition.kind) {
    case "pathAhead":
      return "前方可通行";
    case "itemAhead":
      return "前方有企鹅";
    case "varAtLeast":
      return `${condition.name} ≥ ${condition.value}`;
  }
}

function describeCommand(command: Command): string {
  switch (command.kind) {
    case "forward":
      return `前进 ${command.steps} 步`;
    case "turn":
      return command.direction === "left" ? "左转" : "右转";
    case "repeat":
      return `重复 ${command.times} 次`;
    case "if":
      return `如果 ${describeCondition(command.condition)}`;
    case "setVar":
      return `设置变量 ${command.name} 为 ${command.value}`;
    case "changeVar":
      return `变量 ${command.name} 增加 ${command.delta}`;
  }
}

/**
 * Pointer Events only: pointerdown on a drag handle or palette chip opens a
 * session, pointermove drives the ghost and hit-tests slots, pointerup commits
 * the move, and pointercancel aborts it. Click/keyboard editing stays intact.
 */
type DragSource =
  | { kind: "block"; address: BlockAddress; command: Command }
  | { kind: "palette"; command: Command };

interface DragState {
  ghostX: number;
  ghostY: number;
  source: DragSource;
  snapKey: string | null;
}

interface PointerSession {
  pointerId: number;
  startX: number;
  startY: number;
  captureEl: HTMLElement;
  source: DragSource;
  active: boolean;
  grabOffset: { dx: number; dy: number };
}

interface ActiveDrop {
  container: ContainerPath;
  index: number;
}

interface SnapSocket {
  key: string;
  drop: ActiveDrop;
  target: SnapTarget<string>;
}

interface DragApi {
  snapKey: string | null;
  draggingKey: string | null;
  startBlock(
    event: ReactPointerEvent<HTMLButtonElement>,
    address: BlockAddress,
    command: Command,
  ): void;
  startPalette(event: ReactPointerEvent<HTMLButtonElement>, entry: PaletteEntry): void;
  move(event: ReactPointerEvent<HTMLButtonElement>): void;
  end(event: ReactPointerEvent<HTMLButtonElement>): void;
  cancel(event: ReactPointerEvent<HTMLButtonElement>): void;
  consumeSuppressedClick(): boolean;
}

function addressKey(address: BlockAddress): string {
  return JSON.stringify([address.container, address.index]);
}

function slotKey(container: ContainerPath, index: number): string {
  return JSON.stringify([container, index]);
}

function sameContainerPath(a: ContainerPath, b: ContainerPath): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((segment, index) => segment === b[index]);
}

function isDropAllowed(source: DragSource, drop: ActiveDrop): boolean {
  if (source.kind !== "block") {
    return true;
  }
  if (isDescendantContainer(drop.container, source.address)) {
    return false;
  }
  return !(
    sameContainerPath(drop.container, source.address.container) &&
    (drop.index === source.address.index ||
      drop.index === source.address.index + 1)
  );
}

/** Visible drop slots become snap sockets in viewport coordinates. */
function collectSockets(root: HTMLElement | null, source: DragSource): SnapSocket[] {
  if (root === null) {
    return [];
  }

  const sockets: SnapSocket[] = [];
  for (const element of root.querySelectorAll<HTMLElement>(
    "[data-drop-container][data-drop-index]",
  )) {
    const drop = parseDropSlot(element);
    if (drop === null || !isDropAllowed(source, drop)) {
      continue;
    }
    if (element.getClientRects().length === 0) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    const key = slotKey(drop.container, drop.index);
    sockets.push({
      key,
      drop,
      target: { address: key, edge: "next", x: rect.left, y: rect.top },
    });
  }
  return sockets;
}

function parseDropSlot(element: Element): ActiveDrop | null {
  const slot = element.closest<HTMLElement>("[data-drop-container]");
  if (slot === null) {
    return null;
  }

  const containerText = slot.dataset.dropContainer;
  const indexText = slot.dataset.dropIndex;
  if (containerText === undefined || indexText === undefined) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(containerText);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) {
    return null;
  }

  const container: ContainerPath = [];
  for (const segment of parsed) {
    if (segment === "body" || segment === "then" || segment === "else") {
      container.push(segment);
    } else if (typeof segment === "number" && Number.isInteger(segment) && segment >= 0) {
      container.push(segment);
    } else {
      return null;
    }
  }
  if (container.length % 2 !== 0) {
    return null;
  }

  const index = Number(indexText);
  if (!Number.isInteger(index) || index < 0) {
    return null;
  }

  return { container, index };
}

function paletteFor(allowed: Set<CommandKind>): PaletteEntry[] {
  const entries: PaletteEntry[] = [];

  if (allowed.has("forward")) {
    entries.push({
      key: "forward",
      label: "前进",
      glyph: "→",
      create: () => ({ kind: "forward", steps: 1 }),
    });
  }
  if (allowed.has("turn")) {
    entries.push(
      {
        key: "turn-left",
        label: "左转",
        glyph: "↰",
        create: () => ({ kind: "turn", direction: "left" }),
      },
      {
        key: "turn-right",
        label: "右转",
        glyph: "↱",
        create: () => ({ kind: "turn", direction: "right" }),
      },
    );
  }
  if (allowed.has("repeat")) {
    entries.push({
      key: "repeat",
      label: "重复",
      glyph: "⟳",
      create: () => ({ kind: "repeat", times: 3, body: [] }),
    });
  }
  if (allowed.has("if")) {
    entries.push({
      key: "if",
      label: "如果",
      glyph: "?",
      create: () => ({ kind: "if", condition: { kind: "pathAhead" }, then: [] }),
    });
  }
  if (allowed.has("setVar")) {
    entries.push({
      key: "setVar",
      label: "设置变量",
      glyph: "=",
      create: () => ({ kind: "setVar", name: "变量", value: 0 }),
    });
  }
  if (allowed.has("changeVar")) {
    entries.push({
      key: "changeVar",
      label: "变量增加",
      glyph: "+",
      create: () => ({ kind: "changeVar", name: "变量", delta: 1 }),
    });
  }

  return entries;
}

function replaceAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((item, current) => (current === index ? value : item));
}

function withElseBranch(command: Extract<Command, { kind: "if" }>, next: Command[]): Command {
  if (next.length > 0) {
    return { ...command, else: next };
  }
  return { kind: "if", condition: command.condition, then: command.then };
}

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange(value: number): void;
}

/** Number input that keeps an edit draft and clamps the value on commit. */
function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));
  const skipCommit = useRef(false);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    if (skipCommit.current) {
      skipCommit.current = false;
      setDraft(String(value));
      return;
    }
    const parsed = Number.parseInt(draft, 10);
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value;
    setDraft(String(next));
    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <label className="number-field">
      <span className="number-field__label">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            skipCommit.current = true;
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
        aria-label={label}
      />
    </label>
  );
}

interface NameFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
}

function NameField({ label, value, onChange }: NameFieldProps) {
  return (
    <label className="text-field">
      <span className="text-field__label">{label}</span>
      <input
        type="text"
        value={value}
        maxLength={12}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          const trimmed = value.trim();
          onChange(trimmed.length > 0 ? trimmed : "变量");
        }}
        aria-label={label}
      />
    </label>
  );
}

interface PaletteProps {
  entries: PaletteEntry[];
  onAdd(entry: PaletteEntry): void;
  drag: DragApi;
  compact?: boolean;
}

function Palette({ entries, onAdd, drag, compact = false }: PaletteProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={`block-palette${compact ? " block-palette--inline" : ""}`}>
      {!compact && <p className="block-palette__title">指令栏</p>}
      <div className="block-palette__grid">
        {entries.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className="block-palette__chip"
            draggable={false}
            style={{ touchAction: "none" }}
            onDragStart={(event) => event.preventDefault()}
            onPointerDown={(event) => drag.startPalette(event, entry)}
            onPointerMove={drag.move}
            onPointerUp={drag.end}
            onPointerCancel={drag.cancel}
            onClick={() => {
              if (!drag.consumeSuppressedClick()) {
                onAdd(entry);
              }
            }}
            aria-label={`添加指令：${entry.label}。也可以拖到目标空位插入。`}
          >
            <span className="block-palette__glyph" aria-hidden="true">
              {entry.glyph}
            </span>
            {entry.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ConditionFieldsProps {
  condition: Condition;
  onChange(condition: Condition): void;
}

function ConditionFields({ condition, onChange }: ConditionFieldsProps) {
  return (
    <>
      <label className="select-field">
        <span className="select-field__label">条件</span>
        <select
          value={condition.kind}
          onChange={(event) => {
            const kind = event.target.value as Condition["kind"];
            if (kind === condition.kind) {
              return;
            }
            if (kind === "varAtLeast") {
              onChange({
                kind: "varAtLeast",
                name: condition.kind === "varAtLeast" ? condition.name : "变量",
                value: condition.kind === "varAtLeast" ? condition.value : 0,
              });
              return;
            }
            onChange(kind === "itemAhead" ? { kind: "itemAhead" } : { kind: "pathAhead" });
          }}
          aria-label="条件类型"
        >
          <option value="pathAhead">前方可通行</option>
          <option value="itemAhead">前方有企鹅</option>
          <option value="varAtLeast">变量 ≥</option>
        </select>
      </label>
      {condition.kind === "varAtLeast" && (
        <>
          <NameField
            label="变量名"
            value={condition.name}
            onChange={(name) => onChange({ ...condition, name })}
          />
          <NumberField
            label="阈值"
            value={condition.value}
            min={0}
            max={999}
            onChange={(value) => onChange({ ...condition, value })}
          />
        </>
      )}
    </>
  );
}

interface CommandFieldsProps {
  command: Command;
  onChange(command: Command): void;
}

function CommandFields({ command, onChange }: CommandFieldsProps) {
  switch (command.kind) {
    case "forward":
      return (
        <>
          <span className="block__label">前进</span>
          <NumberField
            label="步数"
            value={command.steps}
            min={1}
            max={9}
            onChange={(steps) => onChange({ ...command, steps })}
          />
          <span className="block__suffix">步</span>
        </>
      );
    case "turn":
      return (
        <>
          <span className="block__label">{command.direction === "left" ? "左转" : "右转"}</span>
          <span className="block__note">原地转向 90°</span>
        </>
      );
    case "repeat":
      return (
        <>
          <span className="block__label">重复</span>
          <NumberField
            label="次数"
            value={command.times}
            min={1}
            max={100}
            onChange={(times) => onChange({ ...command, times })}
          />
          <span className="block__suffix">次</span>
        </>
      );
    case "if":
      return (
        <>
          <span className="block__label">如果</span>
          <ConditionFields
            condition={command.condition}
            onChange={(condition) => onChange({ ...command, condition })}
          />
        </>
      );
    case "setVar":
      return (
        <>
          <span className="block__label">设置变量</span>
          <NameField
            label="变量名"
            value={command.name}
            onChange={(name) => onChange({ ...command, name })}
          />
          <span className="block__label">为</span>
          <NumberField
            label="值"
            value={command.value}
            min={0}
            max={999}
            onChange={(value) => onChange({ ...command, value })}
          />
        </>
      );
    case "changeVar":
      return (
        <>
          <span className="block__label">变量</span>
          <NameField
            label="变量名"
            value={command.name}
            onChange={(name) => onChange({ ...command, name })}
          />
          <span className="block__label">增加</span>
          <NumberField
            label="增加量"
            value={command.delta}
            min={0}
            max={999}
            onChange={(delta) => onChange({ ...command, delta })}
          />
        </>
      );
  }
}

interface DropSlotProps {
  container: ContainerPath;
  index: number;
  snapKey: string | null;
}

/** A real list item that accepts a drop; it is never display:none. */
function DropSlot({ container, index, snapKey }: DropSlotProps) {
  const isSnapped = snapKey === slotKey(container, index);
  return (
    <li
      className={`drop-slot${isSnapped ? " drop-slot--snap" : ""}`}
      data-drop-container={JSON.stringify(container)}
      data-drop-index={index}
      aria-hidden="true"
    />
  );
}

interface BlockListProps {
  commands: Command[];
  onChange(commands: Command[]): void;
  allowed: Set<CommandKind>;
  palette: PaletteEntry[];
  label: string;
  depth: number;
  container: ContainerPath;
  drag: DragApi;
  showPalette?: boolean;
  onRemove(address: BlockAddress): void;
  onMoveToSlot(from: BlockAddress, toIndex: number): void;
}

function BlockList({
  commands,
  onChange,
  allowed,
  palette,
  label,
  depth,
  container,
  drag,
  showPalette = true,
  onRemove,
  onMoveToSlot,
}: BlockListProps) {
  const add = (entry: PaletteEntry) => onChange([...commands, entry.create()]);

  return (
    <div className="block-list-wrap">
      <ol
        className="block-list"
        data-block-container={JSON.stringify(container)}
        aria-label={label}
      >
        {commands.map((command, index) => {
          const address: BlockAddress = { container, index };
          return (
            <Fragment key={`${command.kind}-${index}`}>
              <DropSlot
                container={container}
                index={index}
                snapKey={drag.snapKey}
              />
              <li
                className={`block-list__item${index === 0 ? " block-list__item--first" : ""}${index === commands.length - 1 ? " block-list__item--last" : ""}`}
                data-block-index={index}
              >
                <BlockCard
                  command={command}
                  address={address}
                  allowed={allowed}
                  palette={palette}
                  drag={drag}
                  depth={depth}
                  label={`${describeCommand(command)}（第 ${index + 1} 条）`}
                  dragging={drag.draggingKey === addressKey(address)}
                  onChange={(next) => onChange(replaceAt(commands, index, next))}
                  onRemove={() => onRemove(address)}
                  onMoveToSlot={onMoveToSlot}
                  onMoveUp={
                    index > 0
                      ? () => onMoveToSlot(address, index - 1)
                      : undefined
                  }
                  onMoveDown={
                    index < commands.length - 1
                      ? () => onMoveToSlot(address, index + 2)
                      : undefined
                  }
                />
              </li>
            </Fragment>
          );
        })}
        <DropSlot container={container} index={commands.length} snapKey={drag.snapKey} />
      </ol>

      {commands.length === 0 && (
        <p className="block-list__empty">还没有指令，从下方选择指令添加。</p>
      )}

      {showPalette && <Palette entries={palette} onAdd={add} drag={drag} compact />}
    </div>
  );
}

interface BlockCardProps {
  command: Command;
  address: BlockAddress;
  allowed: Set<CommandKind>;
  palette: PaletteEntry[];
  drag: DragApi;
  depth: number;
  label: string;
  dragging: boolean;
  onChange(command: Command): void;
  onRemove(): void;
  onMoveToSlot(from: BlockAddress, toIndex: number): void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function BlockCard({
  command,
  address,
  allowed,
  palette,
  drag,
  depth,
  label,
  dragging,
  onChange,
  onRemove,
  onMoveToSlot,
  onMoveUp,
  onMoveDown,
}: BlockCardProps) {
  const bodyContainer: ContainerPath = [...address.container, address.index, "body"];
  const thenContainer: ContainerPath = [...address.container, address.index, "then"];
  const elseContainer: ContainerPath = [...address.container, address.index, "else"];
  const socketSnapped = drag.snapKey === slotKey(address.container, address.index + 1);

  return (
    <article
      className={`block block--${command.kind}${dragging ? " block--dragging" : ""}`}
      aria-label={label}
    >
      <div className="block__head">
        <button
          type="button"
          className="block__drag-handle"
          data-drag-handle=""
          draggable={false}
          style={{ touchAction: "none" }}
          onDragStart={(event) => event.preventDefault()}
          onPointerDown={(event) => drag.startBlock(event, address, command)}
          onPointerMove={drag.move}
          onPointerUp={drag.end}
          onPointerCancel={drag.cancel}
          aria-label={`拖动：${label}；也可用上移、下移按钮调整`}
        >
          <span aria-hidden="true">⠿</span>
        </button>
        <span className="block__kind" aria-hidden="true">
          {KIND_GLYPH[command.kind]}
        </span>
        <div className="block__content">
          <CommandFields command={command} onChange={onChange} />
        </div>
        <div className="block__controls">
          <button
            type="button"
            className="icon-button"
            onClick={onMoveUp}
            disabled={onMoveUp === undefined}
            aria-label={`上移：${label}`}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onMoveDown}
            disabled={onMoveDown === undefined}
            aria-label={`下移：${label}`}
          >
            ↓
          </button>
          <button
            type="button"
            className="icon-button icon-button--danger"
            onClick={onRemove}
            aria-label={`删除：${label}`}
          >
            ×
          </button>
        </div>
      </div>

      {command.kind === "repeat" && (
        <div className="block__branch">
          <span className="block__branch-label">重复执行</span>
          <BlockList
            commands={command.body}
            onChange={(body) => onChange({ ...command, body })}
            allowed={allowed}
            palette={palette}
            drag={drag}
            label="重复体内的指令"
            depth={depth + 1}
            container={bodyContainer}
            onRemove={onRemove}
            onMoveToSlot={onMoveToSlot}
          />
        </div>
      )}

      {command.kind === "if" && (
        <>
          <div className="block__branch">
            <span className="block__branch-label">那么</span>
            <BlockList
              commands={command.then}
              onChange={(then) => onChange({ ...command, then })}
              allowed={allowed}
              palette={palette}
              drag={drag}
              label="条件成立时执行的指令"
              depth={depth + 1}
              container={thenContainer}
              onRemove={onRemove}
              onMoveToSlot={onMoveToSlot}
            />
          </div>
          <div className="block__branch block__branch--else">
            <span className="block__branch-label">否则</span>
            <BlockList
              commands={command.else ?? []}
              onChange={(next) => onChange(withElseBranch(command, next))}
              allowed={allowed}
              palette={palette}
              drag={drag}
              label="条件不成立时执行的指令"
              depth={depth + 1}
              container={elseContainer}
              onRemove={onRemove}
              onMoveToSlot={onMoveToSlot}
            />
          </div>
        </>
      )}

      <span
        className={`block__socket${socketSnapped ? " block__socket--snap" : ""}`}
        aria-hidden="true"
      />
    </article>
  );
}

/**
 * Structured, fully controlled block editor. The hat block is fixed; every
 * other command is limited by the level's allowed command kinds and can be
 * nested inside repeat and if bodies. Blocks and palette chips can be dragged
 * with a pointer; every action also has a keyboard/click path.
 */
export default function BlockEditor({ level, program, onChange }: BlockEditorProps) {
  const allowed = useMemo(() => new Set(level.allowedCommands), [level.allowedCommands]);
  const palette = useMemo(() => paletteFor(allowed), [allowed]);

  const sessionRef = useRef<PointerSession | null>(null);
  const editorRootRef = useRef<HTMLElement | null>(null);
  const suppressClickUntilRef = useRef(0);
  const [drag, setDrag] = useState<DragState | null>(null);

  const clearSession = useCallback((session: PointerSession) => {
    if (sessionRef.current === session) {
      sessionRef.current = null;
    }
    if (session.captureEl.hasPointerCapture(session.pointerId)) {
      session.captureEl.releasePointerCapture(session.pointerId);
    }
    setDrag(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      const session = sessionRef.current;
      if (session === null || !session.active) {
        return;
      }
      if (session.source.kind === "palette") {
        suppressClickUntilRef.current = performance.now() + 600;
      }
      clearSession(session);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearSession]);

  const resolveActiveDrop = (
    x: number,
    y: number,
    source: DragSource,
  ): ActiveDrop | null => {
    const element = document.elementFromPoint(x, y);
    if (element === null) {
      return null;
    }
    const slot = parseDropSlot(element);
    if (slot === null || !isDropAllowed(source, slot)) {
      return null;
    }
    return slot;
  };

  /** Nearest visible socket within the magnet radius of the ghost's top-left. */
  const resolveSnap = (
    session: PointerSession,
    x: number,
    y: number,
  ): { socket: SnapSocket; x: number; y: number } | null => {
    const sockets = collectSockets(editorRootRef.current, session.source);
    const snap = pickSnap(
      sockets.map((socket) => socket.target),
      { x, y },
      session.grabOffset,
    );
    if (snap === null) {
      return null;
    }
    const socket = sockets.find((candidate) => candidate.key === snap.address);
    if (socket === undefined) {
      return null;
    }
    return { socket, x: snap.x, y: snap.y };
  };

  const beginSession = (
    event: ReactPointerEvent<HTMLButtonElement>,
    source: DragSource,
    preventDefault: boolean,
  ) => {
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }
    if (sessionRef.current !== null) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (
      source.kind === "block" &&
      target.closest("[data-drag-handle]") === null
    ) {
      return;
    }
    if (preventDefault) {
      event.preventDefault();
    }
    const captureEl = event.currentTarget;
    const sourceEl =
      source.kind === "block" ? target.closest<HTMLElement>(".block") : captureEl;
    const sourceRect = sourceEl?.getBoundingClientRect();
    const grabOffset =
      sourceRect === undefined
        ? { dx: 0, dy: 0 }
        : { dx: sourceRect.left - event.clientX, dy: sourceRect.top - event.clientY };
    captureEl.setPointerCapture(event.pointerId);
    sessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      captureEl,
      source,
      active: false,
      grabOffset,
    };
  };

  const startBlock = (
    event: ReactPointerEvent<HTMLButtonElement>,
    address: BlockAddress,
    command: Command,
  ) => {
    beginSession(event, { kind: "block", address, command }, true);
  };

  const startPalette = (
    event: ReactPointerEvent<HTMLButtonElement>,
    entry: PaletteEntry,
  ) => {
    suppressClickUntilRef.current = 0;
    beginSession(event, { kind: "palette", command: entry.create() }, false);
  };

  const handleMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = sessionRef.current;
    if (session === null || session.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    if (!session.active) {
      if (dx * dx + dy * dy < 25) {
        return;
      }
      session.active = true;
    }

    const snap = resolveSnap(session, event.clientX, event.clientY);
    setDrag({
      ghostX: snap === null ? event.clientX + session.grabOffset.dx : snap.x,
      ghostY: snap === null ? event.clientY + session.grabOffset.dy : snap.y,
      source: session.source,
      snapKey: snap === null ? null : snap.socket.key,
    });
  };

  const handleEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = sessionRef.current;
    if (session === null || session.pointerId !== event.pointerId) {
      return;
    }

    const wasActive = session.active;
    const snap = wasActive
      ? resolveSnap(session, event.clientX, event.clientY)
      : null;
    const active =
      snap !== null
        ? snap.socket.drop
        : wasActive
          ? resolveActiveDrop(event.clientX, event.clientY, session.source)
          : null;

    clearSession(session);

    if (!wasActive) {
      return;
    }
    if (session.source.kind === "palette") {
      suppressClickUntilRef.current = performance.now() + 600;
    }
    if (active === null) {
      return;
    }

    if (session.source.kind === "block") {
      const next = moveCommand(program, session.source.address, active);
      if (next !== program) {
        onChange(next);
      }
      return;
    }

    const next = insertCommand(program, active, session.source.command);
    if (next !== program) {
      onChange(next);
    }
  };

  const handleCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = sessionRef.current;
    if (session === null || session.pointerId !== event.pointerId) {
      return;
    }
    if (session.source.kind === "palette" && session.active) {
      suppressClickUntilRef.current = performance.now() + 600;
    }
    clearSession(session);
  };

  const consumeSuppressedClick = () => {
    if (performance.now() <= suppressClickUntilRef.current) {
      suppressClickUntilRef.current = 0;
      return true;
    }
    suppressClickUntilRef.current = 0;
    return false;
  };

  const removeAt = (address: BlockAddress) => {
    const next = removeCommand(program, address);
    if (next !== program) {
      onChange(next);
    }
  };

  const moveToSlot = (from: BlockAddress, toIndex: number) => {
    const next = moveCommand(program, from, {
      container: from.container,
      index: toIndex,
    });
    if (next !== program) {
      onChange(next);
    }
  };

  const dragApi: DragApi = {
    snapKey: drag === null ? null : drag.snapKey,
    draggingKey:
      drag !== null && drag.source.kind === "block"
        ? addressKey(drag.source.address)
        : null,
    startBlock,
    startPalette,
    move: handleMove,
    end: handleEnd,
    cancel: handleCancel,
    consumeSuppressedClick,
  };

  return (
    <section
      ref={editorRootRef}
      className={`block-editor${drag !== null ? " block-editor--dragging" : ""}`}
      aria-label="积木指令编辑器：拖动积木左侧的手柄可移动或嵌套，拖动指令栏积木可插入任意空位；也可以用上移、下移、删除按钮操作。"
    >
      <div className="block-hat" aria-label="固定起始积木：当开始被点击">
        <span className="block-hat__dot" aria-hidden="true" />
        <span className="block-hat__text">当开始被点击</span>
        <span className="block-hat__spark" aria-hidden="true">
          ✦
        </span>
      </div>

      <BlockList
        commands={program}
        onChange={onChange}
        allowed={allowed}
        palette={palette}
        drag={dragApi}
        label="程序指令"
        depth={0}
        container={[]}
        showPalette={false}
        onRemove={removeAt}
        onMoveToSlot={moveToSlot}
      />

      <Palette
        entries={palette}
        onAdd={(entry) => onChange([...program, entry.create()])}
        drag={dragApi}
      />

      <div className="block-editor__meta">
        <span>指令节点 {countCommands(program)} 个</span>
        <span>代码长度 {1 + countCommands(program)}</span>
      </div>

      {drag !== null && (
        <div
          className={`block-drag-ghost${drag.snapKey === null ? "" : " block-drag-ghost--snap"}`}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            pointerEvents: "none",
            transform: `translate3d(${drag.ghostX}px, ${drag.ghostY}px, 0)`,
          }}
          aria-hidden="true"
        >
          <span className="block__kind">{KIND_GLYPH[drag.source.command.kind]}</span>
          <span className="block-drag-ghost__label">
            {describeCommand(drag.source.command)}
          </span>
        </div>
      )}
    </section>
  );
}
