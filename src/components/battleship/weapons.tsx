"use client";

import { type RefObject, useId, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** Missile flight time; impacts (ring / burst / splash) start right after. */
export const MISSILE_MS = 650;

/** Side view of a missile, nose toward +x. */
export function MissileSvg() {
  const id = `m${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 64 20" className="block h-auto w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#d9dee4" />
          <stop offset="1" stopColor="#808b97" />
        </linearGradient>
        <linearGradient id={`${id}-nose`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8a8a" />
          <stop offset="1" stopColor="#c81e3a" />
        </linearGradient>
        <linearGradient id={`${id}-flame`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset="0.3" stopColor="#ffd23f" />
          <stop offset="0.7" stopColor="#ff7a00" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff2e00" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* exhaust */}
      <path className="bs-flame" d="M12 6.5 Q4 7 -6 10 Q4 13 12 13.5 Z" fill={`url(#${id}-flame)`} />
      {/* tail fins */}
      <path d="M15 6.5 L9 0.5 L13 0.5 L22 6.5 Z M15 13.5 L9 19.5 L13 19.5 L22 13.5 Z" fill="#4b5560" stroke="#2c333a" strokeWidth="0.5" strokeLinejoin="round" />
      {/* body */}
      <rect x="11" y="6" width="3" height="8" rx="0.8" fill="#2c333a" />
      <rect x="13" y="5.5" width="39" height="9" rx="2.5" fill={`url(#${id}-body)`} stroke="#5d6874" strokeWidth="0.5" />
      <rect x="42" y="5.5" width="3" height="9" fill="#e63946" />
      <path d="M17 8 H40" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
      {/* mid fins */}
      <path d="M30 5.5 L27 2.5 L30 2.5 L35 5.5 Z M30 14.5 L27 17.5 L30 17.5 L35 14.5 Z" fill="#5d6874" />
      {/* nose cone */}
      <path d="M51 5.5 Q63 7 64 10 Q63 13 51 14.5 Z" fill={`url(#${id}-nose)`} stroke="#8f1426" strokeWidth="0.5" />
    </svg>
  );
}

/** Aiming reticle drawn over the selected cell. */
export function Reticle() {
  return (
    <svg viewBox="0 0 100 100" className="block h-full w-full overflow-visible" aria-hidden style={{ filter: "drop-shadow(0 0 3px rgb(255 224 102 / .9))" }}>
      <circle className="bs-spin" cx="50" cy="50" r="45" fill="none" stroke="#ffe066" strokeWidth="3" strokeDasharray="9 7" opacity="0.85" />
      <g stroke="#ffe066" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M8 26 V8 H26 M74 8 H92 V26 M92 74 V92 H74 M26 92 H8 V74" />
      </g>
      <circle cx="50" cy="50" r="22" fill="rgb(255 46 77 / .18)" stroke="#ff4d6d" strokeWidth="3.5" />
      <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round">
        <path d="M50 14 V34 M50 66 V86 M14 50 H34 M66 50 H86" />
      </g>
      <circle cx="50" cy="50" r="5" fill="#ff4d6d" stroke="#ffffff" strokeWidth="2" />
    </svg>
  );
}

type Pt = { x: number; y: number };

/** Quadratic bézier point + heading (degrees) at t. */
function along(s: Pt, c: Pt, e: Pt, t: number) {
  const u = 1 - t;
  const x = u * u * s.x + 2 * u * t * c.x + t * t * e.x;
  const y = u * u * s.y + 2 * u * t * c.y + t * t * e.y;
  const dx = 2 * u * (c.x - s.x) + 2 * t * (e.x - c.x);
  const dy = 2 * u * (c.y - s.y) + 2 * t * (e.y - c.y);
  return { x, y, a: (Math.atan2(dy, dx) * 180) / Math.PI };
}

const PUFFS = 6;
const STEPS = 20;

/**
 * A missile that flies to `target` (a zero-size element at the cell centre).
 * Our own shots launch from the FUEGO button (`[data-launcher]`); the rival's fall in
 * from the top of the screen. Rendered in a body portal so the board doesn't clip it.
 */
export function MissileFlight({ target, n, fromLauncher }: { target: RefObject<HTMLElement | null>; n: number; fromLauncher: boolean }) {
  const missile = useRef<HTMLDivElement>(null);
  const puffs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const t = target.current;
    const m = missile.current;
    if (!t || !m || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = t.getBoundingClientRect();
    const e = { x: box.left, y: box.top };
    const cell = (t.parentElement?.getBoundingClientRect().width ?? 340) / n; // rendered size, so it follows the zoom
    m.style.width = `${Math.max(30, cell * 1.25)}px`;

    const launcher = fromLauncher ? document.querySelector<HTMLElement>("[data-launcher]")?.getBoundingClientRect() : undefined;
    const s = launcher
      ? { x: launcher.left + launcher.width / 2, y: launcher.top + launcher.height * 0.35 }
      : fromLauncher
        ? { x: innerWidth / 2, y: innerHeight + 30 }
        : { x: e.x + 70, y: -60 };
    // Bow the path sideways so it reads as a lobbed shot, not a straight line.
    const len = Math.hypot(e.x - s.x, e.y - s.y) || 1;
    const side = e.x <= s.x ? 1 : -1;
    const bow = fromLauncher ? 0.24 * len * side : 0.08 * len;
    const c = { x: (s.x + e.x) / 2 + (-(e.y - s.y) / len) * bow, y: (s.y + e.y) / 2 + ((e.x - s.x) / len) * bow };

    const path = Array.from({ length: STEPS + 1 }, (_, i) => ({ t: i / STEPS, ...along(s, c, e, i / STEPS) }));
    const growFrom = fromLauncher ? 1.3 : 1.7; // shrinks as it comes down onto the sea
    const anims: Animation[] = [
      m.animate(
        path.map((p, i) => ({
          offset: p.t,
          opacity: i === 0 || i === STEPS ? 0 : 1,
          transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) rotate(${p.a}deg) scale(${growFrom - (growFrom - 0.85) * p.t})`,
        })),
        { duration: MISSILE_MS, easing: "cubic-bezier(.45, .05, .8, .65)", fill: "forwards" },
      ),
    ];
    puffs.current.forEach((puff, k) => {
      if (!puff) return;
      puff.style.width = puff.style.height = `${Math.max(10, cell * 0.38)}px`;
      anims.push(
        puff.animate(
          path.map((p) => ({
            offset: p.t,
            opacity: p.t < 0.06 ? 0 : p.t > 0.88 ? 0 : 0.55 - p.t * 0.3,
            transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${0.5 + p.t * 1.4})`,
          })),
          { duration: MISSILE_MS, delay: (k + 1) * 38, easing: "cubic-bezier(.45, .05, .8, .65)", fill: "forwards" },
        ),
      );
    });
    return () => anims.forEach((a) => a.cancel());
  }, [target, n, fromLauncher]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {Array.from({ length: PUFFS }, (_, k) => (
        <span
          key={k}
          ref={(el) => {
            puffs.current[k] = el;
          }}
          className="absolute left-0 top-0 rounded-full opacity-0"
          style={{ background: "radial-gradient(circle, rgb(255 255 255 / .9), rgb(220 225 235 / .5) 55%, transparent 72%)" }}
        />
      ))}
      <div ref={missile} className="absolute left-0 top-0 opacity-0" style={{ filter: "drop-shadow(0 4px 4px rgb(0 0 0 / .4))" }}>
        <MissileSvg />
      </div>
    </div>,
    document.body,
  );
}
