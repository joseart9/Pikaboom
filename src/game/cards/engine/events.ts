// Immutable records of what happened (§10.3). Drive animations; redacted per seat by server/view.ts (Phase 8).
import type { CardId, Keywords, StatusId } from "../catalog/types";
import type { EndReason, EntityId, Seat } from "./types";

/** Public description of a unit (used in events and views). */
export type UnitSnapshot = {
  iid: EntityId;
  defId: CardId;
  controller: Seat;
  attack: number;
  health: number;
  maxHealth: number;
  keywords: Keywords;
  shieldCharges: number;
  statuses: { id: StatusId; magnitude: number; expiresAfterTurn: number | null }[];
  silenced: boolean;
  sleeping: boolean; // summoned this turn and no Carga/Embestida
};

export type DamageKind = "combat" | "effect" | "fatigue";
export type BlockReason = "shield" | "divine" | "immune";
export type SummonCause = "play" | "effect" | "reborn" | "resurrect";

type E<T extends string, P> = { type: T; seq: number; step: number } & P;

export type GameEvent =
  | E<"MATCH_STARTED", { firstSeat: Seat }>
  | E<"MULLIGAN_DONE", { seat: Seat; replaced: EntityId[]; drawn: { iid: EntityId; defId: CardId }[] }> // replaced/drawn private to seat
  | E<"TURN_STARTED", { seat: Seat; turn: number }>
  | E<"TURN_ENDED", { seat: Seat; turn: number; timeout: boolean }>
  | E<"MANA_CHANGED", { seat: Seat; current: number; max: number; temporary: number }>
  | E<"CARD_DRAWN", { seat: Seat; iid: EntityId; defId: CardId }> // private to seat
  | E<"CARD_BURNED", { seat: Seat; defId: CardId }> // public
  | E<"FATIGUE", { seat: Seat; amount: number }>
  | E<"CARD_PLAYED", { seat: Seat; iid: EntityId; defId: CardId; target: EntityId | null; position: number | null }>
  | E<"SPELL_CAST", { seat: Seat; iid: EntityId; defId: CardId }>
  | E<"MOB_SUMMONED", { seat: Seat; index: number; cause: SummonCause; unit: UnitSnapshot; sourceId: EntityId | null }>
  | E<"SUMMON_FIZZLED", { seat: Seat; defId: CardId; count: number }>
  | E<"ATTACK_DECLARED", { attacker: EntityId; target: EntityId }>
  | E<"ATTACK_CANCELLED", { attacker: EntityId }>
  | E<"DAMAGE", { source: EntityId; target: EntityId; amount: number; dealt: number; kind: DamageKind; blocked: BlockReason | null; healthAfter: number }>
  | E<"HEAL", { source: EntityId; target: EntityId; amount: number; healthAfter: number }>
  | E<"MOB_DESTROYED", { iid: EntityId; seat: Seat; defId: CardId; index: number }>
  | E<"STATS_CHANGED", { iid: EntityId; attack: number; health: number; maxHealth: number }>
  | E<"KEYWORDS_CHANGED", { iid: EntityId; keywords: Keywords; shieldCharges: number }>
  | E<"STATUS_APPLIED", { iid: EntityId; status: StatusId; magnitude: number }>
  | E<"STATUS_REMOVED", { iid: EntityId; status: StatusId }>
  | E<"MOB_SILENCED", { iid: EntityId }>
  | E<"MOB_TRANSFORMED", { iid: EntityId; unit: UnitSnapshot }>
  // newIid: the card's iid in its owner's hand (private to that seat); null = the hand was full and the card burned
  // (a CARD_BURNED follows).
  | E<"MOB_RETURNED_TO_HAND", { iid: EntityId; seat: Seat; newIid: EntityId | null }>
  | E<"CONTROL_CHANGED", { iid: EntityId; from: Seat; to: Seat; index: number }>
  | E<"CARD_ADDED_TO_HAND", { seat: Seat; iid: EntityId; defId: CardId }> // private to seat
  // Public (both players learn the card). iid: its new iid in the thief's hand, null = burned (a CARD_BURNED follows).
  // fromIid: its iid in the victim's hand; removed from the thief's view (only the victim needs it, DEC-025).
  | E<"CARD_STOLEN", { from: Seat; to: Seat; iid: EntityId | null; fromIid: EntityId; defId: CardId }>
  | E<"TRIGGER_ACTIVATED", { sourceId: EntityId; abilityId: string; defId: CardId }>
  | E<"CHAIN_LIMIT_REACHED", Record<never, never>>
  | E<"GAME_OVER", { winner: Seat | "draw"; reason: EndReason }>;

export type GameEventType = GameEvent["type"];

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An event before `emit` assigns `seq` and `step`. */
export type EventPayload = DistributiveOmit<GameEvent, "seq" | "step">;

export type EventOf<T extends GameEventType> = Extract<GameEvent, { type: T }>;
