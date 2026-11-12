// What an ability knows while its effects run (§9.4).
import type { CardId } from "../../catalog/types";
import type { GameEvent } from "../events";
import type { EntityId, Seat } from "../types";

export interface AbilityContext {
  controller: Seat; // "friendly"/"enemy" in selectors are relative to this seat
  sourceId: EntityId; // unit iid, card iid (spell), or "system"
  sourceDefId: CardId;
  sourceIndex?: number; // board index at trigger time (death snapshot or current)
  chosen?: EntityId; // player's chosen target (play abilities only)
  event?: GameEvent; // triggering event (triggered abilities)
  depth: number;
}
