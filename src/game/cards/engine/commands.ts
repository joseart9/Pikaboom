// What the engine accepts (§10.2). Lobby commands live in server/commands.ts (Phase 8).
import type { EntityId, Seat } from "./types";

export type GameCommand =
  | { t: "mulligan"; replace: EntityId[] }
  | { t: "play"; card: EntityId; position?: number; target?: EntityId }
  | { t: "attack"; attacker: EntityId; target: EntityId }
  | { t: "endTurn" }
  | { t: "concede" };

/** Issued by the server, never by clients. The `seat` argument of applyCommand is ignored for these. */
export type SystemCommand =
  | { t: "timeout" } // ends the active seat's turn, counts toward forfeit
  | { t: "mulliganTimeout"; seat: Seat };

export type EngineCommand = GameCommand | SystemCommand;
