// Drawing, hand limit (burn) and fatigue (§6.6).
import type { CardId } from "../catalog/types";
import { emit } from "./ctx";
import { isGameOver } from "./gameOver";
import { damageHero } from "./damage";
import { nextIid } from "./ids";
import type { CardInstance, Ctx, EntityId, PlayerState, Seat } from "./types";

/** Removes and returns the top card of the deck, or null when empty. Emits nothing. */
export function takeTopCard(p: PlayerState): CardInstance | null {
  return p.deck.shift() ?? null;
}

/** Draws `n` cards one at a time; each draw independently burns (full hand) or fatigues (empty deck). */
export function drawCards(ctx: Ctx, seat: Seat, n: number): void {
  for (let i = 0; i < n; i++) {
    if (isGameOver(ctx.s)) return;
    drawOne(ctx, seat);
  }
}

function drawOne(ctx: Ctx, seat: Seat): void {
  const s = ctx.s;
  const p = s.players[seat];
  const card = takeTopCard(p);
  if (!card) {
    const { fatigueStart, fatigueIncrement } = s.rules.draw;
    const amount = p.fatigue === 0 ? fatigueStart : p.fatigue + fatigueIncrement;
    p.fatigue = amount;
    emit(ctx, { type: "FATIGUE", seat, amount });
    damageHero(ctx, seat, amount, "fatigue", "fatigue");
    return;
  }
  if (p.hand.length >= s.rules.hand.max) {
    emit(ctx, { type: "CARD_BURNED", seat, defId: card.defId });
    return;
  }
  p.hand.push(card);
  emit(ctx, { type: "CARD_DRAWN", seat, iid: card.iid, defId: card.defId });
}

/** Creates a new card instance in `seat`'s hand (burned and revealed if the hand is full). Returns its iid or null. */
export function addCardToHand(ctx: Ctx, seat: Seat, defId: CardId): EntityId | null {
  const s = ctx.s;
  const p = s.players[seat];
  if (p.hand.length >= s.rules.hand.max) {
    emit(ctx, { type: "CARD_BURNED", seat, defId });
    return null;
  }
  const iid = nextIid(s);
  p.hand.push({ iid, defId, costMod: 0 });
  emit(ctx, { type: "CARD_ADDED_TO_HAND", seat, iid, defId });
  return iid;
}
