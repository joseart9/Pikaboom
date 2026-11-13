// Rarity entrances (Phase 20, §18.5 CARD_PLAYED): a sequence builder (dim → rays → slam → shake → name banner)
// gated by `cardEntrance(def)` — Legendaria/Única → cinematic, cost ≥ 7 → heavy. The timeline is plain data so its
// timing is unit-tested (cinematic 1.2 s at 1×, ≤ 1.6 s cap); `playEntrance` runs it on the FxApi with tracked waits
// (a skip resolves every wait at once). Reduced motion: no rays/slam/shake, only fades + the name, kept short.
import type { CardDef, Rarity } from "../../catalog/types";
import type { Entrance } from "../../catalog/visuals";
import type { FxApi } from "./fx";
import type { CardSound } from "../sounds";

export type StepKind = "dim" | "rays" | "reveal" | "shake" | "name" | "sound";

export interface TimelineStep {
  kind: StepKind;
  /** Start offset (ms) from the beginning of the entrance. */
  at: number;
  /** Duration (ms). For `reveal`, `inMs` is the slam-in part. */
  ms: number;
  inMs?: number;
  intensity?: number;
  sound?: CardSound;
}

export interface Timeline {
  entrance: Entrance;
  steps: TimelineStep[];
  /** When the last step ends (ms). */
  total: number;
}

/** Base timings at 1× (tunable; listed in STATUS "tunable constants"). */
export const CINEMATIC = {
  /** Whole cinematic at 1× (§18.5: 1.2 s). */
  totalMs: 1200,
  raysAt: 100,
  revealAt: 160,
  slamMs: 320,
  shakeAt: 400,
  shakeMs: 300,
  shakeIntensity: 5,
  nameAt: 480,
} as const;

export const HEAVY = {
  totalMs: 700,
  slamMs: 260,
  shakeAt: 170,
  shakeMs: 240,
  shakeIntensity: 3,
} as const;

/** The cap for a group that holds a cinematic (`QueueOptions.cinematicGroupMs`; Phase 20 K: ≤ 1.6 s at 1×). */
export const CINEMATIC_CAP_MS = 1600;
/** Reduced-motion entrances: reading time only (the card and its name), no motion. */
export const REDUCED_ENTRANCE_MS = 900;
/** A second cinematic in the same turn plays this much faster (Phase 20 H). */
export const REPEAT_CINEMATIC_SPEED = 1.5;

/** The steps of an entrance at a given speed. `normal` entrances have no timeline (the Phase 13 animation runs). */
export function entranceTimeline(entrance: Entrance, opts: { speed: number; reducedMotion: boolean }): Timeline {
  const k = 1 / Math.max(0.1, opts.speed);
  const s = (ms: number) => Math.round(ms * k);
  const steps: TimelineStep[] = [];
  if (entrance === "normal") return { entrance, steps, total: 0 };
  if (opts.reducedMotion) {
    const total = s(REDUCED_ENTRANCE_MS);
    if (entrance === "cinematic") steps.push({ kind: "dim", at: 0, ms: total }, { kind: "name", at: 0, ms: total });
    steps.push({ kind: "reveal", at: 0, ms: total, inMs: 0 });
    steps.push({ kind: "sound", at: 0, ms: 0, sound: entrance === "cinematic" ? "cinematic" : "slam" });
    return { entrance, steps, total };
  }
  if (entrance === "heavy") {
    steps.push(
      { kind: "reveal", at: 0, ms: s(HEAVY.totalMs), inMs: s(HEAVY.slamMs) },
      { kind: "sound", at: s(HEAVY.shakeAt), ms: 0, sound: "slam" },
      { kind: "shake", at: s(HEAVY.shakeAt), ms: s(HEAVY.shakeMs), intensity: HEAVY.shakeIntensity },
    );
    return { entrance, steps, total: s(HEAVY.totalMs) };
  }
  const total = s(CINEMATIC.totalMs);
  steps.push(
    { kind: "sound", at: 0, ms: 0, sound: "cinematic" },
    { kind: "dim", at: 0, ms: total },
    { kind: "rays", at: s(CINEMATIC.raysAt), ms: total - s(CINEMATIC.raysAt) },
    { kind: "reveal", at: s(CINEMATIC.revealAt), ms: total - s(CINEMATIC.revealAt), inMs: s(CINEMATIC.slamMs) },
    { kind: "sound", at: s(CINEMATIC.shakeAt), ms: 0, sound: "slam" },
    { kind: "shake", at: s(CINEMATIC.shakeAt), ms: s(CINEMATIC.shakeMs), intensity: CINEMATIC.shakeIntensity },
    { kind: "name", at: s(CINEMATIC.nameAt), ms: total - s(CINEMATIC.nameAt) },
  );
  return { entrance, steps, total };
}

/** Counts cinematics per turn: the first plays at 1×, later ones in the same turn at `REPEAT_CINEMATIC_SPEED`. */
export class CinematicPacer {
  private turn: number | null = null;
  private count = 0;

  /** Speed factor for a cinematic starting now. */
  next(turn: number): number {
    if (turn !== this.turn) {
      this.turn = turn;
      this.count = 0;
    }
    this.count += 1;
    return this.count > 1 ? REPEAT_CINEMATIC_SPEED : 1;
  }

  reset(): void {
    this.turn = null;
    this.count = 0;
  }
}

export interface EntranceEnv {
  fx: FxApi;
  signal: AbortSignal;
  sound(kind: CardSound): void;
}

/** Runs a heavy/cinematic timeline for a played card; resolves when it ends (or at once when skipped). */
export async function playEntrance(def: CardDef, name: string, timeline: Timeline, env: EntranceEnv): Promise<void> {
  const { fx } = env;
  const rarity: Rarity = def.rarity;
  const run = (step: TimelineStep): Promise<void> => {
    switch (step.kind) {
      case "dim":
        return fx.dim(step.ms);
      case "rays":
        return fx.rays(rarity, step.ms);
      case "reveal":
        return fx.reveal(def.id, timeline.entrance === "cinematic" ? "cinematic" : "heavy", step.ms, { inMs: step.inMs, rarity });
      case "shake":
        return fx.shake(step.intensity ?? 3, step.ms);
      case "name":
        return fx.nameBanner(name, rarity, step.ms);
      case "sound":
        if (step.sound) env.sound(step.sound);
        return Promise.resolve();
    }
  };
  for (const step of timeline.steps) {
    void (async () => {
      if (step.at > 0) await fx.wait(step.at);
      if (env.signal.aborted) return;
      await run(step);
    })();
  }
  // Ends on the timeline's clock, not on the animations' `finish` events (those lag on a busy main thread, which
  // would eat into the group cap of what follows, e.g. the card's Grito). Tails end by themselves or on a skip.
  await fx.wait(timeline.total);
}
