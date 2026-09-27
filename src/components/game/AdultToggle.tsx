"use client";

import { setAdultMode, useAdultMode } from "@/game/adultMode";

export function AdultToggle() {
  const on = useAdultMode();
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setAdultMode(!on)}
      className={`flex w-full items-center gap-3 rounded-3xl border-2 px-4 py-3 text-left transition active:scale-[0.98] ${
        on ? "border-[#ff2e6d] bg-[#ff2e6d]/25" : "border-white/15 bg-white/10"
      }`}
    >
      <span className={`text-4xl transition ${on ? "scale-110" : "grayscale-[.7]"}`} aria-hidden>
        🫦
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-2xl leading-none">Modo +18</span>
        <span className="block text-sm font-extrabold text-white/60">{on ? "Palabras picantes activadas 🔥" : "Solo para adultos"}</span>
      </span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? "bg-[#ff2e6d]" : "bg-white/20"}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
      </span>
    </button>
  );
}
