"use client";

import { useId, type ReactNode } from "react";
import type { AbilityId } from "@/game/battleship/logic";

/**
 * Ability icons, drawn in the same steel-and-gradient style as the ship sprites.
 * Every icon lives in a 64×64 viewBox; `uid` keeps gradient ids unique per instance.
 */

type Draw = (p: { uid: string }) => ReactNode;

const OUTLINE = "#1d2530";

function SteelDefs({ uid }: { uid: string }) {
  return (
    <>
      <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4f7fa" />
        <stop offset="0.5" stopColor="#c3ccd5" />
        <stop offset="1" stopColor="#7d8996" />
      </linearGradient>
      <linearGradient id={`${uid}-flame`} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#fffbe0" />
        <stop offset="0.35" stopColor="#ffd23f" />
        <stop offset="0.75" stopColor="#ff7a00" stopOpacity="0.9" />
        <stop offset="1" stopColor="#ff2e00" stopOpacity="0" />
      </linearGradient>
      <radialGradient id={`${uid}-burst`}>
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.35" stopColor="#ffe066" />
        <stop offset="0.7" stopColor="#ff8800" />
        <stop offset="1" stopColor="#ff006e" />
      </radialGradient>
    </>
  );
}

/** Artillery shell lying along +x, nose at x≈60, centred on y=32. */
function Shell({ uid, flame = true }: { uid: string; flame?: boolean }) {
  return (
    <g>
      {flame && <path d="M14 27 Q4 28 -4 32 Q4 36 14 37 Z" fill={`url(#${uid}-flame)`} />}
      <rect x="10" y="26.5" width="6" height="11" rx="1.2" fill="#3a434d" stroke={OUTLINE} strokeWidth="1.2" />
      <rect x="15" y="25.5" width="30" height="13" rx="2" fill={`url(#${uid}-steel)`} stroke={OUTLINE} strokeWidth="1.4" />
      <rect x="36" y="25.5" width="4" height="13" fill="#c8733a" stroke={OUTLINE} strokeWidth="1" />
      <path d="M18 29 H34" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      <path d="M45 25.5 Q58 27.5 61 32 Q58 36.5 45 38.5 Z" fill="#e63946" stroke={OUTLINE} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M47 28.5 Q54 29.5 57 31" stroke="#ffb3ba" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.48;
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} stroke={OUTLINE} strokeWidth="1.3" strokeLinejoin="round" />;
}

const Shot: Draw = ({ uid }) => (
  <>
    <Star cx={50} cy={14} r={11} fill={`url(#${uid}-burst)`} />
    <g transform="rotate(-38 32 32) translate(-2 2)">
      <Shell uid={uid} />
    </g>
  </>
);

const Double: Draw = ({ uid }) => (
  <>
    <g transform="translate(-4 -9) rotate(-38 32 32) scale(.82) translate(7 7)">
      <Shell uid={uid} />
    </g>
    <g transform="translate(8 7) rotate(-38 32 32) scale(.82) translate(7 7)">
      <Shell uid={uid} />
    </g>
    <circle cx="51" cy="51" r="10" fill="#ff4d6d" stroke={OUTLINE} strokeWidth="1.6" />
    <text x="51" y="51.5" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="900" fontFamily="system-ui, sans-serif" fill="#fff">
      ×2
    </text>
  </>
);

const Air: Draw = ({ uid }) => (
  <>
    {/* bombs falling behind the plane */}
    {[
      [10, 56],
      [54, 56],
    ].map(([x, y]) => (
      <g key={x} transform={`translate(${x} ${y})`}>
        <path d="M-2.5 -9 L-4 -12 H4 L2.5 -9 Z" fill="#4b5560" stroke={OUTLINE} strokeWidth="0.8" />
        <ellipse cx="0" cy="-2" rx="4" ry="7.5" fill="#3a434d" stroke={OUTLINE} strokeWidth="1.2" />
        <path d="M-1.5 -6 V2" stroke="#8592a0" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M-4 4 Q0 7 4 4" fill="#e63946" stroke={OUTLINE} strokeWidth="0.8" />
      </g>
    ))}
    {/* top-down bomber, nose up */}
    <path
      d="M32 4 Q36 6 36 14 L36 20 L60 31 L60 36 L36 31 L35 40 L45 46 L45 50 L33 47 L32 49 L31 47 L19 50 L19 46 L29 40 L28 31 L4 36 L4 31 L28 20 L28 14 Q28 6 32 4 Z"
      fill={`url(#${uid}-steel)`}
      stroke={OUTLINE}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M32 9 V42" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
    <ellipse cx="32" cy="12" rx="2.4" ry="4" fill="#26303b" />
    <rect x="13" y="27.5" width="4" height="7" rx="1.5" fill="#4b5560" stroke={OUTLINE} strokeWidth="0.8" />
    <rect x="47" y="27.5" width="4" height="7" rx="1.5" fill="#4b5560" stroke={OUTLINE} strokeWidth="0.8" />
    <circle cx="9" cy="33" r="1.4" fill="#e63946" />
    <circle cx="55" cy="33" r="1.4" fill="#06d6a0" />
  </>
);

const Shield: Draw = ({ uid }) => (
  <>
    <defs>
      <linearGradient id={`${uid}-sh`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c8fdff" />
        <stop offset="0.45" stopColor="#3fd6f0" />
        <stop offset="1" stopColor="#0077a8" />
      </linearGradient>
    </defs>
    <path d="M32 4 L55 12 V30 Q55 49 32 60 Q9 49 9 30 V12 Z" fill={`url(#${uid}-sh)`} stroke="#0b2f45" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M32 9.5 L50 16 V30 Q50 45 32 54.5 Q14 45 14 30 V16 Z" fill="none" stroke="#e8fdff" strokeWidth="1.6" opacity="0.8" />
    {/* the 3×3 zone it protects */}
    {[0, 1, 2].flatMap((r) =>
      [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={21 + c * 8} y={18 + r * 8} width="6" height="6" rx="1.4" fill="#ffffff" opacity={r === 1 && c === 1 ? 0.95 : 0.55} />),
    )}
    <path d="M14 16 L32 9.5 V30 Q22 26 14 30 Z" fill="#ffffff" opacity="0.18" />
  </>
);

const Repair: Draw = ({ uid }) => (
  <>
    <defs>
      <linearGradient id={`${uid}-wood`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#e0a060" />
        <stop offset="1" stopColor="#9a5a26" />
      </linearGradient>
      <mask id={`${uid}-notch`}>
        <rect x="0" y="0" width="64" height="64" fill="#fff" />
        <rect x="28.5" y="-1" width="7" height="11" rx="1" fill="#000" />
      </mask>
    </defs>
    {/* hammer */}
    <g transform="rotate(-45 32 32)">
      <rect x="29.5" y="20" width="5" height="38" rx="2.2" fill={`url(#${uid}-wood)`} stroke={OUTLINE} strokeWidth="1.3" />
      <rect x="19" y="8" width="26" height="12" rx="2" fill={`url(#${uid}-steel)`} stroke={OUTLINE} strokeWidth="1.4" />
      <rect x="19" y="8" width="5" height="12" rx="1" fill="#8592a0" stroke={OUTLINE} strokeWidth="1" />
    </g>
    {/* wrench */}
    <g transform="rotate(45 32 32)">
      <g mask={`url(#${uid}-notch)`}>
        <circle cx="32" cy="10" r="9" fill={`url(#${uid}-steel)`} stroke={OUTLINE} strokeWidth="1.4" />
        <rect x="28.5" y="14" width="7" height="42" rx="3.5" fill={`url(#${uid}-steel)`} stroke={OUTLINE} strokeWidth="1.4" />
      </g>
      <circle cx="32" cy="51" r="2" fill="#5d6874" />
      <path d="M31 20 V44" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
    </g>
    <circle cx="51" cy="51" r="10" fill="#06d6a0" stroke={OUTLINE} strokeWidth="1.6" />
    <path d="M51 45.5 V56.5 M45.5 51 H56.5" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
  </>
);

const Cross: Draw = ({ uid }) => (
  <>
    <defs>
      <linearGradient id={`${uid}-plus`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff8fa3" />
        <stop offset="1" stopColor="#c81e3a" />
      </linearGradient>
    </defs>
    <path
      d="M23 5 H41 V23 H59 V41 H41 V59 H23 V41 H5 V23 H23 Z"
      fill={`url(#${uid}-plus)`}
      stroke={OUTLINE}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* grid lines: five cells */}
    <path d="M23 23 H41 V41 H23 Z" fill="none" stroke="#ffd1d8" strokeWidth="1.4" opacity="0.8" />
    {[
      [32, 14],
      [14, 32],
      [50, 32],
      [32, 50],
    ].map(([x, y]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="3.4" fill="#ffe066" stroke={OUTLINE} strokeWidth="1" />
    ))}
    <Star cx={32} cy={32} r={10} fill={`url(#${uid}-burst)`} />
  </>
);

const Mine: Draw = ({ uid }) => (
  <>
    <defs>
      <radialGradient id={`${uid}-ball`} cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#7a8591" />
        <stop offset="0.5" stopColor="#3a434d" />
        <stop offset="1" stopColor="#14191f" />
      </radialGradient>
    </defs>
    {/* mooring chain */}
    <g fill="none" stroke="#8592a0" strokeWidth="2">
      <ellipse cx="32" cy="50" rx="2.4" ry="3.6" />
      <ellipse cx="32" cy="57" rx="2.4" ry="3.6" />
    </g>
    {/* detonator horns */}
    {[0, 60, 120, 180, 240, 300, 30, 150].map((a) => (
      <g key={a} transform={`rotate(${a} 32 28)`}>
        <rect x="29.5" y="5" width="5" height="8" rx="1" fill="#5d6874" stroke={OUTLINE} strokeWidth="1.1" />
        <circle cx="32" cy="5.5" r="3" fill="#e63946" stroke={OUTLINE} strokeWidth="1.1" />
      </g>
    ))}
    <circle cx="32" cy="28" r="16" fill={`url(#${uid}-ball)`} stroke={OUTLINE} strokeWidth="1.6" />
    <path d="M17 30 Q32 35 47 30" fill="none" stroke="#ffd23f" strokeWidth="2" opacity="0.85" />
    <ellipse cx="26" cy="21" rx="5" ry="3" fill="#ffffff" opacity="0.3" transform="rotate(-30 26 21)" />
  </>
);

const Sonar: Draw = ({ uid }) => (
  <>
    <defs>
      <radialGradient id={`${uid}-scope`}>
        <stop offset="0" stopColor="#0f5a42" />
        <stop offset="1" stopColor="#03140e" />
      </radialGradient>
      <linearGradient id={`${uid}-sweep`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#06d6a0" stopOpacity="0" />
        <stop offset="1" stopColor="#7dffd6" stopOpacity="0.85" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill={`url(#${uid}-steel)`} stroke={OUTLINE} strokeWidth="1.6" />
    <circle cx="32" cy="32" r="23" fill={`url(#${uid}-scope)`} stroke={OUTLINE} strokeWidth="1.2" />
    <g fill="none" stroke="#06d6a0" strokeWidth="1.1" opacity="0.55">
      <circle cx="32" cy="32" r="15.5" />
      <circle cx="32" cy="32" r="8" />
      <path d="M32 9 V55 M9 32 H55" />
    </g>
    <path d="M32 32 L32 9 A23 23 0 0 1 51.9 20.5 Z" fill={`url(#${uid}-sweep)`} />
    <path d="M32 32 L51.9 20.5" stroke="#b9ffe9" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="42" cy="17" r="3.4" fill="#ffe066" />
    <circle cx="42" cy="17" r="6" fill="#ffe066" opacity="0.25" />
    <circle cx="23" cy="40" r="2.2" fill="#7dffd6" opacity="0.8" />
    <circle cx="32" cy="32" r="2" fill="#b9ffe9" />
  </>
);

const Torpedo: Draw = ({ uid }) => (
  <>
    <defs>
      <linearGradient id={`${uid}-torp`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d9e1e8" />
        <stop offset="0.5" stopColor="#7d8b99" />
        <stop offset="1" stopColor="#3f4a55" />
      </linearGradient>
    </defs>
    {/* wake bubbles */}
    {[
      [6, 44, 2.6],
      [11, 50, 1.8],
      [4, 52, 1.5],
      [14, 44, 1.4],
    ].map(([x, y, r]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="none" stroke="#bfe9ff" strokeWidth="1.2" opacity="0.85" />
    ))}
    <g transform="rotate(-24 32 32)">
      {/* propeller */}
      <ellipse cx="7" cy="32" rx="2" ry="8" fill="#c8733a" stroke={OUTLINE} strokeWidth="1.1" />
      {/* tail fins */}
      <path d="M12 32 L9 21 H14 L20 28 Z M12 32 L9 43 H14 L20 36 Z" fill="#4b5560" stroke={OUTLINE} strokeWidth="1.1" strokeLinejoin="round" />
      <rect x="10" y="29" width="5" height="6" fill="#3a434d" />
      <path d="M14 26 H46 Q60 26 61 32 Q60 38 46 38 H14 Q12 32 14 26 Z" fill={`url(#${uid}-torp)`} stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M46 26 Q60 26 61 32 Q60 38 46 38 Z" fill="#e63946" stroke={OUTLINE} strokeWidth="1.2" />
      <rect x="40" y="26" width="3" height="12" fill="#ffd23f" stroke={OUTLINE} strokeWidth="0.8" />
      <path d="M18 29 H38" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    </g>
  </>
);

const Decoy: Draw = ({ uid }) => (
  <>
    <defs>
      <linearGradient id={`${uid}-ghost`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3c8ff" stopOpacity="0.9" />
        <stop offset="1" stopColor="#9b5de5" stopOpacity="0.75" />
      </linearGradient>
    </defs>
    {/* inflatable fake hull, bow to the right */}
    <path
      d="M6 26 Q6 18 14 18 H44 Q56 20 61 32 Q56 44 44 46 H14 Q6 46 6 38 Z"
      fill={`url(#${uid}-ghost)`}
      stroke="#ffffff"
      strokeWidth="2.2"
      strokeDasharray="5 3.5"
      strokeLinejoin="round"
    />
    <rect x="18" y="25" width="16" height="14" rx="3" fill="#ffffff" opacity="0.35" />
    {/* inflation valve */}
    <circle cx="11" cy="32" r="2.6" fill="#ffd23f" stroke={OUTLINE} strokeWidth="1" />
    <text
      x="38"
      y="33"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="24"
      fontWeight="900"
      fontFamily="system-ui, sans-serif"
      fill="#ffffff"
      stroke="#4b1d7a"
      strokeWidth="1.5"
      paintOrder="stroke"
    >
      ?
    </text>
    <path d="M50 8 L52 13 L57 15 L52 17 L50 22 L48 17 L43 15 L48 13 Z" fill="#ffe066" stroke={OUTLINE} strokeWidth="0.9" />
  </>
);

const Ciws: Draw = ({ uid }) => (
  <>
    <defs>
      <linearGradient id={`${uid}-dome`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.6" stopColor="#dfe5eb" />
        <stop offset="1" stopColor="#9aa6b2" />
      </linearGradient>
    </defs>
    {/* tracer fire */}
    <g stroke="#ffd23f" strokeWidth="2.2" strokeLinecap="round">
      <path d="M58 9 L63 2" />
      <path d="M51 6 L54 1" opacity="0.7" />
      <path d="M62 15 L66 9" opacity="0.7" />
    </g>
    <Star cx={55} cy={13} r={6} fill={`url(#${uid}-burst)`} />
    {/* radome body */}
    <rect x="13" y="50" width="34" height="9" rx="2" fill="#5d6874" stroke={OUTLINE} strokeWidth="1.4" />
    <path d="M17 50 V27 Q17 12 30 12 Q43 12 43 27 V50 Z" fill={`url(#${uid}-dome)`} stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M17 36 H43" stroke="#9aa6b2" strokeWidth="1.2" />
    <rect x="22" y="40" width="9" height="6" rx="1" fill="#e63946" stroke={OUTLINE} strokeWidth="0.9" />
    <path d="M22 17 Q26 15 30 15" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.9" />
    {/* rotary barrels sticking out of the radome */}
    <g transform="rotate(-42 38 34)">
      <rect x="36" y="29" width="22" height="10" rx="2" fill="#3a434d" stroke={OUTLINE} strokeWidth="1.3" />
      <path d="M40 32 H56 M40 36 H56" stroke="#8592a0" strokeWidth="1.2" />
      <rect x="54" y="28" width="4" height="12" rx="1" fill="#26303b" stroke={OUTLINE} strokeWidth="1" />
      <rect x="33" y="27" width="7" height="14" rx="2" fill="#5d6874" stroke={OUTLINE} strokeWidth="1.2" />
    </g>
  </>
);

const ICONS: Record<AbilityId | "shot", Draw> = {
  shot: Shot,
  double: Double,
  air: Air,
  shield: Shield,
  repair: Repair,
  cross: Cross,
  mine: Mine,
  sonar: Sonar,
  torpedo: Torpedo,
  decoy: Decoy,
  ciws: Ciws,
};

export function AbilityIcon({ id, className = "h-6 w-6" }: { id: AbilityId | "shot"; className?: string }) {
  const uid = `ico${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const Icon = ICONS[id];
  return (
    <svg viewBox="0 0 64 64" className={`block shrink-0 overflow-visible ${className}`} aria-hidden>
      <defs>
        <SteelDefs uid={uid} />
      </defs>
      <Icon uid={uid} />
    </svg>
  );
}
