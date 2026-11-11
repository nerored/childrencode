import { useEffect, useRef, useState } from "react";
import { formatTextProgram } from "../../domain/commands";
import type { LevelSpec, Score } from "../../domain/types";

export interface ResultModalProps {
  level: LevelSpec;
  score: Score;
  attempts: number;
  hasNext: boolean;
  onRetry(): void;
  onNext(): void;
  onBack(): void;
}

const FAILURE_LABEL: Record<string, string> = {
  "out-of-bounds": "走出了地图边界",
  obstacle: "撞上了障碍物",
  "max-steps": "运行步数超出上限",
  incomplete: "任务还没有完成",
};

function failureLabel(reason?: string): string {
  if (reason === undefined) {
    return "任务还没有完成";
  }
  return FAILURE_LABEL[reason] ?? "任务还没有完成";
}

/**
 * End-of-run summary with stars, par comparisons, next/retry actions and the
 * reference solution once the level is cleared or after two failed attempts.
 */
export default function ResultModal({
  level,
  score,
  attempts,
  hasNext,
  onRetry,
  onNext,
  onBack,
}: ResultModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showReference, setShowReference] = useState(false);

  const codeMet = score.codeLength <= level.parCode;
  const stepsMet = score.steps <= level.parSteps;
  const codeStar = score.completed && codeMet;
  const stepsStar = score.completed && stepsMet;
  const canShowReference = score.completed || attempts >= 2;
  const failedAttemptsLeft = Math.max(0, 2 - attempts);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onRetry();
      }
    };
    document.addEventListener("keydown", handleKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [onRetry]);

  return (
    <div className="result-modal">
      <div
        className="result-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        aria-describedby="result-summary"
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="result-modal__hero">
          <p className="result-modal__eyebrow">
            {score.completed ? "任务完成" : "任务未完成"}
          </p>
          <h2 className="result-modal__title" id="result-title">
            {score.completed ? "通关成功！" : "差一点点"}
          </h2>
          <div
            className="result-stars"
            role="img"
            aria-label={`获得 ${score.stars} 颗星，共 3 颗`}
          >
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={index < score.stars ? "result-star result-star--filled" : "result-star"}
                aria-hidden="true"
              >
                ★
              </span>
            ))}
          </div>
          <p className="result-modal__summary" id="result-summary">
            {score.completed
              ? `第 ${attempts} 次尝试完成本关。`
              : `${failureLabel(score.unpassableReason)} · 第 ${attempts} 次尝试`}
          </p>
        </div>

        <div className="result-metrics">
          <div className="result-metric" data-met={codeMet}>
            <span className="result-metric__label">代码长度</span>
            <strong className="result-metric__value">
              {score.codeLength}
              <span> / {level.parCode}</span>
            </strong>
            <span className="result-metric__status">
              {codeStar
                ? "达标 +1★"
                : codeMet
                  ? "长度达标"
                  : `超出 ${score.codeLength - level.parCode}`}
            </span>
          </div>
          <div className="result-metric" data-met={stepsMet}>
            <span className="result-metric__label">运行步数</span>
            <strong className="result-metric__value">
              {score.steps}
              <span> / {level.parSteps}</span>
            </strong>
            <span className="result-metric__status">
              {stepsStar
                ? "达标 +1★"
                : stepsMet
                  ? "步数达标"
                  : `超出 ${score.steps - level.parSteps}`}
            </span>
          </div>
        </div>

        <div className="result-actions">
          <button
            type="button"
            className={`level-button ${
              score.completed ? "level-button--secondary" : "level-button--primary"
            }`}
            onClick={onRetry}
          >
            重试
          </button>
          <button
            type="button"
            className={`level-button ${
              score.completed ? "level-button--primary" : "level-button--ghost"
            }`}
            onClick={onNext}
            disabled={!score.completed || !hasNext}
          >
            下一关
          </button>
          <button type="button" className="level-button level-button--ghost result-actions__secondary" onClick={onBack}>
            返回地图
          </button>
          <button
            type="button"
            className="level-button level-button--ghost result-actions__secondary"
            onClick={() => setShowReference((current) => !current)}
            disabled={!canShowReference}
            aria-expanded={showReference}
            aria-controls={showReference ? "result-reference" : undefined}
          >
            查看参考解
          </button>
        </div>

        {!canShowReference && failedAttemptsLeft > 0 && (
          <p className="result-modal__note">
            再失败 {failedAttemptsLeft} 次后可以查看参考解。
          </p>
        )}

        {canShowReference && showReference && (
          <div className="result-reference" id="result-reference">
            <div className="result-reference__head">
              <span>参考解</span>
              <span className="result-reference__tag">Python</span>
            </div>
            <pre className="result-reference__code">
              <code>{formatTextProgram(level.standardAnswer)}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
