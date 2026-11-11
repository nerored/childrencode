import { useCallback, useEffect, useRef, useState } from "react";
import { formatTextProgram } from "../../domain/commands";
import type { Command, LevelSpec, RunResult, Score } from "../../domain/types";
import { parseTextProgram } from "../../engine/parse";
import { scoreRun } from "../../engine/score";
import { simulate } from "../../engine/simulate";
import BlockEditor, { type DetachedBlock } from "./BlockEditor";
import Stage3D from "./Stage3D";
import HintPanel from "./HintPanel";
import ResultModal from "./ResultModal";
import {
  buildPlaybackFrames,
  PLAYBACK_END_DELAY_MS,
  PLAYBACK_STEP_MS,
  type StageFrame,
} from "./playback";
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
coder.backward(2)
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
  const [detached, setDetached] = useState<DetachedBlock[]>([]);
  const [pythonSource, setPythonSource] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<RunResult | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [frames, setFrames] = useState<StageFrame[] | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const finishedRef = useRef(false);
  const resultRef = useRef<RunResult | null>(null);
  const scoreRef = useRef<Score | null>(null);
  const onCompleteRef = useRef(onComplete);
  const levelIdRef = useRef(level.id);

  const pythonCode = pythonSource ?? formatTextProgram(program);
  const pythonLineCount =
    pythonCode.trim().length === 0
      ? 0
      : pythonCode.split("\n").filter((line) => line.trim().length > 0).length;

  // Keep the timer callback current without restarting the playback timer when
  // a callback prop or the stored result changes identity.
  useEffect(() => {
    resultRef.current = result;
    scoreRef.current = score;
    onCompleteRef.current = onComplete;
    levelIdRef.current = level.id;
  });

  const finishPlayback = useCallback(() => {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    const finalResult = resultRef.current;
    const finalScore = scoreRef.current;

    setPlaying(false);
    setResultOpen(true);

    if (finalResult !== null && finalResult.completed && finalScore !== null) {
      onCompleteRef.current(levelIdRef.current, finalScore.stars);
    }
  }, []);

  useEffect(() => {
    if (!playing || frames === null) {
      return;
    }

    const lastIndex = frames.length - 1;
    if (frameIndex >= lastIndex) {
      const timer = window.setTimeout(finishPlayback, PLAYBACK_END_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setFrameIndex((current) => (current < lastIndex ? current + 1 : current));
    }, PLAYBACK_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [playing, frameIndex, frames, finishPlayback]);

  useEffect(() => {
    setProgram([]);
    setDetached([]);
    setPythonSource(null);
    setParseError(undefined);
    setResult(null);
    setScore(null);
    setResultOpen(false);
    setAttempts(0);
    setFrames(null);
    setFrameIndex(0);
    setPlaying(false);
    finishedRef.current = true;
  }, [level.id]);

  useEffect(() => {
    setParseError(undefined);
  }, [track]);

  const handleRun = () => {
    if (playing) {
      return;
    }

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
    const nextFrames = buildPlaybackFrames(level, run);

    finishedRef.current = false;
    setResult(run);
    setScore(nextScore);
    setResultOpen(false);
    setAttempts((current) => current + 1);
    setFrames(nextFrames);
    setFrameIndex(0);
    setPlaying(true);
  };

  const handleSkip = () => {
    if (!playing || frames === null) {
      return;
    }
    setFrameIndex(frames.length - 1);
    finishPlayback();
  };

  const cancelPlayback = () => {
    finishedRef.current = true;
    setPlaying(false);
    setFrames(null);
    setFrameIndex(0);
    setResultOpen(false);
  };

  const handleReset = () => {
    if (playing) {
      return;
    }
    cancelPlayback();
    setProgram([]);
    setDetached([]);
    setPythonSource(null);
    setParseError(undefined);
    setResult(null);
    setScore(null);
  };

  const handleNext = () => {
    if (nextLevelId === undefined) {
      return;
    }
    cancelPlayback();
    onNext();
  };

  const handleBack = () => {
    cancelPlayback();
    onBack();
  };

  const currentFrame =
    frames === null ? null : frames[Math.min(frameIndex, frames.length - 1)] ?? null;
  const stepsDisplay = currentFrame !== null ? currentFrame.steps : result?.steps ?? "—";
  const collectedCount =
    currentFrame !== null ? currentFrame.rescued.length : result?.collected.length ?? 0;
  const totalItems = level.goal.items.length;

  const stateClassName = playing
    ? "level-runbar__state level-runbar__state--playing"
    : result === null
      ? "level-runbar__state"
      : `level-runbar__state ${result.completed ? "is-success" : "is-failed"}`;
  const stateLabel = playing
    ? "运行中…"
    : result === null
      ? "等待运行"
      : result.completed
        ? "已通关"
        : "未完成";

  return (
    <section className="level-screen" aria-label={`第 ${level.index} 关：${level.title}`}>
      <header className="level-topbar">
        <div className="level-topbar__row">
          <button type="button" className="level-button level-button--ghost level-back" onClick={handleBack}>
            <span aria-hidden="true">←</span>
            返回地图
          </button>
          <p className="level-eyebrow">第 {level.index} 关</p>
        </div>

        <div className="level-topbar__identity">
          <h1 className="level-title">{level.title}</h1>
          <p className="level-brief">{level.brief}</p>
        </div>

        <div className="level-status-row" aria-label="关卡状态">
          <div className="level-track" role="group" aria-label="编程方式">
            <button
              type="button"
              className="level-track__button"
              aria-pressed={track === "blocks"}
              onClick={() => onTrackChange("blocks")}
              disabled={playing}
            >
              积木
            </button>
            <button
              type="button"
              className="level-track__button"
              aria-pressed={track === "python"}
              onClick={() => onTrackChange("python")}
              disabled={playing}
            >
              Python
            </button>
          </div>
          <p className="level-attempts">
            已尝试 <strong>{attempts}</strong> 次
          </p>
        </div>
      </header>

      <div className={`level-layout${track === "blocks" ? " level-layout--blocks" : ""}`}>
        <div className="level-stage-column">
          <div className="level-stage-shell">
            <div className="level-stage-map">
              <Stage3D level={level} frame={currentFrame} />
            </div>
          </div>

          <div className="level-runbar" role="status" aria-live="polite">
            <span className="level-runbar__item">
              <span className="level-runbar__label">步数</span>
              <strong>{stepsDisplay}</strong>
            </span>
            <span className="level-runbar__item">
              <span className="level-runbar__label">企鹅</span>
              <strong>
                {collectedCount}/{totalItems}
              </strong>
            </span>
            <span className="level-runbar__item">
              <span className="level-runbar__label">代码长度</span>
              <strong>{score?.codeLength ?? "—"}</strong>
            </span>
            <span className={stateClassName}>{stateLabel}</span>
          </div>
        </div>

        <div
          className={`level-editor-column${track === "blocks" ? " level-editor-column--blocks" : ""}`}
        >
          {track === "blocks" ? (
            <section className="level-editor-shell" aria-labelledby="editor-title">
              <header className="level-editor-heading">
                <div>
                  <p className="level-eyebrow">指令编排</p>
                  <h2 className="editor-panel__title" id="editor-title">编排程序</h2>
                </div>
                <HintPanel hint={level.hint} tutorial={level.tutorial} />
              </header>
              <BlockEditor
                level={level}
                program={program}
                detached={detached}
                onChange={setProgram}
                onDetachedChange={setDetached}
              />
            </section>
          ) : (
            <section className="level-editor-shell" aria-labelledby="editor-title">
              <header className="level-editor-heading">
                <div>
                  <p className="level-eyebrow">Python 编程</p>
                  <h2 className="editor-panel__title" id="editor-title">编写你的程序</h2>
                </div>
                <div className="level-editor-heading__meta">
                  <span className="editor-panel__badge">{pythonLineCount} 行</span>
                  <HintPanel hint={level.hint} tutorial={level.tutorial} />
                </div>
              </header>

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
                    disabled={playing}
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
                  disabled={playing}
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
            </section>
          )}
        </div>

        <section className="level-run-module" role="group" aria-label="程序运行控制">
          <div className="level-run-module__thresholds">
            <span>目标</span>
            <strong>代码 ≤ {level.parCode}</strong>
            <span>·</span>
            <strong>步数 ≤ {level.parSteps}</strong>
          </div>
          <div className="level-run-module__actions">
            <button
              type="button"
              className="level-button level-button--run"
              onClick={handleRun}
              disabled={playing}
            >
              <span aria-hidden="true">▶</span>
              运行程序
            </button>
            <button
              type="button"
              className="level-button level-button--ghost"
              onClick={handleReset}
              disabled={playing}
            >
              重置程序
            </button>
            {playing && (
              <button
                type="button"
                className="level-button level-button--skip"
                onClick={handleSkip}
              >
                跳过播放
              </button>
            )}
          </div>
          <div className="level-run-module__metrics">
            <span>步数 <strong>{stepsDisplay}</strong></span>
            <span>企鹅 <strong>{collectedCount}/{totalItems}</strong></span>
            <span>代码 <strong>{score?.codeLength ?? "—"}</strong></span>
            <span className={stateClassName}>{stateLabel}</span>
          </div>
        </section>
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
