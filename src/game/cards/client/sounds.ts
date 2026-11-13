"use client";

// Card-game sounds and haptics (Phase 11 G.7; Phase 20 sound map). Most kinds map onto the existing synthesized
// sounds in src/game/audio.ts; Phase 20 adds a few card-game-only ones (elements, cinematic, slam, explosion, pack
// flash) synthesized here with WebAudio — no audio files. Every sound respects the global mute (`isMuted()` of
// src/game/audio.ts, toggled by the in-match settings and the other games). Sounds never throw (no AudioContext,
// autoplay policies): the game must work silently.
import { isMuted, playClick, playCoin, playError, playFanfare, playHit, playLaunch, playLifeLost, playPick, playPowerUp, playSplash, playTick, playWhoosh, unlockAudio } from "../../audio";
import { haptic } from "../../../lib/haptic";

export type CardSound =
  | "tick"
  | "myTurn"
  | "error"
  | "victory"
  | "defeat"
  | "draw"
  | "foeJoined"
  | "matchStart"
  | "select"
  // Event playback (Phase 13)
  | "play"
  | "hit"
  | "heal"
  | "death"
  | "burn"
  // Match reward paid (Phase 16)
  | "coin"
  // Phase 20: entrances, elements, impacts, pack opening
  | "cinematic"
  | "slam"
  | "explosion"
  | "blocked"
  | "fire"
  | "ice"
  | "arcane"
  | "lightning"
  | "shadow"
  | "nature"
  | "holy"
  | "packRare"
  | "packLegendary";

// ── Phase 20 synth (own graph; the shared one in audio.ts is private to it) ─────────────────────────────────
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, start: number, dur: number, { type = "sine" as OscillatorType, vol = 0.2, endFreq = 0, attack = 0.005 } = {}) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master!);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noise(start: number, dur: number, { vol = 0.2, type = "lowpass" as BiquadFilterType, freq = 2000, endFreq = 0, q = 1 } = {}) {
  const c = ac();
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, start);
  if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(start, Math.random());
  src.stop(start + dur + 0.05);
}

const now = () => ac().currentTime;

/** Deep boom + rising shimmer under a Legendaria/Única entrance. */
function sCinematic() {
  const t = now();
  tone(70, t, 1.1, { vol: 0.5, endFreq: 35, attack: 0.01 });
  noise(t, 0.9, { vol: 0.25, type: "bandpass", freq: 300, endFreq: 3000, q: 1.5 });
  [523, 659, 784, 1047].forEach((n, i) => tone(n, t + 0.25 + i * 0.08, 0.6, { type: "triangle", vol: 0.08, attack: 0.03 }));
}
/** Heavy landing thud. */
function sSlam() {
  const t = now();
  tone(110, t, 0.35, { vol: 0.55, endFreq: 40, attack: 0.002 });
  noise(t, 0.25, { vol: 0.35, freq: 900, endFreq: 150 });
}
/** Small explosion for a destroyed unit. */
function sExplosion() {
  const t = now();
  noise(t, 0.45, { vol: 0.45, freq: 5000, endFreq: 300 });
  tone(120, t, 0.4, { vol: 0.35, endFreq: 45, attack: 0.002 });
}
/** Glassy "tink" for a blocked hit. */
function sBlocked() {
  const t = now();
  tone(1760, t, 0.18, { type: "triangle", vol: 0.12 });
  tone(2637, t + 0.03, 0.2, { type: "sine", vol: 0.08 });
}
function sFire() {
  const t = now();
  noise(t, 0.4, { vol: 0.3, type: "bandpass", freq: 800, endFreq: 2500, q: 0.8 });
  tone(180, t, 0.3, { type: "sawtooth", vol: 0.05, endFreq: 90 });
}
function sIce() {
  const t = now();
  [2093, 2637, 3136].forEach((n, i) => tone(n, t + i * 0.04, 0.25, { type: "sine", vol: 0.07 }));
  noise(t, 0.2, { vol: 0.12, type: "highpass", freq: 6000 });
}
function sArcane() {
  const t = now();
  tone(660, t, 0.3, { type: "sine", vol: 0.12, endFreq: 1320 });
  tone(990, t + 0.05, 0.3, { type: "triangle", vol: 0.06, endFreq: 1980 });
}
function sLightning() {
  const t = now();
  noise(t, 0.18, { vol: 0.4, type: "highpass", freq: 3000 });
  tone(1200, t, 0.15, { type: "square", vol: 0.06, endFreq: 200 });
}
function sShadow() {
  const t = now();
  tone(220, t, 0.45, { type: "sawtooth", vol: 0.06, endFreq: 110, attack: 0.05 });
  noise(t, 0.4, { vol: 0.15, type: "lowpass", freq: 600, endFreq: 200 });
}
function sNature() {
  const t = now();
  noise(t, 0.35, { vol: 0.2, type: "bandpass", freq: 1500, endFreq: 600, q: 2 });
  tone(392, t, 0.2, { type: "triangle", vol: 0.08, endFreq: 523 });
}
function sHoly() {
  const t = now();
  [523, 659, 784].forEach((n) => tone(n, t, 0.6, { type: "sine", vol: 0.07, attack: 0.06 }));
  tone(1568, t + 0.1, 0.4, { type: "sine", vol: 0.04, attack: 0.05 });
}
/** Pack: a Rara/Mágica card flips. */
function sPackRare() {
  const t = now();
  [784, 988, 1319].forEach((n, i) => tone(n, t + i * 0.06, 0.3, { type: "triangle", vol: 0.1 }));
}
/** Pack: the Legendaria/Única flash. */
function sPackLegendary() {
  sCinematic();
  const t = now();
  [1047, 1319, 1568, 2093].forEach((n, i) => tone(n, t + 0.4 + i * 0.07, 0.5, { type: "square", vol: 0.05 }));
}

const SOUNDS: Record<CardSound, () => void> = {
  tick: () => playTick(true),
  myTurn: playPick,
  error: playError,
  victory: playFanfare,
  defeat: playLifeLost,
  draw: playClick,
  foeJoined: playCoin,
  matchStart: playWhoosh,
  select: playClick,
  play: playWhoosh,
  hit: playHit,
  heal: playPowerUp,
  death: playSplash,
  burn: playLaunch,
  coin: playCoin,
  cinematic: sCinematic,
  slam: sSlam,
  explosion: sExplosion,
  blocked: sBlocked,
  fire: sFire,
  ice: sIce,
  arcane: sArcane,
  lightning: sLightning,
  shadow: sShadow,
  nature: sNature,
  holy: sHoly,
  packRare: sPackRare,
  packLegendary: sPackLegendary,
};

const HAPTICS: Partial<Record<CardSound, number | number[]>> = {
  myTurn: [40, 30, 40],
  error: 30,
  victory: [60, 40, 60],
  defeat: 120,
  foeJoined: 30,
  slam: 25,
  cinematic: [30, 60, 50],
  packLegendary: [40, 40, 80],
};

export function playCardSound(kind: CardSound): void {
  if (!isMuted()) {
    try {
      SOUNDS[kind]();
    } catch {
      /* audio unavailable — silent is fine */
    }
  }
  const pattern = HAPTICS[kind];
  if (pattern !== undefined) haptic(pattern);
}

let armed = false;

/** Browsers (iOS especially) only start audio from a user gesture: unlock on the first tap anywhere. */
export function armAudioUnlock(): void {
  if (armed || typeof window === "undefined") return;
  armed = true;
  window.addEventListener(
    "pointerdown",
    () => {
      try {
        unlockAudio();
        ac();
      } catch {
        /* ignore */
      }
    },
    { once: true, capture: true },
  );
}
