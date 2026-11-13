// Simple 24×24 glyphs per status, plus Silencio (placeholder art; a future skin pass replaces this file).
// `ring` marks polarity at a glance: red-ish for harmful statuses, gold for helpful ones.
import type { StatusId } from "@/game/cards/catalog/types";
import type { Glyph } from "./keywordGlyphs";

export type StatusGlyphId = StatusId | "silenced";

const HARMFUL = "#ff4d6d";
const HELPFUL = "#ffd166";

export const STATUS_GLYPHS: Record<StatusGlyphId, Glyph & { ring: string }> = {
  burn: { d: "M12 2 C14 6 18 8 18 14 A6 6 0 0 1 6 14 C6 10 8 9 9 6 C10 9 11 9 12 2 Z", fill: "#ff7b00", ring: HARMFUL },
  freeze: { d: "M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z", fill: "#9bf6ff", ring: HARMFUL },
  stun: {
    d: "M12 2 L14.5 8.5 L21 9 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9 L9.5 8.5 Z",
    fill: "#ffe066",
    ring: HARMFUL,
  },
  weakness: { d: "M9 3 H15 V12 H20 L12 21 L4 12 H9 Z", fill: "#cdb4db", ring: HARMFUL },
  vulnerability: {
    d: "M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z M13 5 L10 11 L13 13 L11 19 L15.5 12 L12.5 10 L15 5 Z",
    fill: "#ff8fa3",
    ring: HARMFUL,
  },
  curse: {
    d: "M12 2 A8 8 0 0 1 20 10 C20 14 17 15 17 18 H7 C7 15 4 14 4 10 A8 8 0 0 1 12 2 Z M8 8 A2 2 0 1 0 8.1 8 Z M16 8 A2 2 0 1 0 16.1 8 Z M9 19 H15 V22 H9 Z",
    fill: "#c77dff",
    ring: HARMFUL,
  },
  blessing: { d: "M12 3 L20 12 H15 V21 H9 V12 H4 Z", fill: "#ffd60a", ring: HELPFUL },
  disarm: { d: "M19 2 L22 5 L13 14 L10 11 Z M8 13 L11 16 L9 18 L11 20 L9 22 L2 15 L4 13 L6 15 Z", fill: "#adb5bd", ring: HARMFUL },
  bleed: { d: "M12 2 C15 7 19 10 19 15 A7 7 0 0 1 5 15 C5 10 9 7 12 2 Z", fill: "#d00000", ring: HARMFUL },
  immune: {
    d: "M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z M12 6 L13.5 10 H17.5 L14.5 12.5 L15.5 16.5 L12 14 L8.5 16.5 L9.5 12.5 L6.5 10 H10.5 Z",
    fill: "#ffe066",
    ring: HELPFUL,
  },
  silenced: {
    d: "M12 2 A10 10 0 1 1 11.9 2 Z M12 5 A7 7 0 0 0 6.3 16.1 L16.1 6.3 A7 7 0 0 0 12 5 Z M17.7 7.9 L7.9 17.7 A7 7 0 0 0 17.7 7.9 Z",
    fill: "#e9ecef",
    ring: "#9aa0a6",
  },
};
