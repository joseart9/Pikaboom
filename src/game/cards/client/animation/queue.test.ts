import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ViewEvent } from "../../server/view";
import { AnimationQueue, groupEvents, OWN_SPEED, type QueueHooks } from "./queue";

const ev = (seq: number, step: number, type: ViewEvent["type"] = "MANA_CHANGED"): ViewEvent =>
  ({ type, seq, step, seat: 0, current: 1, max: 1, temporary: 0 }) as ViewEvent;

function harness(handler: (group: readonly ViewEvent[], speed: number, signal: AbortSignal) => Promise<void> = () => new Promise((r) => setTimeout(r, 100))) {
  const log: string[] = [];
  const speeds: number[] = [];
  const reconciledAt: number[] = [];
  let hidden = false;
  const hooks: QueueHooks = {
    play: (g, ctl) => {
      speeds.push(ctl.speed);
      log.push(`play ${g.map((e) => e.seq).join(",")}`);
      return handler(g, ctl.speed, ctl.signal);
    },
    apply: (g) => log.push(`apply ${g.map((e) => e.seq).join(",")}`),
    enter: async () => {},
    reconcile: (complete) => {
      log.push(`reconcile ${complete}`);
      reconciledAt.push(Date.now());
    },
    finishFx: () => log.push("finishFx"),
    onPlayingChange: (p) => log.push(`playing ${p}`),
    hidden: () => hidden,
  };
  const queue = new AnimationQueue(hooks);
  return { queue, log, speeds, reconciledAt, setHidden: (h: boolean) => (hidden = h) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("groupEvents", () => {
  it("groups consecutive events by step and always opens a group at a command start", () => {
    const events = [ev(1, 0, "CARD_PLAYED"), ev(2, 0), ev(3, 0, "MOB_SUMMONED"), ev(4, 1, "TRIGGER_ACTIVATED"), ev(5, 1, "DAMAGE"), ev(6, 2, "MOB_DESTROYED"), ev(7, 0, "ATTACK_DECLARED"), ev(8, 1, "DAMAGE"), ev(9, 1, "DAMAGE")];
    expect(groupEvents(events).map((g) => g.map((e) => e.seq))).toEqual([[1, 2, 3], [4, 5], [6], [7], [8, 9]]);
    // Two step-0 commands back to back stay apart.
    expect(groupEvents([ev(1, 0, "CARD_PLAYED"), ev(2, 0), ev(3, 0, "CARD_PLAYED"), ev(4, 0)]).map((g) => g.length)).toEqual([2, 2]);
  });
});

describe("AnimationQueue (Phase 13 I)", () => {
  it("plays groups in order, applies each after its handlers, and reconciles at the end", async () => {
    const h = harness();
    h.queue.push([ev(1, 0), ev(2, 0), ev(3, 1)]);
    expect(h.queue.playing).toBe(true);
    await vi.runAllTimersAsync();
    expect(h.log).toEqual(["playing true", "play 1,2", "apply 1,2", "play 3", "apply 3", "reconcile true", "playing false"]);
    expect(h.queue.playing).toBe(false);
  });

  it("events pushed while playing are appended to the same timeline", async () => {
    const h = harness();
    h.queue.push([ev(1, 0)]);
    await vi.advanceTimersByTimeAsync(50);
    h.queue.push([ev(2, 0, "ATTACK_DECLARED")]);
    await vi.runAllTimersAsync();
    expect(h.log.filter((l) => l.startsWith("reconcile"))).toEqual(["reconcile true"]);
    expect(h.log.indexOf("apply 1")).toBeLessThan(h.log.indexOf("apply 2"));
  });

  it("speeds up to ×2 when more than 12 events wait; own results play at 1.5", async () => {
    const h = harness();
    h.queue.push(Array.from({ length: 14 }, (_, i) => ev(i + 1, i)));
    await vi.runAllTimersAsync();
    expect(h.speeds[0]).toBe(2); // 14 waiting
    expect(h.speeds.at(-1)).toBe(1); // the tail plays at normal speed
    const own = harness();
    own.queue.push([ev(1, 0)], OWN_SPEED);
    await vi.runAllTimersAsync();
    expect(own.speeds).toEqual([1.5]);
  });

  it("skips to reconcile when more than 30 events wait, or a single push brings more than 40", async () => {
    const h = harness();
    h.queue.push(Array.from({ length: 31 }, (_, i) => ev(i + 1, i)));
    await vi.runAllTimersAsync();
    expect(h.log).toEqual(["playing true", "finishFx", "reconcile false", "playing false"]);
    const gap = harness();
    gap.queue.push(Array.from({ length: 41 }, (_, i) => ev(i + 1, 0)));
    expect(gap.log).toEqual(["finishFx", "reconcile false"]);
  });

  it("a hidden page skips at once", () => {
    const h = harness();
    h.setHidden(true);
    h.queue.push([ev(1, 0)]);
    expect(h.log).toEqual(["finishFx", "reconcile false"]);
  });

  it("a handler that never resolves is timed out (1200 ms ÷ speed) and the queue still reconciles", async () => {
    const h = harness(() => new Promise(() => {}));
    h.queue.push([ev(1, 0), ev(2, 1)]);
    await vi.advanceTimersByTimeAsync(1199);
    expect(h.log).not.toContain("apply 1");
    await vi.advanceTimersByTimeAsync(2);
    expect(h.log).toContain("apply 1");
    await vi.runAllTimersAsync();
    expect(h.log.slice(-2)).toEqual(["reconcile true", "playing false"]);
  });

  it("a throwing handler does not break the queue", async () => {
    const h = harness(() => {
      throw new Error("boom");
    });
    h.queue.push([ev(1, 0)]);
    await vi.runAllTimersAsync();
    expect(h.log).toContain("apply 1");
    expect(h.log).toContain("reconcile true");
  });

  it("tap skip finishes the current group instantly (aborting it) and doubles the speed of the rest", async () => {
    let aborted = false;
    const h = harness((_, __, signal) => {
      signal.addEventListener("abort", () => (aborted = true));
      return new Promise((r) => setTimeout(r, 1000));
    });
    h.queue.push([ev(1, 0), ev(2, 1), ev(3, 2)]);
    await vi.advanceTimersByTimeAsync(10);
    h.queue.skipCurrent();
    await vi.advanceTimersByTimeAsync(0);
    expect(aborted).toBe(true);
    expect(h.log).toContain("apply 1");
    expect(h.log).toContain("finishFx");
    await vi.runAllTimersAsync();
    expect(h.speeds).toEqual([1, 2, 2]);
    expect(h.log.slice(-2)).toEqual(["reconcile true", "playing false"]);
  });

  it("never blocks longer than 4 s: a long playback skips to reconcile, even mid-group", async () => {
    const h = harness(() => new Promise((r) => setTimeout(r, 900)));
    const t0 = Date.now();
    h.queue.push(Array.from({ length: 10 }, (_, i) => ev(i + 1, i)));
    await vi.runAllTimersAsync();
    // 900 ms handlers: the 5th group would end at 4.5 s; the budget (3.8 s) cuts it short.
    expect(h.reconciledAt[0] - t0).toBeGreaterThan(3500);
    expect(h.reconciledAt[0] - t0).toBeLessThanOrEqual(3800);
    expect(h.log.filter((l) => l.startsWith("apply")).length).toBeLessThan(10);
    expect(h.log.slice(-2)).toEqual(["reconcile false", "playing false"]);
  });

  it("skipAll and cancel stop a running loop; reconcile always runs for skipAll", async () => {
    const h = harness();
    h.queue.push([ev(1, 0), ev(2, 1)]);
    await vi.advanceTimersByTimeAsync(10);
    h.queue.skipAll();
    await vi.runAllTimersAsync();
    expect(h.log.filter((l) => l.startsWith("apply"))).toEqual([]);
    expect(h.log.filter((l) => l.startsWith("reconcile"))).toEqual(["reconcile false"]);
    const c = harness();
    c.queue.push([ev(1, 0)]);
    c.queue.cancel();
    await vi.runAllTimersAsync();
    expect(c.log).toEqual(["playing true", "play 1", "finishFx", "playing false"]);
  });

  it("an empty push while idle just reconciles", () => {
    const h = harness();
    h.queue.push([]);
    expect(h.log).toEqual(["reconcile true"]);
  });
});
