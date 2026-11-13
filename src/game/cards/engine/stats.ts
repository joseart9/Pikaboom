// Derived unit stats: base stats + modifiers + Furia + statuses (Debilidad −N attack, Bendición +N/+N; §7.2).
import type { StatusId } from "../catalog/types";
import { hasKeyword, keywordValue } from "./keywords";
import type { MatchState, Unit } from "./types";

/** Magnitude of a status on the unit (0 when absent). Kept here (not statuses.ts) to avoid an import cycle. */
function magnitude(u: Unit, id: StatusId): number {
  return u.statuses.find((st) => st.id === id)?.magnitude ?? 0;
}

export function getAttack(u: Unit): number {
  let attack = u.baseAttack;
  for (const m of u.modifiers) attack += m.attack;
  attack += magnitude(u, "blessing") - magnitude(u, "weakness");
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
  return health + magnitude(u, "blessing");
}

export function getHealth(u: Unit): number {
  return getMaxHealth(u) - u.damage;
}

/** Entered the battlefield this turn (summoning sick unless Carga/Embestida). */
export function summonedThisTurn(s: MatchState, u: Unit): boolean {
  // Units that changed control this turn also count (changeControl sets summonedTurn).
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
