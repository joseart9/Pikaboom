// Undead mobs (§20.2).
import type { CardDef } from "../types";
import { core } from "./core";

export const UNDEAD_DEFS: readonly CardDef[] = [
  // ── Normal ──
  {
    ...core("restless-skeleton"), type: "mob", cost: 2, rarity: "common", collectible: true,
    attack: 2, health: 1, tribes: ["undead"], keywords: {},
    abilities: [{ id: "deathrattle", trigger: { on: "death" }, effects: [{ type: "summon", card: "skeleton", count: 1 }] }],
  },
  {
    ...core("vampire-bat"), type: "mob", cost: 2, rarity: "common", collectible: true,
    attack: 2, health: 2, tribes: ["undead"], keywords: { lifesteal: 2 }, abilities: [],
  },
  // ── Rara ──
  {
    ...core("bone-wall"), type: "mob", cost: 3, rarity: "rare", collectible: true,
    attack: 1, health: 4, tribes: ["undead"], keywords: { taunt: true, shield: 2 }, abilities: [],
  },
  {
    ...core("hungry-ghoul"), type: "mob", cost: 3, rarity: "rare", collectible: true,
    attack: 3, health: 2, tribes: ["undead"], keywords: { rush: true },
    abilities: [{
      id: "onKill", trigger: { on: "kill" },
      effects: [{ type: "buff", to: { kind: "self" }, attack: 1, health: 1 }],
    }],
  },
  // ── Mágica ──
  {
    ...core("crypt-banshee"), type: "mob", cost: 4, rarity: "magic", collectible: true,
    attack: 3, health: 3, tribes: ["undead"], keywords: {},
    abilities: [{
      id: "onUndeadDied", trigger: { on: "otherDied", side: "friendly", filter: { tribe: "undead" } },
      effects: [{ type: "buff", to: { kind: "self" }, attack: 1, health: 1 }],
    }],
  },
  // ── Legendaria ──
  {
    ...core("morvath"), type: "mob", cost: 8, rarity: "legendary", collectible: true,
    attack: 6, health: 6, tribes: ["undead"], keywords: {},
    abilities: [{
      id: "battlecry", trigger: { on: "play" },
      effects: [{ type: "destroy", to: { kind: "all", group: "allMobs", excludeSelf: true } }],
    }],
  },
  {
    ...core("skeleton-king"), type: "mob", cost: 6, rarity: "legendary", collectible: true,
    attack: 4, health: 5, tribes: ["undead"], keywords: {},
    abilities: [{
      id: "battlecry", trigger: { on: "play" },
      effects: [{ type: "summon", card: "skeleton", count: 4, overflow: true }],
    }],
  },
];
