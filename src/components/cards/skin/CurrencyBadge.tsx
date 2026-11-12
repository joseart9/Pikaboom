export interface CurrencyBadgeProps {
  amount: number;
  label?: string;
}

/** Coin + amount (economy UI arrives in Phase 16). */
export function CurrencyBadge({ amount, label }: CurrencyBadgeProps) {
  return (
    <span title={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-display)", fontSize: 20 }}>
      <svg viewBox="0 0 20 20" aria-hidden style={{ width: 20, height: 20 }}>
        <circle cx={10} cy={10} r={9} fill="#ffbe0b" stroke="#7a4b00" strokeWidth={2} />
        <circle cx={10} cy={10} r={5} fill="none" stroke="#7a4b00" strokeWidth={1.5} />
      </svg>
      {amount}
    </span>
  );
}
