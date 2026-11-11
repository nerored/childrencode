import type { TutorialStep } from "../../domain/types";

export interface HintPanelProps {
  hint: string;
  tutorial: TutorialStep[];
}

const HIGHLIGHT_LABEL: Record<NonNullable<TutorialStep["highlight"]>, string> = {
  palette: "指令栏",
  run: "运行",
  grid: "场景",
};

/** Level hint plus the optional data-driven tutorial bubbles. */
export default function HintPanel({ hint, tutorial }: HintPanelProps) {
  return (
    <aside className="hint-panel" aria-labelledby="level-hint-title">
      <div className="hint-panel__head">
        <span className="hint-panel__icon" aria-hidden="true">
          ?
        </span>
        <h3 className="hint-panel__title" id="level-hint-title">任务提示</h3>
      </div>
      <p className="hint-panel__hint">{hint}</p>

      {tutorial.length > 0 && (
        <div className="hint-panel__tutorial">
          <p className="hint-panel__tutorial-title">跟着做</p>
          <ol className="hint-panel__steps">
            {tutorial.map((step, index) => (
              <li
                key={`${step.text}-${index}`}
                className="hint-panel__step"
                data-highlight={step.highlight ?? "none"}
              >
                <span className="hint-panel__index" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="hint-panel__step-body">
                  <p>{step.text}</p>
                  {step.highlight !== undefined && (
                    <span className="hint-panel__tag">{HIGHLIGHT_LABEL[step.highlight]}</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
}
