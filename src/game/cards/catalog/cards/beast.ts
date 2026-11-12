// Beast mobs (§20.2). Básica beasts live in basic.ts; beast-themed spells in neutral.ts.
import type { CardDef } from "../types";
import { core } from "./core";

export const BEAST_DEFS: readonly CardDef[] = [
  // ── Normal ──
  {
    ...core("berserker-bear"), type: "mob", cost: 4, rarity: "common", collectible: true,
    attack: 3, health: 5, tribes: ["beast"], keywords: { berserk: { percent: 50, attack: 3 } }, abilities: [],
  },
  {
    ...core("charging-rhino"), type: "mob", cost: 4, rarity: "common", collectible: true,
    attack: 4, health: 2, tribes: ["beast"], keywords: { charge: true }, abilities: [],
  },
  // ── Rara ──
  {
    ...core("thornback-tortoise"), type: "mob", cost: 3, rarity: "rare", collectible: true,
    attack: 1, health: 5, tribes: ["beast"], keywords: { taunt: true, thorns: 2 }, abilities: [],
  },
  {
    ...core("alpha-wolf"), type: "mob", cost: 3, rarity: "rare", collectible: true,
    attack: 2, health: 3, tribes: ["beast"], keywords: {},
    abilities: [{
      id: "packLeader", trigger: { on: "otherSummoned", side: "friendly", filter: { tribe: "beast" } },
      effects: [{ type: "buff", to: { kind: "eventTarget" }, attack: 1 }],
    }],
  },
  {
    ...core("twin-claw-panther"), type: "mob", cost: 4, rarity: "rare", collectible: true,
    attack: 3, health: 3, tribes: ["beast"], keywords: { doubleStrike: true }, abilities: [],
  },
  {
    ...core("line-breaker"), type: "mob", cost: 5, rarity: "rare", collectible: true,
    attack: 4, health: 4, tribes: ["beast"], keywords: { cleave: true }, abilities: [],
  },
  // ── Legendaria ──
  {
    ...core("ursaria"), type: "mob", cost: 7, rarity: "legendary", collectible: true,
    attack: 5, health: 7, tribes: ["beast"], keywords: { taunt: true },
    abilities: [{ id: "battlecry", trigger: { on: "play" }, effects: [{ type: "summon", card: "bear-cub", count: 2 }] }],
  },
];
