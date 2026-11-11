import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { countCommands } from "../../domain/commands";
import type { Command, CommandKind, Condition, LevelSpec } from "../../domain/types";
import {
  getCommandTail,
  insertCommands,
  isDescendantContainer,
  moveCommandStack,
  removeCommandTail,
} from "./commandTree";
import type { BlockAddress, ContainerPath } from "./commandTree";
import { chooseSnap, pickSnap, socketZone } from "./blockGraph";
import type { SnapTarget } from "./blockGraph";
import {
  BLUEPRINT_ZOOM_STEP,
  DEFAULT_BLUEPRINT_VIEW,
  MAX_BLUEPRINT_ZOOM,
  MIN_BLUEPRINT_ZOOM,
  WHEEL_ZOOM_SENSITIVITY,
  panViewBy,
  zoomViewAt,
} from "./blueprint";
import type { BlueprintView } from "./blueprint";

export interface DetachedBlock {
  id: string;
  commands: Command[];
  keys: string[];
  x: number;
  y: number;
}

export interface BlockEditorProps {
  level: LevelSpec;
  program: Command[];
  detached: DetachedBlock[];
  onChange(program: Command[]): void;
  onDetachedChange(detached: DetachedBlock[]): void;
}

interface PaletteEntry {
  key: string;
  kind: CommandKind;
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

/** Pointer targets that must never start a canvas pan. */
const PAN_IGNORE_SELECTOR = [
  ".block",
  ".blueprint-start",
  ".palette-block",
  "[data-drag-handle]",
  "[data-drop-container]",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  ".blueprint-toolbar",
  ".block-palette-panel",
].join(", ");

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
      return `移动${command.direction === "backward" ? "后退" : "前进"} ${command.steps} 步`;
    case "turn":
      return `转向（${command.direction === "left" ? "左转" : "右转"}）`;
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
 * Pointer Events only: pointerdown on a drag handle or palette block opens a
 * session, pointermove drives the ghost and hit-tests slots, pointerup commits
 * the move, and pointercancel aborts it. Click/keyboard editing stays intact.
 */
type DragSource =
  | { kind: "block"; address: BlockAddress; commands: Command[] }
  | {
      kind: "detached";
      id: string;
      offset: number;
      commands: Command[];
      keys: string[];
    }
  | { kind: "palette"; commands: [Command] };

interface DragState {
  source: DragSource;
  snapKey: string | null;
  snapPoint: { x: number; y: number } | null;
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

interface PanSession {
  pointerId: number;
  lastX: number;
  lastY: number;
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
  draggingKeys: string[];
  startBlock(
    event: ReactPointerEvent<HTMLElement>,
    address: BlockAddress,
    command: Command,
  ): void;
  startPalette(event: ReactPointerEvent<HTMLElement>, entry: PaletteEntry): void;
  startDetached(
    event: ReactPointerEvent<HTMLElement>,
    block: DetachedBlock,
    index: number,
  ): void;
  move(event: ReactPointerEvent<HTMLElement>): void;
  end(event: ReactPointerEvent<HTMLElement>): void;
  cancel(event: ReactPointerEvent<HTMLElement>): void;
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
  for (let offset = 0; offset < source.commands.length; offset += 1) {
    if (
      isDescendantContainer(drop.container, {
        container: source.address.container,
        index: source.address.index + offset,
      })
    ) {
      return false;
    }
  }
  return !(
    sameContainerPath(drop.container, source.address.container) &&
    drop.index >= source.address.index
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
      target: {
        address: key,
        edge: "next",
        x: rect.left,
        y: rect.top,
        zone: socketZone(rect),
      },
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
      key: "move",
      kind: "forward",
      label: "移动",
      glyph: "→",
      create: () => ({ kind: "forward", steps: 1 }),
    });
  }
  if (allowed.has("turn")) {
    entries.push({
      key: "turn",
      kind: "turn",
      label: "转向",
      glyph: "↻",
      create: () => ({ kind: "turn", direction: "left" }),
    });
  }
  if (allowed.has("repeat")) {
    entries.push({
      key: "repeat",
      kind: "repeat",
      label: "重复",
      glyph: "⟳",
      create: () => ({ kind: "repeat", times: 3, body: [] }),
    });
  }
  if (allowed.has("if")) {
    entries.push({
      key: "if",
      kind: "if",
      label: "如果",
      glyph: "?",
      create: () => ({ kind: "if", condition: { kind: "pathAhead" }, then: [] }),
    });
  }
  if (allowed.has("setVar")) {
    entries.push({
      key: "setVar",
      kind: "setVar",
      label: "设置变量",
      glyph: "=",
      create: () => ({ kind: "setVar", name: "变量", value: 0 }),
    });
  }
  if (allowed.has("changeVar")) {
    entries.push({
      key: "changeVar",
      kind: "changeVar",
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

interface NumberKeypadProps {
  label: string;
  value: string;
  onDigit(digit: string): void;
  onBackspace(): void;
  onClear(): void;
  onConfirm(): void;
  onCancel(): void;
}

const KEYPAD_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
] as const;

function NumberKeypad({
  label,
  value,
  onDigit,
  onBackspace,
  onClear,
  onConfirm,
  onCancel,
}: NumberKeypadProps) {
  if (typeof document === "undefined") {
    return null;
  }

  const keepInputFocus = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
  };

  // The keypad must escape the transformed blueprint scene, but it still needs
  // the --level-* tokens, which are scoped to .level-screen.
  const layerRoot =
    document.querySelector<HTMLElement>(".level-screen") ?? document.body;

  return createPortal(
    <div
      className="number-keypad-layer"
      onPointerDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) {
          event.preventDefault();
          onConfirm();
        }
      }}
    >
      <section
        className="number-keypad"
        role="dialog"
        aria-modal="true"
        aria-label={`数字键盘：${label}`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="number-keypad__head">
          <div>
            <p className="number-keypad__eyebrow">数字键盘</p>
            <h3 className="number-keypad__title">{label}</h3>
          </div>
          <button
            type="button"
            className="number-keypad__close"
            onPointerDown={keepInputFocus}
            onClick={onCancel}
            aria-label="关闭数字键盘"
          >
            ×
          </button>
        </header>
        <output className="number-keypad__display" aria-live="polite">
          {value.length > 0 ? value : "0"}
        </output>
        <div className="number-keypad__grid">
          {KEYPAD_ROWS.flat().map((digit) => (
            <button
              key={digit}
              type="button"
              className="number-keypad__key"
              onPointerDown={keepInputFocus}
              onClick={() => onDigit(digit)}
              aria-label={`数字 ${digit}`}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="number-keypad__key number-keypad__key--soft"
            onPointerDown={keepInputFocus}
            onClick={onClear}
          >
            清空
          </button>
          <button
            type="button"
            className="number-keypad__key"
            onPointerDown={keepInputFocus}
            onClick={() => onDigit("0")}
            aria-label="数字 0"
          >
            0
          </button>
          <button
            type="button"
            className="number-keypad__key number-keypad__key--soft"
            onPointerDown={keepInputFocus}
            onClick={onBackspace}
            aria-label="删除一位"
          >
            ⌫
          </button>
        </div>
        <div className="number-keypad__actions">
          <button
            type="button"
            className="number-keypad__action number-keypad__action--cancel"
            onPointerDown={keepInputFocus}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="number-keypad__action number-keypad__action--confirm"
            onPointerDown={keepInputFocus}
            onClick={onConfirm}
          >
            确定
          </button>
        </div>
      </section>
    </div>,
    layerRoot,
  );
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
  const [keypadOpen, setKeypadOpen] = useState(false);
  const skipCommit = useRef(false);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  useEffect(() => {
    if (!keypadOpen) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDraft(String(value));
        setKeypadOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keypadOpen, value]);

  const commitValue = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value;
    setDraft(String(next));
    if (next !== value) {
      onChange(next);
    }
  };

  const commit = () => {
    if (skipCommit.current) {
      skipCommit.current = false;
      setDraft(String(value));
      return;
    }
    commitValue(draft);
  };

  const closeWithCommit = () => {
    commitValue(draft);
    setKeypadOpen(false);
  };

  const closeWithoutCommit = () => {
    setDraft(String(value));
    setKeypadOpen(false);
  };

  const pressDigit = (digit: string) => {
    const maxLength = Math.max(1, String(max).length);
    setDraft((current) => {
      const next = current === "" || current === "0" ? digit : `${current}${digit}`;
      return next.slice(0, maxLength);
    });
  };

  return (
    <>
      <label className="number-field">
        <span className="number-field__label">{label}</span>
        <input
          type="text"
          inputMode="none"
          pattern="[0-9]*"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setKeypadOpen(true)}
          onClick={() => setKeypadOpen(true)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
              setKeypadOpen(false);
            }
            if (event.key === "Escape") {
              skipCommit.current = true;
              setDraft(String(value));
              setKeypadOpen(false);
              event.currentTarget.blur();
            }
          }}
          aria-label={label}
          aria-haspopup="dialog"
        />
      </label>
      {keypadOpen && (
        <NumberKeypad
          label={label}
          value={draft}
          onDigit={pressDigit}
          onBackspace={() =>
            setDraft((current) => (current.length <= 1 ? "" : current.slice(0, -1)))
          }
          onClear={() => setDraft("0")}
          onConfirm={closeWithCommit}
          onCancel={closeWithoutCommit}
        />
      )}
    </>
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

function PaletteFields({ command }: { command: Command }) {
  switch (command.kind) {
    case "forward":
      return (
        <>
          <span className="palette-block__value">
            {command.direction === "backward" ? "后退" : "前进"}
          </span>
          <span className="palette-block__value">{command.steps}</span>
          <span className="palette-block__suffix">步</span>
        </>
      );
    case "turn":
      return <span className="palette-block__value">左转</span>;
    case "repeat":
      return (
        <>
          <span className="palette-block__value">{command.times}</span>
          <span className="palette-block__suffix">次</span>
        </>
      );
    case "if":
      return (
        <span className="palette-block__condition">
          {describeCondition(command.condition)}
        </span>
      );
    case "setVar":
      return (
        <>
          <span className="palette-block__value">{command.name}</span>
          <span className="palette-block__suffix">为</span>
          <span className="palette-block__value">{command.value}</span>
        </>
      );
    case "changeVar":
      return (
        <>
          <span className="palette-block__value">{command.name}</span>
          <span className="palette-block__suffix">加</span>
          <span className="palette-block__value">{command.delta}</span>
        </>
      );
  }
}

interface BlockPaletteProps {
  entries: PaletteEntry[];
  onAdd(entry: PaletteEntry): void;
  drag: DragApi;
}

/** The single selection area: puzzle-shaped samples above the canvas. */
function BlockPalette({ entries, onAdd, drag }: BlockPaletteProps) {
  return (
    <div className="block-palette-panel" role="group" aria-label="积木指令栏">
      <div className="block-palette-panel__head">
        <p className="block-palette-panel__title">指令积木</p>
        <p className="block-palette-panel__hint">拖到画布连接，点击追加；拖回此处删除</p>
      </div>
      <div className="block-palette-panel__list" role="list">
        {entries.map((entry) => {
          const preview = entry.create();
          return (
            <button
              key={entry.key}
              type="button"
              role="listitem"
              className={`palette-block palette-block--${entry.kind}`}
              data-palette-key={entry.key}
              draggable={false}
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
              aria-label={`添加指令：${entry.label}。也可以拖到画布空位插入。`}
            >
              <span className="palette-block__glyph" aria-hidden="true">
                {entry.glyph}
              </span>
              <span className="palette-block__label">{entry.label}</span>
              <PaletteFields command={preview} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface BlueprintToolbarProps {
  view: BlueprintView;
  onZoomIn(): void;
  onZoomOut(): void;
  onReset(): void;
}

function BlueprintToolbar({
  view,
  onZoomIn,
  onZoomOut,
  onReset,
}: BlueprintToolbarProps) {
  const atMin = view.zoom <= MIN_BLUEPRINT_ZOOM + 1e-6;
  const atMax = view.zoom >= MAX_BLUEPRINT_ZOOM - 1e-6;

  return (
    <div className="blueprint-toolbar" role="toolbar" aria-label="画布缩放">
      <span className="blueprint-toolbar__label">蓝图</span>
      <button
        type="button"
        className="blueprint-zoom blueprint-zoom--out"
        aria-label="缩小画布"
        onClick={onZoomOut}
        disabled={atMin}
      >
        −
      </button>
      <output className="blueprint-zoom__value" aria-live="polite">
        {Math.round(view.zoom * 100)}%
      </output>
      <button
        type="button"
        className="blueprint-zoom blueprint-zoom--in"
        aria-label="放大画布"
        onClick={onZoomIn}
        disabled={atMax}
      >
        +
      </button>
      <button
        type="button"
        className="blueprint-zoom blueprint-zoom--reset"
        aria-label="重置画布视图"
        onClick={onReset}
      >
        重置
      </button>
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
          <span className="block__label">移动</span>
          <label className="select-field">
            <span className="select-field__label">方向</span>
            <select
              value={command.direction === "backward" ? "backward" : "forward"}
              onChange={(event) => {
                const next = event.target.value;
                const forward = { kind: "forward" as const, steps: command.steps };
                onChange(
                  next === "backward" ? { ...forward, direction: "backward" } : forward,
                );
              }}
              aria-label="移动方向"
            >
              <option value="forward">前进</option>
              <option value="backward">后退</option>
            </select>
          </label>
          <NumberField
            label="步数"
            value={command.steps}
            min={1}
            max={99}
            onChange={(steps) => onChange({ ...command, steps })}
          />
          <span className="block__suffix">步</span>
        </>
      );
    case "turn":
      return (
        <>
          <span className="block__label">转向</span>
          <label className="select-field">
            <span className="select-field__label">方向</span>
            <select
              value={command.direction}
              onChange={(event) =>
                onChange({
                  ...command,
                  direction: event.target.value === "right" ? "right" : "left",
                })
              }
              aria-label="转向方向"
            >
              <option value="left">左转</option>
              <option value="right">右转</option>
            </select>
          </label>
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
  start?: boolean;
}

/** A real list item that accepts a drop; it is never display:none. */
function DropSlot({ container, index, snapKey, start = false }: DropSlotProps) {
  const isSnapped = snapKey === slotKey(container, index);
  const className = [
    "drop-slot",
    start ? "drop-slot--start" : "",
    isSnapped ? "drop-slot--snap" : "",
  ]
    .filter((value) => value.length > 0)
    .join(" ");

  return (
    <li
      className={className}
      data-drop-container={JSON.stringify(container)}
      data-drop-index={index}
      aria-hidden="true"
    />
  );
}

interface BlockListProps {
  commands: Command[];
  onChange(commands: Command[]): void;
  label: string;
  container: ContainerPath;
  drag: DragApi;
  start?: boolean;
  emptyHint?: string;
  onRemove(address: BlockAddress): void;
  onMoveToSlot(from: BlockAddress, toIndex: number): void;
}

function BlockList({
  commands,
  onChange,
  label,
  container,
  drag,
  start = false,
  emptyHint,
  onRemove,
  onMoveToSlot,
}: BlockListProps) {
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
                start={start && index === 0}
              />
              <li
                className={`block-list__item${index === 0 ? " block-list__item--first" : ""}${index === commands.length - 1 ? " block-list__item--last" : ""}`}
                data-block-index={index}
              >
                <BlockCard
                  command={command}
                  address={address}
                  drag={drag}
                  label={`${describeCommand(command)}（第 ${index + 1} 条）`}
                  dragging={drag.draggingKeys.includes(addressKey(address))}
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
        <DropSlot
          container={container}
          index={commands.length}
          snapKey={drag.snapKey}
          start={start && commands.length === 0}
        />
      </ol>

      {commands.length === 0 && emptyHint !== undefined && (
        <p className="blueprint-empty">{emptyHint}</p>
      )}
    </div>
  );
}

interface DetachedBlockCardProps {
  block: DetachedBlock;
  drag: DragApi;
  onChange(index: number, command: Command): void;
}

function DetachedBlockCard({ block, drag, onChange }: DetachedBlockCardProps) {
  return (
    <div
      className="block--detached detached-block-stack"
      style={{ transform: `translate3d(${block.x}px, ${block.y}px, 0)` }}
      data-detached-id={block.id}
    >
      {block.commands.map((command, index) => (
        <article
          key={block.keys[index]}
          className={`block block--${command.kind}`}
          aria-label={`未连接指令 ${index + 1}：${describeCommand(command)}；拖到插槽连接，拖回指令栏删除`}
          onPointerDown={(event) => drag.startDetached(event, block, index)}
          onPointerMove={drag.move}
          onPointerUp={drag.end}
          onPointerCancel={drag.cancel}
        >
          <div className="block__head">
            <div className="block__content">
              <CommandFields
                command={command}
                onChange={(next) => onChange(index, next)}
              />
            </div>
          </div>
          <span className="block__socket" aria-hidden="true" />
        </article>
      ))}
    </div>
  );
}

const previewCommandKeys = new WeakMap<Command, string>();
let previewCommandKeySequence = 0;

function previewCommandKey(command: Command): string {
  const existing = previewCommandKeys.get(command);
  if (existing !== undefined) {
    return existing;
  }
  previewCommandKeySequence += 1;
  const key = `preview-${previewCommandKeySequence}`;
  previewCommandKeys.set(command, key);
  return key;
}

function BlockStackPreview({ commands }: { commands: Command[] }) {
  return (
    <div className="block-stack-preview" aria-hidden="true">
      {commands.map((command) => (
        <div
          key={previewCommandKey(command)}
          className={`block block--${command.kind} block-stack-preview__item`}
        >
          <div className="block__head">
            <div className="block__content">
              <CommandFields command={command} onChange={() => {}} />
            </div>
          </div>
          <span className="block__socket" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

interface BlockCardProps {
  command: Command;
  address: BlockAddress;
  drag: DragApi;
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
  drag,
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
      onPointerDown={(event) => drag.startBlock(event, address, command)}
      onPointerMove={drag.move}
      onPointerUp={drag.end}
      onPointerCancel={drag.cancel}
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
            drag={drag}
            label="重复体内的指令"
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
              drag={drag}
              label="条件成立时执行的指令"
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
              drag={drag}
              label="条件不成立时执行的指令"
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
 * Structured, fully controlled block editor. The start hat is fixed; every
 * other command is limited by the level's allowed command kinds and can be
 * nested inside repeat and if bodies. The palette appends or drags new blocks;
 * the canvas pans on empty space and zooms around the pointer.
 */
export default function BlockEditor({
  level,
  program,
  detached,
  onChange,
  onDetachedChange,
}: BlockEditorProps) {
  const allowed = useMemo(() => new Set(level.allowedCommands), [level.allowedCommands]);
  const palette = useMemo(() => paletteFor(allowed), [allowed]);

  const sessionRef = useRef<PointerSession | null>(null);
  const editorRootRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<PanSession | null>(null);
  const suppressClickUntilRef = useRef(0);
  const detachedIdRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const deleteTargetRef = useRef(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [view, setView] = useState<BlueprintView>(DEFAULT_BLUEPRINT_VIEW);
  const [panning, setPanning] = useState(false);

  const clearSession = useCallback((session: PointerSession) => {
    if (sessionRef.current === session) {
      sessionRef.current = null;
    }
    if (session.captureEl.hasPointerCapture(session.pointerId)) {
      session.captureEl.releasePointerCapture(session.pointerId);
    }
    dragRef.current = null;
    deleteTargetRef.current = false;
    setDrag(null);
    setDeleteTarget(false);
    const root = editorRootRef.current;
    root?.style.removeProperty("--drag-x");
    root?.style.removeProperty("--drag-y");
    root?.style.removeProperty("--drag-zoom");
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

  useEffect(() => {
    panRef.current = null;
    setPanning(false);
    setView(DEFAULT_BLUEPRINT_VIEW);
  }, [level.id]);

  // React's synthetic wheel listener is passive, so zoom needs a native one.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) {
      return undefined;
    }

    const handleWheel = (event: WheelEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select") !== null
      ) {
        return;
      }
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
      setView((current) =>
        zoomViewAt(
          current,
          point,
          current.zoom * Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY),
        ),
      );
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, []);

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

  const positionGhost = (x: number, y: number, zoom: number) => {
    const root = editorRootRef.current;
    if (root === null) {
      return;
    }
    root.style.setProperty("--drag-x", `${x}px`);
    root.style.setProperty("--drag-y", `${y}px`);
    root.style.setProperty("--drag-zoom", String(zoom));
  };

  const applyDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const applyDeleteTarget = (next: boolean) => {
    if (deleteTargetRef.current === next) {
      return;
    }
    deleteTargetRef.current = next;
    setDeleteTarget(next);
  };

  /** Nearest visible socket whose expanded zone contains the pointer. */
  const resolveSnap = (
    session: PointerSession,
    x: number,
    y: number,
    preferredKey: string | null = null,
  ): SnapSocket | null => {
    const sockets = collectSockets(editorRootRef.current, session.source);
    const nearest = pickSnap(
      sockets.map((socket) => socket.target),
      { x, y },
    );
    if (nearest === null) {
      return null;
    }
    const preferred =
      preferredKey === null
        ? undefined
        : sockets.find((candidate) => candidate.key === preferredKey)?.target;
    const chosen = chooseSnap(nearest, preferred, { x, y });
    if (chosen === null) {
      return null;
    }
    return sockets.find((candidate) => candidate.key === chosen.address) ?? null;
  };

  const beginSession = (
    event: ReactPointerEvent<HTMLElement>,
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
    if (source.kind !== "palette") {
      const control = target.closest(
        "button, input, select, textarea, a, [data-no-drag]",
      );
      if (control !== null && control.closest("[data-drag-handle]") === null) {
        return;
      }
    }
    if (preventDefault) {
      event.preventDefault();
    }
    const captureEl = event.currentTarget;
    const sourceEl =
      source.kind === "palette"
        ? captureEl
        : target.closest<HTMLElement>(".block");
    const sourceRect = sourceEl?.getBoundingClientRect();
    // Palette chips are 150x46; anchoring the ghost to the chip's top-left
    // pushes the snap corner far from the pointer. Keep palette drags close
    // to the pointer so every socket is reachable.
    const grabOffset =
      source.kind === "palette"
        ? { dx: -12, dy: -12 }
        : sourceRect === undefined
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
    event: ReactPointerEvent<HTMLElement>,
    address: BlockAddress,
    command: Command,
  ) => {
    const commands = getCommandTail(program, address);
    beginSession(
      event,
      {
        kind: "block",
        address,
        commands: commands.length > 0 ? commands : [command],
      },
      true,
    );
  };

  const startPalette = (
    event: ReactPointerEvent<HTMLElement>,
    entry: PaletteEntry,
  ) => {
    suppressClickUntilRef.current = 0;
    beginSession(event, { kind: "palette", commands: [entry.create()] }, false);
  };

  const startDetached = (
    event: ReactPointerEvent<HTMLElement>,
    block: DetachedBlock,
    index: number,
  ) => {
    beginSession(
      event,
      {
        kind: "detached",
        id: block.id,
        offset: index,
        commands: block.commands.slice(index),
        keys: block.keys.slice(index),
      },
      true,
    );
  };

  const handleMove = (event: ReactPointerEvent<HTMLElement>) => {
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

    positionGhost(
      event.clientX + session.grabOffset.dx,
      event.clientY + session.grabOffset.dy,
      view.zoom,
    );

    const snap = resolveSnap(
      session,
      event.clientX,
      event.clientY,
      dragRef.current?.snapKey ?? null,
    );
    const snapKey = snap === null ? null : snap.key;
    const snapPoint = snap === null ? null : { x: snap.target.x, y: snap.target.y };
    const current = dragRef.current;
    if (
      current === null ||
      current.snapKey !== snapKey ||
      (snapPoint === null && current.snapPoint !== null) ||
      (snapPoint !== null &&
        (current.snapPoint === null ||
          current.snapPoint.x !== snapPoint.x ||
          current.snapPoint.y !== snapPoint.y))
    ) {
      applyDrag({ source: session.source, snapKey, snapPoint });
    }

    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const overPalette =
      session.source.kind !== "palette" &&
      hit instanceof Element &&
      hit.closest(".block-palette-panel") !== null;
    applyDeleteTarget(overPalette);
  };

  const nextDetachedId = () => {
    detachedIdRef.current += 1;
    return `free-${detachedIdRef.current}`;
  };

  const createFree = (
    commands: Command[],
    position: { x: number; y: number },
    keys?: string[],
  ): DetachedBlock => {
    const id = nextDetachedId();
    return {
      id,
      commands,
      keys:
        keys ?? commands.map((_, index) => `${id}-${index}`),
      ...position,
    };
  };

  const removeDetachedTail = (id: string, offset: number): DetachedBlock[] =>
    detached.flatMap((item) => {
      if (item.id !== id) {
        return [item];
      }
      const remaining = item.commands.slice(0, offset);
      return remaining.length === 0
        ? []
        : [
            {
              ...item,
              commands: remaining,
              keys: item.keys.slice(0, offset),
            },
          ];
    });

  const handleEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const session = sessionRef.current;
    if (session === null || session.pointerId !== event.pointerId) {
      return;
    }

    const wasActive = session.active;
    const source = session.source;
    const snap = wasActive
      ? resolveSnap(
          session,
          event.clientX,
          event.clientY,
          dragRef.current?.snapKey ?? null,
        )
      : null;
    const active =
      snap !== null
        ? snap.drop
        : wasActive
          ? resolveActiveDrop(event.clientX, event.clientY, source)
          : null;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const overPalette =
      hit instanceof Element && hit.closest(".block-palette-panel") !== null;
    const viewport = viewportRef.current;
    const viewportRect = viewport?.getBoundingClientRect();
    const overViewport =
      viewportRect !== undefined &&
      event.clientX >= viewportRect.left &&
      event.clientX <= viewportRect.right &&
      event.clientY >= viewportRect.top &&
      event.clientY <= viewportRect.bottom;
    const freePosition =
      viewportRect === undefined
        ? null
        : {
            x:
              (event.clientX + session.grabOffset.dx - viewportRect.left - view.x) /
              view.zoom,
            y:
              (event.clientY + session.grabOffset.dy - viewportRect.top - view.y) /
              view.zoom,
          };

    clearSession(session);

    if (!wasActive) {
      return;
    }
    if (source.kind === "palette") {
      suppressClickUntilRef.current = performance.now() + 600;
    }

    if (active !== null) {
      if (source.kind === "block") {
        const next = moveCommandStack(program, source.address, active);
        if (next !== program) {
          onChange(next);
        }
        return;
      }
      if (source.kind === "detached") {
        const next = insertCommands(program, active, source.commands);
        if (next !== program) {
          onChange(next);
          onDetachedChange(removeDetachedTail(source.id, source.offset));
        }
        return;
      }
      const next = insertCommands(program, active, source.commands);
      if (next !== program) {
        onChange(next);
      }
      return;
    }

    if (overPalette) {
      if (source.kind === "block") {
        const next = removeCommandTail(program, source.address);
        if (next !== program) {
          onChange(next);
        }
      } else if (source.kind === "detached") {
        onDetachedChange(removeDetachedTail(source.id, source.offset));
      }
      return;
    }

    if (!overViewport || freePosition === null) {
      return;
    }

    if (source.kind === "block") {
      const next = removeCommandTail(program, source.address);
      if (next === program) {
        return;
      }
      onChange(next);
      onDetachedChange([
        ...detached,
        createFree(source.commands, freePosition),
      ]);
      return;
    }

    if (source.kind === "detached") {
      if (source.offset === 0) {
        onDetachedChange(
          detached.map((item) =>
            item.id === source.id ? { ...item, ...freePosition } : item,
          ),
        );
      } else {
        onDetachedChange([
          ...removeDetachedTail(source.id, source.offset),
          createFree(source.commands, freePosition, source.keys),
        ]);
      }
      return;
    }

    onDetachedChange([
      ...detached,
      createFree(source.commands, freePosition),
    ]);
  };

  const handleCancel = (event: ReactPointerEvent<HTMLElement>) => {
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

  const handlePanStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }
    if (sessionRef.current !== null || drag !== null) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest(PAN_IGNORE_SELECTOR) !== null) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };
    setPanning(true);
  };

  const handlePanMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (pan === null || pan.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - pan.lastX;
    const dy = event.clientY - pan.lastY;
    if (dx === 0 && dy === 0) {
      return;
    }
    pan.lastX = event.clientX;
    pan.lastY = event.clientY;
    setView((current) => panViewBy(current, dx, dy));
  };

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (pan === null || pan.pointerId !== event.pointerId) {
      return;
    }
    panRef.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePanLostCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (pan !== null && pan.pointerId === event.pointerId) {
      panRef.current = null;
      setPanning(false);
    }
  };

  const zoomAtViewportCenter = (next: (zoom: number) => number) => {
    const viewport = viewportRef.current;
    const point =
      viewport === null
        ? { x: 0, y: 0 }
        : (() => {
            const rect = viewport.getBoundingClientRect();
            return { x: rect.width / 2, y: rect.height / 2 };
          })();
    setView((current) => zoomViewAt(current, point, next(current.zoom)));
  };

  const zoomIn = () =>
    zoomAtViewportCenter((zoom) => zoom + BLUEPRINT_ZOOM_STEP);

  const zoomOut = () =>
    zoomAtViewportCenter((zoom) => zoom - BLUEPRINT_ZOOM_STEP);

  const resetView = () => {
    panRef.current = null;
    setPanning(false);
    setView(DEFAULT_BLUEPRINT_VIEW);
  };

  const removeAt = (address: BlockAddress) => {
    const next = removeCommandTail(program, address);
    if (next !== program) {
      onChange(next);
    }
  };

  const moveToSlot = (from: BlockAddress, toIndex: number) => {
    const next = moveCommandStack(program, from, {
      container: from.container,
      index: toIndex,
    });
    if (next !== program) {
      onChange(next);
    }
  };

  const draggingKeys: string[] = [];
  if (drag !== null && drag.source.kind === "block") {
    const source = drag.source;
    for (let offset = 0; offset < source.commands.length; offset += 1) {
      draggingKeys.push(
        addressKey({
          container: source.address.container,
          index: source.address.index + offset,
        }),
      );
    }
  }

  const dragApi: DragApi = {
    snapKey: drag === null ? null : drag.snapKey,
    draggingKeys,
    startBlock,
    startPalette,
    startDetached,
    move: handleMove,
    end: handleEnd,
    cancel: handleCancel,
    consumeSuppressedClick,
  };

  const sceneTransform = `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})`;

  return (
    <section
      ref={editorRootRef}
      className={`block-editor blueprint-editor${drag !== null ? " block-editor--dragging" : ""}${deleteTarget ? " block-editor--delete-target" : ""}`}
      aria-label="积木指令编辑器：拖动积木任意位置移动或连接，拖回指令栏删除，从上方指令栏拖入画布。"
    >
      <BlockPalette
        entries={palette}
        onAdd={(entry) => onChange([...program, entry.create()])}
        drag={dragApi}
      />

      <BlueprintToolbar
        view={view}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
      />

      <div
        ref={viewportRef}
        className={`blueprint-viewport${panning ? " blueprint-viewport--panning" : ""}${drag !== null ? " blueprint-viewport--dragging" : ""}`}
        role="group"
        aria-label="程序画布：拖动空白处平移，滚轮缩放"
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onLostPointerCapture={handlePanLostCapture}
      >
        <div
          className="blueprint-scene"
          style={{ transform: sceneTransform, transformOrigin: "0 0" }}
        >
          <div
            className="blueprint-start"
            data-blueprint-start=""
            aria-label="固定起始积木：当开始被点击（不可删除）"
          >
            <span className="blueprint-start__dot" aria-hidden="true" />
            <span className="blueprint-start__text">当开始被点击</span>
            <span className="blueprint-start-lock" aria-hidden="true">
              固定
            </span>
            <span className="blueprint-start__spark" aria-hidden="true">
              ✦
            </span>
          </div>

          <BlockList
            commands={program}
            onChange={onChange}
            drag={dragApi}
            label="程序指令"
            container={[]}
            start
            emptyHint="从指令栏拖入第一块积木"
            onRemove={removeAt}
            onMoveToSlot={moveToSlot}
          />

          <div className="blueprint-free-layer">
            {detached.map((block) => (
              <DetachedBlockCard
                key={block.id}
                block={block}
                drag={dragApi}
                onChange={(index, command) =>
                  onDetachedChange(
                    detached.map((item) =>
                      item.id === block.id
                        ? {
                            ...item,
                            commands: item.commands.map((current, currentIndex) =>
                              currentIndex === index ? command : current,
                            ),
                          }
                        : item,
                    ),
                  )
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="block-editor__meta">
        <span>指令节点 {countCommands(program)} 个</span>
        <span>代码长度 {1 + countCommands(program)}</span>
      </div>

      {drag !== null && (
        <>
          {drag.snapPoint !== null && (
            <div
              className="block-drag-target"
              style={{
                transform: `translate3d(${drag.snapPoint.x - 10 * view.zoom}px, ${drag.snapPoint.y - 10 * view.zoom}px, 0) scale(${view.zoom})`,
              }}
              aria-hidden="true"
              inert
            >
              <div className="block-drag-target__outline">
                <BlockStackPreview commands={drag.source.commands} />
              </div>
            </div>
          )}
          <div
            className={`block-drag-ghost block-drag-ghost--${drag.source.commands[0].kind}`}
            aria-hidden="true"
            inert
          >
            <BlockStackPreview commands={drag.source.commands} />
          </div>
        </>
      )}
    </section>
  );
}
