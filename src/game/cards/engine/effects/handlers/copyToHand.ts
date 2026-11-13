// `copyToHand` (Phase 19 F): a new instance of each target unit's card in the side's hand (default: the ability's
// controller). Private CARD_ADDED_TO_HAND; burned and revealed if the hand is full. Heroes are ignored.
import { findUnit } from "../../board";
import { addCardToHand } from "../../draw";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";
import { seatFor } from "./side";

export const copyToHand: EffectHandler<"copyToHand"> = (ctx, e, a) => {
  const seat = seatFor(a, e.side);
  for (const id of resolveSelector(ctx, e.to, a)) {
    const u = findUnit(ctx.s, id);
    if (u) addCardToHand(ctx, seat, u.defId);
  }
};
