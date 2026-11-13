import { describe, expect, it } from "vitest";
import { applyCommand } from "../../engine/apply";
import { seedToRng } from "../../engine/rng";
import type { MatchState, Seat } from "../../engine/types";
import { projectGame, type MatchView, type ViewEvent } from "../../server/view";
import { randomCommand, seedHex } from "../../testing/driver";
import { BEAST_DECK, newMatch, randomCatalogDeck, TEST_STATUS_DECK } from "../../testing/matches";
import type { CardId } from "../../catalog/types";
import { toBoardModel, type BoardModel } from "../boardModel";
import { boardMismatches, presentationReducer, reduceEvents } from "./reduce";

function viewOf(s: MatchState, seat: Seat, since: number): MatchView {
  return { matchId: "m", version: 1, status: s.phase === "finished" ? "finished" : "active", seat, game: projectGame(s, seat, since) } as MatchView;
}

/** Plays a seeded random game; after each command reduces the redacted events for `seat` into the running model. */
function replayGame(seed: number, seat: Seat, commands: number, decks?: [CardId[], CardId[]]) {
  let s = newMatch(seedHex(seed), decks);
  const driver = { rng: seedToRng(seedHex(seed + 500)) };
  let since = s.seq;
  let model = toBoardModel(viewOf(s, seat, since))!;
  const mismatches: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < commands && s.phase !== "finished"; i++) {
    const [actor, cmd] = randomCommand(s, driver);
    s = applyCommand(s, actor, cmd).state;
    const view = viewOf(s, seat, since);
    for (const e of view.game!.events) seen.add(e.type);
    model = reduceEvents(model, view.game!.events);
    since = view.game!.lastSeq;
    for (const m of boardMismatches(model, toBoardModel(view)!)) mismatches.push(`#${i} ${cmd.t}: ${m}`);
  }
  return { mismatches, seen, finished: s.phase === "finished", model };
}

describe("presentationReducer (Phase 13 I)", () => {
  it("events of recorded seeded games, applied to the initial model, yield the final view's model (both seats)", () => {
    const seen = new Set<string>();
    let finished = 0;
    for (let g = 1; g <= 12; g++) {
      for (const seat of [0, 1] as const) {
        const r = replayGame(g, seat, 400);
        expect(r.mismatches.slice(0, 5)).toEqual([]);
        for (const t of r.seen) seen.add(t);
        if (r.finished) {
          finished += 1;
          expect(r.model.winner).not.toBeNull();
        }
      }
    }
    // The games exercise the interesting events (sanity check of the test itself).
    for (const t of ["MULLIGAN_DONE", "CARD_PLAYED", "MOB_SUMMONED", "DAMAGE", "MOB_DESTROYED", "CARD_DRAWN", "MANA_CHANGED", "TURN_STARTED", "GAME_OVER"]) {
      expect(seen.has(t), t).toBe(true);
    }
    expect(finished).toBeGreaterThan(0);
  });

  it("status deck games (Phase 18): statuses and Silencio reduce to the reconciled model too", () => {
    const seen = new Set<string>();
    for (let g = 1; g <= 8; g++) {
      for (const seat of [0, 1] as const) {
        const r = replayGame(g + 200, seat, 400, [TEST_STATUS_DECK, BEAST_DECK]);
        expect(r.mismatches.slice(0, 5)).toEqual([]);
        for (const t of r.seen) seen.add(t);
      }
    }
    for (const t of ["STATUS_APPLIED", "STATUS_REMOVED", "MOB_SILENCED"]) expect(seen.has(t), t).toBe(true);
  });

  it("all-cards games (Phase 19): transform, return to hand, control change and steals reduce to the reconciled model", () => {
    const seen = new Set<string>();
    for (let g = 1; g <= 30; g++) {
      for (const seat of [0, 1] as const) {
        const r = replayGame(g + 400, seat, 400, [randomCatalogDeck(3000 + 2 * g), randomCatalogDeck(3001 + 2 * g)]);
        expect(r.mismatches.slice(0, 5), `game ${g} seat ${seat}`).toEqual([]);
        for (const t of r.seen) seen.add(t);
      }
    }
    for (const t of ["MOB_TRANSFORMED", "MOB_RETURNED_TO_HAND", "CONTROL_CHANGED", "CARD_STOLEN"]) expect(seen.has(t), t).toBe(true);
  }, 60_000);

  it("is pure and returns the same model for events it does not cover", () => {
    const s = newMatch(seedHex(3));
    const model = toBoardModel(viewOf(s, 0, 0))!;
    const frozen = JSON.stringify(model);
    const e: ViewEvent = { type: "CHAIN_LIMIT_REACHED", seq: 99, step: 0 };
    expect(presentationReducer(model, e)).toBe(model);
    const fake: ViewEvent = { type: "DAMAGE", seq: 100, step: 0, source: "h1", target: model.me.hero.id, amount: 3, dealt: 3, kind: "effect", blocked: null, healthAfter: 27 };
    const next = presentationReducer(model, fake);
    expect(next.me.hero.health).toBe(27);
    expect(JSON.stringify(model)).toBe(frozen);
  });

  it("hidden draws only move the counters; a summon is inserted at its index; a duplicate summon is ignored", () => {
    const s = newMatch(seedHex(4));
    let model: BoardModel = toBoardModel(viewOf(s, 0, 0))!;
    const before = { hand: model.foe.handCount, deck: model.foe.deckCount };
    model = presentationReducer(model, { type: "CARD_DRAWN", seq: 1, step: 0, seat: 1, hidden: true });
    expect([model.foe.handCount, model.foe.deckCount]).toEqual([before.hand + 1, before.deck - 1]);
    const unit = { iid: "x1", defId: "skeleton", controller: 1 as Seat, attack: 1, health: 1, maxHealth: 1, keywords: {}, shieldCharges: 0, statuses: [], silenced: false, sleeping: true };
    model = presentationReducer(model, { type: "MOB_SUMMONED", seq: 2, step: 0, seat: 1, index: 0, cause: "effect", unit, sourceId: null });
    model = presentationReducer(model, { type: "MOB_SUMMONED", seq: 3, step: 0, seat: 1, index: 0, cause: "effect", unit: { ...unit, iid: "x2" }, sourceId: null });
    model = presentationReducer(model, { type: "MOB_SUMMONED", seq: 4, step: 0, seat: 1, index: 0, cause: "effect", unit, sourceId: null });
    expect(model.foe.board.map((u) => u.iid)).toEqual(["x2", "x1"]);
    model = presentationReducer(model, { type: "TURN_STARTED", seq: 5, step: 0, seat: 1, turn: 2 });
    expect(model.foe.board.every((u) => !u.sleeping)).toBe(true);
    expect(model.isMyTurn).toBe(false);
  });
});
