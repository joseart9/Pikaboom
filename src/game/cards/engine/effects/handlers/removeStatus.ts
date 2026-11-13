// `removeStatus`: removes one status, every negative one ("allNegative", Purificar) or all of them. Heroes: no-op.
import { STATUS_DEFS } from "../../../catalog/statuses";
import { findUnit } from "../../board";
import { removeStatuses } from "../../statuses";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";

export const removeStatus: EffectHandler<"removeStatus"> = (ctx, e, a) => {
  for (const id of resolveSelector(ctx, e.to, a)) {
    const u = findUnit(ctx.s, id);
    if (!u) continue;
    removeStatuses(ctx, u, (st) =>
      e.status === "all" ? true : e.status === "allNegative" ? STATUS_DEFS[st.id].polarity === "negative" : st.id === e.status,
    );
  }
};
