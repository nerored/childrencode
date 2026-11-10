import { useEffect, useMemo, useRef, useState } from "react";
import { countCommands } from "../../domain/commands";
import type { Command, CommandKind, Condition, LevelSpec } from "../../domain/types";

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
      return "前方有道具";
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

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
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
  compact?: boolean;
}

function Palette({ entries, onAdd, compact = false }: PaletteProps) {
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
            onClick={() => onAdd(entry)}
            aria-label={`添加指令：${entry.label}`}
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
          <option value="itemAhead">前方有道具</option>
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

interface BlockListProps {
  commands: Command[];
  onChange(commands: Command[]): void;
  allowed: Set<CommandKind>;
  palette: PaletteEntry[];
  label: string;
  depth: number;
  showPalette?: boolean;
}

function BlockList({
  commands,
  onChange,
  allowed,
  palette,
  label,
  depth,
  showPalette = true,
}: BlockListProps) {
  const add = (entry: PaletteEntry) => onChange([...commands, entry.create()]);

  return (
    <div className="block-list-wrap">
      {commands.length === 0 ? (
        <p className="block-list__empty">
          还没有指令{showPalette ? "，从下方添加一条" : "，从上方选择指令添加"}。
        </p>
      ) : (
        <ol className="block-list" aria-label={label}>
          {commands.map((command, index) => (
            <li key={`${command.kind}-${index}`} className="block-list__item">
              <BlockCard
                command={command}
                allowed={allowed}
                palette={palette}
                depth={depth}
                label={`${describeCommand(command)}（第 ${index + 1} 条）`}
                onChange={(next) => onChange(replaceAt(commands, index, next))}
                onRemove={() => onChange(commands.filter((_, current) => current !== index))}
                onMoveUp={
                  index > 0 ? () => onChange(moveItem(commands, index, index - 1)) : undefined
                }
                onMoveDown={
                  index < commands.length - 1
                    ? () => onChange(moveItem(commands, index, index + 1))
                    : undefined
                }
              />
            </li>
          ))}
        </ol>
      )}

      {showPalette && <Palette entries={palette} onAdd={add} compact />}
    </div>
  );
}

interface BlockCardProps {
  command: Command;
  allowed: Set<CommandKind>;
  palette: PaletteEntry[];
  depth: number;
  label: string;
  onChange(command: Command): void;
  onRemove(): void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function BlockCard({
  command,
  allowed,
  palette,
  depth,
  label,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: BlockCardProps) {
  return (
    <article className={`block block--${command.kind}`} aria-label={label}>
      <div className="block__head">
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
            label="重复体内的指令"
            depth={depth + 1}
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
              label="条件成立时执行的指令"
              depth={depth + 1}
            />
          </div>
          <div className="block__branch block__branch--else">
            <span className="block__branch-label">否则</span>
            <BlockList
              commands={command.else ?? []}
              onChange={(next) => onChange(withElseBranch(command, next))}
              allowed={allowed}
              palette={palette}
              label="条件不成立时执行的指令"
              depth={depth + 1}
            />
          </div>
        </>
      )}
    </article>
  );
}

/**
 * Structured, fully controlled block editor. The hat block is fixed; every
 * other command is limited by the level's allowed command kinds and can be
 * nested inside repeat and if bodies.
 */
export default function BlockEditor({ level, program, onChange }: BlockEditorProps) {
  const allowed = useMemo(() => new Set(level.allowedCommands), [level.allowedCommands]);
  const palette = useMemo(() => paletteFor(allowed), [allowed]);

  return (
    <section className="block-editor" aria-label="积木指令编辑器">
      <div className="block-hat" aria-label="固定起始积木：当开始被点击">
        <span className="block-hat__dot" aria-hidden="true" />
        <span className="block-hat__text">当开始被点击</span>
        <span className="block-hat__spark" aria-hidden="true">
          ✦
        </span>
      </div>

      <Palette entries={palette} onAdd={(entry) => onChange([...program, entry.create()])} />

      <BlockList
        commands={program}
        onChange={onChange}
        allowed={allowed}
        palette={palette}
        label="程序指令"
        depth={0}
        showPalette={false}
      />

      <div className="block-editor__meta">
        <span>指令节点 {countCommands(program)} 个</span>
        <span>代码长度 {1 + countCommands(program)}</span>
      </div>
    </section>
  );
}
