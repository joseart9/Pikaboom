// Phase 8 service tests that must hold for every MatchStore (rows 4–7, 10 and the simultaneous-ready race).
// matchService.test.ts runs them on the memory store; pgStore.db.test.ts runs them on PgMatchStore over PGlite.
import { describe, expect, it } from "vitest";
import type { EngineCommand, GameCommand } from "../engine/commands";
import { seedToRng } from "../engine/rng";
import type { Seat } from "../engine/types";
import { isServiceError } from "../server/errors";
import { TIMEOUT_GRACE_MS } from "../server/matchService";
import { replay } from "../server/replay";
import { randomCommand, seedHex } from "./driver";
import {
  expectError,
  finishMulligan,
  GUEST,
  HOST,
  loadRow as row,
  req,
  startMatch,
  starterChoice,
  STRANGER,
  userOf,
  type MakeServiceOptions,
  type TestService,
} from "./server";

export function defineSharedServiceTests(label: string, make: (opts?: Omit<MakeServiceOptions, "store">) => Promise<TestService>): void {
  describe(`lobby (Phase 8 row 10) — ${label}`, () => {
    it("create → join → selectDeck ×2 → ready ×2 → active, mulligan, 3/4 cards", async () => {
      const t = await make();
      const created = await t.service.createLobby(HOST, "Ana");
      expect(created).toMatchObject({ status: "lobby", seat: 0, foeOnline: false, game: null });
      expect(created.lobby).toMatchObject({ host: { name: "Ana", deckChosen: false, ready: false }, guest: null, myDeck: null });
      expect(created.lobby!.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);

      // Creating again resumes the same lobby.
      expect((await t.service.createLobby(HOST, "Ana")).matchId).toBe(created.matchId);

      const joined = await t.service.joinByCode(GUEST, "Beto", ` ${created.lobby!.code.toLowerCase()} `);
      expect(joined).toMatchObject({ matchId: created.matchId, seat: 1, foeOnline: true });
      expect(joined.lobby!.guest).toMatchObject({ name: "Beto", deckChosen: false, ready: false });
      // Joining again returns your seat.
      expect((await t.service.joinByCode(GUEST, "Beto", created.lobby!.code)).seat).toBe(1);

      const id = created.matchId;
      await expectError(t.service.submitCommand(id, HOST, req({ t: "lobby.ready", ready: true })), 409, "no_deck");
      await expectError(
        t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: { kind: "saved", id: "0b1c2d3e-4f50-4172-8394-a5b6c7d8e9f0" } })),
        409,
        "deck_unavailable",
      );
      // Phase 15: code-defined starter decks are no longer selectable; the granted saved copies are.
      await expectError(
        t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: { kind: "starter", id: "starter-undead" } })),
        409,
        "deck_unavailable",
      );
      const undead = await starterChoice(t, HOST, "undead");
      const sel = await t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: undead }));
      expect(sel.lobby!.myDeck).toEqual(undead);
      await t.service.submitCommand(id, HOST, req({ t: "lobby.ready", ready: true }));
      // Changing deck clears ready.
      const changed = await t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: await starterChoice(t, HOST, "beast") }));
      expect(changed.lobby!.host.ready).toBe(false);
      await t.service.submitCommand(id, HOST, req({ t: "lobby.ready", ready: true }));
      await t.service.submitCommand(id, GUEST, req({ t: "lobby.selectDeck", deck: await starterChoice(t, GUEST, "undead") }));
      const guestView = await t.service.submitCommand(id, GUEST, req({ t: "lobby.ready", ready: true }));

      expect(guestView.status).toBe("active");
      expect(guestView.lobby).toBeNull();
      const hostView = (await t.service.readMatch(id, HOST)) as { view: typeof guestView };
      for (const v of [guestView, hostView.view]) {
        expect(v.game!.phase).toBe("mulligan");
        expect(v.game!.legal?.mulligan).toBe(true);
      }
      const r = await row(t, id);
      const first = r.state!.firstSeat;
      const handOf = (seat: Seat) => (seat === 0 ? hostView.view : guestView).game!.me.hand.length;
      expect(handOf(first)).toBe(3);
      expect(handOf(first === 0 ? 1 : 0)).toBe(4);
      expect(r.setup!.players.map((p) => p.userId)).toEqual([HOST, GUEST]);
      expect(r.startedAt).not.toBeNull();
      expect(r.turnDeadline!.getTime() - t.clock.t).toBe(30_000);
      // Lobby commands after the start are wrong_phase; game commands before it were too.
      await expectError(t.service.submitCommand(id, HOST, req({ t: "lobby.leave" })), 409, "wrong_phase");
    });

    it("two simultaneous ready commands start the match exactly once", async () => {
      const t = await make();
      const { matchId: id, lobby } = await t.service.createLobby(HOST, "Ana");
      await t.service.joinByCode(GUEST, "Beto", lobby!.code);
      await t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: await starterChoice(t, HOST, "undead") }));
      await t.service.submitCommand(id, GUEST, req({ t: "lobby.selectDeck", deck: await starterChoice(t, GUEST, "beast") }));
      const [a, b] = await Promise.all([
        t.service.submitCommand(id, HOST, req({ t: "lobby.ready", ready: true })),
        t.service.submitCommand(id, GUEST, req({ t: "lobby.ready", ready: true })),
      ]);
      expect([a.status, b.status]).toContain("active");
      const cmds = await t.store.listCommands(id);
      expect(cmds.filter((c) => c.command.t === "lobby.ready")).toHaveLength(2);
      const r = await row(t, id);
      expect(r.status).toBe("active");
      expect(r.state!.log.filter((e) => e.type === "MATCH_STARTED")).toHaveLength(1);
    });
  });

  describe(`resume — GET /matches/current (Phase 11 I) — ${label}`, () => {
    it("offers the open lobby/match to its players only, and nothing once it is over", async () => {
      const t = await make();
      expect(await t.service.currentMatchFor(HOST)).toBeNull();

      // Lobby: the host resumes it; the guest only after joining.
      const created = await t.service.createLobby(HOST, "Ana");
      expect(await t.service.currentMatchFor(HOST)).toBe(created.matchId);
      expect(await t.service.currentMatchFor(GUEST)).toBeNull();
      await t.service.joinByCode(GUEST, "Beto", created.lobby!.code);
      expect(await t.service.currentMatchFor(GUEST)).toBe(created.matchId);

      // A guest who leaves the lobby no longer has it; the host still does.
      await t.service.submitCommand(created.matchId, GUEST, req({ t: "lobby.leave" }));
      expect(await t.service.currentMatchFor(GUEST)).toBeNull();
      expect(await t.service.currentMatchFor(HOST)).toBe(created.matchId);
      await t.service.submitCommand(created.matchId, HOST, req({ t: "lobby.leave" }));
      expect(await t.service.currentMatchFor(HOST)).toBeNull();

      // Active match (mulligan and playing): both players resume the same id; a stranger gets nothing.
      const { matchId } = await startMatch(t);
      expect(await t.service.currentMatchFor(HOST)).toBe(matchId);
      expect(await t.service.currentMatchFor(GUEST)).toBe(matchId);
      expect(await t.service.currentMatchFor(STRANGER)).toBeNull();
      await finishMulligan(t, matchId);
      expect(await t.service.currentMatchFor(GUEST)).toBe(matchId);

      // Reading it again after a "refresh" returns the same state (no restart).
      const before = (await t.service.readMatch(matchId, GUEST)) as { view: { version: number; game: { turn: number } } };
      const again = (await t.service.readMatch(matchId, GUEST)) as { view: { version: number; game: { turn: number } } };
      expect(again.view.version).toBe(before.view.version);
      expect(again.view.game.turn).toBe(before.view.game.turn);

      // Finished (concede): no longer offered; the match itself stays readable for the game-over screen.
      const done = await t.service.submitCommand(matchId, GUEST, req({ t: "concede" }));
      expect(done.status).toBe("finished");
      expect(done.game).toMatchObject({ winner: 0, endReason: "concede" });
      expect(await t.service.currentMatchFor(HOST)).toBeNull();
      expect(await t.service.currentMatchFor(GUEST)).toBeNull();
      const read = (await t.service.readMatch(matchId, HOST)) as { view: { status: string; game: { winner: number } } };
      expect(read.view).toMatchObject({ status: "finished", game: { winner: 0 } });
    });
  });

  describe(`idempotency & concurrency (Phase 8 rows 4–6, T1, T5, T6) — ${label}`, () => {
    it("row 4: the same CommandRequest 10× concurrently has exactly one effect", async () => {
      const t = await make();
      const { matchId: id } = await startMatch(t);
      const s = await finishMulligan(t, id);
      const seat = s.turn.activeSeat;
      // Mana-spark (cost 0) is always playable for the second player; for the first, endTurn is the sure command.
      const card = s.players[seat].hand.find((c) => s.defs[c.defId].cost === 0);
      const command: GameCommand = card ? { t: "play", card: card.iid } : { t: "endTurn" };
      const before = (await row(t, id)).version;
      const request = req(command);
      const views = await Promise.all(Array.from({ length: 10 }, () => t.service.submitCommand(id, userOf(seat), request)));
      const after = await row(t, id);
      expect(after.version).toBe(before + 1);
      expect(new Set(views.map((v) => v.version))).toEqual(new Set([before + 1]));
      const sig = card ? "CARD_PLAYED" : "TURN_ENDED";
      const newEvents = after.state!.log.filter((e) => e.seq > s.seq && e.type === sig);
      expect(newEvents).toHaveLength(1);
      expect((await t.store.listCommands(id)).filter((c) => c.commandId === request.commandId)).toHaveLength(1);
      // A later retry with the same id is still a no-op.
      expect((await t.service.submitCommand(id, userOf(seat), request)).version).toBe(before + 1);
    });

    it("row 5: interleaved random commands from both seats equal replay(setup, command log)", async () => {
      const t = await make({ seeds: [seedHex(4242)] });
      const { matchId: id } = await startMatch(t);
      const driver = { rng: seedToRng(seedHex(4343)) };
      let accepted = 0;
      let rejected = 0;
      for (let batch = 0; batch < 40 && accepted < 20; batch++) {
        const s = (await row(t, id)).state!;
        if (s.phase === "finished") break;
        // Up to 3 commands built from the same snapshot, sent concurrently by both seats (some become illegal).
        const cmds: [Seat, EngineCommand][] = [];
        for (let k = 0; k < 3; k++) cmds.push(randomCommand(s, driver));
        if (s.phase === "playing") cmds.push([s.turn.activeSeat === 0 ? 1 : 0, { t: "endTurn" }]); // the wrong seat tries too
        const results = await Promise.allSettled(cmds.map(([seat, c]) => t.service.submitCommand(id, userOf(seat), req(c as GameCommand))));
        for (const r of results) {
          if (r.status === "fulfilled") accepted++;
          else if (isServiceError(r.reason) && r.reason.status === 409) rejected++;
          else throw r.reason;
        }
      }
      expect(accepted).toBeGreaterThanOrEqual(20);
      expect(rejected).toBeGreaterThan(0);
      const r = await row(t, id);
      const log = await t.store.listCommands(id);
      expect(log.map((c) => c.seq)).toEqual([...log.map((c) => c.seq)].sort((a, b) => a - b));
      expect(replay(r.setup!, log.map((c) => ({ seat: c.seat, command: c.command, seq: c.seq })))).toEqual(r.state);
    });

    it("row 6: the inactive seat gets not_your_turn; a stranger gets 403; unknown match 404", async () => {
      const t = await make();
      const { matchId: id } = await startMatch(t);
      const s = await finishMulligan(t, id);
      const inactive: Seat = s.turn.activeSeat === 0 ? 1 : 0;
      const card = s.players[inactive].hand[0].iid;
      const err = await expectError(t.service.submitCommand(id, userOf(inactive), req({ t: "play", card })), 409, "not_your_turn");
      expect(err.message).toBe("No es tu turno.");
      await expectError(t.service.submitCommand(id, userOf(inactive), req({ t: "endTurn" })), 409, "not_your_turn");
      await expectError(t.service.submitCommand(id, STRANGER, req({ t: "endTurn" })), 403, "not_in_match");
      await expectError(t.service.readMatch(id, STRANGER), 403, "not_in_match");
      await expectError(t.service.readMatch("00000000-0000-4000-8000-999999999999", HOST), 404, "not_found");
      // Engine errors carry the Spanish text.
      const active = userOf(s.turn.activeSeat);
      await expectError(t.service.submitCommand(id, active, req({ t: "play", card: "c999" })), 409, "card_not_in_hand");
    });
  });

  describe(`timeouts (Phase 8 row 7) — ${label}`, () => {
    it("row 7: a read after the deadline (+grace) passes the turn once, with id sys:timeout:N", async () => {
      const t = await make();
      const { matchId: id } = await startMatch(t);
      const s = await finishMulligan(t, id);
      const r0 = await row(t, id);
      expect(r0.turnDeadline!.getTime() - t.clock.t).toBe(75_000);
      t.clock.advance(75_000 + TIMEOUT_GRACE_MS); // exactly at deadline + grace: not yet
      await t.service.readMatch(id, HOST);
      expect((await row(t, id)).state!.turn.number).toBe(1);
      t.clock.advance(1);
      const read = (await t.service.readMatch(id, HOST)) as { view: { game: { turn: number; activeSeat: Seat } } };
      expect(read.view.game.turn).toBe(2);
      expect(read.view.game.activeSeat).toBe(s.turn.activeSeat === 0 ? 1 : 0);
      const r1 = await row(t, id);
      const timeouts = (await t.store.listCommands(id)).filter((c) => c.commandId.startsWith("sys:timeout:"));
      expect(timeouts.map((c) => [c.commandId, c.userId, c.seat])).toEqual([["sys:timeout:1", null, s.turn.activeSeat]]);
      expect(r1.state!.log.some((e) => e.type === "TURN_ENDED" && e.timeout)).toBe(true);
      expect(r1.turnDeadline!.getTime() - t.clock.t).toBe(75_000);
      // A system write never marks anyone as seen: the reader is touched separately (no version bump).
      await t.service.readMatch(id, HOST);
      await t.service.readMatch(id, GUEST);
      const r2 = await row(t, id);
      expect(r2.version).toBe(r1.version);
      expect(r2.state!.turn.number).toBe(2);
    });
  });
}
