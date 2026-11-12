// Random legal-command driver shared by the engine fuzz test (Phase 7) and the server tests (Phase 8).
import type { EngineCommand } from "../engine/commands";
import { getLegalActions } from "../engine/legal";
import { rngInt, type RngState } from "../engine/rng";
import type { MatchState, Seat } from "../engine/types";

export function seedHex(n: number): string {
  return n.toString(16).padStart(32, "0");
}

/**
 * One uniformly random legal action: during mulligan the first seat not done replaces a random third of its hand;
 * otherwise plays (random legal target/position), attacks, or endTurn. Uses only the driver RNG.
 */
export function randomCommand(s: MatchState, driver: { rng: RngState }): [Seat, EngineCommand] {
  if (s.phase === "mulligan") {
    const seat: Seat = s.players[0].mulliganDone ? 1 : 0;
    return [seat, { t: "mulligan", replace: s.players[seat].hand.filter(() => rngInt(driver, 3) === 0).map((c) => c.iid) }];
  }
  const seat = s.turn.activeSeat;
  const legal = getLegalActions(s, seat);
  const options: EngineCommand[] = [{ t: "endTurn" }];
  for (const [card, entry] of Object.entries(legal.play)) {
    const position = rngInt(driver, s.players[seat].board.length + 1);
    if (entry.targets && entry.targets.length > 0) {
      options.push({ t: "play", card, position, target: entry.targets[rngInt(driver, entry.targets.length)] });
    } else {
      options.push({ t: "play", card, position });
    }
  }
  for (const [attacker, targets] of Object.entries(legal.attacks)) {
    for (const target of targets) options.push({ t: "attack", attacker, target });
  }
  return [seat, options[rngInt(driver, options.length)]];
}
