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

type Kind = "full" | "empty" | "temp";

// Faceted crystal (10×12 box), light from the upper left: ink silhouette, base, lit left facet, highlight sliver.
const OUTLINE = "M5 0.4 9.6 6 5 11.6 0.4 6Z";
const BODY = "M5 1.6 8.5 6 5 10.4 1.5 6Z";
const LIT = "M5 1.6 5 10.4 1.5 6Z";
const SHINE = "M4.6 2.9 4.6 5.4 3 5.9Z";

/** One crystal. Spent = empty dark socket; temporary = pale crystal with a spark cut (shape cue, not colour only). */
function Crystal({ kind, size }: { kind: Kind; size: string }) {
  return (
    <svg viewBox="0 0 10 12" aria-hidden style={{ width: `calc(${size} * 0.8)`, height: size, flex: "0 0 auto", overflow: "visible" }}>
      <path d={OUTLINE} fill="#1d0842" stroke="#1d0842" strokeWidth={0.6} strokeLinejoin="round" />
      {kind === "empty" ? (
        <path d={BODY} fill="#ffffff14" stroke="#ffffff30" strokeWidth={0.5} />
      ) : (
        <>
          <path d={BODY} fill={kind === "temp" ? "#4fc3e8" : "#1f6fd1"} />
          <path d={LIT} fill={kind === "temp" ? "var(--cg-mana-temp)" : "var(--cg-mana)"} />
          <path d={SHINE} fill="#e6f6ff" opacity={0.9} />
          {kind === "temp" && <path d="M5 4.2 5.7 6 5 7.8 4.3 6Z" fill="#ffffff" />}
        </>
      )}
    </svg>
  );
}

/** "4/5" plus a row of faceted crystals: filled = available, hollow socket = spent, pale with a spark = temporary mana. */
export function ManaCrystals({ current, max, temporary, size, label, compact = false }: ManaCrystalsProps) {
  const base = Math.max(0, current - temporary);
  const crystals: Kind[] = Array.from({ length: Math.max(max, base) }, (_, i) => (i < base ? "full" : "empty"));
  for (let i = 0; i < temporary; i++) crystals.push("temp");
  return (
    <span aria-label={label} title={label} style={{ display: "inline-flex", alignItems: "center", gap: `calc(${size} * 0.3)` }}>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: `calc(${size} * 1.2)`,
          color: "var(--cg-mana-shine)",
          WebkitTextStroke: `calc(${size} * 0.1) #1d0842`,
          paintOrder: "stroke fill",
          textShadow: "0 0 8px #3fa9ff99",
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        {current}
        <span style={{ fontSize: "0.72em", color: "var(--cg-mana-hi)" }}>/{max}</span>
      </span>
      {!compact && (
        <span aria-hidden style={{ display: "inline-flex", gap: `calc(${size} * 0.08)` }}>
          {crystals.map((kind, i) => (
            <Crystal key={i} kind={kind} size={size} />
          ))}
        </span>
      )}
    </span>
  );
}
