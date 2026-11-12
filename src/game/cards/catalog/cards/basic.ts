// Básica cards (§20.2): always owned, never in packs.
import type { CardDef } from "../types";
import { core } from "./core";

export const BASIC_DEFS: readonly CardDef[] = [
  {
    ...core("squire"), type: "mob", cost: 1, rarity: "basic", collectible: true,
    attack: 1, health: 2, tribes: ["human"], keywords: {}, abilities: [],
  },
  {
    ...core("wolf-pup"), type: "mob", cost: 1, rarity: "basic", collectible: true,
    attack: 1, health: 1, tribes: ["beast"], keywords: { rush: true }, abilities: [],
  },
  {
    ...core("arcane-spark"), type: "spell", cost: 1, rarity: "basic", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "allCharacters" },
      effects: [{ type: "damage", amount: 2, to: { kind: "chosen" } }],
    }],
  },
  {
    ...core("healing-touch"), type: "spell", cost: 1, rarity: "basic", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "friendlyCharacters" },
      effects: [{ type: "heal", amount: 4, to: { kind: "chosen" } }],
    }],
  },
  {
    ...core("shield-bearer"), type: "mob", cost: 2, rarity: "basic", collectible: true,
    attack: 1, health: 3, tribes: ["human"], keywords: { taunt: true }, abilities: [],
  },
  {
    ...core("forest-boar"), type: "mob", cost: 2, rarity: "basic", collectible: true,
    attack: 3, health: 2, tribes: ["beast"], keywords: {}, abilities: [],
  },
  {
    ...core("iron-guard"), type: "mob", cost: 3, rarity: "basic", collectible: true,
    attack: 2, health: 4, tribes: ["human"], keywords: { shield: 1 }, abilities: [],
  },
  {
    ...core("stone-golem"), type: "mob", cost: 4, rarity: "basic", collectible: true,
    attack: 3, health: 5, tribes: ["construct"], keywords: { taunt: true }, abilities: [],
  },
];
