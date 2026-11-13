// The card catalog (ADR-10): every card definition in the game, keyed by id.
import { cardName } from "../i18n";
import { ADVANCED_CARD_DEFS } from "./cards/advanced";
import { BASIC_DEFS } from "./cards/basic";
import { BEAST_DEFS } from "./cards/beast";
import { NEUTRAL_DEFS } from "./cards/neutral";
import { STATUS_CARD_DEFS } from "./cards/status";
import { TOKEN_DEFS } from "./cards/tokens";
import { UNDEAD_DEFS } from "./cards/undead";
import type { CardDef, CardId, MobCardDef, Rarity, SpellCardDef } from "./types";

export const RARITIES: readonly Rarity[] = ["basic", "common", "rare", "magic", "legendary", "unique"];

function buildCatalog(...groups: (readonly CardDef[])[]): Record<CardId, CardDef> {
  const catalog: Record<CardId, CardDef> = Object.create(null);
  for (const def of groups.flat()) {
    if (Object.prototype.hasOwnProperty.call(catalog, def.id)) throw new Error(`Duplicate card id in catalog: ${def.id}`);
    catalog[def.id] = def;
  }
  return Object.freeze(catalog);
}

export const CATALOG: Readonly<Record<CardId, CardDef>> = buildCatalog(
  BASIC_DEFS,
  UNDEAD_DEFS,
  BEAST_DEFS,
  NEUTRAL_DEFS,
  STATUS_CARD_DEFS,
  ADVANCED_CARD_DEFS,
  TOKEN_DEFS,
);

export function hasDef(id: CardId, catalog: Readonly<Record<CardId, CardDef>> = CATALOG): boolean {
  return Object.prototype.hasOwnProperty.call(catalog, id);
}

/** The definition for `id`; throws for unknown ids (callers validate untrusted ids with `hasDef` first). */
export function getDef(id: CardId): CardDef {
  if (!hasDef(id)) throw new Error(`Unknown card id: ${id}`);
  return CATALOG[id];
}

export function isMob(def: CardDef): def is MobCardDef {
  return def.type === "mob";
}

export function isSpell(def: CardDef): def is SpellCardDef {
  return def.type === "spell";
}

/** Sort order for card lists (§15.1): cost, then Spanish name, then id. */
export function compareCards(a: CardDef, b: CardDef): number {
  return a.cost - b.cost || cardName(a.id).localeCompare(cardName(b.id), "es") || a.id.localeCompare(b.id);
}

/** All collectible cards (no tokens), sorted by cost then Spanish name. */
export const COLLECTIBLE_CARDS: readonly CardDef[] = Object.values(CATALOG)
  .filter((d) => d.collectible)
  .sort(compareCards);

/** Collectible Básica cards: always owned, never in packs. */
export const BASIC_CARDS: readonly CardDef[] = COLLECTIBLE_CARDS.filter((d) => d.rarity === "basic");

/** Collectible cards of one rarity (sorted like COLLECTIBLE_CARDS). */
export function cardsByRarity(rarity: Rarity): CardDef[] {
  return COLLECTIBLE_CARDS.filter((d) => d.rarity === rarity);
}
