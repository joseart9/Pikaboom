// Drop-in art registry (Phase 20, docs/cards/ART_GUIDE.md). A primitive uses a file ONLY when its key is listed
// here — so a missing file never shows a broken image, and adding art is: put the SVG in public/cards/…, add its key,
// run `npm test` (skin/assets.test.ts checks every listed file: exists, ≤ 30 KB, viewBox, no raster, no external refs).
// Until then every primitive draws its generated placeholder.

/** Card illustrations: `public/cards/art/<art key>.svg` (the art key is `CardDef.art`, today equal to the card id). */
export const CARD_ART_FILES: ReadonlySet<string> = new Set<string>([]);

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

export const SKIN_FILES: ReadonlySet<SkinAsset> = new Set<SkinAsset>([]);

/** Max size of one SVG (ART_GUIDE.md). */
export const MAX_SVG_BYTES = 30 * 1024;

export const cardArtUrl = (key: string) => `/cards/art/${encodeURIComponent(key)}.svg`;
export const skinUrl = (name: SkinAsset) => `/cards/skin/${name}.svg`;

/** CSS `url(...)` layer for a skin image, or null when it has no file yet. */
export function skinLayer(name: SkinAsset): string | null {
  return SKIN_FILES.has(name) ? `url("${skinUrl(name)}") center / cover no-repeat` : null;
}
