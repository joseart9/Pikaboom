// Shared palette + cel material ramps for card illustrations (docs/cards/UI_VISUAL_SYSTEM.md §2.1, §6).
// Imported by art.mjs and the per-wave recipe modules in ./recipes/. Build-time only.
// ── Palette (docs/cards/UI_VISUAL_SYSTEM.md §2.1) and per-material cel ramps: [base, shade, light] ─────────────────
export const GOLD = "#f2c14e", GOLD_DEEP = "#a8742a", GOLD_SHINE = "#fff1c1";
export const LEGENDARY = "#ff9f1c", UNIQUE = "#ff006e";
export const M = {
  skin: { base: "#f2c29b", shade: "#c98f6a", light: "#ffe0c4" },
  hair: { base: "#6b3f1f", shade: "#3f2412", light: "#9a6235" },
  steel: { base: "#9fb3c8", shade: "#5e6f8a", light: "#e2ecf5" },
  leather: { base: "#8a5a2b", shade: "#5c3a1c", light: "#b07a40" },
  cloth: { base: "#6b4a2f", shade: "#46301e", light: "#8e6a45" },
  tabard: { base: "#3d6fc4", shade: "#24418a", light: "#6a95e0" },
  gold: { base: GOLD, shade: GOLD_DEEP, light: GOLD_SHINE },
  rock: { base: "#8a86a8", shade: "#575275", light: "#bdb9d6" },
  moss: { base: "#5f9a4a", shade: "#3d6b30", light: "#7bd389" },
  fur: { base: "#8d9cb8", shade: "#5a6788", light: "#c3cee2" },
  cream: { base: "#eadfc8", shade: "#b9a98a", light: "#fff8ea" },
  bone: { base: "#e9e2cf", shade: "#a89f8a", light: "#fffaf0" },
};
