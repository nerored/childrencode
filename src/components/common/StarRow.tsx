export type StarSize = "xs" | "sm" | "md" | "lg";

interface StarRowProps {
  stars: number;
  max?: number;
  size?: StarSize;
  /** Accessible label override. Defaults to "N / M 星". */
  label?: string;
  className?: string;
}

const STAR_PATH =
  "M12 2.5 14.9 8.4l6.5.95-4.7 4.58 1.11 6.47L12 17.35 6.19 20.4l1.1-6.47-4.7-4.58 6.51-.95L12 2.5Z";

/** Five-pointed star row used for level and chapter ratings. */
export default function StarRow({
  stars,
  max = 3,
  size = "sm",
  label,
  className,
}: StarRowProps) {
  const safeMax = Math.max(1, Math.trunc(max));
  const safeStars = Math.min(safeMax, Math.max(0, Math.trunc(stars)));
  const description = label ?? `${safeStars} / ${safeMax} 星`;

  return (
    <span
      className={["star-row", `star-row--${size}`, className].filter(Boolean).join(" ")}
      role="img"
      aria-label={description}
    >
      {Array.from({ length: safeMax }, (_, index) => (
        <svg
          key={index}
          className={`star-row__star${index < safeStars ? " is-filled" : ""}`}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}
