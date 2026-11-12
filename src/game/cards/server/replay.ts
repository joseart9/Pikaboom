// Rebuilds a match from its setup and command log (§11). Pure.
import { applyCommand } from "../engine/apply";
import type { EngineCommand } from "../engine/commands";
import { ENGINE_VERSION } from "../engine/index";
import { createMatch } from "../engine/setup";
import type { MatchSetup, MatchState, Seat } from "../engine/types";
import { ServiceError } from "./errors";

/** A logged command as stored (`cards_match_commands`); lobby entries are skipped by `replay`. */
export interface EngineCommandLog {
  seat: Seat;
  command: EngineCommand | { t: `lobby.${string}` };
  seq?: number;
}

/**
 * `createMatch(setup)`, then every game/system command in `seq` order with its seat. Throws `replay_unavailable`
 * when the setup was created by another engine version, and rethrows engine errors (a log that does not replay
 * is a bug, never an expected outcome).
 */
export function replay(setup: MatchSetup, commands: readonly EngineCommandLog[]): MatchState {
  if (setup.engineVersion !== ENGINE_VERSION) throw new ServiceError(409, "replay_unavailable");
  const ordered = commands.every((c) => typeof c.seq === "number") ? [...commands].sort((a, b) => a.seq! - b.seq!) : [...commands];
  let s = createMatch(setup);
  for (const entry of ordered) {
    if (entry.command.t.startsWith("lobby.")) continue;
    s = applyCommand(s, entry.seat, entry.command as EngineCommand).state;
  }
  return s;
}
