interface BrandMarkProps {
  className?: string;
}

/** Original hexagonal island mark used by the brand lockup. */
export default function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M24 3.5 41.5 13.6v20.8L24 44.5 6.5 34.4V13.6L24 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M24 12.5v11.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="m18.8 18.6 5.2-5.3 5.2 5.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.2 29.6c3.4-2.1 6.1-2.1 9.3-.2 3.2 1.9 6 1.9 9.2-.2 1.3-.8 2.5-1.2 3.8-1.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="24" cy="33.4" r="1.6" fill="currentColor" />
    </svg>
  );
}
