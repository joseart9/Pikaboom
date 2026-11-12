// Mana (§6.4): `current` spendable, `max` crystals (≤ cap), `temporary` this turn only.
import { emit } from "./ctx";
import type { Ctx, PlayerState, Seat } from "./types";

function emitMana(ctx: Ctx, seat: Seat): void {
  const m = ctx.s.players[seat].mana;
  emit(ctx, { type: "MANA_CHANGED", seat, current: m.current, max: m.max, temporary: m.temporary });
}

export function availableMana(p: PlayerState): number {
  return p.mana.current + p.mana.temporary;
}

/** Start of turn: +gainPerTurn crystals (capped), refill, clear temporary. */
export function refreshManaForTurn(ctx: Ctx, seat: Seat): void {
  const m = ctx.s.players[seat].mana;
  m.max = Math.min(m.max + m.gainPerTurn, m.cap);
  m.current = m.max;
  m.temporary = 0;
  emitMana(ctx, seat);
}

/** Pays from temporary first, then current. Caller has checked affordability. No event for a 0 cost. */
export function payCost(ctx: Ctx, seat: Seat, cost: number): void {
  if (cost <= 0) return;
  const m = ctx.s.players[seat].mana;
  const fromTemp = Math.min(m.temporary, cost);
  m.temporary -= fromTemp;
  m.current = Math.max(0, m.current - (cost - fromTemp));
  emitMana(ctx, seat);
}

/** `gainMana` effect kinds (§6.4). Max never exceeds cap; mana never below 0. */
export function gainMana(ctx: Ctx, seat: Seat, amount: number, kind: "temporary" | "current" | "max" | "emptyMax"): void {
  if (amount <= 0) return;
  const m = ctx.s.players[seat].mana;
  switch (kind) {
    case "temporary":
      m.temporary += amount;
      break;
    case "current":
      m.current = Math.min(m.current + amount, m.max);
      break;
    case "max":
      m.max = Math.min(m.max + amount, m.cap);
      m.current = Math.min(m.current + amount, m.max);
      break;
    case "emptyMax":
      m.max = Math.min(m.max + amount, m.cap);
      break;
  }
  emitMana(ctx, seat);
}

/** End of turn: temporary mana is discarded. */
export function clearTemporaryMana(ctx: Ctx, seat: Seat): void {
  const m = ctx.s.players[seat].mana;
  if (m.temporary === 0) return;
  m.temporary = 0;
  emitMana(ctx, seat);
}
