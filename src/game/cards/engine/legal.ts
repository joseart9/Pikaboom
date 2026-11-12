// Legal actions for a seat (ADR-13). Must agree exactly with what applyCommand accepts.
// Mulligan, plays (with targets, §6.5), attacks, endTurn.
import { canFit } from "./board";
import { attackTargets, canAttack } from "./combat";
import { availableMana } from "./mana";
import { effectiveCost, playTargets } from "./play";
import type { LegalActions, MatchState, Seat } from "./types";

export function getLegalActions(s: MatchState, seat: Seat): LegalActions {
  const legal: LegalActions = { mulligan: false, play: {}, attacks: {}, endTurn: false };
  const p = s.players[seat];
  if (s.phase === "mulligan") {
    legal.mulligan = !p.mulliganDone;
    return legal;
  }
  if (s.phase !== "playing" || s.turn.activeSeat !== seat) return legal;

  legal.endTurn = true;
  const mana = availableMana(p);
  const roomForMob = canFit(s, seat);
  for (const card of p.hand) {
    const def = s.defs[card.defId];
    if (effectiveCost(s, card) > mana) continue;
    if (def.type === "mob" && !roomForMob) continue;
    const targets = playTargets(s, seat, card);
    if (def.type === "spell" && targets !== null && targets.length === 0) continue; // unplayable spell
    legal.play[card.iid] = {
      needsPosition: def.type === "mob" && p.board.length > 0,
      targets,
      // Spells with a spec always need a target; mobs only when a valid one exists (else the Grito fizzles).
      targetRequired: targets !== null && targets.length > 0,
    };
  }
  for (const u of p.board) {
    if (!canAttack(s, u)) continue;
    const targets = attackTargets(s, u);
    if (targets.length > 0) legal.attacks[u.iid] = targets;
  }
  return legal;
}
