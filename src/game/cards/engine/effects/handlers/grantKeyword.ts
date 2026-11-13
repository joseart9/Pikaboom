// `grantKeyword`: boolean keywords become `true`; Escudo ADDS charges (the keyword then mirrors the live charge
// count, DEC-012); numeric keywords keep the larger value. Heroes are ignored. Emits KEYWORDS_CHANGED.
// (`berserk` needs two values and cannot be granted — the validator rejects it.) Silenced units stay keyword-less
// (`hasKeyword` ignores their keywords, DEC-024), so they are skipped.
import type { KeywordId, Keywords } from "../../../catalog/types";
import { findUnit } from "../../board";
import { emit } from "../../ctx";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";

const NUMERIC: ReadonlySet<KeywordId> = new Set<KeywordId>(["lifesteal", "thorns", "regeneration"]);

export const grantKeyword: EffectHandler<"grantKeyword"> = (ctx, e, a) => {
  for (const id of resolveSelector(ctx, e.to, a)) {
    const u = findUnit(ctx.s, id);
    if (!u || u.silenced) continue;
    const kw = u.keywords as Record<string, unknown>;
    if (e.keyword === "shield") {
      u.shieldCharges += e.value ?? 1;
      u.keywords.shield = u.shieldCharges;
    } else if (NUMERIC.has(e.keyword)) {
      const current = typeof kw[e.keyword] === "number" ? (kw[e.keyword] as number) : 0;
      kw[e.keyword] = Math.max(current, e.value ?? 1);
    } else if (e.keyword !== "berserk") {
      kw[e.keyword] = true;
    }
    const keywords: Keywords = structuredClone(u.keywords);
    emit(ctx, { type: "KEYWORDS_CHANGED", iid: u.iid, keywords, shieldCharges: u.shieldCharges });
  }
};
