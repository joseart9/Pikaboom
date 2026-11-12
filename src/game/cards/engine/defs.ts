// Card-definition snapshot for a match (ADR-11): the deck cards plus every card they can create, transitively.
import type { CardDef, CardId, EffectDef } from "../catalog/types";

function referencedCards(effects: readonly EffectDef[], out: CardId[]): void {
  for (const e of effects) {
    if (e.type === "summon" || e.type === "addToHand" || e.type === "transform") out.push(e.card);
    else if (e.type === "if") {
      referencedCards(e.then, out);
      if (e.else) referencedCards(e.else, out);
    }
  }
}

/**
 * Deep-copied defs for `ids` and everything reachable through `summon`/`addToHand`/`transform`.
 * Callers pass the deck ids **plus** `rules.hand.secondPlayerBonusCard`. Throws on unknown ids.
 */
export function defsClosure(ids: readonly CardId[], catalog: Readonly<Record<CardId, CardDef>>): Record<CardId, CardDef> {
  const out: Record<CardId, CardDef> = {};
  const pending = [...ids];
  while (pending.length > 0) {
    const id = pending.shift()!;
    if (Object.prototype.hasOwnProperty.call(out, id)) continue;
    if (!Object.prototype.hasOwnProperty.call(catalog, id)) throw new Error(`defsClosure: unknown card "${id}"`);
    const def = catalog[id];
    out[id] = structuredClone(def);
    const refs: CardId[] = [];
    for (const a of def.abilities) referencedCards(a.effects, refs);
    pending.push(...refs);
  }
  return out;
}
