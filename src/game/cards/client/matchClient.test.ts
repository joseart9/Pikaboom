import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedToRng } from "../engine/rng";
import type { MatchView, ViewEvent } from "../server/view";
import { randomCommand, seedHex } from "../testing/driver";
import type { FxApi } from "./animation/fx";
import { toBoardModel } from "./boardModel";
import { BOT_DELAY_MS, LocalTransport } from "./localTransport";
import { isCinematicGroup, MatchClient } from "./matchClient";
import type { MatchTransport, SendResult, TransportUpdate } from "./transport";

function fakeTransport() {
  let push: (u: TransportUpdate) => void = () => {};
  let next: SendResult = { ok: false, error: "x" };
  const transport: MatchTransport = {
    start: (cb) => {
      push = cb;
    },
    send: async () => next,
    stop: () => {},
  };
  return { transport, push: (u: TransportUpdate) => push(u), reply: (r: SendResult) => (next = r) };
}

const view = (version: number, seat: 0 | 1 = 0): MatchView =>
  ({
    matchId: "m",
    version,
    status: "active",
    seat,
    serverNow: new Date().toISOString(),
    turnDeadline: null,
    foeOnline: true,
    lobby: null,
    game: null,
    rewards: null,
  }) as MatchView;

describe("MatchClient store", () => {
  it("a { same: true } poll (same clock, same presence) notifies nobody — no re-render (Phase 10 K)", () => {
    const f = fakeTransport();
    const client = new MatchClient(f.transport);
    client.start();
    f.push({ view: view(3), status: "online" });
    let calls = 0;
    client.subscribe(() => calls++);
    const before = client.getSnapshot();
    for (let i = 0; i < 5; i++) f.push({ serverNow: new Date().toISOString(), foeOnline: true, status: "online" });
    expect(calls).toBe(0);
    expect(client.getSnapshot()).toBe(before);
    f.push({ foeOnline: false });
    expect(calls).toBe(1);
  });

  it("ignores older views, accepts newer ones and a different seat", () => {
    const f = fakeTransport();
    const client = new MatchClient(f.transport);
    client.start();
    f.push({ view: view(5) });
    f.push({ view: view(4) });
    expect(client.getSnapshot().view!.version).toBe(5);
    f.push({ view: view(5) });
    expect(client.getSnapshot().view!.version).toBe(5);
    f.push({ view: view(5, 1) });
    expect(client.getSnapshot().view!.seat).toBe(1);
    f.push({ view: view(6, 1) });
    expect(client.getSnapshot().view!.version).toBe(6);
  });

  it("a rejected command keeps the view and raises a new error id each time", async () => {
    const f = fakeTransport();
    const client = new MatchClient(f.transport);
    client.start();
    f.push({ view: view(2) });
    f.reply({ ok: false, error: "No es tu turno.", code: "not_your_turn" });
    expect(await client.send({ t: "endTurn" })).toBe(false);
    const e1 = client.getSnapshot().error!;
    expect(e1.text).toBe("No es tu turno.");
    await client.send({ t: "endTurn" });
    expect(client.getSnapshot().error!.id).toBeGreaterThan(e1.id);
    expect(client.getSnapshot().view!.version).toBe(2);
    expect(client.getSnapshot().pending).toBeNull();
  });
});

describe("MatchClient event playback (Phase 13)", () => {
  /** An FxApi with no DOM: elements are never found (handlers resolve at once); timed effects use real timers. */
  function fakeFx(calls: string[] = []): FxApi {
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    return {
      el: () => null,
      query: () => null,
      anchor: () => null,
      animate: () => Promise.resolve(),
      wait,
      flyCard: () => Promise.resolve(),
      projectile: () => Promise.resolve(),
      floatNumber: () => Promise.resolve(),
      shake: () => Promise.resolve(),
      flash: () => Promise.resolve(),
      burst: () => {},
      slam: () => Promise.resolve(),
      chain: () => Promise.resolve(),
      banner: (text, _tone, ms) => {
        calls.push(`banner ${text}`);
        return wait(ms);
      },
      reveal: (defId, mode, ms) => {
        calls.push(`reveal ${mode} ${defId}`);
        return wait(ms);
      },
      streak: () => {},
      ring: () => Promise.resolve(),
      glyph: () => Promise.resolve(),
      dim: (ms) => wait(ms),
      rays: (_rarity, ms) => wait(ms),
      nameBanner: (text, _rarity, ms) => {
        calls.push(`name ${text}`);
        return wait(ms);
      },
      vignette: () => Promise.resolve(),
      sweep: () => Promise.resolve(),
      crack: () => Promise.resolve(),
      aura: () => Promise.resolve(),
      accent: () => Promise.resolve(),
      motes: () => {},
      finishAll: () => calls.push("finishAll"),
      settle: () => {},
    };
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("the board lags while events play, input is locked, and it reconciles to the view with zero mismatches", async () => {
    const tr = new LocalTransport({ seed: seedHex(21), names: ["A", "B"], follow: false, viewer: 0 });
    const client = new MatchClient(tr);
    const calls: string[] = [];
    client.setFx(fakeFx(calls));
    client.start();
    tr.setBot(1);
    const driver = { rng: seedToRng(seedHex(22)) };
    let commands = 0;
    for (let i = 0; i < 400 && tr.getState().phase === "playing"; i++) {
      const s = tr.getState();
      if (s.turn.activeSeat !== 0) {
        await vi.advanceTimersByTimeAsync(BOT_DELAY_MS + 50); // the bot acts; its events play
        continue;
      }
      await vi.runOnlyPendingTimersAsync();
      if (client.getSnapshot().animating) continue;
      const [, cmd] = randomCommand(s, driver);
      const sent = client.send(cmd as Parameters<MatchClient["send"]>[0]);
      expect(await sent).toBe(true);
      commands += 1;
      const snap = client.getSnapshot();
      if (snap.animating) {
        expect(snap.board!.legal).toBeNull(); // input lock
        expect(snap.settling).toEqual(cmd);
      }
    }
    await vi.runAllTimersAsync();
    const end = client.getSnapshot();
    expect(end.animating).toBe(false);
    expect(end.settling).toBeNull();
    expect(end.board).toEqual(toBoardModel(end.view));
    expect(commands).toBeGreaterThan(5);
    expect(client.reconcileStats.checked).toBeGreaterThan(5);
    expect(client.reconcileStats.mismatches).toBe(0);
    expect(calls.some((c) => c.startsWith("reveal played"))).toBe(true); // the opponent's cards are revealed
    expect(calls.some((c) => c.startsWith("banner"))).toBe(true);
    client.stop();
  });

  it("a view arriving mid-playback is appended; the reconcile uses the newest view", async () => {
    const f = fakeTransport();
    const client = new MatchClient(f.transport);
    client.setFx(fakeFx());
    client.start();
    const tr = new LocalTransport({ seed: seedHex(23), names: ["A", "B"], follow: false, viewer: 0 });
    f.push({ view: tr.view() });
    const before = client.getSnapshot().board!;
    // Two turn changes, each pushed as its own view (events filtered client-side by seq), without waiting.
    const endTurnAsActive = async (version: number) => {
      tr.setViewer(tr.getState().turn.activeSeat);
      expect((await tr.send({ t: "endTurn" })).ok).toBe(true);
      tr.setViewer(0);
      f.push({ view: { ...tr.view(), version } });
    };
    await endTurnAsActive(10);
    await vi.advanceTimersByTimeAsync(0);
    expect(client.getSnapshot().animating).toBe(true); // the turn banner is playing
    await endTurnAsActive(11);
    // The second view's events wait behind the first: its turn is not applied yet.
    expect(client.getSnapshot().animating).toBe(true);
    expect(client.getSnapshot().board!.turn).toBeLessThanOrEqual(before.turn + 1);
    await vi.runAllTimersAsync();
    const snap = client.getSnapshot();
    expect(snap.animating).toBe(false);
    expect(snap.view!.version).toBe(11);
    expect(snap.board!.turn).toBe(before.turn + 2);
    expect(snap.board).toEqual(toBoardModel(snap.view));
    expect(client.reconcileStats.mismatches).toBe(0);
  });

  it("eventsTruncated, or no FX layer, shows the view at once", async () => {
    const tr = new LocalTransport({ seed: seedHex(24), names: ["A", "B"], follow: false, viewer: 0 });
    const f = fakeTransport();
    const client = new MatchClient(f.transport);
    client.setFx(fakeFx());
    client.start();
    f.push({ view: tr.view() });
    const v = tr.view();
    f.push({ view: { ...v, version: v.version + 1, game: { ...v.game!, turn: 99, eventsTruncated: true, events: [{ type: "CHAIN_LIMIT_REACHED", seq: 9999, step: 0 }] } } });
    expect(client.getSnapshot().animating).toBe(false);
    expect(client.getSnapshot().board!.turn).toBe(99);
    client.setFx(null);
    f.push({ view: { ...v, version: v.version + 2, game: { ...v.game!, turn: 100, events: [{ type: "CHAIN_LIMIT_REACHED", seq: 10000, step: 0 }] } } });
    expect(client.getSnapshot().board!.turn).toBe(100);
  });
});

describe("isCinematicGroup (Phase 20)", () => {
  const played = (defId: string) => ({ type: "CARD_PLAYED", seq: 1, step: 0, seat: 0, iid: "x", defId, target: null, position: 0 }) as ViewEvent;
  it("only a group that plays a Legendaria/Única card is cinematic", () => {
    expect(isCinematicGroup([played("ignis")])).toBe(true);
    expect(isCinematicGroup([played("morvath")])).toBe(true);
    expect(isCinematicGroup([played("iron-colossus")])).toBe(false); // heavy, not cinematic
    expect(isCinematicGroup([played("squire")])).toBe(false);
    expect(isCinematicGroup([{ type: "TURN_STARTED", seq: 1, step: 0, seat: 0, turn: 1 } as ViewEvent])).toBe(false);
  });
});
