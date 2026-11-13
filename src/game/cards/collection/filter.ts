// Collection filters, search and sort (§15.1, Phase 14). Pure; the collection screen and the Phase 15 deck editor
// use them. Within one chip group the selected values are alternatives (OR); groups combine with AND; an empty
// group does not filter.
import { compareCards, RARITIES } from "../catalog";
import type { CardDef, Rarity, Tribe } from "../catalog/types";
import { cardName, cardText } from "../i18n";
import { ownedCount, type Inventory } from "./inventory";

export const TRIBES: readonly Tribe[] = ["undead", "beast", "human", "dragon", "demon", "elemental", "construct"];
/** "Sin tipo": spells and mobs without a tribe. */
export const NO_TRIBE = "none";
export type TribeChip = Tribe | typeof NO_TRIBE;
export const TRIBE_CHIPS: readonly TribeChip[] = [...TRIBES, NO_TRIBE];

/** Cost chips 0..7; 7 means "7 or more". */
export const MAX_COST_BUCKET = 7;
export const COST_BUCKETS: readonly number[] = Array.from({ length: MAX_COST_BUCKET + 1 }, (_, i) => i);

export type Ownership = "all" | "owned" | "missing";

export interface CollectionFilter {
  rarities: Rarity[];
  tribes: TribeChip[];
  costs: number[];
  ownership: Ownership;
  query: string;
}

export const EMPTY_FILTER: CollectionFilter = { rarities: [], tribes: [], costs: [], ownership: "all", query: "" };

export function costBucket(cost: number): number {
  return Math.min(Math.max(0, cost), MAX_COST_BUCKET);
}

/** Lowercase, accents removed, whitespace collapsed ("Gólem  de Piedra" → "golem de piedra"). */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Searchable text of a card: Spanish name + rules text (markdown bold removed). */
function searchText(def: CardDef): string {
  return normalizeSearch(`${cardName(def.id)} ${cardText(def.id).replaceAll("**", "")}`);
}
const SEARCH_CACHE = new Map<CardDef, string>();
function cachedSearchText(def: CardDef): string {
  let s = SEARCH_CACHE.get(def);
  if (s === undefined) {
    s = searchText(def);
    SEARCH_CACHE.set(def, s);
  }
  return s;
}

function tribeChipsOf(def: CardDef): TribeChip[] {
  return def.type === "mob" && def.tribes.length > 0 ? def.tribes : [NO_TRIBE];
}

export function isActive(f: CollectionFilter): boolean {
  return f.rarities.length > 0 || f.tribes.length > 0 || f.costs.length > 0 || f.ownership !== "all" || normalizeSearch(f.query) !== "";
}

export function matchesFilter(def: CardDef, inventory: Readonly<Inventory>, f: CollectionFilter): boolean {
  if (f.rarities.length > 0 && !f.rarities.includes(def.rarity)) return false;
  if (f.tribes.length > 0 && !tribeChipsOf(def).some((tr) => f.tribes.includes(tr))) return false;
  if (f.costs.length > 0 && !f.costs.includes(costBucket(def.cost))) return false;
  const owned = ownedCount(inventory, def.id) > 0;
  if (f.ownership === "owned" && !owned) return false;
  if (f.ownership === "missing" && owned) return false;
  const q = normalizeSearch(f.query);
  if (q !== "") {
    const text = cachedSearchText(def);
    // Every word must appear somewhere ("lobo alfa" finds "Lobo Alfa"; word order does not matter).
    if (!q.split(" ").every((word) => text.includes(word))) return false;
  }
  return true;
}

/** The cards that pass `f`, sorted by cost, then Spanish name (§15.1). */
export function filterCards(cards: readonly CardDef[], inventory: Readonly<Inventory>, f: CollectionFilter): CardDef[] {
  return cards.filter((d) => matchesFilter(d, inventory, f)).sort(compareCards);
}

/** "Descubiertas: N/total" — collectible cards with at least one copy. */
export function discoveredCount(cards: readonly CardDef[], inventory: Readonly<Inventory>): number {
  return cards.reduce((n, d) => n + (ownedCount(inventory, d.id) > 0 ? 1 : 0), 0);
}

/** Toggles `value` in a chip group (returns a new array, keeping the chip order of `all`). */
export function toggleChip<T>(selected: readonly T[], value: T, all: readonly T[]): T[] {
  const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
  return all.filter((v) => next.includes(v));
}

const MAX_QUERY = 60;

/** Restores a filter from untrusted storage (sessionStorage), dropping anything unknown. */
export function parseFilter(raw: unknown): CollectionFilter {
  if (!raw || typeof raw !== "object") return EMPTY_FILTER;
  const o = raw as Record<string, unknown>;
  const pick = <T>(v: unknown, all: readonly T[]): T[] => (Array.isArray(v) ? all.filter((x) => v.includes(x)) : []);
  return {
    rarities: pick(o.rarities, RARITIES),
    tribes: pick(o.tribes, TRIBE_CHIPS),
    costs: pick(o.costs, COST_BUCKETS),
    ownership: o.ownership === "owned" || o.ownership === "missing" ? o.ownership : "all",
    query: typeof o.query === "string" ? o.query.slice(0, MAX_QUERY) : "",
  };
}
