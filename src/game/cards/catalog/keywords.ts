// Keyword metadata registry (§7.1, §9.7). Behavior lives in the engine; names/texts in `es.keyword`.
import type { KeywordId } from "./types";

export interface KeywordMeta {
  id: KeywordId;
  icon: string;
  hasValue: boolean;
  order: number;
  available: "mvp" | "v1";
}

export const KEYWORDS: Record<KeywordId, KeywordMeta> = {
  taunt: { id: "taunt", icon: "taunt", hasValue: false, order: 1, available: "mvp" },
  shield: { id: "shield", icon: "shield", hasValue: true, order: 2, available: "mvp" },
  lifesteal: { id: "lifesteal", icon: "lifesteal", hasValue: true, order: 3, available: "mvp" },
  rush: { id: "rush", icon: "rush", hasValue: false, order: 4, available: "mvp" },
  charge: { id: "charge", icon: "charge", hasValue: false, order: 5, available: "mvp" },
  doubleStrike: { id: "doubleStrike", icon: "doubleStrike", hasValue: false, order: 6, available: "mvp" },
  berserk: { id: "berserk", icon: "berserk", hasValue: true, order: 7, available: "mvp" },
  thorns: { id: "thorns", icon: "thorns", hasValue: true, order: 8, available: "mvp" },
  cleave: { id: "cleave", icon: "cleave", hasValue: false, order: 9, available: "mvp" },
  regeneration: { id: "regeneration", icon: "regeneration", hasValue: true, order: 10, available: "mvp" },
  reborn: { id: "reborn", icon: "reborn", hasValue: false, order: 11, available: "mvp" },
  poison: { id: "poison", icon: "poison", hasValue: false, order: 12, available: "v1" },
  stealth: { id: "stealth", icon: "stealth", hasValue: false, order: 13, available: "v1" },
  divineShield: { id: "divineShield", icon: "divineShield", hasValue: false, order: 14, available: "v1" },
  flying: { id: "flying", icon: "flying", hasValue: false, order: 15, available: "v1" },
};

export const KEYWORD_IDS = Object.keys(KEYWORDS) as KeywordId[];
