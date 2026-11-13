import { describe, expect, it, vi } from "vitest";
import type { MatchState, Seat } from "../engine/types";
import { makeState } from "../testing/fixtures";
import { expectError, finishMulligan, GUEST, HOST, loadRow as row, makeService, req, startMatch, starterChoice, STRANGER, userOf, type TestService } from "../testing/server";
import { defineSharedServiceTests } from "../testing/serviceSuite";
import { FakeRewards } from "../testing/rewards";
import { normalizeCode } from "./matchService";
import type { MemoryMatchStore } from "./memoryStore";
import type { MatchView } from "./view";

// Rows 4–7, 10 and the simultaneous-ready race live in testing/serviceSuite.ts so Phase 9 runs them on PGlite too.
defineSharedServiceTests("memory store", async (opts) => makeService(opts));

/** Replaces the match state through the store contract (to set up end-game positions). */
async function forceState(t: TestService, id: string, state: MatchState): Promise<void> {
  const r = await row(t, id);
  await t.store.update(id, r.version, { state }, null, null);
}

describe("lobby (Phase 8 row 10)", () => {
  it("game commands in a lobby are wrong_phase; host leaving cancels; guest leaving frees the seat", async () => {
    const t = makeService();
    const { matchId: id, lobby } = await t.service.createLobby(HOST, "Ana");
    await t.service.joinByCode(GUEST, "Beto", lobby!.code);
    await expectError(t.service.submitCommand(id, HOST, req({ t: "endTurn" })), 409, "wrong_phase");

    await t.service.submitCommand(id, GUEST, req({ t: "lobby.selectDeck", deck: await starterChoice(t, GUEST, "beast") }));
    const left = await t.service.submitCommand(id, GUEST, req({ t: "lobby.leave" }));
    expect(left.status).toBe("lobby");
    const r = await row(t, id);
    expect(r.guestId).toBeNull();
    expect(r.guestName).toBeNull();
    expect(r.lobby.guest).toEqual({ deck: null, ready: false });
    await expectError(t.service.readMatch(id, GUEST), 403, "not_in_match");

    const cancelled = await t.service.submitCommand(id, HOST, req({ t: "lobby.leave" }));
    expect(cancelled.status).toBe("cancelled");
    expect(await t.service.currentMatchFor(HOST)).toBeNull();
    await expectError(t.service.joinByCode(GUEST, "Beto", lobby!.code), 404, "not_found");
    await expectError(t.service.submitCommand(id, HOST, req({ t: "lobby.ready", ready: false })), 409, "game_over");
  });

  it("currentMatchFor returns the open match", async () => {
    const t = makeService();
    expect(await t.service.currentMatchFor(HOST)).toBeNull();
    const { matchId } = await startMatch(t);
    expect(await t.service.currentMatchFor(HOST)).toBe(matchId);
    expect(await t.service.currentMatchFor(GUEST)).toBe(matchId);
    expect(await t.service.currentMatchFor(STRANGER)).toBeNull();
  });

  it("stale lobbies are cancelled after 2 h and stale matches abandoned after 30 min", async () => {
    const t = makeService();
    const lobbyView = await t.service.createLobby(STRANGER, "Ceci");
    const { matchId } = await startMatch(t);
    t.clock.advance(30 * 60 * 1000 + 1);
    await t.service.cleanupStale();
    expect((await row(t, matchId)).status).toBe("abandoned");
    expect((await row(t, lobbyView.matchId)).status).toBe("lobby");
    t.clock.advance(90 * 60 * 1000);
    expect(await t.service.currentMatchFor(STRANGER)).toBeNull();
    expect((await row(t, lobbyView.matchId)).status).toBe("cancelled");
    const read = (await t.service.readMatch(matchId, HOST)) as { view: { status: string; game: { legal: unknown } } };
    expect(read.view.status).toBe("abandoned");
    expect(read.view.game.legal).toBeNull();
  });
});

describe("join errors (Phase 8 row 11)", () => {
  it("wrong code, own lobby, full lobby, already in another match", async () => {
    const t = makeService();
    const { lobby } = await t.service.createLobby(HOST, "Ana");
    const code = lobby!.code;
    await expectError(t.service.joinByCode(GUEST, "Beto", "ZZZZZZ"), 404, "not_found");
    await expectError(t.service.joinByCode(GUEST, "Beto", "AB"), 404, "not_found");
    const own = await expectError(t.service.joinByCode(HOST, "Ana", code), 409, "own_lobby");
    expect(own.message).toBe("No puedes unirte a tu propia sala.");
    await t.service.joinByCode(GUEST, "Beto", code);
    const full = await expectError(t.service.joinByCode(STRANGER, "Ceci", code), 409, "full");
    expect(full.message).toBe("La sala ya está llena.");
    // A user with their own open lobby cannot join another one.
    const other = makeService();
    const a = await other.service.createLobby(HOST, "Ana");
    const b = await other.service.createLobby(STRANGER, "Ceci");
    const busy = await expectError(other.service.joinByCode(STRANGER, "Ceci", a.lobby!.code), 409, "already_in_match");
    expect(busy.details).toEqual({ matchId: b.matchId });
  });

  it("normalizes codes", () => {
    expect(normalizeCode(" ab-c d2 ")).toBe("ABCD2");
    expect(normalizeCode("abc1o0")).toBe("ABC");
  });
});

describe("timeouts (Phase 8 rows 7–9, T13)", () => {
  it("row 7b: a late command from the timed-out player gets 'Se acabó tu tiempo.'", async () => {
    const t = makeService();
    const { matchId: id } = await startMatch(t);
    const s = await finishMulligan(t, id);
    t.clock.advance(80_000);
    const err = await expectError(t.service.submitCommand(id, userOf(s.turn.activeSeat), req({ t: "endTurn" })), 409, "not_your_turn");
    expect(err.message).toBe("Se acabó tu tiempo.");
  });

  it("row 8: three consecutive timeouts forfeit the match (abandon)", async () => {
    const t = makeService();
    const { matchId: id } = await startMatch(t);
    const s = await finishMulligan(t, id);
    const sleeper = s.turn.activeSeat;
    const other: Seat = sleeper === 0 ? 1 : 0;
    for (let i = 0; i < 5 && (await row(t, id)).status === "active"; i++) {
      t.clock.advance(80_000); // sleeper's turn times out
      await t.service.readMatch(id, userOf(other));
      const r = await row(t, id);
      if (r.status !== "active") break;
      if (r.state!.turn.activeSeat === other) await t.service.submitCommand(id, userOf(other), req({ t: "endTurn" }));
    }
    const r = await row(t, id);
    expect(r.status).toBe("finished");
    expect(r.endReason).toBe("abandon");
    expect(r.result).toBe("win");
    expect(r.winnerId).toBe(userOf(other));
    expect(r.turnDeadline).toBeNull();
    expect((await t.store.listCommands(id)).filter((c) => c.commandId.startsWith("sys:timeout:"))).toHaveLength(3);
  });

  it("row 9: the mulligan timeout keeps the hand of the seat that did not submit", async () => {
    const t = makeService();
    const { matchId: id } = await startMatch(t);
    const before = (await row(t, id)).state!;
    await t.service.submitCommand(id, HOST, req({ t: "mulligan", replace: [before.players[0].hand[0].iid] }));
    t.clock.advance(30_001);
    const read = (await t.service.readMatch(id, HOST)) as { view: { game: { phase: string } } };
    expect(read.view.game.phase).toBe("playing");
    const r = await row(t, id);
    const guestHand = r.state!.players[1].hand.map((c) => c.iid);
    for (const c of before.players[1].hand) expect(guestHand).toContain(c.iid);
    const sys = (await t.store.listCommands(id)).filter((c) => c.commandId.startsWith("sys:"));
    expect(sys.map((c) => [c.commandId, c.command])).toEqual([["sys:mulligan-timeout:1", { t: "mulliganTimeout", seat: 1 }]]);
    expect(r.turnDeadline!.getTime() - t.clock.t).toBe(75_000);
  });

  it("both seats time out of the mulligan one write at a time, each with its own id", async () => {
    const t = makeService();
    const { matchId: id } = await startMatch(t);
    t.clock.advance(31_000);
    await t.service.readMatch(id, GUEST);
    const ids = (await t.store.listCommands(id)).filter((c) => c.commandId.startsWith("sys:")).map((c) => c.commandId);
    expect(ids).toEqual(["sys:mulligan-timeout:0", "sys:mulligan-timeout:1"]);
    expect((await row(t, id)).state!.phase).toBe("playing");
  });
});

describe("reads", () => {
  it("returns { same } for the known version and tracks the foe's presence", async () => {
    const t = makeService();
    const { matchId: id } = await startMatch(t);
    const v = (await row(t, id)).version;
    const same = await t.service.readMatch(id, HOST, { knownVersion: v });
    expect(same).toMatchObject({ same: true, version: v, foeOnline: true });
    t.clock.advance(9_001);
    expect(await t.service.readMatch(id, HOST, { knownVersion: v })).toMatchObject({ same: true, foeOnline: false });
    await t.service.readMatch(id, GUEST, { knownVersion: v });
    expect(await t.service.readMatch(id, HOST, { knownVersion: v })).toMatchObject({ foeOnline: true });
    const full = (await t.service.readMatch(id, HOST, { knownVersion: v - 1, since: 1000 })) as { view: { game: { events: unknown[] } } };
    expect(full.view.game.events).toEqual([]);
  });
});

describe("finished matches (Phase 8 row 14)", () => {
  it("win: hero destroyed sets winnerId, result, totalTurns; reads OK, commands game_over", async () => {
    const t = makeService();
    const { matchId: id } = await startMatch(t);
    await finishMulligan(t, id);
    const s = makeState({ p0: { board: ["forest-boar"] }, p1: { health: 1 }, active: 0, turn: 7 });
    await forceState(t, id, s);
    const attacker = s.players[0].board[0].iid;
    const v = await t.service.submitCommand(id, HOST, req({ t: "attack", attacker, target: "h1" }));
    expect(v.status).toBe("finished");
    expect(v.game!.winner).toBe(0);
    const r = await row(t, id);
    expect(r).toMatchObject({ status: "finished", result: "win", winnerId: HOST, endReason: "hero_destroyed", totalTurns: 7 });
    expect(r.finishedAt).toEqual(t.clock.now());
    await expectError(t.service.submitCommand(id, GUEST, req({ t: "concede" })), 409, "game_over");
    expect(await t.service.readMatch(id, GUEST)).toHaveProperty("view.status", "finished");
    expect(await t.service.currentMatchFor(HOST)).toBeNull();
  });

  it("draw: the turn limit sets result draw and no winner", async () => {
    const t = makeService();
    const { matchId: id } = await startMatch(t);
    await finishMulligan(t, id);
    await forceState(t, id, makeState({ active: 1, turn: 80 }));
    await t.service.submitCommand(id, GUEST, req({ t: "endTurn" }));
    expect(await row(t, id)).toMatchObject({ status: "finished", result: "draw", winnerId: null, endReason: "turn_limit", totalTurns: 80 });
  });

  it("concede (even during mulligan, even off-turn) gives the win to the other seat", async () => {
    const t = makeService();
    const { matchId: id } = await startMatch(t);
    await t.service.submitCommand(id, HOST, req({ t: "concede" }));
    expect(await row(t, id)).toMatchObject({ status: "finished", result: "win", winnerId: GUEST, endReason: "concede", totalTurns: 0 });
  });
});

describe("match rewards (Phase 16)", () => {
  const withRewards = () => {
    let fake: FakeRewards | undefined;
    const t = makeService({ rewards: (store) => (fake = new FakeRewards(store as MemoryMatchStore)) });
    return { t, fake: fake! };
  };

  it("the finishing command grants once and answers with the view that contains the reward", async () => {
    const { t, fake } = withRewards();
    const { matchId: id } = await startMatch(t);
    await finishMulligan(t, id);
    const done = await t.service.submitCommand(id, GUEST, req({ t: "concede" }));
    expect(fake.calls).toEqual([id]);
    const r = await row(t, id);
    expect(r.status).toBe("finished");
    expect(r.rewardsGrantedAt).not.toBeNull();
    expect(done.version).toBe(r.version); // the grant's version bump is already in the answer
    expect(done.rewards).toEqual({ amount: 20, reason: "loss" });

    const host = await t.service.readMatch(id, HOST, { knownVersion: r.version - 1 });
    expect(host.same).toBeUndefined();
    expect((host as { view: MatchView }).view.rewards).toEqual({ amount: 50, reason: "win" });
    // Refreshing the game-over screen: same answer, no second grant.
    await t.service.readMatch(id, HOST);
    await t.service.readMatch(id, GUEST);
    expect(fake.calls).toEqual([id]);
    expect(await t.service.readMatch(id, HOST, { knownVersion: r.version })).toMatchObject({ same: true });
  });

  it("a resent finishing command returns the reward without granting again", async () => {
    const { t, fake } = withRewards();
    const { matchId: id } = await startMatch(t);
    await finishMulligan(t, id);
    const concede = req({ t: "concede" });
    await t.service.submitCommand(id, GUEST, concede);
    const again = await t.service.submitCommand(id, GUEST, concede);
    expect(again.rewards).toEqual({ amount: 20, reason: "loss" });
    expect(fake.calls).toEqual([id]);
  });

  it("a failed grant is not fatal and the next read retries it", async () => {
    const { t, fake } = withRewards();
    const { matchId: id } = await startMatch(t);
    await finishMulligan(t, id);
    fake.failNext = 1;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const done = await t.service.submitCommand(id, GUEST, req({ t: "concede" }));
    errors.mockRestore();
    expect(done.status).toBe("finished");
    expect(done.rewards).toBeNull();
    expect((await row(t, id)).rewardsGrantedAt).toBeNull();

    // The client polls with the version it has: the retry bumps the version, so it gets the full view at once.
    const read = await t.service.readMatch(id, HOST, { knownVersion: done.version });
    expect((read as { view: MatchView }).view.rewards).toEqual({ amount: 50, reason: "win" });
    expect(fake.calls).toEqual([id, id]);
  });

  it("a read retries at most once per request while the grant keeps failing", async () => {
    const { t, fake } = withRewards();
    const { matchId: id } = await startMatch(t);
    await finishMulligan(t, id);
    fake.failNext = 3;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const done = await t.service.submitCommand(id, GUEST, req({ t: "concede" }));
    const read = await t.service.readMatch(id, HOST, { knownVersion: done.version });
    errors.mockRestore();
    expect(read).toMatchObject({ same: true });
    expect(fake.calls).toHaveLength(2);
  });

  it("a forfeit by timeouts grants the rewards (abandon end reason)", async () => {
    const { t, fake } = withRewards();
    const { matchId: id } = await startMatch(t);
    const s = await finishMulligan(t, id);
    const sleeper = s.turn.activeSeat;
    const other: Seat = sleeper === 0 ? 1 : 0;
    for (let i = 0; i < 5 && (await row(t, id)).status === "active"; i++) {
      t.clock.advance(80_000);
      await t.service.readMatch(id, userOf(other));
      const r = await row(t, id);
      if (r.status !== "active") break;
      if (r.state!.turn.activeSeat === other) await t.service.submitCommand(id, userOf(other), req({ t: "endTurn" }));
    }
    const r = await row(t, id);
    expect(r.endReason).toBe("abandon");
    expect(r.rewardsGrantedAt).not.toBeNull();
    expect(fake.calls).toEqual([id]);
  });

  it("stale-abandoned matches are never rewarded", async () => {
    const { t, fake } = withRewards();
    const { matchId: id } = await startMatch(t);
    t.clock.advance(30 * 60 * 1000 + 1);
    await t.service.cleanupStale();
    const read = (await t.service.readMatch(id, HOST)) as { view: MatchView };
    expect(read.view.status).toBe("abandoned");
    expect(read.view.rewards).toBeNull();
    expect(fake.calls).toEqual([]);
  });

  it("without a rewards port (dev memory store) a finished match simply has no reward", async () => {
    const t = makeService();
    const { matchId: id } = await startMatch(t);
    await finishMulligan(t, id);
    const done = await t.service.submitCommand(id, GUEST, req({ t: "concede" }));
    expect(done.rewards).toBeNull();
    const read = (await t.service.readMatch(id, HOST)) as { view: MatchView };
    expect(read.view.rewards).toBeNull();
  });
});
