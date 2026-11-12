export interface ManaCrystalsProps {
  current: number;
  max: number;
  temporary: number;
  /** CSS length of one crystal. */
  size: string;
  label?: string;
  /** Hide the crystal row and show only the "current/max" number (cramped spaces). */
  compact?: boolean;
}

/** "4/5" plus a row of crystals: filled = available, hollow = spent, light = temporary mana. */
export function ManaCrystals({ current, max, temporary, size, label, compact = false }: ManaCrystalsProps) {
  const base = Math.max(0, current - temporary);
  const crystals: ("full" | "empty" | "temp")[] = Array.from({ length: Math.max(max, base) }, (_, i) => (i < base ? "full" : "empty"));
  for (let i = 0; i < temporary; i++) crystals.push("temp");
  return (
    <span aria-label={label} title={label} style={{ display: "inline-flex", alignItems: "center", gap: `calc(${size} * 0.3)` }}>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: `calc(${size} * 1.2)`,
          color: "var(--cg-mana)",
          WebkitTextStroke: `calc(${size} * 0.08) #0b2a4a`,
          paintOrder: "stroke fill",
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        {current}/{max}
      </span>
      {!compact && (
        <span aria-hidden style={{ display: "inline-flex", gap: `calc(${size} * 0.12)` }}>
          {crystals.map((kind, i) => (
            <svg key={i} viewBox="0 0 10 12" style={{ width: `calc(${size} * 0.75)`, height: size }}>
              <path
                d="M5 0.6 L9.4 6 L5 11.4 L0.6 6 Z"
                fill={kind === "full" ? "var(--cg-mana)" : kind === "temp" ? "var(--cg-mana-temp)" : "var(--cg-mana-empty)"}
                stroke="#0b2a4a"
                strokeWidth={0.8}
              />
            </svg>
          ))}
        </span>
      )}
    </span>
  );
}
