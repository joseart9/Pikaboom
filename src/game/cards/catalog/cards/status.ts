// The first status cards (Phase 18 F): Quemadura, Congelado, Sangrado, Maldición, Debilidad, Bendición,
// Vulnerabilidad, Desarmado, Aturdido, Inmune and Silencio.
import type { CardDef } from "../types";
import { core } from "./core";

export const STATUS_CARD_DEFS: readonly CardDef[] = [
  // ── Normal ──
  {
    ...core("ember-imp"), type: "mob", cost: 1, rarity: "common", collectible: true,
    attack: 1, health: 2, tribes: ["demon"], keywords: {},
    abilities: [{
      id: "battlecry", trigger: { on: "play" }, target: { group: "enemyMobs" },
      effects: [{ type: "applyStatus", to: { kind: "chosen" }, status: "burn", magnitude: 1, duration: 2 }],
    }],
  },
  {
    ...core("ice-shard"), type: "spell", cost: 1, rarity: "common", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "enemyMobs" },
      effects: [
        { type: "damage", amount: 1, to: { kind: "chosen" } },
        { type: "applyStatus", to: { kind: "chosen" }, status: "freeze", duration: 1 },
      ],
    }],
  },
  {
    ...core("blessing-of-light"), type: "spell", cost: 2, rarity: "common", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "friendlyMobs" },
      effects: [{ type: "applyStatus", to: { kind: "chosen" }, status: "blessing", magnitude: 2, duration: 2 }],
    }],
  },
  {
    ...core("purify"), type: "spell", cost: 1, rarity: "common", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "friendlyMobs" },
      effects: [
        { type: "removeStatus", to: { kind: "chosen" }, status: "allNegative" },
        { type: "heal", amount: 2, to: { kind: "chosen" } },
      ],
    }],
  },
  {
    ...core("shatter-armor"), type: "spell", cost: 2, rarity: "common", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "enemyMobs" },
      effects: [{ type: "applyStatus", to: { kind: "chosen" }, status: "vulnerability", magnitude: 2, duration: 2 }],
    }],
  },
  {
    ...core("disarming-strike"), type: "spell", cost: 2, rarity: "common", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "enemyMobs" },
      effects: [
        { type: "damage", amount: 1, to: { kind: "chosen" } },
        { type: "applyStatus", to: { kind: "chosen" }, status: "disarm", duration: 1 },
      ],
    }],
  },
  // ── Rara ──
  {
    ...core("flame-wyrm"), type: "mob", cost: 4, rarity: "rare", collectible: true,
    attack: 3, health: 4, tribes: ["dragon"], keywords: {},
    abilities: [{
      id: "battlecry", trigger: { on: "play" },
      effects: [{ type: "applyStatus", to: { kind: "random", group: "enemyMobs", count: 1 }, status: "burn", magnitude: 2, duration: 2 }],
    }],
  },
  {
    ...core("blood-hound"), type: "mob", cost: 3, rarity: "rare", collectible: true,
    attack: 3, health: 3, tribes: ["beast"], keywords: {},
    abilities: [{
      id: "rend", trigger: { on: "damageDealt", combatOnly: true },
      conditions: [{ kind: "isEnemy", subject: "eventTarget" }],
      effects: [{ type: "applyStatus", to: { kind: "eventTarget" }, status: "bleed", magnitude: 1, duration: 2 }],
    }],
  },
  {
    ...core("silence-monk"), type: "mob", cost: 3, rarity: "rare", collectible: true,
    attack: 3, health: 2, tribes: ["human"], keywords: {},
    abilities: [{
      id: "battlecry", trigger: { on: "play" }, target: { group: "allMobs" },
      effects: [{ type: "silence", to: { kind: "chosen" } }],
    }],
  },
  {
    ...core("stone-sleep"), type: "spell", cost: 3, rarity: "rare", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "enemyMobs" },
      effects: [{ type: "applyStatus", to: { kind: "chosen" }, status: "stun", duration: 1 }],
    }],
  },
  {
    ...core("aegis-ward"), type: "spell", cost: 2, rarity: "rare", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "friendlyMobs" },
      effects: [{ type: "applyStatus", to: { kind: "chosen" }, status: "immune", duration: 1 }],
    }],
  },
  // ── Mágica ──
  {
    ...core("frozen-gale"), type: "spell", cost: 5, rarity: "magic", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" },
      effects: [
        { type: "damage", amount: 1, to: { kind: "all", group: "enemyMobs" } },
        { type: "applyStatus", to: { kind: "all", group: "enemyMobs" }, status: "freeze", duration: 1 },
      ],
    }],
  },
  {
    ...core("curse-weaver"), type: "mob", cost: 4, rarity: "magic", collectible: true,
    attack: 3, health: 4, tribes: ["demon"], keywords: {},
    abilities: [{
      id: "battlecry", trigger: { on: "play" }, target: { group: "enemyMobs" },
      effects: [
        { type: "applyStatus", to: { kind: "chosen" }, status: "curse" },
        { type: "applyStatus", to: { kind: "chosen" }, status: "weakness", magnitude: 2, duration: 2 },
      ],
    }],
  },
];
