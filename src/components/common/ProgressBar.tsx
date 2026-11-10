export type ProgressTone = "mint" | "gold" | "cyan";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  tone?: ProgressTone;
  showValue?: boolean;
  className?: string;
}

/** Slim progress meter for stars and completion ratios. */
export default function ProgressBar({
  value,
  max,
  label,
  tone = "mint",
  showValue = false,
  className,
}: ProgressBarProps) {
  const safeMax = Math.max(0, max);
  const safeValue = Math.min(safeMax, Math.max(0, value));
  const percent = safeMax === 0 ? 0 : (safeValue / safeMax) * 100;
  const accessibleLabel = label ?? "收集进度";

  return (
    <span className={["progress", `progress--${tone}`, className].filter(Boolean).join(" ")}>
      {(label !== undefined || showValue) && (
        <span className="progress__head">
          {label !== undefined ? <span className="progress__label">{label}</span> : <span />}
          {showValue ? (
            <span className="progress__value">
              {safeValue}
              <span>/{safeMax}</span>
            </span>
          ) : null}
        </span>
      )}
      <span
        className="progress__track"
        role="progressbar"
        aria-label={accessibleLabel}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
      >
        <span className="progress__fill" style={{ width: `${percent}%` }} />
      </span>
    </span>
  );
}
