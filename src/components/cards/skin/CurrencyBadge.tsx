export interface CurrencyBadgeProps {
  amount: number;
  label?: string;
  /** Currency name shown after the amount ("Oro"). */
  unit?: string;
  /** Shown before the amount ("+" for rewards). */
  prefix?: string;
}

/** Coin + amount (+ unit). The menu shows it from Phase 14; the store and rewards use it later. */
export function CurrencyBadge({ amount, label, unit, prefix }: CurrencyBadgeProps) {
  return (
    <span title={label} className="cg-currency" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-display)", fontSize: 20 }}>
      <svg viewBox="0 0 20 20" aria-hidden style={{ width: 20, height: 20 }}>
        <circle cx={10} cy={10} r={9} fill="#ffbe0b" stroke="#7a4b00" strokeWidth={2} />
        <circle cx={10} cy={10} r={5} fill="none" stroke="#7a4b00" strokeWidth={1.5} />
      </svg>
      {prefix}
      {amount}
      {unit && <span style={{ fontSize: "0.8em" }}>{unit}</span>}
    </span>
  );
}
