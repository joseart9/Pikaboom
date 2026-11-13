import { STATUS_GLYPHS, type StatusGlyphId } from "./icons/statusGlyphs";

export interface StatusIconProps {
  /** A status id, or "silenced" for the Silencio marker. */
  status: StatusGlyphId;
  /** Shown in the corner (statuses with a magnitude: Quemadura (2), Debilidad (1)…). */
  magnitude?: number;
  size: string;
  title?: string;
}

/** A status glyph in a dark disc ringed by its polarity colour, with an optional magnitude. */
export function StatusIcon({ status, magnitude, size, title }: StatusIconProps) {
  const g = STATUS_GLYPHS[status];
  return (
    <span
      title={title}
      data-status={status}
      style={{
        position: "relative",
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#1d0842e6",
        boxShadow: `0 0 0 1.5px ${g.ring}`,
        flex: "0 0 auto",
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden style={{ width: "70%", height: "70%" }}>
        <path d={g.d} fill={g.fill} fillRule={g.rule ?? "evenodd"} stroke="#1d0842" strokeWidth={1} />
      </svg>
      {magnitude !== undefined && (
        <span
          style={{
            position: "absolute",
            right: "-25%",
            bottom: "-25%",
            fontFamily: "var(--font-display)",
            fontSize: `calc(${size} * 0.62)`,
            lineHeight: 1,
            color: "var(--cg-text)",
            WebkitTextStroke: `calc(${size} * 0.08) #1d0842`,
            paintOrder: "stroke fill",
          }}
        >
          {magnitude}
        </span>
      )}
    </span>
  );
}
