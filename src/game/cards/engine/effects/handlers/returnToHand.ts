// `returnToHand` (Phase 19 F): the unit leaves the board (no death, no Último Aliento) and a fresh instance of its
// card goes to its OWNER's hand (burned and revealed if that hand is full, §6.6). Emits MOB_RETURNED_TO_HAND whose
// `newIid` is private to the owner (server/view.ts); `newIid: null` + CARD_BURNED when the card burned.
import { boardIndexOf } from "../../board";
import { emit } from "../../ctx";
import { nextIid } from "../../ids";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";

export const returnToHand: EffectHandler<"returnToHand"> = (ctx, e, a) => {
  const s = ctx.s;
  for (const id of resolveSelector(ctx, e.to, a)) {
    const at = boardIndexOf(s, id);
    if (!at) continue; // heroes
    const [unit] = s.players[at.seat].board.splice(at.index, 1);
    const owner = s.players[unit.owner];
    if (owner.hand.length >= s.rules.hand.max) {
      emit(ctx, { type: "MOB_RETURNED_TO_HAND", iid: unit.iid, seat: unit.owner, newIid: null });
      emit(ctx, { type: "CARD_BURNED", seat: unit.owner, defId: unit.defId });
      continue;
    }
    const newIid = nextIid(s);
    owner.hand.push({ iid: newIid, defId: unit.defId, costMod: 0 });
    emit(ctx, { type: "MOB_RETURNED_TO_HAND", iid: unit.iid, seat: unit.owner, newIid });
  }
};
