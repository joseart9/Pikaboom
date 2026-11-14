// Card log: the cards each side has played and the units that were slain, oldest first, built from the event stream.
// Framework-free; MatchClient feeds it as event groups are applied (so the log never runs ahead of the animations).
import type { CardId } from "../catalog/types";
import type { Seat } from "../engine/types";
import type { ViewEvent } from "../server/view";

export interface CardLogEntry {
  /** Event seq: unique and increasing, used as the React key and to drop duplicates. */
  seq: number;
  kind: "played" | "slain";
  /** Who played the card / whose unit died. */
  seat: Seat;
  defId: CardId;
  /** The turn it happened on (0 when unknown). */
  turn: number;
}

/** The log keeps at most this many entries (a long match never grows it unbounded). */
export const CARD_LOG_MAX = 200;

/** The log entries a list of events produces; `turn` is the turn in progress before the first event. */
export function cardLogEntries(events: readonly ViewEvent[], turn: number): CardLogEntry[] {
  const out: CardLogEntry[] = [];
  let current = turn;
  for (const e of events) {
    if (e.type === "TURN_STARTED") current = e.turn;
    else if (e.type === "CARD_PLAYED") out.push({ seq: e.seq, kind: "played", seat: e.seat, defId: e.defId, turn: current });
    else if (e.type === "MOB_DESTROYED") out.push({ seq: e.seq, kind: "slain", seat: e.seat, defId: e.defId, turn: current });
  }
  return out;
}

/** Appends entries newer than the log's last one, trimmed to `CARD_LOG_MAX`. Returns the same array when unchanged. */
export function appendCardLog(log: readonly CardLogEntry[], entries: readonly CardLogEntry[]): readonly CardLogEntry[] {
  const last = log.length > 0 ? log[log.length - 1].seq : -1;
  const fresh = entries.filter((e) => e.seq > last);
  if (fresh.length === 0) return log;
  const next = [...log, ...fresh];
  return next.length > CARD_LOG_MAX ? next.slice(next.length - CARD_LOG_MAX) : next;
}
