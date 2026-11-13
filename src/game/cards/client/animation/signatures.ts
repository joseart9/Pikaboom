// UI-09 signature reveals: the six Legendaria/Única cards get an individual cinematic built from the SAME primitives
// (an aura behind the card, one accent over it, particle motes) — data, not six code forks. `entranceTimeline` folds
// a spec into the regular cinematic timeline (still ≤ 1.6 s at 1×, skippable, reduced-motion aware); the look of each
// aura/accent variant is CSS (`.cg-fx-aura--<id>`, `.cg-fx-accent--<id>` in cards.css). The card art stays static.
import type { SignatureId } from "../../catalog/visuals";
import type { ParticleKind } from "./fx";

/** How the accent over the card moves: a star glint, a band sweeping across, an expanding flare, a soft pulse. */
export type AccentMotion = "glint" | "sweep" | "flare" | "pulse";
/** Where on the revealed card a mote burst starts. */
export type MoteOrigin = "center" | "top" | "base";

export interface MoteSpec {
  /** Offset (ms at 1×) from the start of the entrance. */
  at: number;
  kind: ParticleKind;
  count: number;
  from: MoteOrigin;
}

export interface SignatureSpec {
  /** The aura behind the card (replaces the generic rarity rays): start, total turn (deg) and start scale. */
  aura: { at: number; spin: number; from: number };
  /** One accent over the card. */
  accent: { at: number; ms: number; motion: AccentMotion };
  motes: MoteSpec[];
  /** Overrides the cinematic shake intensity (Ignis lands hard). */
  shake?: number;
}

/** Timings at 1× inside the 1.2 s cinematic (reveal slams in at 160 ms, impact ≈ 400 ms). */
export const SIGNATURES: Record<SignatureId, SignatureSpec> = {
  // Shadow ritual ring, violet tomb light and soft bone motes.
  morvath: {
    aura: { at: 60, spin: 40, from: 0.5 },
    accent: { at: 400, ms: 520, motion: "pulse" },
    motes: [
      { at: 420, kind: "bone", count: 16, from: "base" },
      { at: 420, kind: "shadow", count: 12, from: "center" },
      { at: 720, kind: "bone", count: 8, from: "base" },
    ],
  },
  // Crown glint and tiny rising bone fragments.
  "skeleton-king": {
    aura: { at: 100, spin: 12, from: 0.8 },
    accent: { at: 520, ms: 420, motion: "glint" },
    motes: [
      { at: 400, kind: "bone", count: 14, from: "base" },
      { at: 660, kind: "bone", count: 10, from: "base" },
    ],
  },
  // Protective verdant leaf / aurora arc.
  ursaria: {
    aura: { at: 80, spin: -20, from: 0.7 },
    accent: { at: 420, ms: 520, motion: "pulse" },
    motes: [
      { at: 420, kind: "nature", count: 20, from: "center" },
      { at: 700, kind: "heal", count: 8, from: "top" },
    ],
  },
  // Brief cyan crystalline ice-shard sweep.
  vaelra: {
    aura: { at: 100, spin: 30, from: 0.6 },
    accent: { at: 360, ms: 420, motion: "sweep" },
    motes: [{ at: 420, kind: "ice", count: 22, from: "center" }],
  },
  // Fiery wing/halo reveal with a short ember burst and a strong impact.
  ignis: {
    aura: { at: 60, spin: 50, from: 0.4 },
    accent: { at: 400, ms: 360, motion: "flare" },
    motes: [
      { at: 400, kind: "fire", count: 28, from: "center" },
      { at: 600, kind: "fire", count: 14, from: "base" },
    ],
    shake: 8,
  },
  // Dark asymmetric eclipse with a magenta void flare.
  nyxara: {
    aura: { at: 100, spin: -35, from: 1.3 },
    accent: { at: 440, ms: 440, motion: "flare" },
    motes: [
      { at: 440, kind: "void", count: 16, from: "center" },
      { at: 700, kind: "shadow", count: 10, from: "top" },
    ],
  },
};
