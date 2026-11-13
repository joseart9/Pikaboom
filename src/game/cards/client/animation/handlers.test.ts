import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ViewEvent } from "../../server/view";
import type { FxApi } from "./fx";
import { ANIMATIONS, ENTER_ANIMATIONS, runHandlers, type AnimationEnv } from "./handlers";
import { REPEAT_CINEMATIC_SPEED } from "./cinematics";

/** Records every FxApi call as "name arg…" (elements by their id). No DOM. */
function recordingFx(present: Set<string>) {
  const calls: string[] = [];
  const els = new Map<string, Element>();
  const elFor = (id: string) => {
    if (!present.has(id)) return null;
    if (!els.has(id)) {
      const rect = { left: 0, top: 0, width: 10, height: 10 };
      els.set(id, { id, getBoundingClientRect: () => rect, classList: { contains: () => false } } as unknown as Element);
    }
    return els.get(id) as HTMLElement;
  };
  /** Elements by id, boxes as "rect", strings as is; numbers (durations) and option objects are dropped. */
  const name = (x: unknown): string | null => {
    if (typeof x === "string") return x;
    if (x && typeof x === "object" && "id" in x) return (x as { id: string }).id;
    if (x && typeof x === "object" && "left" in x) return "rect";
    return null;
  };
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const rec =
    (fn: string, timed = true) =>
    (...args: unknown[]) => {
      const parts = fn === "shake" ? [String(args[0])] : args.map(name).filter((p): p is string => p !== null);
      calls.push([fn, ...parts].join(" "));
      const ms = [...args].reverse().find((x): x is number => typeof x === "number");
      return timed ? wait(ms ?? 10) : undefined;
    };
  const fx = {
    el: elFor,
    query: () => null,
    anchor: () => ({ left: 0, top: 0, width: 10, height: 10 }) as DOMRect,
    animate: rec("animate"),
    wait,
    flyCard: rec("flyCard"),
    projectile: rec("projectile"),
    floatNumber: rec("floatNumber"),
    shake: rec("shake"),
    flash: rec("flash"),
    burst: rec("burst", false),
    streak: rec("streak", false),
    slam: rec("slam"),
    chain: rec("chain"),
    banner: rec("banner"),
    reveal: rec("reveal"),
    ring: rec("ring"),
    glyph: rec("glyph"),
    dim: rec("dim"),
    rays: rec("rays"),
    nameBanner: rec("nameBanner"),
    vignette: rec("vignette"),
    sweep: rec("sweep"),
    crack: rec("crack"),
    aura: rec("aura"),
    accent: rec("accent"),
    motes: rec("motes", false),
    finishAll: () => {},
    settle: () => {},
  } as unknown as FxApi;
  return { fx, calls };
}

function env(fx: FxApi, opts: { reduced?: boolean; defs?: Record<string, string>; pace?: () => number } = {}): AnimationEnv & { sounds: string[] } {
  const sounds: string[] = [];
  const reduced = opts.reduced ?? false;
  return {
    fx,
    reducedMotion: reduced,
    speed: 1,
    perspective: 0,
    signal: new AbortController().signal,
    ms: (b) => b * (reduced ? 0.3 : 1),
    hold: (b) => b,
    sound: (k) => sounds.push(k),
    defOf: (id) => opts.defs?.[id] ?? null,
    paceCinematic: opts.pace ?? (() => 1),
    sounds,
  };
}

const E = (e: Record<string, unknown>) => ({ seq: 1, step: 0, ...e }) as unknown as ViewEvent;

/** FX that move things or spawn particles — forbidden under reduced motion (§18.3). */
const MOTION = /^(projectile|shake|burst|streak|rays|sweep|ring|flyCard|slam|motes|accent)\b/;

const SAMPLE: ViewEvent[] = [
  E({ type: "CARD_PLAYED", seat: 1, iid: "c1", defId: "ignis", target: null, position: 0 }),
  E({ type: "CARD_PLAYED", seat: 1, iid: "c2", defId: "iron-colossus", target: null, position: 0 }),
  E({ type: "CARD_PLAYED", seat: 1, iid: "c3", defId: "flame-lance", target: "u1", position: null }),
  E({ type: "ATTACK_DECLARED", attacker: "u1", target: "u2" }),
  E({ type: "DAMAGE", source: "c3", target: "u2", amount: 5, dealt: 5, kind: "effect", blocked: null, healthAfter: 1 }),
  E({ type: "DAMAGE", source: "u1", target: "h0", amount: 6, dealt: 6, kind: "combat", blocked: null, healthAfter: 10 }),
  E({ type: "DAMAGE", source: "u1", target: "u2", amount: 2, dealt: 0, kind: "combat", blocked: "divine", healthAfter: 3 }),
  E({ type: "HEAL", source: "c4", target: "u1", amount: 2, healthAfter: 5 }),
  E({ type: "MOB_DESTROYED", iid: "u2", seat: 1, defId: "ash-drake", index: 0 }),
  E({ type: "TRIGGER_ACTIVATED", sourceId: "u1", abilityId: "battlecry", defId: "ignis" }),
  E({ type: "STATUS_APPLIED", iid: "u1", status: "freeze", magnitude: 0 }),
  E({ type: "CARD_BURNED", seat: 0, defId: "squire" }),
  E({ type: "GAME_OVER", winner: 0, reason: "hero" }),
];
const ENTER_SAMPLE: ViewEvent[] = [
  E({ type: "TURN_STARTED", seat: 0, turn: 3 }),
  E({ type: "MOB_SUMMONED", seat: 0, index: 0, cause: "play", sourceId: null, unit: { iid: "u1", defId: "iron-colossus" } }),
  E({ type: "MOB_SUMMONED", seat: 0, index: 0, cause: "effect", sourceId: null, unit: { iid: "u2", defId: "skeleton" } }),
];
const PRESENT = new Set(["u1", "u2", "h0", "h1"]);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function play(events: ViewEvent[], e: AnimationEnv, enter = false) {
  for (const ev of events) {
    const p = runHandlers(enter ? ENTER_ANIMATIONS : ANIMATIONS, [ev], e);
    await vi.runAllTimersAsync();
    await p;
  }
}

describe("Phase 20 handlers", () => {
  it("reduced motion: no projectiles, shakes, particles, trails, rays or flights — anywhere", async () => {
    const { fx, calls } = recordingFx(PRESENT);
    const e = env(fx, { reduced: true, defs: { c3: "flame-lance", u1: "ash-drake" } });
    await play(SAMPLE, e);
    await play(ENTER_SAMPLE, e, true);
    expect(calls.filter((c) => MOTION.test(c))).toEqual([]);
    // …but the information still shows: numbers, the cinematic card and its name, the banner.
    expect(calls).toContain("floatNumber u2 -5 damage");
    expect(calls.some((c) => c.startsWith("reveal ignis cinematic"))).toBe(true);
    expect(calls.some((c) => c.startsWith("nameBanner"))).toBe(true);
    expect(calls.some((c) => c.startsWith("banner"))).toBe(true);
    // UI-09: Ignis keeps its signature as a static rim (a fade-only aura).
    expect(calls).toContain("aura ignis");
  });

  it("full motion: elemental projectile from the spell's source, impact, shake ∝ damage, vignette on my hero", async () => {
    const { fx, calls } = recordingFx(PRESENT);
    const e = env(fx, { defs: { c3: "flame-lance", u1: "ash-drake" } });
    await play(SAMPLE, e);
    expect(calls).toContain("projectile rect u2 fire"); // Lanza de Fuego: from the centre, fire
    expect(e.sounds).toContain("fire");
    expect(calls.some((c) => c.startsWith("streak u1 u2 fire"))).toBe(true); // a dragon's attack trail
    expect(calls).toContain("shake 6"); // 6 combat damage ≥ 5
    expect(calls).toContain("vignette"); // h0 is my hero (perspective 0)
    expect(calls).toContain("ring u2 holy"); // Escudo Divino block
    expect(calls).toContain("burst u2 fire"); // the drake explodes in fire…
    expect(calls).toContain("burst u2 debris"); // …with debris
    expect(calls.some((c) => c.startsWith("glyph u1 !"))).toBe(true); // a Grito glyph
    expect(calls).toContain("burst u1 ice"); // Congelado → ice crystals
    expect(calls).toContain("crack h1"); // the loser's portrait cracks
    expect(calls).toContain("burst h0 confetti"); // I won
  });

  it("Legendaria/Única plays run the cinematic; cost ≥ 7 runs the heavy entrance; others stay basic", async () => {
    const { fx, calls } = recordingFx(PRESENT);
    await play(SAMPLE.slice(0, 3), env(fx));
    // UI-09: Ignis's signature (aura + flare + embers) replaces the generic rarity rays, and lands harder.
    expect(calls).toEqual(expect.arrayContaining(["dim", "aura ignis", "accent ignis flare", "motes fire center", "reveal ignis cinematic", "nameBanner Ignis, el Dragón Eterno unique", "shake 8"]));
    expect(calls.some((c) => c.startsWith("rays"))).toBe(false);
    expect(calls).toContain("reveal iron-colossus heavy");
    expect(calls).toContain("reveal flame-lance played");
    expect(calls.filter((c) => c.startsWith("dim"))).toHaveLength(1); // only the cinematic dims
  });

  it("a second cinematic in the same turn is paced faster", async () => {
    const { fx } = recordingFx(PRESENT);
    const paces = [1, REPEAT_CINEMATIC_SPEED];
    const e = env(fx, { pace: () => paces.shift() ?? 1 });
    const t0 = Date.now();
    await play([SAMPLE[0]], e);
    const first = Date.now() - t0;
    const t1 = Date.now();
    await play([SAMPLE[0]], e);
    const second = Date.now() - t1;
    expect(second).toBeLessThan(first);
    expect(first).toBeLessThanOrEqual(1600);
  });

  it("the rest of a cinematic's group (its Grito) starts only after the entrance", async () => {
    vi.setSystemTime(0);
    const { fx } = recordingFx(PRESENT);
    const at: Record<string, number> = {};
    const mark = <T extends (...args: never[]) => unknown>(name: string, fn: T) =>
      ((...args: Parameters<T>) => {
        at[name] ??= Date.now();
        return fn(...args);
      }) as T;
    fx.dim = mark("dim", fx.dim);
    fx.projectile = mark("projectile", fx.projectile);
    const group = [SAMPLE[0], E({ type: "DAMAGE", source: "c1", target: "h1", amount: 3, dealt: 3, kind: "effect", blocked: null, healthAfter: 27 })];
    const p = runHandlers(ANIMATIONS, group, env(fx, { defs: { c1: "ignis" } }));
    await vi.runAllTimersAsync();
    await p;
    expect(at.dim).toBe(0);
    expect(at.projectile).toBeGreaterThanOrEqual(1200);
  });

  it("tokens rise from the ground; heavy cards land with a slam", async () => {
    const { fx, calls } = recordingFx(PRESENT);
    const e = env(fx);
    await play(ENTER_SAMPLE, e, true);
    expect(calls).toContain("sweep mine");
    expect(calls).toContain("shake 3"); // Coloso de Hierro lands
    expect(e.sounds).toContain("slam");
    expect(calls).toContain("burst u2 dust");
  });
});
