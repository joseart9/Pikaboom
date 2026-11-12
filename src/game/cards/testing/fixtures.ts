// Engine test fixtures (ADR-23): build mid-game states directly, apply commands, inspect results.
import { CATALOG } from "../catalog";
import type { CardDef, CardId, Keywords } from "../catalog/types";
import { STANDARD_RULES } from "../config/rules";
import { applyCommand } from "../engine/apply";
import { createUnit } from "../engine/board";
import type { EngineCommand } from "../engine/commands";
import type { GameEvent, GameEventType } from "../engine/events";
import { seedToRng } from "../engine/rng";
import type { ApplyResult, MatchState, Modifier, PlayerState, Seat, Unit } from "../engine/types";
import { TEST_DEFS } from "./testCards";

export const TEST_SEED = "0123456789abcdef0123456789abcdef";

export interface UnitSpec {
  defId: CardId;
  attack?: number; // overrides the def's base attack (test-only shortcut for "a 3/2 unit")
  health?: number; // overrides the def's base health
  damage?: number;
  sleeping?: boolean;
  attacksThisTurn?: number;
  keywords?: Keywords;
  shieldCharges?: number;
  modifiers?: Modifier[];
}

export interface SideSpec {
  hand?: CardId[];
  deck?: CardId[];
  board?: (CardId | UnitSpec)[];
  health?: number;
  mana?: number;
  maxMana?: number;
}

/**
 * A `playing`-phase state: firstSeat 0, defs = CATALOG + TEST_DEFS, units awake unless `sleeping: true`,
 * extra inline `defs` (test-only cards), mana current = max = `mana ?? 10` (`maxMana` overrides max), hero health 30 (max 30), decks empty by default.
 * iids are assigned in order: p0 board, p0 hand, p0 deck, then p1 board, hand, deck.
 */
export function makeState(
  spec: { p0?: SideSpec; p1?: SideSpec; active?: Seat; turn?: number; seed?: string; defs?: Record<CardId, CardDef> } = {},
): MatchState {
  const turn = spec.turn ?? 1;
  const s: MatchState = {
    engineVersion: 1,
    rules: structuredClone(STANDARD_RULES),
    defs: { ...structuredClone(CATALOG), ...structuredClone(TEST_DEFS), ...structuredClone(spec.defs ?? {}) },
    rng: seedToRng(spec.seed ?? TEST_SEED),
    nextId: 0,
    phase: "playing",
    firstSeat: 0,
    turn: { number: turn, activeSeat: spec.active ?? 0 },
    players: [undefined as never, undefined as never],
    winner: null,
    endReason: null,
    seq: 0,
    log: [],
  };
  const iid = () => `c${++s.nextId}`;
  const side = (seat: Seat, sp: SideSpec = {}): PlayerState => {
    const p: PlayerState = {
      seat,
      userId: `user-${seat}`,
      name: `P${seat}`,
      hero: { health: sp.health ?? s.rules.hero.startingHealth, maxHealth: s.rules.hero.maxHealth },
      mana: {
        current: sp.mana ?? 10,
        max: sp.maxMana ?? sp.mana ?? 10,
        temporary: 0,
        cap: s.rules.mana.cap,
        gainPerTurn: s.rules.mana.gainPerTurn,
      },
      deck: [],
      hand: [],
      board: [],
      graveyard: [],
      fatigue: 0,
      mulliganDone: true,
      consecutiveTimeouts: 0,
      actedThisTurn: false,
      deaths: { total: 0, byTribe: {} },
      turnCounters: { cardsPlayed: 0, spellsCast: 0, mobsPlayed: 0 },
    };
    for (const b of sp.board ?? []) {
      const u = typeof b === "string" ? { defId: b } : b;
      const unit = createUnit(s, seat, u.defId, iid());
      if (u.attack !== undefined) unit.baseAttack = u.attack;
      if (u.health !== undefined) unit.baseHealth = u.health;
      unit.summonedTurn = u.sleeping ? turn : turn - 1;
      unit.damage = u.damage ?? 0;
      unit.attacksThisTurn = u.attacksThisTurn ?? 0;
      if (u.keywords) unit.keywords = structuredClone(u.keywords);
      unit.shieldCharges = u.shieldCharges ?? unit.keywords.shield ?? 0;
      unit.modifiers = structuredClone(u.modifiers ?? []);
      p.board.push(unit);
    }
    p.hand = (sp.hand ?? []).map((defId) => ({ iid: iid(), defId, costMod: 0 }));
    p.deck = (sp.deck ?? []).map((defId) => ({ iid: iid(), defId, costMod: 0 }));
    return p;
  };
  s.players = [side(0, spec.p0), side(1, spec.p1)];
  return s;
}

export function act(s: MatchState, seat: Seat, cmd: EngineCommand): ApplyResult {
  return applyCommand(s, seat, cmd);
}

export function unitAt(s: MatchState, seat: Seat, index: number): Unit {
  const u = s.players[seat].board[index];
  if (!u) throw new Error(`no unit at seat ${seat} index ${index}`);
  return u;
}

/** Card ids (defIds) in a seat's hand, in order. */
export function handIds(s: MatchState, seat: Seat): CardId[] {
  return s.players[seat].hand.map((c) => c.defId);
}

export function eventTypes(events: readonly GameEvent[]): GameEventType[] {
  return events.map((e) => e.type);
}

export function eventsOf<T extends GameEventType>(events: readonly GameEvent[], type: T): Extract<GameEvent, { type: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

/** Recursively freezes an object graph (to prove applyCommand never mutates its input). */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}
