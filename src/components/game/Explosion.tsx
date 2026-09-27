"use client";

import { useState } from "react";

const COLORS = ["#ffbe0b", "#fb5607", "#ff006e", "#ffe066", "#ffffff", "#ff8800"];

function makeParticles() {
  return (
      Array.from({ length: 46 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 180 + Math.random() * 420;
        return {
          i,
          dx: `${Math.cos(angle) * dist}px`,
          dy: `${Math.sin(angle) * dist}px`,
          rot: `${Math.random() * 720 - 360}deg`,
          dur: `${0.8 + Math.random() * 0.9}s`,
          size: 8 + Math.random() * 22,
          color: COLORS[i % COLORS.length],
          round: Math.random() > 0.5,
        };
      })
  );
}

function makeSmoke() {
  return (
      Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return {
          i,
          dx: `${Math.cos(angle) * 160}px`,
          dy: `${Math.sin(angle) * 160 - 60}px`,
          dur: `${1.6 + Math.random() * 1}s`,
          size: 120 + Math.random() * 80,
        };
      })
  );
}

export function Explosion() {
  const [particles] = useState(makeParticles);
  const [smoke] = useState(makeSmoke);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[#1a0636]/60" />
      {smoke.map((s) => (
        <span
          key={`s${s.i}`}
          className="pb-smoke absolute left-1/2 top-1/2 rounded-full"
          style={{ width: s.size, height: s.size, background: "radial-gradient(circle, #6b5a7a 0%, #3a2f45 60%, transparent 70%)", ["--dx" as string]: s.dx, ["--dy" as string]: s.dy, ["--dur" as string]: s.dur }}
        />
      ))}
      <span
        className="pb-fireball absolute left-1/2 top-1/2 h-64 w-64 rounded-full"
        style={{ background: "radial-gradient(circle, #fff 0%, #ffe066 25%, #ff8800 50%, #ff006e 70%, transparent 72%)" }}
      />
      {particles.map((p) => (
        <span
          key={p.i}
          className="pb-particle absolute left-1/2 top-1/2"
          style={{
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            background: p.color,
            borderRadius: p.round ? "9999px" : "3px",
            ["--dx" as string]: p.dx,
            ["--dy" as string]: p.dy,
            ["--rot" as string]: p.rot,
            ["--dur" as string]: p.dur,
          }}
        />
      ))}
      <div
        className="pb-boom-text absolute left-1/2 top-1/2 font-display text-[6.5rem] leading-none whitespace-nowrap text-[#ffe066] sm:text-[10rem]"
        style={{ WebkitTextStroke: "6px #1d0842", paintOrder: "stroke fill", textShadow: "0 10px 0 #ff006e, 0 0 60px #ff8800" }}
      >
        ¡BOOM!
      </div>
      <div className="pb-flash absolute inset-0 bg-white" />
    </div>
  );
}
