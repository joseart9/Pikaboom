// `draw`: draws one card at a time for the side's player (burn and fatigue apply per card, §6.6).
import { drawCards } from "../../draw";
import { resolveAmount } from "../amount";
import type { EffectHandler } from "../execute";
import { seatFor } from "./side";

export const draw: EffectHandler<"draw"> = (ctx, e, a) => {
  drawCards(ctx, seatFor(a, e.side), resolveAmount(ctx, e.count, a));
};
