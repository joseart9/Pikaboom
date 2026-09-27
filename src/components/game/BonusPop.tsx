"use client";

import { useEffect } from "react";

/** A time change shown on screen: positive = bonus, negative = penalty, 0 = nothing. */
export type Bonus = { id: number; seconds: number };

function look(seconds: number) {
  if (seconds < 0) return { color: "#ff2e4d", label: seconds <= -15 ? "¡PELIGRO!" : seconds <= -10 ? "¡AUCH!" : "¡OUCH!" };
  if (seconds === 0) return { color: "#d7cff5", label: "¡NADA!" };
  if (seconds >= 20) return { color: "#ff3cac", label: "¡MEGA TIEMPO!" };
  if (seconds >= 10) return { color: "#ffbe0b", label: "¡INCREÍBLE!" };
  if (seconds >= 5) return { color: "#00d2ff", label: "¡BIEN!" };
  return { color: "#9be15d", label: "¡UN POQUITO!" };
}

/**
 * Fixed full-screen overlay with pointer-events: none — it never participates in layout,
 * so nothing underneath moves while the text grows and fades.
 */
export function BonusPop({ bonus, onDone }: { bonus: Bonus | null; onDone: () => void }) {
  useEffect(() => {
    if (!bonus) return;
    const t = setTimeout(onDone, 1750);
    return () => clearTimeout(t);
  }, [bonus, onDone]);

  if (!bonus) return null;
  const s = look(bonus.seconds);
  const text = `${bonus.seconds < 0 ? "−" : "+"}${Math.abs(bonus.seconds)}s`;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-live="polite">
      <div className="absolute left-1/2 top-1/2">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={`${bonus.id}-${i}`}
            className="pb-ray absolute left-0 top-0 block h-10 w-2 rounded-full"
            style={{ background: s.color, ["--r" as string]: `${(360 / 14) * i}deg`, transformOrigin: "50% 100%", marginLeft: -4, marginTop: -40 }}
          />
        ))}
      </div>
      <div
        key={bonus.id}
        className="pb-bonus absolute left-1/2 top-1/2 flex flex-col items-center whitespace-nowrap text-center font-display"
        style={{ color: s.color, textShadow: "0 5px 0 #1d0842, 0 0 30px rgb(0 0 0 / .5)", WebkitTextStroke: "3px #1d0842", paintOrder: "stroke fill" }}
      >
        <span className="text-[7rem] leading-none sm:text-[9rem]">{text}</span>
        <span className="text-4xl">{s.label}</span>
      </div>
    </div>
  );
}
