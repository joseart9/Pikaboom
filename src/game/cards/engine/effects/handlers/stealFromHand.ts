// `stealFromHand` (Phase 19 F): `count` distinct random cards (engine RNG) leave the enemy's hand for the
// controller's, each with a new iid. Public CARD_STOLEN (both players learn the card); burned and revealed if the
// thief's hand is full (`iid: null` + CARD_BURNED). An empty enemy hand is a no-op and uses no RNG.
import { emit } from "../../ctx";
import { nextIid, otherSeat } from "../../ids";
import { rngPick } from "../../rng";
import type { EffectHandler } from "../execute";

export const stealFromHand: EffectHandler<"stealFromHand"> = (ctx, e, a) => {
  const s = ctx.s;
  const to = a.controller;
  const from = otherSeat(to);
  const victim = s.players[from];
  const thief = s.players[to];
  for (const card of rngPick(s, victim.hand, e.count)) {
    victim.hand = victim.hand.filter((c) => c.iid !== card.iid);
    if (thief.hand.length >= s.rules.hand.max) {
      emit(ctx, { type: "CARD_STOLEN", from, to, iid: null, fromIid: card.iid, defId: card.defId });
      emit(ctx, { type: "CARD_BURNED", seat: to, defId: card.defId });
      continue;
    }
    const iid = nextIid(s);
    thief.hand.push({ iid, defId: card.defId, costMod: card.costMod });
    emit(ctx, { type: "CARD_STOLEN", from, to, iid, fromIid: card.iid, defId: card.defId });
  }
};
