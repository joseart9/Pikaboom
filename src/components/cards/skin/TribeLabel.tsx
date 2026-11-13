export interface TribeLabelProps {
  label: string;
}

/** Tribe ribbon at the bottom of a mob card: ink plate with a thin lit edge (frame-mob.svg leaves a recess for it). */
export function TribeLabel({ label }: TribeLabelProps) {
  return (
    <span
      style={{
        display: "block",
        padding: "0.4cqh 1.6cqw",
        borderRadius: "3cqh",
        background: "linear-gradient(180deg, #2f1f62 0%, #1d0842 100%)",
        boxShadow: "0 0 0 0.6cqh #1d0842, inset 0 0.4cqh 0 #ffffff1f",
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
