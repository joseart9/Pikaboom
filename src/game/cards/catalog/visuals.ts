// Presentation data for cards (Phase 20, plan §21 Phase 20 C/F): which element an effect looks like (projectile,
// particles, sound) and how a played card enters (normal / heavy / cinematic). Pure data — no gameplay meaning, so it
// is NOT part of the card hashes and changing it needs no `version` bump. Unlisted cards fall back to their tribe's
// element and to the rarity/cost entrance defaults.
import type { CardDef, CardId, Tribe } from "./types";

export type FxElement = "fire" | "ice" | "arcane" | "lightning" | "shadow" | "nature" | "holy";
export type Entrance = "normal" | "heavy" | "cinematic";

export const FX_ELEMENTS: readonly FxElement[] = ["fire", "ice", "arcane", "lightning", "shadow", "nature", "holy"];

export interface CardVisual {
  element?: FxElement;
  entrance?: Entrance;
}

/** Explicit per-card visuals. Keys must be catalog ids (`visuals.test.ts`). */
export const CARD_VISUALS: Partial<Record<CardId, CardVisual>> = {
  // fire
  ignis: { element: "fire" },
  "flame-lance": { element: "fire" },
  "flame-wyrm": { element: "fire" },
  "ember-imp": { element: "fire" },
  "ash-drake": { element: "fire" },
  "phoenix-chick": { element: "fire" },
  "larval-drake": { element: "fire" },
  // ice
  "ice-shard": { element: "ice" },
  "frozen-gale": { element: "ice" },
  vaelra: { element: "ice" },
  // lightning
  "chain-lightning": { element: "lightning" },
  "storm-weaver": { element: "lightning" },
  "storm-drake": { element: "lightning" },
  "stone-sleep": { element: "lightning" },
  "disarming-strike": { element: "lightning" },
  // arcane
  "arcane-spark": { element: "arcane" },
  "arcane-insight": { element: "arcane" },
  "arcane-echo": { element: "arcane" },
  "apprentice-mage": { element: "arcane" },
  "growing-crystal": { element: "arcane" },
  "mana-spark": { element: "arcane" },
  "toad-hex": { element: "arcane" },
  "mind-thrall": { element: "arcane" },
  "mana-leech": { element: "arcane" },
  scholar: { element: "arcane" },
  "golem-forge": { element: "arcane" },
  // shadow
  "bone-storm": { element: "shadow" },
  "soul-harvest": { element: "shadow" },
  "drain-life": { element: "shadow" },
  "dark-pact": { element: "shadow" },
  "raise-dead": { element: "shadow" },
  "curse-weaver": { element: "shadow" },
  "soul-thief": { element: "shadow" },
  "shatter-armor": { element: "shadow" },
  banish: { element: "shadow" },
  necromancer: { element: "shadow" },
  morvath: { element: "shadow" },
  nyxara: { element: "shadow" },
  // nature
  "savage-strike": { element: "nature" },
  "wild-roar": { element: "nature" },
  "pack-call": { element: "nature" },
  "swamp-ent": { element: "nature" },
  "venom-spider": { element: "nature" },
  "blood-hound": { element: "nature" },
  ursaria: { element: "nature" },
  // holy
  "healing-touch": { element: "holy" },
  "blessing-of-light": { element: "holy" },
  purify: { element: "holy" },
  "aegis-ward": { element: "holy" },
  "dawn-paladin": { element: "holy" },
  "sun-cleric": { element: "holy" },
  "silence-monk": { element: "holy" },
  "last-stand-knight": { element: "holy" },
};

/** Fallback element of a mob without an explicit entry (first tribe that has one). */
export const TRIBE_ELEMENT: Partial<Record<Tribe, FxElement>> = {
  dragon: "fire",
  undead: "shadow",
  beast: "nature",
  demon: "shadow",
  elemental: "lightning",
};

/** Cost from which a non-legendary card lands "heavy". */
export const HEAVY_COST = 7;

/** The element of a card's effects, or null (the animation uses its neutral default). */
export function effectElement(def: CardDef | undefined): FxElement | null {
  if (!def) return null;
  const explicit = CARD_VISUALS[def.id]?.element;
  if (explicit) return explicit;
  if (def.type === "mob") for (const tribe of def.tribes) if (TRIBE_ELEMENT[tribe]) return TRIBE_ELEMENT[tribe]!;
  return null;
}

/** How the card enters when played: explicit, else Legendaria/Única → cinematic, cost ≥ 7 → heavy, else normal. */
export function cardEntrance(def: CardDef | undefined): Entrance {
  if (!def) return "normal";
  const explicit = CARD_VISUALS[def.id]?.entrance;
  if (explicit) return explicit;
  if (def.rarity === "legendary" || def.rarity === "unique") return "cinematic";
  if (def.cost >= HEAVY_COST) return "heavy";
  return "normal";
}
