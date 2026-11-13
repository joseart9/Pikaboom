import type { ReactNode } from "react";
import { skinLayer } from "./assets";

export interface HeroPortraitProps {
  name: string;
  seat: 0 | 1;
  /** Mine vs the opponent's (colors the portrait). */
  mine: boolean;
  highlighted: boolean;
  targetable: boolean;
  /** CSS size of the portrait. */
  size: string;
  children?: ReactNode;
}

/** Round hero portrait with the player's initial; glows when targetable/highlighted. */
export function HeroPortrait({ name, seat, mine, highlighted, targetable, size, children }: HeroPortraitProps) {
  const ring = targetable
    ? "0 0 0 3px var(--cg-invalid), 0 0 16px 4px var(--cg-invalid)"
    : highlighted
      ? "0 0 0 3px var(--cg-selected), 0 0 14px 2px var(--cg-selected)"
      : "0 0 0 3px #1d0842, 0 3px 8px var(--cg-shadow)";
  return (
    <span
      data-seat={seat}
      style={{
        position: "relative",
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          skinLayer(mine ? "hero-mine" : "hero-foe") ??
          `radial-gradient(circle at 35% 30%, #ffffff40, transparent 55%), ${mine ? "var(--cg-hero)" : "var(--cg-foe-hero)"}`,
        boxShadow: ring,
        flex: "0 0 auto",
        transition: "box-shadow var(--cg-dur-fast)",
      }}
    >
      <span
        aria-hidden
        style={{
          fontFamily: "var(--font-display)",
          fontSize: `calc(${size} * 0.46)`,
          color: "var(--cg-text)",
          WebkitTextStroke: `calc(${size} * 0.03) #1d0842`,
          paintOrder: "stroke fill",
        }}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
      {children}
    </span>
  );
}
