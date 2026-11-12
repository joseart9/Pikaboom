import { describe, expect, it } from "vitest";
import type { MatchView } from "../server/view";
import { MatchClient } from "./matchClient";
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
