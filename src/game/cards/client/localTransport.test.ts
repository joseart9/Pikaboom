import { describe, expect, it } from "vitest";
import { seedToRng } from "../engine/rng";
import { randomCommand, seedHex } from "../testing/driver";
import { toBoardModel } from "./boardModel";
import { LocalTransport } from "./localTransport";
import { MatchClient } from "./matchClient";
import type { TransportUpdate } from "./transport";

describe("LocalTransport (sandbox)", () => {
  it("starts in the playing phase (both hands kept) and follows the active seat", async () => {
    const tr = new LocalTransport({ seed: seedHex(7), names: ["A", "B"] });
    const updates: TransportUpdate[] = [];
    tr.start((u) => updates.push(u));
    const first = updates[0].view!;
    expect(first.status).toBe("active");
    expect(first.game!.phase).toBe("playing");
    expect(first.seat).toBe(first.game!.activeSeat);
    expect(first.game!.legal?.endTurn).toBe(true);
    const ended = await tr.send({ t: "endTurn" });
    expect(ended.ok).toBe(true);
    if (ended.ok) {
      expect(ended.view.version).toBe(first.version + 1);
      expect(ended.view.seat).not.toBe(first.seat); // followed the turn
    }
  });

  it("rejects illegal commands with Spanish text and keeps the state", async () => {
    const tr = new LocalTransport({ seed: seedHex(8), names: ["A", "B"], follow: false, viewer: 0 });
    const s = tr.getState();
    const inactive = s.turn.activeSeat === 0 ? 1 : 0;
    tr.setViewer(inactive);
    const r = await tr.send({ t: "endTurn" });
    expect(r).toEqual({ ok: false, error: "No es tu turno.", code: "not_your_turn" });
    expect(tr.getState()).toBe(s);
  });

  it("a MatchClient over it plays 60 random legal commands; views stay consistent with the engine", async () => {
    const tr = new LocalTransport({ seed: seedHex(9), names: ["A", "B"] });
    const client = new MatchClient(tr);
    client.start();
    const driver = { rng: seedToRng(seedHex(10)) };
    for (let i = 0; i < 60 && tr.getState().phase === "playing"; i++) {
      const [seat, cmd] = randomCommand(tr.getState(), driver);
      tr.setViewer(seat);
      expect(await client.send(cmd as Parameters<MatchClient["send"]>[0])).toBe(true);
      const snap = client.getSnapshot();
      expect(snap.pending).toBeNull();
      expect(snap.board).toEqual(toBoardModel(snap.view));
      expect(snap.view!.game!.me.hand.map((c) => c.iid)).toEqual(tr.getState().players[snap.view!.seat].hand.map((c) => c.iid));
    }
    client.stop();
  });

  it("MatchClient ignores a second command while one is pending", async () => {
    const tr = new LocalTransport({ seed: seedHex(11), names: ["A", "B"] });
    const client = new MatchClient(tr);
    client.start();
    const a = client.send({ t: "endTurn" });
    const b = client.send({ t: "endTurn" });
    expect(await b).toBe(false);
    expect(await a).toBe(true);
    expect(client.getSnapshot().view!.version).toBe(2);
  });
});
