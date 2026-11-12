// Match creation (§6.1).
import type { CardId } from "../catalog/types";
import type { PlayerSetup } from "../config/rules";
import { emit, newCtx } from "./ctx";
import { takeTopCard } from "./draw";
import { nextIid, otherSeat } from "./ids";
import { rngInt, rngShuffle, seedToRng } from "./rng";
import type { MatchSetup, MatchState, PlayerState, Seat } from "./types";

function newPlayer(s: MatchState, seat: Seat, setup: PlayerSetup): PlayerState {
  const hero = { ...{ startingHealth: s.rules.hero.startingHealth, maxHealth: s.rules.hero.maxHealth }, ...setup.heroOverrides };
  const mana = { ...s.rules.mana, ...setup.manaOverrides };
  return {
    seat,
    userId: setup.userId,
    name: setup.name,
    hero: { health: hero.startingHealth, maxHealth: hero.maxHealth },
    mana: { current: 0, max: mana.startingMax, temporary: 0, cap: mana.cap, gainPerTurn: mana.gainPerTurn },
    deck: [],
    hand: [],
    board: [],
    graveyard: [],
    fatigue: 0,
    mulliganDone: false,
    consecutiveTimeouts: 0,
    actedThisTurn: false,
    deaths: { total: 0, byTribe: {} },
    turnCounters: { cardsPlayed: 0, spellsCast: 0, mobsPlayed: 0 },
  };
}

/**
 * Builds the initial state: RNG from the seed, coin flip for the first player, both decks shuffled (seat 0 first),
 * iids assigned after shuffling (seat 0 top→bottom, then seat 1), opening hands drawn (3 / 4), phase `mulligan`.
 * Deck legality is the server's job (§15.3); this only requires ≥ 1 card per deck and every id in `setup.defs`.
 */
export function createMatch(setup: MatchSetup): MatchState {
  for (const [i, p] of setup.players.entries()) {
    if (!Array.isArray(p.deck) || p.deck.length === 0) throw new Error(`createMatch: player ${i} has an empty deck`);
    for (const id of p.deck) {
      if (!Object.prototype.hasOwnProperty.call(setup.defs, id)) throw new Error(`createMatch: "${id}" missing from defs`);
    }
  }
  const bonus = setup.rules.hand.secondPlayerBonusCard;
  if (bonus !== null && !Object.prototype.hasOwnProperty.call(setup.defs, bonus)) {
    throw new Error(`createMatch: bonus card "${bonus}" missing from defs`);
  }

  const s: MatchState = {
    engineVersion: setup.engineVersion,
    rules: structuredClone(setup.rules),
    defs: structuredClone(setup.defs),
    rng: seedToRng(setup.seed),
    nextId: 0,
    phase: "mulligan",
    firstSeat: 0,
    turn: { number: 0, activeSeat: 0 },
    players: [undefined as never, undefined as never],
    winner: null,
    endReason: null,
    seq: 0,
    log: [],
  };
  s.firstSeat = rngInt(s, 2) as Seat;
  s.turn.activeSeat = s.firstSeat;
  s.players = [newPlayer(s, 0, setup.players[0]), newPlayer(s, 1, setup.players[1])];

  const shuffled: CardId[][] = setup.players.map((p) => {
    const ids = [...p.deck];
    rngShuffle(s, ids);
    return ids;
  });
  for (const seat of [0, 1] as const) {
    s.players[seat].deck = shuffled[seat].map((defId) => ({ iid: nextIid(s), defId, costMod: 0 }));
  }

  const ctx = newCtx(s);
  emit(ctx, { type: "MATCH_STARTED", firstSeat: s.firstSeat });
  const second = otherSeat(s.firstSeat);
  for (const [seat, count] of [[s.firstSeat, s.rules.hand.firstPlayerStart], [second, s.rules.hand.secondPlayerStart]] as const) {
    const p = s.players[seat];
    for (let i = 0; i < count; i++) {
      const card = takeTopCard(p);
      if (!card) break; // opening draws from an empty deck are skipped silently (no fatigue)
      p.hand.push(card);
      emit(ctx, { type: "CARD_DRAWN", seat, iid: card.iid, defId: card.defId });
    }
  }
  return s;
}
