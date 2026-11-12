// Battlefield helpers: unit creation/placement, lookups, capacity (§6.9).
import type { CardId } from "../catalog/types";
import { emit } from "./ctx";
import type { SummonCause, UnitSnapshot } from "./events";
import { getAttack, getHealth, getMaxHealth, isSleeping } from "./stats";
import type { Ctx, EntityId, MatchState, Seat, Unit } from "./types";

/** A fresh unit for a mob def (keywords cloned, shield charges from Escudo N). Does not place it. */
export function createUnit(s: MatchState, seat: Seat, defId: CardId, iid: EntityId): Unit {
  const def = s.defs[defId];
  if (!def || def.type !== "mob") throw new Error(`createUnit: "${defId}" is not a mob def`);
  const keywords = structuredClone(def.keywords);
  return {
    iid,
    defId,
    controller: seat,
    owner: seat,
    baseAttack: def.attack,
    baseHealth: def.health,
    damage: 0,
    modifiers: [],
    keywords,
    shieldCharges: keywords.shield ?? 0,
    statuses: [],
    silenced: false,
    summonedTurn: s.turn.number,
    attacksThisTurn: 0,
    pendingDestroy: false,
    lastDamagedBy: null,
    thresholdsFired: [],
    abilityUses: {},
    rebornUsed: false,
  };
}

export function snapshotUnit(s: MatchState, u: Unit): UnitSnapshot {
  return {
    iid: u.iid,
    defId: u.defId,
    controller: u.controller,
    attack: getAttack(u),
    health: getHealth(u),
    maxHealth: getMaxHealth(u),
    keywords: structuredClone(u.keywords),
    shieldCharges: u.shieldCharges,
    statuses: u.statuses.map((st) => ({ id: st.id, magnitude: st.magnitude, expiresAfterTurn: st.expiresAfterTurn })),
    silenced: u.silenced,
    sleeping: isSleeping(s, u),
  };
}

/**
 * Creates a unit and inserts it at `index` (clamped to 0..board.length) on `seat`'s board; emits MOB_SUMMONED.
 * Capacity is the caller's job (`canFit`). The unit is summoning sick (`summonedTurn = turn.number`).
 */
export function placeUnit(
  ctx: Ctx,
  seat: Seat,
  defId: CardId,
  iid: EntityId,
  index: number,
  cause: SummonCause,
  sourceId: EntityId | null,
  init?: (u: Unit) => void, // adjusts the fresh unit before MOB_SUMMONED is emitted (Renacer: 1 health)
): Unit {
  const s = ctx.s;
  const board = s.players[seat].board;
  const at = Math.max(0, Math.min(Math.trunc(index), board.length));
  const unit = createUnit(s, seat, defId, iid);
  init?.(unit);
  board.splice(at, 0, unit);
  emit(ctx, { type: "MOB_SUMMONED", seat, index: at, cause, unit: snapshotUnit(s, unit), sourceId });
  return unit;
}

export function boardIndexOf(s: MatchState, iid: EntityId): { seat: Seat; index: number } | null {
  for (const seat of [0, 1] as const) {
    const index = s.players[seat].board.findIndex((u) => u.iid === iid);
    if (index >= 0) return { seat, index };
  }
  return null;
}

export function findUnit(s: MatchState, iid: EntityId): Unit | null {
  const at = boardIndexOf(s, iid);
  return at ? s.players[at.seat].board[at.index] : null;
}

/** Whether one more unit fits: under `normalLimit` (6), or `hardLimit` (10) for Desborde summons. */
export function canFit(s: MatchState, seat: Seat, overflow = false): boolean {
  const limit = overflow ? s.rules.board.hardLimit : s.rules.board.normalLimit;
  return s.players[seat].board.length < limit;
}

/** Units in board order (ADR-20): active seat's board left→right, then the other seat's. */
export function unitsInBoardOrder(s: MatchState): Unit[] {
  const first = s.turn.activeSeat;
  return [...s.players[first].board, ...s.players[first === 0 ? 1 : 0].board];
}
