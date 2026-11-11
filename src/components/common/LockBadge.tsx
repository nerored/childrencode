interface LockBadgeProps {
  /** Render nothing when the target is unlocked. */
  locked?: boolean;
  label?: string;
  /** Icon-only presentation for tight chips. */
  compact?: boolean;
  className?: string;
}

/** Small padlock label shown on locked scenes, chapters, and levels. */
export default function LockBadge({
  locked = true,
  label = "待解锁",
  compact = false,
  className,
}: LockBadgeProps) {
  if (!locked) return null;

  return (
    <span
      className={[
        "lock-badge",
        "lock-badge--v2",
        compact ? "lock-badge--compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <rect
          x="3.2"
          y="7"
          width="9.6"
          height="6.8"
          rx="1.6"
          stroke="currentColor"
          strokeWidth="1.3"
          fill="none"
        />
        <path
          d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7"
          stroke="currentColor"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span className="lock-badge__text">{label}</span>
    </span>
  );
}
