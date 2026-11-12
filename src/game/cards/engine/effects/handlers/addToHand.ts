// `addToHand`: new card instances in the side's hand (private CARD_ADDED_TO_HAND; burned if the hand is full).
import { addCardToHand } from "../../draw";
import type { EffectHandler } from "../execute";
import { seatFor } from "./side";

export const addToHand: EffectHandler<"addToHand"> = (ctx, e, a) => {
  const seat = seatFor(a, e.side);
  for (let k = 0; k < e.count; k++) addCardToHand(ctx, seat, e.card);
};
