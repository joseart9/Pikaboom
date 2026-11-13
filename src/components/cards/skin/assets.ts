// Drop-in art registry (Phase 20, docs/cards/ART_GUIDE.md). A primitive uses a file ONLY when its key is listed
// here — so a missing file never shows a broken image, and adding art is: put the SVG in public/cards/…, add its key,
// run `npm test` (skin/assets.test.ts checks every listed file: exists, ≤ 30 KB, viewBox, no raster, no external refs).
// Until then every primitive draws its generated placeholder.

/** Card illustrations: `public/cards/art/<art key>.svg` (the art key is `CardDef.art`, today equal to the card id). */
// UI-03 pilots (scripts/cards-art/art.mjs); UI-04…06 add the rest (docs/cards/UI_ASSET_STATUS.md).
export const CARD_ART_FILES: ReadonlySet<string> = new Set<string>([
  "squire",
  "wolf-pup",
  "stone-golem",
  "restless-skeleton",
  "arcane-spark",
  "flame-lance",
  "morvath",
  "ignis",
  // UI-04 wave: humans, beasts, constructs, elementals.
  "shield-bearer", "iron-guard", "dawn-paladin", "last-stand-knight", "sun-cleric", "silence-monk",
  "apprentice-mage", "scholar", "necromancer", "grave-digger", "soul-thief",
  "wolf", "alpha-wolf", "blood-hound", "bear-cub", "berserker-bear", "ursaria",
  "forest-boar", "charging-rhino", "thornback-tortoise", "twin-claw-panther", "line-breaker", "venom-spider", "toad",
  "clockwork-sentinel", "iron-colossus", "scrap-golem", "swamp-ent", "storm-weaver", "phoenix-chick",
  // UI-05 wave: undead, demons, dragons.
  "skeleton", "vampire-bat", "bone-wall", "hungry-ghoul", "crypt-banshee", "skeleton-king",
  "ember-imp", "shadow-stalker", "curse-weaver", "mana-leech", "nyxara",
  "larval-drake", "flame-wyrm", "ash-drake", "storm-drake", "vaelra",
  // UI-06 wave: the 26 remaining spells (full catalog coverage, 80/80).
  "healing-touch", "blessing-of-light", "purify", "aegis-ward", "savage-strike", "pack-call", "wild-roar",
  "drain-life", "soul-harvest", "bone-storm", "shatter-armor", "banish", "dark-pact", "raise-dead",
  "arcane-insight", "arcane-echo", "growing-crystal", "mana-spark", "golem-forge", "toad-hex", "mind-thrall",
  "chain-lightning", "ice-shard", "frozen-gale", "disarming-strike", "stone-sleep",
]);

/** Skin images: `public/cards/skin/<name>.svg`. */
export type SkinAsset =
  | "card-back"
  | "board-backdrop"
  | "frame-mob"
  | "frame-spell"
  | "hero-mine"
  | "hero-foe"
  | "badge-gem"
  | "badge-diamond"
  | "badge-drop"
  | "badge-circle";

export const SKIN_ASSETS: readonly SkinAsset[] = [
  "card-back",
  "board-backdrop",
  "frame-mob",
  "frame-spell",
  "hero-mine",
  "hero-foe",
  "badge-gem",
  "badge-diamond",
  "badge-drop",
  "badge-circle",
];

export const SKIN_FILES: ReadonlySet<SkinAsset> = new Set<SkinAsset>(SKIN_ASSETS); // all 10 drawn in UI-02

/** Max size of one SVG (ART_GUIDE.md). */
export const MAX_SVG_BYTES = 30 * 1024;

export const cardArtUrl = (key: string) => `/cards/art/${encodeURIComponent(key)}.svg`;
export const skinUrl = (name: SkinAsset) => `/cards/skin/${name}.svg`;

/** CSS `url(...)` layer for a skin image, or null when it has no file yet. */
export function skinLayer(name: SkinAsset): string | null {
  return SKIN_FILES.has(name) ? `url("${skinUrl(name)}") center / cover no-repeat` : null;
}
