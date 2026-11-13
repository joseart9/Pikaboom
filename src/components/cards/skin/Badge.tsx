// Shared number badge used by the stat primitives. Skin-internal: shapes are simple SVGs, sizes are CSS lengths.
import type { CSSProperties, ReactNode } from "react";
import { SKIN_FILES, skinUrl, type SkinAsset } from "./assets";

export type BadgeShape = "circle" | "diamond" | "drop" | "gem";

const PATHS: Record<BadgeShape, string> = {
  circle: "M50 4 A46 46 0 1 1 49.9 4 Z",
  diamond: "M50 3 L97 50 L50 97 L3 50 Z",
  drop: "M50 4.7 C67.6 27.6 88.7 41.7 88.7 59.3 A38.7 38.7 0 0 1 11.3 59.3 C11.3 41.7 32.4 27.6 50 4.7 Z",
  gem: "M50 3 L93 27 L93 73 L50 97 L7 73 L7 27 Z",
};

/** Number look for a board stat that differs from the printed card (damage, buffs, debuffs): dark red, black rim. */
export const MODIFIED_STAT = { valueColor: "#a3001b", valueStroke: "#000000", valueStrokeWidth: 0.1 } as const;

export interface BadgeProps {
  shape: BadgeShape;
  fill: string;
  value: ReactNode;
  /** CSS length of the badge side (e.g. "24cqh", "32px"). */
  size: string;
  valueColor?: string;
  /** Outline colour of the number (defaults to the ink). */
  valueStroke?: string;
  /** Outline width as a fraction of `size` (default 0.06). */
  valueStrokeWidth?: number;
  title?: string;
}

export function Badge({ shape, fill, value, size, valueColor = "var(--cg-text)", valueStroke = "#1d0842", valueStrokeWidth = 0.06, title }: BadgeProps) {
  const style: CSSProperties = {
    position: "relative",
    display: "inline-grid",
    placeItems: "center",
    width: size,
    height: size,
    lineHeight: 1,
    flex: "0 0 auto",
  };
  return (
    <span style={style} title={title}>
      <svg viewBox="0 0 100 100" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
        {SKIN_FILES.has(`badge-${shape}` as SkinAsset) ? (
          <image href={skinUrl(`badge-${shape}` as SkinAsset)} width={100} height={100} />
        ) : (
          <>
            <path d={PATHS[shape]} fill={fill} stroke="#1d0842" strokeWidth={7} strokeLinejoin="round" />
            <path d={PATHS[shape]} fill="none" stroke="#ffffff55" strokeWidth={3} transform="translate(50 50) scale(0.82) translate(-50 -50)" />
          </>
        )}
      </svg>
      <span
        style={{
          position: "relative",
          fontFamily: "var(--font-display)",
          fontSize: `calc(${size} * 0.6)`,
          color: valueColor,
          WebkitTextStroke: `calc(${size} * ${valueStrokeWidth}) ${valueStroke}`,
          paintOrder: "stroke fill",
          transform: shape === "drop" ? "translateY(12%)" : undefined,
        }}
      >
        {value}
      </span>
    </span>
  );
}
