// Simple 24×24 glyphs per keyword (placeholder art; a future skin pass replaces this file with real icons).
import type { KeywordId } from "@/game/cards/catalog/types";

export interface Glyph {
  /** Path data in a 24×24 box. */
  d: string;
  fill: string;
}

export const KEYWORD_GLYPHS: Record<KeywordId, Glyph> = {
  taunt: { d: "M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z", fill: "#c9ced6" },
  shield: { d: "M12 3 A9 9 0 1 1 11.9 3 Z M12 7 A5 5 0 1 0 12.1 7 Z", fill: "#7fd3ff" },
  lifesteal: { d: "M12 2 C15 7 19 10 19 15 A7 7 0 0 1 5 15 C5 10 9 7 12 2 Z", fill: "#ff4d6d" },
  rush: { d: "M3 5 L11 12 L3 19 V15 L7 12 L3 9 Z M12 5 L20 12 L12 19 V15 L16 12 L12 9 Z", fill: "#ffbe0b" },
  charge: { d: "M13 2 L4 14 H11 L9 22 L20 9 H13 Z", fill: "#ffe066" },
  doubleStrike: { d: "M4 3 L13 12 L11 14 L2 5 Z M20 3 L22 5 L13 14 L11 12 Z M5 15 L9 19 L6 22 L2 18 Z M19 15 L22 18 L18 22 L15 19 Z", fill: "#e9ecef" },
  berserk: { d: "M12 2 C14 6 18 8 18 13 A6 6 0 0 1 6 13 C6 10 8 9 9 6 C10 9 11 9 12 2 Z", fill: "#ff6b35" },
  thorns: { d: "M12 2 L14 9 L21 7 L16 12 L21 17 L14 15 L12 22 L10 15 L3 17 L8 12 L3 7 L10 9 Z", fill: "#7bc950" },
  cleave: { d: "M3 14 C6 6 18 6 21 14 L18 15 C16 10 8 10 6 15 Z M11 15 H13 V22 H11 Z", fill: "#e9ecef" },
  regeneration: { d: "M9 3 H15 V9 H21 V15 H15 V21 H9 V15 H3 V9 H9 Z", fill: "#06d6a0" },
  reborn: { d: "M12 4 A8 8 0 1 1 4 12 H7 A5 5 0 1 0 12 7 V10 L7 5.5 L12 1 Z", fill: "#ff9f1c" },
  poison: { d: "M12 2 C15 7 19 10 19 15 A7 7 0 0 1 5 15 C5 10 9 7 12 2 Z", fill: "#7bc950" },
  stealth: { d: "M2 12 C6 5 18 5 22 12 C18 19 6 19 2 12 Z M12 9 A3 3 0 1 0 12.1 9 Z", fill: "#9aa0a6" },
  divineShield: { d: "M12 3 A9 9 0 1 1 11.9 3 Z M12 6 A6 6 0 1 0 12.1 6 Z", fill: "#ffe066" },
  flying: { d: "M2 14 C6 6 14 4 22 6 C16 8 14 10 13 14 C10 12 6 12 2 14 Z", fill: "#bde0fe" },
};
