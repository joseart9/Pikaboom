// Keyword lookups for engine rules (§7.1). Metadata (names, icons, order) lives in catalog/keywords.ts.
// Every rule reads keywords through these helpers so Silencio (Phase 18) disables them in one place.
import type { KeywordId, Keywords } from "../catalog/types";
import type { Unit } from "./types";

/** Whether the unit currently has keyword `k` (a silenced unit has none). */
export function hasKeyword(u: Unit, k: KeywordId): boolean {
  return !u.silenced && u.keywords[k] !== undefined;
}

/** The keyword's value (`true`, N or `{ percent, attack }`), or undefined when absent or silenced. */
export function keywordValue<K extends KeywordId>(u: Unit, k: K): Keywords[K] | undefined {
  return u.silenced ? undefined : u.keywords[k];
}

/** Attacks allowed per turn: 2 with Golpe Doble, otherwise 1. */
export function maxAttacks(u: Unit): number {
  return hasKeyword(u, "doubleStrike") ? 2 : 1;
}
