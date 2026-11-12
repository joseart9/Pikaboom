// Authoritative match state (§10.1). Pure data: JSON-serializable, structuredClone-able.
import type { CardDef, CardId, Keywords, StatusId, Tribe } from "../catalog/types";
import type { PlayerSetup, RulesConfig } from "../config/rules";
import type { GameEvent } from "./events";
import type { RngState } from "./rng";

export type { RngState } from "./rng"; // DEC-003: rng.ts owns the type

export type Seat = 0 | 1;
export type EntityId = string; // "h0" | "h1" | "c<number>"

export interface CardInstance {
  iid: EntityId;
  defId: CardId;
  costMod: number; // for future cost effects (0 in V1)
}

export interface Modifier {
  attack: number;
  health: number;
  expires: "never" | "endOfTurn";
  sourceId: EntityId;
}

export interface StatusInstance {
  id: StatusId;
  magnitude: number;
  expiresAfterTurn: number | null;
  sourceId: EntityId;
  appliedTurn: number;
}

export interface Unit {
  iid: EntityId;
  defId: CardId;
  controller: Seat;
  owner: Seat; // original owner (for future "return to owner")
  baseAttack: number; // copied from def at summon/transform
  baseHealth: number;
  damage: number; // current health = maxHealth - damage
  modifiers: Modifier[];
  keywords: Keywords; // current keywords (granted/removed)
  shieldCharges: number;
  statuses: StatusInstance[];
  silenced: boolean;
  summonedTurn: number;
  attacksThisTurn: number;
  pendingDestroy: boolean;
  lastDamagedBy: EntityId | null;
  thresholdsFired: string[]; // ability ids of healthThreshold triggers already fired this life
  abilityUses: Record<string, { turn: number; thisTurn: number; total: number }>;
  rebornUsed: boolean; // true for a unit that came back via Renacer
}

export interface Hero {
  health: number;
  maxHealth: number;
}

export interface PlayerState {
  seat: Seat;
  userId: string;
  name: string;
  hero: Hero;
  mana: { current: number; max: number; temporary: number; cap: number; gainPerTurn: number };
  deck: CardInstance[]; // index 0 = top
  hand: CardInstance[];
  board: Unit[]; // index 0 = leftmost
  graveyard: { iid: EntityId; defId: CardId; diedTurn: number }[];
  fatigue: number; // last fatigue damage dealt (next = fatigue + increment); 0 = never fatigued
  mulliganDone: boolean;
  consecutiveTimeouts: number;
  actedThisTurn: boolean;
  deaths: { total: number; byTribe: Partial<Record<Tribe, number>> };
  turnCounters: { cardsPlayed: number; spellsCast: number; mobsPlayed: number };
}

export type Phase = "mulligan" | "playing" | "finished";
export type EndReason = "hero_destroyed" | "mutual_destruction" | "concede" | "abandon" | "turn_limit";

export interface MatchState {
  engineVersion: number; // ENGINE_VERSION constant at creation
  rules: RulesConfig; // snapshot
  defs: Record<CardId, CardDef>; // snapshot (ADR-11)
  rng: RngState;
  nextId: number; // for "c<n>" ids
  phase: Phase;
  firstSeat: Seat;
  turn: { number: number; activeSeat: Seat };
  players: [PlayerState, PlayerState];
  winner: Seat | "draw" | null;
  endReason: EndReason | null;
  seq: number; // last event seq
  log: GameEvent[]; // ring buffer (LOG_LIMIT), full detail incl. private events
}

/** Everything needed to create (and later replay) a match (§11). */
export interface MatchSetup {
  engineVersion: number; // ENGINE_VERSION at creation (replay checks it)
  seed: string; // 32 hex chars
  rules: RulesConfig;
  defs: Record<CardId, CardDef>; // closure (engine never reads CATALOG directly)
  players: [PlayerSetup, PlayerSetup];
}

export interface ApplyResult {
  state: MatchState;
  events: GameEvent[];
}

/** What a seat may do right now (§10.4). Computed by the engine; `server/view.ts` re-exports it. */
export interface LegalActions {
  mulligan: boolean; // true while you may still mulligan
  play: Record<EntityId, { needsPosition: boolean; targets: EntityId[] | null; targetRequired: boolean }>;
  attacks: Record<EntityId, EntityId[]>; // attacker → legal targets
  endTurn: boolean;
}

/** A queued triggered ability or Renacer (§8.2–§8.3). */
export interface PendingTrigger {
  kind: "ability" | "reborn";
  sourceId: EntityId;
  controller: Seat;
  defId: CardId;
  abilityId: string | null;
  event: GameEvent | null;
  depth: number;
  snapshot?: { seat: Seat; index: number; silenced: boolean }; // death triggers & reborn
}

/** Per-command working context (§8.1). */
export interface Ctx {
  s: MatchState;
  events: GameEvent[]; // events emitted by this command, in order
  queue: PendingTrigger[];
  step: number;
  resolutions: number;
  depth: number; // depth of the trigger currently resolving (0 = primary action)
  chainLimitEmitted: boolean;
  /** Units removed by death processing during this command, by iid (last state before removal). Used for
   *  death triggers, `otherDied` filters and MOB_DESTROYED event subjects. Not part of MatchState. */
  departed: Record<EntityId, Unit>;
}
