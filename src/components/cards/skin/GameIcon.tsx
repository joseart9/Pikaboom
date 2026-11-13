import { GAME_ICONS, type GameIconName } from "./icons/gameIcons";

export interface GameIconProps {
  name: GameIconName;
  /** CSS size (default `1em`, so it follows the surrounding text). */
  size?: string;
  /** Fill colour (default `currentColor`). */
  fill?: string;
  /** Accessible name; without it the icon is decorative (`aria-hidden`) and must sit next to a text label. */
  title?: string;
  /** Ink outline around the glyph (on bright faces and busy backgrounds). */
  outlined?: boolean;
  className?: string;
}

/** A UI glyph from the shared icon family (no emoji/dingbat characters in Duelo Arcano's UI). */
export function GameIcon({ name, size = "1em", fill = "currentColor", title, outlined = false, className }: GameIconProps) {
  const g = GAME_ICONS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ width: size, height: size, display: "inline-block", flex: "0 0 auto", verticalAlign: "-0.15em" }}
    >
      {title && <title>{title}</title>}
      <path
        d={g.d}
        fill={fill}
        fillRule={g.rule ?? "evenodd"}
        stroke={outlined ? "#1d0842" : undefined}
        strokeWidth={outlined ? 1.2 : undefined}
        strokeLinejoin="round"
        paintOrder="stroke fill"
      />
    </svg>
  );
}
