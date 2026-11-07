"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { ConnStatus } from "@/game/battleship/useRoom";

/** QR for the invite link, drawn as inline SVG. */
export function QrCode({ text, size = 168 }: { text: string; size?: number }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1d0842", light: "#ffffff" } })
      .then((s) => alive && setSvg(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [text]);
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl [&>svg]:h-full [&>svg]:w-full"
      style={{ width: size, height: size }}
      aria-label="Código QR para unirse"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export type PopMsg = { id: number; text: string; sub?: string; color: string; small?: boolean };

/** Big animated text over everything (turn changes, coins, combos). Never affects layout. */
export function Pop({ pop, onDone }: { pop: PopMsg | null; onDone: () => void }) {
  useEffect(() => {
    if (!pop) return;
    const t = setTimeout(onDone, 1700);
    return () => clearTimeout(t);
  }, [pop, onDone]);
  if (!pop) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-live="polite">
      <div className="absolute left-1/2 top-1/2">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={`${pop.id}-${i}`}
            className="pb-ray absolute left-0 top-0 block h-10 w-2 rounded-full"
            style={{ background: pop.color, ["--r" as string]: `${(360 / 14) * i}deg`, transformOrigin: "50% 100%", marginLeft: -4, marginTop: -40 }}
          />
        ))}
      </div>
      <div
        key={pop.id}
        className="pb-bonus absolute left-1/2 top-1/2 flex flex-col items-center whitespace-nowrap text-center font-display"
        style={{ color: pop.color, textShadow: "0 5px 0 #1d0842, 0 0 30px rgb(0 0 0 / .5)", WebkitTextStroke: "3px #1d0842", paintOrder: "stroke fill" }}
      >
        <span
          className={`leading-none ${
            pop.text.length <= 8 ? (pop.small ? "text-6xl" : "text-[4.2rem] sm:text-[5rem]") : pop.text.length <= 11 ? "text-[3rem] sm:text-[4rem]" : "text-[2.5rem] sm:text-[3.5rem]"
          }`}
        >
          {pop.text}
        </span>
        {pop.sub && <span className="mt-1 text-2xl">{pop.sub}</span>}
      </div>
    </div>
  );
}

export function ConnBadge({ status }: { status: ConnStatus }) {
  const ok = status === "online";
  const label = ok ? "En línea" : status === "connecting" ? "Conectando…" : "Reconectando…";
  return (
    <span
      className={`relative grid h-11 w-11 place-items-center rounded-2xl text-lg ${ok ? "bg-[#06d6a0]/20" : "bg-[#ffbe0b]/25"}`}
      role="status"
      aria-label={label}
      title={label}
    >
      📶
      <span className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#2b0a57] ${ok ? "bg-[#06d6a0]" : "animate-pulse bg-[#ffbe0b]"}`} />
    </span>
  );
}

/** Spinning radar used while waiting for the other phone. */
export function Radar({ size = 120 }: { size?: number }) {
  return (
    <div className="relative shrink-0 overflow-hidden rounded-full border-4 border-[#06d6a0]/60 bg-[#06281f]" style={{ width: size, height: size }}>
      <div className="absolute inset-[22%] rounded-full border-2 border-[#06d6a0]/30" />
      <div className="absolute inset-[44%] rounded-full border-2 border-[#06d6a0]/30" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#06d6a0]/30" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-[#06d6a0]/30" />
      <div className="bs-radar absolute inset-0" style={{ background: "conic-gradient(from 0deg, transparent 0deg, transparent 290deg, rgb(6 214 160 / .7) 360deg)" }} />
      <span className="bs-blip absolute left-[64%] top-[28%] h-2.5 w-2.5 rounded-full bg-[#7dffd6] shadow-[0_0_8px_#7dffd6]" />
      <span className="bs-blip absolute left-[30%] top-[62%] h-2 w-2 rounded-full bg-[#7dffd6] shadow-[0_0_8px_#7dffd6]" style={{ animationDelay: "1.1s" }} />
    </div>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),12px)] z-50 flex justify-center px-4 pb-24">
      <div key={text} className="pb-pop-in max-w-sm rounded-2xl border-2 border-white/20 bg-[#1d0842]/95 px-4 py-2.5 text-center text-sm font-extrabold shadow-2xl">
        {text}
      </div>
    </div>
  );
}
