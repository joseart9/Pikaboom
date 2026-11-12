// `gainMana` (§6.4): temporary / current / max / emptyMax for the side's player.
import { gainMana as gain } from "../../mana";
import type { EffectHandler } from "../execute";
import { seatFor } from "./side";

export const gainMana: EffectHandler<"gainMana"> = (ctx, e, a) => {
  gain(ctx, seatFor(a, e.side), e.amount, e.kind);
};
