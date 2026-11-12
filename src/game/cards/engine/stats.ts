// Derived unit stats: base stats + modifiers + Furia. Statuses (Debilidad, Bendición — Phase 18) extend these.
import { hasKeyword, keywordValue } from "./keywords";
import type { MatchState, Unit } from "./types";

export function getAttack(u: Unit): number {
  let attack = u.baseAttack;
  for (const m of u.modifiers) attack += m.attack;
  // Furia: +attack while alive and at or below `percent` of max health. Recomputed on every read,
  // so healing above the threshold removes the bonus immediately.
  const berserk = keywordValue(u, "berserk");
  if (berserk) {
    const health = getHealth(u);
    if (health > 0 && health * 100 <= getMaxHealth(u) * berserk.percent) attack += berserk.attack;
  }
  return Math.max(0, attack);
}

/** May be ≤ 0 when health debuffs exceed the base (debuffs can kill, §6.8). */
export function getMaxHealth(u: Unit): number {
  let health = u.baseHealth;
  for (const m of u.modifiers) health += m.health;
  return health;
}

export function getHealth(u: Unit): number {
  return getMaxHealth(u) - u.damage;
}

/** Entered the battlefield this turn (summoning sick unless Carga/Embestida). */
export function summonedThisTurn(s: MatchState, u: Unit): boolean {
  // V1: units that changed control this turn also count (Phase 19 sets summonedTurn on control change).
  return u.summonedTurn >= s.turn.number;
}

/** Summoned this turn and without Carga/Embestida (the UI's "sleeping" look). */
export function isSleeping(s: MatchState, u: Unit): boolean {
  return summonedThisTurn(s, u) && !hasKeyword(u, "charge") && !hasKeyword(u, "rush");
}

/** Alive for selectors and rules: on a board, health > 0 and not flagged for destruction. */
export function isAlive(u: Unit): boolean {
  return getHealth(u) > 0 && !u.pendingDestroy;
}
