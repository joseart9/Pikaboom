import { useId } from "react";

export interface PackArtProps {
  /** Pack type key (`ECONOMY.packs`); unknown types fall back to the arcane palette. */
  variant?: string;
  /** CSS height; the pack is 0.72 wide (a card's proportion). Default `100%` of the parent. */
  height?: string;
  className?: string;
}

interface PackPalette {
  hi: string;
  base: string;
  deep: string;
  glow: string;
  sigil: string;
}

// One palette per pack type. Only "arcane" is on sale today (ECONOMY.packs); a new type adds a row here.
const PALETTES: Record<string, PackPalette> = {
  arcane: { hi: "#8a5ae0", base: "#4b2f8f", deep: "#1b1036", glow: "#c77dff", sigil: "#ff006e" },
};

/** Zig-zag crimp between x0 and x1 (heat-sealed foil edge), as "L" segments. */
function crimp(x0: number, x1: number, yOut: number, yIn: number, step: number): string {
  const pts: string[] = [];
  const dir = x1 > x0 ? 1 : -1;
  let i = 0;
  for (let x = x0; dir > 0 ? x <= x1 : x >= x1; x += step * dir, i++) pts.push(`L${x} ${i % 2 === 0 ? yOut : yIn}`);
  return pts.join("");
}

// Pouch outline (viewBox 0 0 144 200): crimped top and bottom, slightly waisted sides.
const BODY = `M8 12${crimp(8, 136, 6, 12, 8)}C138 60 138 140 136 188${crimp(136, 8, 194, 188, 8)}C6 140 6 60 8 12Z`;
const TEAR = "M10 28H134";

// Drawn foil booster for the store and the pack opening (UI-07). Static SVG, fixed palette (UI_VISUAL_SYSTEM.md §2.1),
// decorative (the offer title names it). Lit from the upper left like every raised face.
export function PackArt({ variant = "arcane", height = "100%", className }: PackArtProps) {
  const p = PALETTES[variant] ?? PALETTES.arcane;
  const id = useId().replace(/:/g, "");
  const foil = `${id}-foil`;
  const shine = `${id}-shine`;
  const glow = `${id}-glow`;
  const medal = `${id}-medal`;
  return (
    <svg
      viewBox="0 0 144 200"
      className={className}
      aria-hidden
      style={{ height, aspectRatio: "0.72", width: "auto", display: "block", flex: "0 0 auto", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={foil} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.hi} />
          <stop offset="0.45" stopColor={p.base} />
          <stop offset="1" stopColor={p.deep} />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.8" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={medal} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1c1" />
          <stop offset="0.5" stopColor="#f2c14e" />
          <stop offset="1" stopColor="#a8742a" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <path d={BODY} fill={`url(#${foil})`} stroke="#1d0842" strokeWidth="5" strokeLinejoin="round" />
      <g clipPath={`url(#${id}-clip)`}>
        {/* Rune lattice */}
        <path
          d="M-10 60L72 -22M-10 110L122 -22M-10 160L154 -4M-10 210L154 46M30 222L154 98M80 222L154 148"
          stroke="#ffffff"
          strokeOpacity="0.07"
          strokeWidth="9"
        />
        <circle cx="72" cy="104" r="62" fill={`url(#${glow})`} />
        {/* Diagonal foil shine */}
        <path d="M18 200L96 0H124L46 200Z" fill={`url(#${shine})`} />
        {/* Gold band behind the medallion */}
        <path d="M0 92H144V116H0Z" fill="#a8742a" />
        <path d="M0 92H144V97H0Z" fill="#fff1c1" opacity="0.7" />
        <path d="M0 116H144" stroke="#1d0842" strokeWidth="3" />
        <path d="M0 92H144" stroke="#1d0842" strokeWidth="3" />
      </g>
      {/* Tear line under the top seal */}
      <path d={TEAR} stroke="#1d0842" strokeWidth="2.5" strokeDasharray="6 5" opacity="0.7" />
      <path d="M10 26H134" stroke="#ffffff" strokeWidth="1" strokeDasharray="6 5" opacity="0.35" />
      {/* Medallion with a four-point arcane star and a ring of rune studs */}
      <circle cx="72" cy="104" r="34" fill={`url(#${medal})`} stroke="#1d0842" strokeWidth="4.5" />
      <circle cx="72" cy="104" r="26" fill={p.deep} stroke="#1d0842" strokeWidth="2" />
      <path
        d="M72 82.5L74 86L72 89.5L70 86ZM93.5 104L90 106L86.5 104L90 102ZM72 125.5L70 122L72 118.5L74 122ZM50.5 104L54 102L57.5 104L54 106Z"
        fill="#f2c14e"
      />
      <path d="M72 88L76.6 99.4L88 104L76.6 108.6L72 120L67.4 108.6L56 104L67.4 99.4Z" fill={p.sigil} stroke="#1d0842" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M72 88L76.6 99.4L72 104L67.4 99.4Z" fill="#ffb3d1" />
      <circle cx="72" cy="104" r="3.4" fill="#ffffff" />
      {/* Corner sparkles */}
      <path d="M30 46L32 52L38 54L32 56L30 62L28 56L22 54L28 52Z" fill="#fff1c1" opacity="0.9" />
      <path d="M114 150L115.4 154.6L120 156L115.4 157.4L114 162L112.6 157.4L108 156L112.6 154.6Z" fill="#fff1c1" opacity="0.8" />
    </svg>
  );
}
