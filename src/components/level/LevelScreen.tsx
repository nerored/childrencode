import { useEffect, useState } from "react";
import { formatTextProgram } from "../../domain/commands";
import type { Command, LevelSpec, RunResult, Score } from "../../domain/types";
import { parseTextProgram } from "../../engine/parse";
import { scoreRun } from "../../engine/score";
import { simulate } from "../../engine/simulate";
import BlockEditor from "./BlockEditor";
import GridStage from "./GridStage";
import HintPanel from "./HintPanel";
import ResultModal from "./ResultModal";
import "./level.css";

export interface LevelScreenProps {
  level: LevelSpec;
  track: "blocks" | "python";
  onTrackChange(track: "blocks" | "python"): void;
  onBack(): void;
  onComplete(levelId: string, stars: number): void;
  onNext(): void;
  nextLevelId?: string;
}

const PYTHON_CHEATSHEET = `coder.forward(2)
coder.turnLeft()
coder.turnRight()
repeat(3):
  coder.forward(1)
if coder.pathAhead():
  coder.forward(1)
else:
  coder.turnRight()
score = 1
score += 1`;

/** Full level play screen: stage, editor, run controls and result modal. */
export default function LevelScreen({
  level,
  track,
  onTrackChange,
  onBack,
  onComplete,
  onNext,
  nextLevelId,
}: LevelScreenProps) {
  const [program, setProgram] = useState<Command[]>([]);
  const [pythonSource, setPythonSource] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<RunResult | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const pythonCode = pythonSource ?? formatTextProgram(program);
  const pythonLineCount =
    pythonCode.trim().length === 0
      ? 0
      : pythonCode.split("\n").filter((line) => line.trim().length > 0).length;

  useEffect(() => {
    setProgram([]);
    setPythonSource(null);
    setParseError(undefined);
    setResult(null);
    setScore(null);
    setResultOpen(false);
    setAttempts(0);
  }, [level.id]);

  useEffect(() => {
    setParseError(undefined);
  }, [track]);

  const handleRun = () => {
    let activeProgram = program;

    if (track === "python") {
      const parsed = parseTextProgram(pythonCode);
      if (parsed.error !== undefined) {
        setParseError(parsed.error);
        return;
      }
      setParseError(undefined);
      activeProgram = parsed.program;
      setProgram(parsed.program);
    }

    const run = simulate(level, activeProgram);
    const nextScore = scoreRun(level, activeProgram, run);

    setResult(run);
    setScore(nextScore);
    setResultOpen(true);
    setAttempts((current) => current + 1);

    if (run.completed) {
      onComplete(level.id, nextScore.stars);
    }
  };

  const handleReset = () => {
    setProgram([]);
    setPythonSource(null);
    setParseError(undefined);
    setResult(null);
    setScore(null);
    setResultOpen(false);
  };

  const handleNext = () => {
    if (nextLevelId === undefined) {
      return;
    }
    setResultOpen(false);
    onNext();
  };

  const handleBack = () => {
    setResultOpen(false);
    onBack();
  };

  const collectedCount = result?.collected.length ?? 0;
  const totalItems = level.goal.items.length;

  return (
    <section className="level-screen" aria-label={`第 ${level.index} 关：${level.title}`}>
      <header className="level-topbar">
        <button type="button" className="level-button level-button--ghost level-back" onClick={handleBack}>
          <span aria-hidden="true">←</span>
          返回地图
        </button>

        <div className="level-topbar__identity">
          <p className="level-eyebrow">第 {level.index} 关</p>
          <h1 className="level-title">{level.title}</h1>
          <p className="level-brief">{level.brief}</p>
        </div>

        <div className="level-topbar__side">
          <div className="level-track" role="group" aria-label="编程方式">
            <button
              type="button"
              className="level-track__button"
              aria-pressed={track === "blocks"}
              onClick={() => onTrackChange("blocks")}
            >
              积木
            </button>
            <button
              type="button"
              className="level-track__button"
              aria-pressed={track === "python"}
              onClick={() => onTrackChange("python")}
            >
              Python
            </button>
          </div>
          <p className="level-attempts">
            已尝试 <strong>{attempts}</strong> 次
          </p>
        </div>
      </header>

      <div className="level-layout">
        <div className="level-stage-column">
          <GridStage level={level} run={result} />

          <div className="level-runbar" role="status" aria-live="polite">
            <span className="level-runbar__item">
              <span className="level-runbar__label">步数</span>
              <strong>{result?.steps ?? "—"}</strong>
            </span>
            <span className="level-runbar__item">
              <span className="level-runbar__label">道具</span>
              <strong>
                {collectedCount}/{totalItems}
              </strong>
            </span>
            <span className="level-runbar__item">
              <span className="level-runbar__label">代码长度</span>
              <strong>{score?.codeLength ?? "—"}</strong>
            </span>
            <span
              className={`level-runbar__state${
                result === null ? "" : result.completed ? " is-success" : " is-failed"
              }`}
            >
              {result === null ? "等待运行" : result.completed ? "已通关" : "未完成"}
            </span>
          </div>
        </div>

        <div className="level-editor-column">
          <section className="editor-panel" aria-labelledby="editor-title">
            <header className="editor-panel__head">
              <div>
                <p className="level-eyebrow">{track === "blocks" ? "积木编程" : "Python 编程"}</p>
                <h2 className="editor-panel__title" id="editor-title">
                  {track === "blocks" ? "搭建你的程序" : "编写你的程序"}
                </h2>
              </div>
              <span className="editor-panel__badge">
                {track === "blocks" ? `${program.length} 条顶层指令` : `${pythonLineCount} 行`}
              </span>
            </header>

            {track === "blocks" ? (
              <BlockEditor level={level} program={program} onChange={setProgram} />
            ) : (
              <div className="python-editor">
                <div className="python-editor__bar">
                  <span className="python-editor__filename">main.py</span>
                  <button
                    type="button"
                    className="level-button level-button--tiny"
                    onClick={() => {
                      setPythonSource(formatTextProgram(program));
                      setParseError(undefined);
                    }}
                  >
                    载入积木代码
                  </button>
                </div>
                <textarea
                  className="python-editor__code"
                  value={pythonCode}
                  onChange={(event) => {
                    setPythonSource(event.target.value);
                    setParseError(undefined);
                  }}
                  spellCheck={false}
                  rows={14}
                  aria-label="Python 代码编辑器"
                  aria-invalid={parseError !== undefined}
                  aria-describedby={parseError !== undefined ? "python-error" : "python-help"}
                />
                {parseError !== undefined ? (
                  <p className="python-editor__error" id="python-error" role="alert">
                    {parseError}
                  </p>
                ) : (
                  <p className="python-editor__help" id="python-help">
                    每级缩进 2 个空格；变量名使用英文字母或下划线。
                  </p>
                )}
                <details className="python-editor__cheatsheet">
                  <summary>语法速查</summary>
                  <pre>
                    <code>{PYTHON_CHEATSHEET}</code>
                  </pre>
                </details>
              </div>
            )}

            <footer className="editor-panel__actions">
              <button type="button" className="level-button level-button--run" onClick={handleRun}>
                <span aria-hidden="true">▶</span>
                运行程序
              </button>
              <button type="button" className="level-button level-button--ghost" onClick={handleReset}>
                重置程序
              </button>
              <span className="editor-panel__par">
                目标：代码 ≤ {level.parCode} · 步数 ≤ {level.parSteps}
              </span>
            </footer>
          </section>

          <HintPanel hint={level.hint} tutorial={level.tutorial} />
        </div>
      </div>

      {resultOpen && result !== null && score !== null && (
        <ResultModal
          level={level}
          score={score}
          attempts={attempts}
          hasNext={nextLevelId !== undefined}
          onRetry={() => setResultOpen(false)}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
    </section>
  );
}
