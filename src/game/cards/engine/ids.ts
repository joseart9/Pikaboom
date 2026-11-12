// Entity ids: cards/units are "c<n>" (allocated from state.nextId), heroes are "h0"/"h1".
import type { EntityId, MatchState, Seat } from "./types";

export function nextIid(s: MatchState): EntityId {
  s.nextId += 1;
  return `c${s.nextId}`;
}

export function heroId(seat: Seat): "h0" | "h1" {
  return seat === 0 ? "h0" : "h1";
}

/** The seat whose hero `id` is, or null when `id` is not a hero id. */
export function seatOfHero(id: EntityId): Seat | null {
  return id === "h0" ? 0 : id === "h1" ? 1 : null;
}

export function otherSeat(seat: Seat): Seat {
  return seat === 0 ? 1 : 0;
}
