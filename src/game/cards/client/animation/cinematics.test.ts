import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG } from "../../catalog";
import type { FxApi } from "./fx";
import { CINEMATIC, CINEMATIC_CAP_MS, CinematicPacer, entranceTimeline, playEntrance, REPEAT_CINEMATIC_SPEED, type StepKind } from "./cinematics";

const end = (tl: ReturnType<typeof entranceTimeline>) => Math.max(...tl.steps.map((s) => s.at + s.ms));
const kinds = (tl: ReturnType<typeof entranceTimeline>) => new Set<StepKind>(tl.steps.map((s) => s.kind));

describe("entrance timelines (Phase 20 I: cinematic ≤ 1.6 s at 1×)", () => {
  it("a 1× cinematic is 1.2 s: dim → rays → slam (reveal) → shake → name, all inside the total", () => {
    const tl = entranceTimeline("cinematic", { speed: 1, reducedMotion: false });
    expect(tl.total).toBe(CINEMATIC.totalMs);
    expect(tl.total).toBeLessThanOrEqual(CINEMATIC_CAP_MS);
    expect(end(tl)).toBeLessThanOrEqual(tl.total);
    const at = (k: StepKind) => tl.steps.find((s) => s.kind === k)!.at;
    expect(at("dim")).toBe(0);
    expect(at("dim")).toBeLessThan(at("rays"));
    expect(at("rays")).toBeLessThan(at("reveal"));
    expect(at("reveal")).toBeLessThan(at("shake"));
    expect(at("shake")).toBeLessThan(at("name"));
    // The shake lands on the slam's impact (inside the slam-in), never before the card appears.
    const reveal = tl.steps.find((s) => s.kind === "reveal")!;
    expect(at("shake")).toBeGreaterThanOrEqual(reveal.at + reveal.inMs! * 0.6);
  });

  it("scales with speed (own plays 1.5×, settings 2×, a repeat cinematic ×1.5)", () => {
    for (const speed of [1.5, 2, 3, 2 * REPEAT_CINEMATIC_SPEED]) {
      const tl = entranceTimeline("cinematic", { speed, reducedMotion: false });
      expect(tl.total).toBe(Math.round(CINEMATIC.totalMs / speed));
      expect(end(tl)).toBeLessThanOrEqual(tl.total);
      expect(tl.total).toBeLessThanOrEqual(CINEMATIC_CAP_MS / speed);
    }
  });

  it("heavy entrances slam and shake without dim, rays or name; normal entrances have no timeline", () => {
    const heavy = entranceTimeline("heavy", { speed: 1, reducedMotion: false });
    expect(kinds(heavy)).toEqual(new Set(["reveal", "shake", "sound"]));
    expect(heavy.total).toBeLessThan(1200);
    expect(end(heavy)).toBeLessThanOrEqual(heavy.total);
    expect(entranceTimeline("normal", { speed: 1, reducedMotion: false })).toEqual({ entrance: "normal", steps: [], total: 0 });
  });

  it("reduced motion: no rays, no shake, no slam-in — only fades, the card and its name", () => {
    for (const entrance of ["cinematic", "heavy"] as const) {
      const tl = entranceTimeline(entrance, { speed: 1, reducedMotion: true });
      expect(kinds(tl).has("rays")).toBe(false);
      expect(kinds(tl).has("shake")).toBe(false);
      expect(tl.steps.find((s) => s.kind === "reveal")!.inMs).toBe(0);
      expect(tl.total).toBeLessThanOrEqual(CINEMATIC_CAP_MS);
    }
    expect(kinds(entranceTimeline("cinematic", { speed: 1, reducedMotion: true })).has("name")).toBe(true);
  });
});

describe("CinematicPacer (Phase 20 H: two cinematics in one turn → the second at 1.5×)", () => {
  it("first per turn at 1×, later ones in the same turn faster, a new turn resets", () => {
    const p = new CinematicPacer();
    expect(p.next(3)).toBe(1);
    expect(p.next(3)).toBe(REPEAT_CINEMATIC_SPEED);
    expect(p.next(3)).toBe(REPEAT_CINEMATIC_SPEED);
    expect(p.next(4)).toBe(1);
    p.reset();
    expect(p.next(4)).toBe(1);
  });
});

describe("playEntrance", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function fakeFx(log: string[]): FxApi {
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const timed = (name: string) => (...args: unknown[]) => {
      log.push(`${Date.now()} ${name}`);
      const ms = args.find((a) => typeof a === "number") as number;
      return wait(ms ?? 0);
    };
    return {
      wait,
      dim: timed("dim"),
      rays: timed("rays"),
      reveal: (defId: string, mode: string, ms: number) => {
        log.push(`${Date.now()} reveal ${mode} ${defId}`);
        return wait(ms);
      },
      shake: timed("shake"),
      nameBanner: (text: string, _r: string, ms: number) => {
        log.push(`${Date.now()} name ${text}`);
        return wait(ms);
      },
    } as unknown as FxApi;
  }

  it("runs every step at its offset and resolves at the total", async () => {
    vi.setSystemTime(0);
    const log: string[] = [];
    const sounds: string[] = [];
    const tl = entranceTimeline("cinematic", { speed: 1, reducedMotion: false });
    let finished = -1;
    void playEntrance(CATALOG.ignis, "Ignis", tl, { fx: fakeFx(log), signal: new AbortController().signal, sound: (k) => sounds.push(k) }).then(() => (finished = Date.now()));
    await vi.runAllTimersAsync();
    expect(log).toEqual([
      "0 dim",
      `${CINEMATIC.raysAt} rays`,
      `${CINEMATIC.revealAt} reveal cinematic ignis`,
      `${CINEMATIC.shakeAt} shake`,
      `${CINEMATIC.nameAt} name Ignis`,
    ]);
    expect(sounds).toEqual(["cinematic", "slam"]);
    expect(finished).toBe(tl.total);
  });

  it("an aborted entrance starts no further steps", async () => {
    vi.setSystemTime(0);
    const log: string[] = [];
    const abort = new AbortController();
    const tl = entranceTimeline("cinematic", { speed: 1, reducedMotion: false });
    void playEntrance(CATALOG.vaelra, "Vaelra", tl, { fx: fakeFx(log), signal: abort.signal, sound: () => {} });
    await vi.advanceTimersByTimeAsync(120);
    abort.abort();
    await vi.runAllTimersAsync();
    expect(log).toEqual(["0 dim", `${CINEMATIC.raysAt} rays`]);
  });
});
