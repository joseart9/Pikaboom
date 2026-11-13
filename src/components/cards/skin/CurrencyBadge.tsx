export interface CurrencyBadgeProps {
  amount: number;
  label?: string;
  /** Currency name shown after the amount ("Oro"). */
  unit?: string;
  /** Shown before the amount ("+" for rewards). */
  prefix?: string;
}

/** Faceted gold coin + amount (+ unit). Used by the menu, collection, store and rewards. */
export function CurrencyBadge({ amount, label, unit, prefix }: CurrencyBadgeProps) {
  return (
    <span title={label} className="cg-currency" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-display)", fontSize: 20 }}>
      <svg viewBox="0 0 20 20" aria-hidden style={{ width: "1.1em", height: "1.1em", flex: "0 0 auto" }}>
        <circle cx={10} cy={10} r={9.2} fill="#1d0842" />
        <circle cx={10} cy={10} r={7.8} fill="#a8742a" />
        <path d="M10 2.2A7.8 7.8 0 0 0 2.2 10H10Z" fill="#fff1c1" />
        <path d="M2.2 10A7.8 7.8 0 0 0 10 17.8V10Z M10 2.2A7.8 7.8 0 0 1 17.8 10H10Z" fill="#f2c14e" />
        <circle cx={10} cy={10} r={4.6} fill="#f2c14e" stroke="#a8742a" strokeWidth={1.2} />
        <path d="M10 6.6 11 9 13.4 10 11 11 10 13.4 9 11 6.6 10 9 9Z" fill="#a8742a" />
      </svg>
      {prefix}
      {amount}
      {unit && <span style={{ fontSize: "0.8em" }}>{unit}</span>}
    </span>
  );
}
