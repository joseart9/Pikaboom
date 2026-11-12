import type { Tribe } from "@/game/cards/catalog/types";

export interface CardArtProps {
  art: string;
  tribe?: Tribe;
  spell?: boolean;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const TRIBE_GLYPH: Partial<Record<Tribe, string>> = {
  undead: "M12 3 C7 3 4 6.5 4 11 C4 14 6 16 7 16.5 V20 H17 V16.5 C18 16 20 14 20 11 C20 6.5 17 3 12 3 Z M8.5 9.5 A2 2 0 1 0 8.6 9.5 Z M15.5 9.5 A2 2 0 1 0 15.6 9.5 Z",
  beast: "M6 8 A2.2 2.2 0 1 0 6.1 8 Z M10 4.5 A2.2 2.2 0 1 0 10.1 4.5 Z M14 4.5 A2.2 2.2 0 1 0 14.1 4.5 Z M18 8 A2.2 2.2 0 1 0 18.1 8 Z M12 10 C8 10 6 15 7 18 C8 20 10 19 12 19 C14 19 16 20 17 18 C18 15 16 10 12 10 Z",
  dragon: "M3 18 C6 10 10 6 20 4 C16 8 15 10 16 13 L21 12 C18 17 13 20 3 18 Z",
  human: "M12 3 A4 4 0 1 0 12.1 3 Z M4 21 C4 15 8 13 12 13 C16 13 20 15 20 21 Z",
  construct: "M5 5 H19 V19 H5 Z M8 8 V11 H11 V8 Z M13 8 V11 H16 V8 Z M8 14 H16 V16 H8 Z",
};
const SPELL_GLYPH = "M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z";
const DEFAULT_GLYPH = "M12 4 A8 8 0 1 1 11.9 4 Z";

/**
 * Card illustration. No art files exist yet, so this always renders a generated placeholder: a gradient whose hue
 * comes from the art key, with a tribe (or spell) glyph. A skin pass can return `<img src="/cards/art/<art>.svg">`.
 */
export function CardArt({ art, tribe, spell = false }: CardArtProps) {
  const h = hash(art);
  const hue = h % 360;
  const hue2 = (hue + 40 + ((h >> 9) % 80)) % 360;
  const glyph = spell ? SPELL_GLYPH : (tribe && TRIBE_GLYPH[tribe]) || DEFAULT_GLYPH;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <radialGradient id={`cg-art-${art}`} cx="40%" cy="35%" r="80%">
          <stop offset="0%" stopColor={`hsl(${hue} 70% 62%)`} />
          <stop offset="100%" stopColor={`hsl(${hue2} 65% 22%)`} />
        </radialGradient>
      </defs>
      <rect width={100} height={100} fill={`url(#cg-art-${art})`} />
      <g transform="translate(25 22) scale(2.1)" opacity={0.85}>
        <path d={glyph} fill="#ffffffcc" fillRule="evenodd" />
      </g>
    </svg>
  );
}
