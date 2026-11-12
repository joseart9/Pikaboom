export interface CardBackProps {
  /** CSS height; width follows the card ratio. */
  height: string;
}

/** The back of a card (opponent hand, deck). */
export function CardBack({ height }: CardBackProps) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        height,
        width: `calc(${height} * 0.72)`,
        borderRadius: `calc(${height} * 0.1)`,
        background: "repeating-linear-gradient(45deg, var(--cg-card-back) 0 18%, #5d22ad 18% 36%)",
        border: `max(1.5px, calc(${height} * 0.06)) solid var(--cg-card-back-2)`,
        boxShadow: "0 2px 4px var(--cg-shadow)",
      }}
    />
  );
}
