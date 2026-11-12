// Mulligan card selection (Phase 11 G.6). Pure: the overlay keeps the marked iids and sends `replace` in hand order.
import type { EntityId } from "../engine/types";

export type MulliganAction = { t: "toggle"; iid: EntityId } | { t: "clear" };

/**
 * Next marked set. Marks are always a subset of `hand` (iids that left the hand are dropped), so a stale mark can
 * never reach the server as an `invalid_mulligan`.
 */
export function mulliganReducer(marked: readonly EntityId[], action: MulliganAction, hand: readonly EntityId[]): EntityId[] {
  const kept = marked.filter((iid) => hand.includes(iid));
  if (action.t === "clear") return [];
  if (!hand.includes(action.iid)) return kept;
  return kept.includes(action.iid) ? kept.filter((iid) => iid !== action.iid) : [...kept, action.iid];
}

/** The `replace` list for `{ t: "mulligan" }`: the marked cards in hand order, without duplicates. */
export function replaceList(marked: readonly EntityId[], hand: readonly EntityId[]): EntityId[] {
  return hand.filter((iid, i) => marked.includes(iid) && hand.indexOf(iid) === i);
}
