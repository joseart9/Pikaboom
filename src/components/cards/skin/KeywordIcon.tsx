import type { KeywordId } from "@/game/cards/catalog/types";
import { KEYWORD_GLYPHS } from "./icons/keywordGlyphs";

export interface KeywordIconProps {
  keyword: KeywordId;
  value?: number;
  size: string;
  title?: string;
}

/** A keyword glyph in a dark disc, with an optional value (e.g. Escudo charges). */
export function KeywordIcon({ keyword, value, size, title }: KeywordIconProps) {
  const g = KEYWORD_GLYPHS[keyword];
  return (
    <span
      title={title}
      style={{
        position: "relative",
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#1d0842d9",
        boxShadow: "0 0 0 1px #ffffff44",
        flex: "0 0 auto",
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden style={{ width: "72%", height: "72%" }}>
        <path d={g.d} fill={g.fill} fillRule={g.rule ?? "evenodd"} stroke="#1d0842" strokeWidth={1} />
      </svg>
      {value !== undefined && (
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
          {value}
        </span>
      )}
    </span>
  );
}
