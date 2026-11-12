export interface TribeLabelProps {
  label: string;
}

/** Tribe ribbon at the bottom of a mob card. */
export function TribeLabel({ label }: TribeLabelProps) {
  return (
    <span
      style={{
        display: "block",
        padding: "0.4cqh 1cqw",
        borderRadius: "3cqh",
        background: "#1d0842cc",
        color: "var(--cg-text-dim)",
        fontSize: "5cqh",
        fontWeight: 800,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {label}
    </span>
  );
}
