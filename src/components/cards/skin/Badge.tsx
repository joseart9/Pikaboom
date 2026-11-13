// Shared number badge used by the stat primitives. Skin-internal: shapes are simple SVGs, sizes are CSS lengths.
import type { CSSProperties, ReactNode } from "react";
import { SKIN_FILES, skinUrl, type SkinAsset } from "./assets";

export type BadgeShape = "circle" | "diamond" | "drop" | "gem";

const PATHS: Record<BadgeShape, string> = {
  circle: "M50 4 A46 46 0 1 1 49.9 4 Z",
  diamond: "M50 3 L97 50 L50 97 L3 50 Z",
  drop: "M50 4 C70 30 94 46 94 66 A44 44 0 0 1 6 66 C6 46 30 30 50 4 Z",
  gem: "M50 3 L93 27 L93 73 L50 97 L7 73 L7 27 Z",
};

export interface BadgeProps {
  shape: BadgeShape;
  fill: string;
  value: ReactNode;
  /** CSS length of the badge side (e.g. "24cqh", "32px"). */
  size: string;
  valueColor?: string;
  title?: string;
}

export function Badge({ shape, fill, value, size, valueColor = "var(--cg-text)", title }: BadgeProps) {
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
          WebkitTextStroke: `calc(${size} * 0.06) #1d0842`,
          paintOrder: "stroke fill",
          transform: shape === "drop" ? "translateY(12%)" : undefined,
        }}
      >
        {value}
      </span>
    </span>
  );
}
