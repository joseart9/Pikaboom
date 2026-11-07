"use client";

import { useId, type ReactNode } from "react";
import type { ShipType } from "@/game/battleship/logic";

/**
 * Top-down ship sprites. Each is drawn horizontally, bow pointing right, in a
 * viewBox of (size * 100) × 100 — one grid cell = 100 units. Vertical ships are
 * rotated inside the SVG so the sprite always fills its cells exactly.
 */

/** Small parked jet, nose toward +x, ~20 units long. */
function Jet({ x, y, rot, scale = 1 }: { x: number; y: number; rot: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <path
        d="M10 0 L4 -1.7 L0 -2 L-4.5 -7.8 L-6.8 -7.8 L-5.6 -2 L-8 -2 L-10 -4.6 L-11.4 -4.6 L-10.4 0 L-11.4 4.6 L-10 4.6 L-8 2 L-5.6 2 L-6.8 7.8 L-4.5 7.8 L0 2 L4 1.7 Z"
        fill="#a7b2be"
        stroke="#56616d"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <path d="M8 0 L-8 0" stroke="#c9d2db" strokeWidth="0.9" strokeLinecap="round" />
      <ellipse cx="4.6" cy="0" rx="2.2" ry="0.9" fill="#26303b" />
    </g>
  );
}

function Helicopter({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M-4 0 L-13 0" stroke="#7d8996" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="0" cy="0" rx="5.5" ry="2.6" fill="#8d99a6" stroke="#4f5a66" strokeWidth="0.5" />
      <ellipse cx="3" cy="0" rx="1.8" ry="1.3" fill="#26303b" />
      <g stroke="#2b333c" strokeWidth="0.9" strokeLinecap="round" opacity="0.8">
        <path d="M-7 -6 L7 6" />
        <path d="M-7 6 L7 -6" />
      </g>
    </g>
  );
}

const CARRIER_DECK =
  "M8 28 L60 22 L112 18 L132 9 L298 9 L326 19 L440 22 Q470 26 483 40 L487 50 L483 60 Q470 74 440 78 L300 82 L60 80 L8 74 Z";

function Carrier({ uid }: { uid: string }) {
  const deck = `${uid}-deck`;
  const hull = `${uid}-hull`;
  const island = `${uid}-island`;
  return (
    <>
      <defs>
        <linearGradient id={deck} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a5461" />
          <stop offset="0.5" stopColor="#3b4450" />
          <stop offset="1" stopColor="#323a45" />
        </linearGradient>
        <linearGradient id={hull} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a96a3" />
          <stop offset="1" stopColor="#4e5965" />
        </linearGradient>
        <linearGradient id={island} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d5dce3" />
          <stop offset="1" stopColor="#8e9aa7" />
        </linearGradient>
      </defs>

      {/* hull peeking out ahead of the flight deck */}
      <path d="M430 30 Q478 34 497 50 Q478 66 430 70 Z" fill={`url(#${hull})`} stroke="#3d4650" strokeWidth="0.8" />

      {/* deck thickness / side */}
      <path d={CARRIER_DECK} fill="#1f262e" transform="translate(0 2.6)" />

      {/* elevators hanging off the deck edges */}
      <g fill="#46505c" stroke="#8592a0" strokeWidth="0.8">
        <rect x="246" y="79" width="26" height="11" rx="1" />
        <rect x="392" y="76" width="24" height="11" rx="1" />
        <rect x="420" y="74" width="22" height="11" rx="1" />
        <rect x="80" y="10" width="26" height="11" rx="1" />
      </g>

      {/* flight deck */}
      <path d={CARRIER_DECK} fill={`url(#${deck})`} stroke="#8794a2" strokeWidth="1.2" strokeLinejoin="round" />

      {/* angled landing deck */}
      <g transform="translate(14 58) rotate(-8)">
        <rect x="0" y="-4" width="150" height="8" fill="#000" opacity="0.16" />
        <path d="M0 -10 L270 -10 M0 10 L270 10" stroke="#e8edf2" strokeWidth="1" opacity="0.85" />
        <path d="M0 0 L270 0" stroke="#ffffff" strokeWidth="1.3" strokeDasharray="7 6" opacity="0.9" />
        <path d="M40 -10 L40 10" stroke="#ffd23f" strokeWidth="1" opacity="0.8" />
        {/* arresting wires */}
        <path d="M46 -9 L46 9 M54 -9 L54 9 M62 -9 L62 9" stroke="#cfd6de" strokeWidth="0.6" opacity="0.7" />
      </g>

      {/* bow catapults */}
      <g stroke="#cfd6de" strokeWidth="1.1" opacity="0.85">
        <path d="M300 41 L470 46" />
        <path d="M300 59 L470 54" />
      </g>
      <g fill="#5c6774">
        <rect x="292" y="35" width="4" height="12" rx="1" />
        <rect x="292" y="53" width="4" height="12" rx="1" />
      </g>

      {/* deck edge safety line */}
      <path d="M300 79 L440 75 Q466 72 478 60" fill="none" stroke="#ffd23f" strokeWidth="0.8" opacity="0.55" />

      {/* hull number */}
      <text
        x="452"
        y="50"
        transform="rotate(90 452 50)"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="15"
        fontWeight="900"
        fontFamily="system-ui, sans-serif"
        fill="#f2f5f8"
        opacity="0.85"
      >
        05
      </text>

      {/* aircraft */}
      <Jet x={322} y={57.5} rot={-1.5} />
      <Jet x={350} y={31} rot={110} />
      <Jet x={370} y={31} rot={110} />
      <Jet x={390} y={31} rot={110} />
      <Jet x={404} y={67} rot={-108} />
      <Jet x={423} y={65} rot={-108} />
      <Jet x={176} y={71} rot={-100} scale={0.95} />
      <Jet x={197} y={71.5} rot={-100} scale={0.95} />
      <Jet x={218} y={72} rot={-100} scale={0.95} />
      <Helicopter x={120} y={68} rot={180} />

      {/* island superstructure (starboard) */}
      <g>
        <rect x="330" y="73" width="50" height="17" rx="2.5" fill="#1f262e" transform="translate(1.5 2)" opacity="0.6" />
        <rect x="330" y="73" width="50" height="17" rx="2.5" fill={`url(#${island})`} stroke="#5d6874" strokeWidth="0.8" />
        <rect x="336" y="75.5" width="34" height="12" rx="1.5" fill="#e6ebf0" stroke="#7b8794" strokeWidth="0.6" />
        <rect x="370" y="76" width="4" height="11" rx="1" fill="#26303b" />
        <path d="M344 81.5 L364 81.5" stroke="#5d6874" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M352 76.5 L352 86.5" stroke="#5d6874" strokeWidth="0.8" />
        <circle cx="345" cy="81.5" r="2.6" fill="#f7f9fb" stroke="#7b8794" strokeWidth="0.6" />
        <circle cx="362" cy="78.5" r="1.6" fill="#f7f9fb" stroke="#7b8794" strokeWidth="0.5" />
      </g>
    </>
  );
}

/** Gradients shared by the gun ships. */
function SteelDefs({ uid }: { uid: string }) {
  return (
    <defs>
      <linearGradient id={`${uid}-side`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8a96a3" />
        <stop offset="1" stopColor="#4a5561" />
      </linearGradient>
      <linearGradient id={`${uid}-gray`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8995a2" />
        <stop offset="0.55" stopColor="#737f8c" />
        <stop offset="1" stopColor="#5f6a77" />
      </linearGradient>
      <linearGradient id={`${uid}-teak`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c99a66" />
        <stop offset="0.5" stopColor="#b6875a" />
        <stop offset="1" stopColor="#9c724a" />
      </linearGradient>
      <pattern id={`${uid}-planks`} width="28" height="3.4" patternUnits="userSpaceOnUse">
        <path d="M0 3.2 H28" stroke="#5e3f22" strokeWidth="0.45" opacity="0.45" />
        <path d="M11 0 V3.2" stroke="#5e3f22" strokeWidth="0.4" opacity="0.25" />
      </pattern>
      <linearGradient id={`${uid}-house`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#dbe1e7" />
        <stop offset="1" stopColor="#97a3af" />
      </linearGradient>
      <linearGradient id={`${uid}-turret`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b5bfc9" />
        <stop offset="1" stopColor="#6c7884" />
      </linearGradient>
    </defs>
  );
}

/** Armoured main-gun turret, barrels toward +x. */
function Turret({ uid, x, y, rot = 0, guns = 3, len = 26, scale = 1 }: { uid: string; x: number; y: number; rot?: number; guns?: number; len?: number; scale?: number }) {
  const offs = guns === 3 ? [-6, 0, 6] : guns === 2 ? [-3.5, 3.5] : [0];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <circle cx="1.5" cy="2" r="13" fill="#000" opacity="0.28" />
      {offs.map((o) => (
        <g key={o}>
          <rect x="8" y={o - 1.4} width={len} height="2.8" rx="1.2" fill="#7f8b97" stroke="#3f4852" strokeWidth="0.5" />
          <rect x={8 + len - 3} y={o - 1.7} width="3" height="3.4" rx="1" fill="#4b545e" />
        </g>
      ))}
      <path d="M-13 -11 Q-15.5 0 -13 11 L4 11 Q12.5 9 13 0 Q12.5 -9 4 -11 Z" fill={`url(#${uid}-turret)`} stroke="#4f5a66" strokeWidth="0.7" />
      <rect x="-10" y="-13.2" width="3.2" height="26.4" rx="1.2" fill="#8e9aa6" stroke="#4f5a66" strokeWidth="0.5" />
      <rect x="-3" y="-4" width="6" height="3.5" rx="0.8" fill="#5d6874" opacity="0.7" />
    </g>
  );
}

/** Small enclosed gun mount (secondary / destroyer guns), barrels toward +x. */
function Mount({ uid, x, y, rot = 0, guns = 2, len = 11, scale = 1 }: { uid: string; x: number; y: number; rot?: number; guns?: number; len?: number; scale?: number }) {
  const offs = guns === 2 ? [-1.9, 1.9] : [0];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <circle cx="1" cy="1.3" r="6.5" fill="#000" opacity="0.25" />
      {offs.map((o) => (
        <rect key={o} x="3" y={o - 0.8} width={len} height="1.6" rx="0.7" fill="#7f8b97" stroke="#3f4852" strokeWidth="0.35" />
      ))}
      <path d="M-6.5 -5.5 Q-7.5 0 -6.5 5.5 L2 5.5 Q6.5 4 6.5 0 Q6.5 -4 2 -5.5 Z" fill={`url(#${uid}-turret)`} stroke="#4f5a66" strokeWidth="0.55" />
    </g>
  );
}

function Funnel({ x, y, rx = 9, ry = 7 }: { x: number; y: number; rx?: number; ry?: number }) {
  return (
    <g>
      <ellipse cx={x + 1.5} cy={y + 2} rx={rx} ry={ry} fill="#000" opacity="0.3" />
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#7d8995" stroke="#4a545e" strokeWidth="0.7" />
      <ellipse cx={x + 0.6} cy={y} rx={rx * 0.68} ry={ry * 0.66} fill="#1b2026" />
      <path d={`M${x - rx * 0.5} ${y} H${x + rx * 0.6}`} stroke="#3a424b" strokeWidth="0.6" />
    </g>
  );
}

/** Mast seen from above: a hub with a yard arm across the ship. */
function Mast({ x, y, span = 22 }: { x: number; y: number; span?: number }) {
  return (
    <g stroke="#3e4750" strokeLinecap="round">
      <path d={`M${x} ${y - span / 2} V${y + span / 2}`} strokeWidth="1.1" />
      <circle cx={x} cy={y} r="2.4" fill="#c7cfd7" strokeWidth="0.6" />
    </g>
  );
}

const BATTLESHIP_HULL = "M8 50 Q8 27 38 22 L296 20 Q362 22 394 50 Q362 78 296 80 L38 78 Q8 73 8 50 Z";
const BATTLESHIP_DECK = "M13 50 Q13 30 40 26 L296 24.5 Q355 26.5 385 50 Q355 73.5 296 75.5 L40 74 Q13 70 13 50 Z";

function Battleship({ uid }: { uid: string }) {
  return (
    <>
      <SteelDefs uid={uid} />
      <path d={BATTLESHIP_HULL} fill="#1f262e" transform="translate(0 2.6)" />
      <path d={BATTLESHIP_HULL} fill={`url(#${uid}-side)`} stroke="#3d4650" strokeWidth="0.8" />
      <path d={BATTLESHIP_DECK} fill={`url(#${uid}-teak)`} />
      <path d={BATTLESHIP_DECK} fill={`url(#${uid}-planks)`} />
      <path d={BATTLESHIP_DECK} fill="none" stroke="#e3c79d" strokeWidth="0.7" opacity="0.6" />

      {/* bow: breakwater + anchor chains */}
      <path d="M328 31 L346 50 L328 69" fill="none" stroke="#d9dfe5" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M370 45 L350 46 M370 55 L350 54" stroke="#3a3027" strokeWidth="1.2" strokeDasharray="1.6 1" />

      {/* stern crane */}
      <path d="M24 50 L42 40" stroke="#4a545e" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="24" cy="50" r="3" fill="#8e9aa6" stroke="#4a545e" strokeWidth="0.6" />

      {/* superstructure */}
      <rect x="132" y="35" width="122" height="30" rx="5" fill="#000" opacity="0.28" transform="translate(1.5 2.2)" />
      <rect x="132" y="35" width="122" height="30" rx="5" fill={`url(#${uid}-house)`} stroke="#68737f" strokeWidth="0.8" />
      <rect x="146" y="40" width="94" height="20" rx="4" fill="#e6ebf0" stroke="#8a96a2" strokeWidth="0.6" />
      <Funnel x={168} y={50} />
      <Funnel x={203} y={50} />
      <Mast x={222} y={50} span={26} />
      <ellipse cx="240" cy="50" rx="9" ry="10.5" fill="#b8c2cc" stroke="#5d6874" strokeWidth="0.8" />
      <path d="M245 43 Q250 50 245 57" fill="none" stroke="#1d242c" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="148" cy="50" r="5" fill="#c4ccd4" stroke="#5d6874" strokeWidth="0.6" />

      {/* secondary 5" mounts along the sides */}
      {[152, 178, 204, 230].map((x) => (
        <g key={x}>
          <Mount uid={uid} x={x} y={30.5} rot={-35} />
          <Mount uid={uid} x={x} y={69.5} rot={35} />
        </g>
      ))}

      {/* main battery */}
      <Turret uid={uid} x={82} y={50} rot={180} />
      <Turret uid={uid} x={316} y={50} />
      <Turret uid={uid} x={274} y={50} scale={1.06} />
    </>
  );
}

const CRUISER_HULL = "M8 50 Q8 33 30 30 L210 28 Q268 30 296 50 Q268 70 210 72 L30 70 Q8 67 8 50 Z";
const CRUISER_DECK = "M12 50 Q12 35 32 33.5 L210 31.5 Q262 33.5 288 50 Q262 66.5 210 68.5 L32 66.5 Q12 65 12 50 Z";

function Vls({ x, y, cols, rows }: { x: number; y: number; cols: number; rows: number }) {
  const cw = 4.4;
  const ch = 4;
  return (
    <g>
      <rect x={x - 1.2} y={y - 1.2} width={cols * cw + 1.4} height={rows * ch + 1.4} rx="1" fill="#4a5460" stroke="#a5b0bb" strokeWidth="0.5" />
      {Array.from({ length: cols * rows }, (_, i) => (
        <rect key={i} x={x + (i % cols) * cw} y={y + Math.floor(i / cols) * ch} width={cw - 1} height={ch - 1} rx="0.4" fill="#2b323a" />
      ))}
    </g>
  );
}

function Cruiser({ uid }: { uid: string }) {
  return (
    <>
      <SteelDefs uid={uid} />
      <path d={CRUISER_HULL} fill="#1f262e" transform="translate(0 2.4)" />
      <path d={CRUISER_HULL} fill={`url(#${uid}-side)`} stroke="#3d4650" strokeWidth="0.8" />
      <path d={CRUISER_DECK} fill={`url(#${uid}-gray)`} stroke="#a9b4bf" strokeWidth="0.7" />

      {/* stern helicopter deck */}
      <rect x="15" y="36" width="44" height="28" rx="3" fill="#56616d" />
      <circle cx="37" cy="50" r="10.5" fill="none" stroke="#f2f5f8" strokeWidth="1" opacity="0.9" />
      <path d="M17 50 H57" stroke="#ffd23f" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.8" />
      <path d="M33.5 45.5 V54.5 M40.5 45.5 V54.5 M33.5 50 H40.5" stroke="#f2f5f8" strokeWidth="1.1" />

      <Vls x={66} y={41} cols={4} rows={4} />

      {/* aft deckhouse + CIWS */}
      <rect x="92" y="38" width="40" height="24" rx="3" fill="#000" opacity="0.28" transform="translate(1.3 2)" />
      <rect x="92" y="38" width="40" height="24" rx="3" fill={`url(#${uid}-house)`} stroke="#68737f" strokeWidth="0.7" />
      <circle cx="100" cy="50" r="4.2" fill="#f4f6f8" stroke="#7b8794" strokeWidth="0.6" />
      <Funnel x={118} y={50} rx={7.5} ry={6} />

      {/* forward deckhouse with radar faces */}
      <rect x="136" y="35" width="62" height="30" rx="4" fill="#000" opacity="0.28" transform="translate(1.4 2.2)" />
      <rect x="136" y="35" width="62" height="30" rx="4" fill={`url(#${uid}-house)`} stroke="#68737f" strokeWidth="0.8" />
      <Funnel x={150} y={50} rx={7.5} ry={6} />
      <Mast x={168} y={50} span={24} />
      <rect x="176" y="40" width="18" height="20" rx="2.5" fill="#e6ebf0" stroke="#8a96a2" strokeWidth="0.6" />
      <path d="M180 36.2 H192 M180 63.8 H192" stroke="#2b323a" strokeWidth="2" strokeLinecap="round" />
      <path d="M195.5 42 V58" stroke="#1d242c" strokeWidth="1.5" strokeLinecap="round" />

      <Vls x={210} y={41} cols={5} rows={4} />

      {/* bow gun + chains */}
      <path d="M278 45 L262 46 M278 55 L262 54" stroke="#2b323a" strokeWidth="1" strokeDasharray="1.4 0.9" />
      <g transform="translate(248 50)">
        <circle cx="1" cy="1.4" r="7" fill="#000" opacity="0.25" />
        <rect x="4" y="-0.9" width="17" height="1.8" rx="0.8" fill="#7f8b97" stroke="#3f4852" strokeWidth="0.35" />
        <path d="M-7 -6.5 L5 -5.5 L9 0 L5 5.5 L-7 6.5 Z" fill={`url(#${uid}-turret)`} stroke="#4f5a66" strokeWidth="0.6" strokeLinejoin="round" />
      </g>
    </>
  );
}

const SUB_HULL = "M16 47 Q40 36 80 34 L238 34 Q293 34 293 50 Q293 66 238 66 L80 66 Q40 64 16 53 Z";

function Submarine({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sub`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14181d" />
          <stop offset="0.38" stopColor="#3b4450" />
          <stop offset="0.5" stopColor="#4a5461" />
          <stop offset="0.62" stopColor="#3b4450" />
          <stop offset="1" stopColor="#14181d" />
        </linearGradient>
        <linearGradient id={`${uid}-sail`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#262c34" />
          <stop offset="0.5" stopColor="#4d5764" />
          <stop offset="1" stopColor="#1e232a" />
        </linearGradient>
      </defs>

      {/* stern planes + screw */}
      <g fill="#262c34" stroke="#56606c" strokeWidth="0.6" strokeLinejoin="round">
        <path d="M27 45 L23 23 L33 23 L41 42 Z" />
        <path d="M27 55 L23 77 L33 77 L41 58 Z" />
      </g>
      <ellipse cx="13" cy="50" rx="3.4" ry="6" fill="#1a1e23" stroke="#56606c" strokeWidth="0.6" />

      {/* hull */}
      <path d={SUB_HULL} fill="#000" opacity="0.35" transform="translate(0 2.6)" />
      <path d={SUB_HULL} fill={`url(#${uid}-sub)`} stroke="#0e1114" strokeWidth="0.8" />
      <path d="M60 46 Q160 44.5 270 46" fill="none" stroke="#7d8996" strokeWidth="0.8" opacity="0.5" />

      {/* missile tube hatches */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i} fill="#2a3139" stroke="#66717d" strokeWidth="0.5">
          <circle cx={98 + i * 13} cy="43.5" r="3.6" />
          <circle cx={98 + i * 13} cy="56.5" r="3.6" />
        </g>
      ))}
      <rect x="250" y="47" width="10" height="6" rx="1.5" fill="#2a3139" stroke="#66717d" strokeWidth="0.5" />

      {/* sail with fairwater planes */}
      <path d="M182 51.6 Q182 44.6 192 44.6 L212 45.6 Q222 47.6 222 51.6 Q222 55.6 212 57.6 L192 58.6 Q182 58.6 182 51.6 Z" fill="#000" opacity="0.4" />
      <rect x="199" y="31" width="6" height="38" rx="2.5" fill="#262c34" stroke="#56606c" strokeWidth="0.6" />
      <path d="M182 50 Q182 43 192 43 L212 44 Q222 46 222 50 Q222 54 212 56 L192 57 Q182 57 182 50 Z" fill={`url(#${uid}-sail)`} stroke="#0e1114" strokeWidth="0.8" />
      <circle cx="203" cy="48" r="1.4" fill="#9aa6b2" />
      <circle cx="209" cy="50" r="1.2" fill="#9aa6b2" />
      <circle cx="197" cy="51" r="1" fill="#9aa6b2" />
    </>
  );
}

const DESTROYER_HULL = "M6 50 Q6 36 24 33 L130 31 Q178 33 196 50 Q178 67 130 69 L24 67 Q6 64 6 50 Z";
const DESTROYER_DECK = "M10 50 Q10 38 26 36 L130 34.5 Q173 36.5 188 50 Q173 63.5 130 65.5 L26 64 Q10 62 10 50 Z";

function Destroyer({ uid }: { uid: string }) {
  return (
    <>
      <SteelDefs uid={uid} />
      <path d={DESTROYER_HULL} fill="#1f262e" transform="translate(0 2.3)" />
      <path d={DESTROYER_HULL} fill={`url(#${uid}-side)`} stroke="#3d4650" strokeWidth="0.8" />
      <path d={DESTROYER_DECK} fill={`url(#${uid}-gray)`} stroke="#a9b4bf" strokeWidth="0.7" />

      {/* depth-charge racks */}
      <rect x="12" y="40" width="7" height="5" rx="1" fill="#3a424b" />
      <rect x="12" y="55" width="7" height="5" rx="1" fill="#3a424b" />

      {/* torpedo tubes */}
      <g transform="translate(55 50) rotate(-18)">
        <circle r="4" fill="#5d6874" />
        {[-4, -2, 0, 2, 4].map((o) => (
          <rect key={o} x="-11" y={o - 0.8} width="22" height="1.6" rx="0.8" fill="#8e9aa6" stroke="#3f4852" strokeWidth="0.3" />
        ))}
      </g>

      {/* superstructure */}
      <rect x="64" y="39" width="72" height="22" rx="3.5" fill="#000" opacity="0.28" transform="translate(1.3 2)" />
      <rect x="64" y="39" width="72" height="22" rx="3.5" fill={`url(#${uid}-house)`} stroke="#68737f" strokeWidth="0.7" />
      <Funnel x={76} y={50} rx={7} ry={5.5} />
      <Funnel x={95} y={50} rx={7} ry={5.5} />
      <Mast x={110} y={50} span={20} />
      <rect x="116" y="41.5" width="17" height="17" rx="2.5" fill="#e6ebf0" stroke="#8a96a2" strokeWidth="0.6" />
      <path d="M134.5 44 V56" stroke="#1d242c" strokeWidth="1.5" strokeLinecap="round" />

      {/* guns */}
      <Mount uid={uid} x={32} y={50} rot={180} guns={1} len={13} scale={1.15} />
      <Mount uid={uid} x={164} y={50} guns={1} len={13} scale={1.15} />
      <Mount uid={uid} x={146} y={50} guns={1} len={13} scale={1.2} />
      <path d="M182 46 L172 46.5 M182 54 L172 53.5" stroke="#2b323a" strokeWidth="0.9" strokeDasharray="1.3 0.8" />
    </>
  );
}

const SPRITES: Record<ShipType, (p: { uid: string }) => ReactNode> = {
  carrier: Carrier,
  battleship: Battleship,
  cruiser: Cruiser,
  submarine: Submarine,
  destroyer: Destroyer,
};

export function ShipSprite({ type, size, vertical }: { type: ShipType; size: number; vertical: boolean }) {
  const uid = `ship${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const Sprite = SPRITES[type];
  const len = size * 100;
  return (
    <svg
      viewBox={vertical ? `0 0 100 ${len}` : `0 0 ${len} 100`}
      className="block h-full w-full overflow-visible"
      aria-hidden
    >
      <g transform={vertical ? "translate(100 0) rotate(90)" : undefined}>
        <Sprite uid={uid} />
      </g>
    </svg>
  );
}
