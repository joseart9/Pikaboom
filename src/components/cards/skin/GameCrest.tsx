import { useId } from "react";

export interface GameCrestProps {
  /** CSS size of the square crest (default `1em`). */
  size?: string;
  className?: string;
}

// Duelo Arcano crest (UI-07): two fanned card backs behind an engraved violet shield with a gold rim and a faceted
// arcane gem — the same materials as the card back, buttons and gems (UI_VISUAL_SYSTEM.md §3). Static, fixed palette
// (§2.1), decorative: the title next to it carries the name.
export function GameCrest({ size = "1em", className }: GameCrestProps) {
  const id = useId().replace(/:/g, "");
  const shield = `${id}-shield`;
  const gem = `${id}-gem`;
  const halo = `${id}-halo`;
  return (
    <svg viewBox="-8 -10 136 132" className={className} aria-hidden style={{ width: size, height: size, display: "block", flex: "0 0 auto" }}>
      <defs>
        <linearGradient id={shield} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#6a48b8" />
          <stop offset="0.55" stopColor="#4b2f8f" />
          <stop offset="1" stopColor="#22144a" />
        </linearGradient>
        <linearGradient id={gem} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5fa2" />
          <stop offset="1" stopColor="#8a0b52" />
        </linearGradient>
        <radialGradient id={halo} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c77dff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#c77dff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="58" r="56" fill={`url(#${halo})`} />
      {/* Fanned card backs */}
      <g stroke="#1d0842" strokeWidth="3" strokeLinejoin="round">
        <g transform="rotate(-22 60 70)">
          <rect x="44" y="6" width="32" height="46" rx="4" fill="#4a1791" />
          <rect x="48.5" y="10.5" width="23" height="37" rx="2" fill="none" stroke="#ff006e" strokeWidth="2" />
        </g>
        <g transform="rotate(22 60 70)">
          <rect x="44" y="6" width="32" height="46" rx="4" fill="#4a1791" />
          <rect x="48.5" y="10.5" width="23" height="37" rx="2" fill="none" stroke="#ff006e" strokeWidth="2" />
        </g>
      </g>
      {/* Shield: ink silhouette, violet body, brushed-gold rim, lit upper-left plane */}
      <path d="M60 22L97 33V60C97 84 81 101 60 111C39 101 23 84 23 60V33Z" fill={`url(#${shield})`} stroke="#1d0842" strokeWidth="5" strokeLinejoin="round" />
      <path d="M60 29L90 38V60C90 80 77 94 60 103C43 94 30 80 30 60V38Z" fill="none" stroke="#f2c14e" strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 29L30 38V60C30 66 31.5 71.5 34 76.5L60 44Z" fill="#ffffff" opacity="0.1" />
      <path d="M60 104L60 96C74 89 84 78 86 62L90 62C88 81 77 95 60 104Z" fill="#a8742a" opacity="0.8" />
      {/* Faceted arcane gem */}
      <path d="M60 44L78 58L70 82H50L42 58Z" fill={`url(#${gem})`} stroke="#1d0842" strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 44L78 58L60 63L42 58Z" fill="#ffb3d1" />
      <path d="M42 58L60 63L50 82Z" fill="#c2186b" />
      <path d="M78 58L60 63L70 82Z" fill="#6a0840" />
      <path d="M53 52L60 47L66 51L58 56Z" fill="#ffffff" opacity="0.85" />
      {/* Gold sparkles at the shield shoulders */}
      <path d="M24 22L26 28L32 30L26 32L24 38L22 32L16 30L22 28Z" fill="#fff1c1" stroke="#1d0842" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M97 12L98.6 16.4L103 18L98.6 19.6L97 24L95.4 19.6L91 18L95.4 16.4Z" fill="#fff1c1" stroke="#1d0842" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
