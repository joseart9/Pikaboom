export interface StatDeltaProps {
  /** > 0 buffed above the printed value, < 0 below it. 0 renders nothing. */
  delta: number;
  size: string;
  title?: string;
}

/**
 * UI-08: a small chevron pip next to a stat badge — up and green when buffed, down and red when debuffed. The
 * direction is the cue (not colour only); the inspect sheet states the exact difference.
 */
export function StatDelta({ delta, size, title }: StatDeltaProps) {
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={`cg-stat-delta cg-stat-delta--${up ? "up" : "down"}`} title={title} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d={up ? "M12 3L22 14H16V21H8V14H2Z" : "M12 21L2 10H8V3H16V10H22Z"}
          fill={up ? "#06d6a0" : "#ff4d6d"}
          stroke="#1d0842"
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
