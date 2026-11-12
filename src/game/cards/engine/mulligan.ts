// Simultaneous mulligan (§6.2).
import { emit } from "./ctx";
import { addCardToHand, takeTopCard } from "./draw";
import { EngineError } from "./errors";
import { otherSeat } from "./ids";
import { rngShuffle } from "./rng";
import { startTurn } from "./turns";
import type { CardInstance, Ctx, EntityId, Seat } from "./types";

/**
 * Replaces the chosen hand cards: remove them, draw as many from the top (no CARD_DRAWN — the owner learns them
 * from the private MULLIGAN_DONE.drawn), then put the removed cards back and reshuffle the deck.
 */
export function applyMulligan(ctx: Ctx, seat: Seat, replace: unknown): void {
  const s = ctx.s;
  const p = s.players[seat];
  if (p.mulliganDone) throw new EngineError("already_mulliganed");
  if (!Array.isArray(replace) || replace.some((id) => typeof id !== "string")) throw new EngineError("invalid_mulligan");
  const ids = replace as EntityId[];
  if (new Set(ids).size !== ids.length) throw new EngineError("invalid_mulligan");
  if (!ids.every((id) => p.hand.some((c) => c.iid === id))) throw new EngineError("invalid_mulligan");

  const removed: CardInstance[] = p.hand.filter((c) => ids.includes(c.iid));
  p.hand = p.hand.filter((c) => !ids.includes(c.iid));
  const drawn: CardInstance[] = [];
  for (let i = 0; i < removed.length; i++) {
    const card = takeTopCard(p);
    if (!card) break;
    drawn.push(card);
  }
  p.hand.push(...drawn);
  if (removed.length > 0) {
    p.deck.push(...removed);
    rngShuffle(s, p.deck);
  }
  p.mulliganDone = true;
  emit(ctx, {
    type: "MULLIGAN_DONE",
    seat,
    replaced: removed.map((c) => c.iid),
    drawn: drawn.map((c) => ({ iid: c.iid, defId: c.defId })),
  });
}

/** When both seats are done: bonus card to the second player, phase `playing`, turn 1 starts. */
export function finishMulliganIfDone(ctx: Ctx): void {
  const s = ctx.s;
  if (s.phase !== "mulligan" || !s.players[0].mulliganDone || !s.players[1].mulliganDone) return;
  const bonus = s.rules.hand.secondPlayerBonusCard;
  if (bonus !== null) addCardToHand(ctx, otherSeat(s.firstSeat), bonus);
  s.phase = "playing";
  startTurn(ctx);
}
