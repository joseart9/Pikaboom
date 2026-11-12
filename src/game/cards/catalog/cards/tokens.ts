// Tokens (§20.2): `collectible: false`, rarity `basic`. Created by effects / the second player's bonus card.
import type { CardDef } from "../types";
import { core } from "./core";

export const TOKEN_DEFS: readonly CardDef[] = [
  {
    ...core("skeleton"), type: "mob", cost: 1, rarity: "basic", collectible: false,
    attack: 1, health: 1, tribes: ["undead"], keywords: {}, abilities: [],
  },
  {
    ...core("wolf"), type: "mob", cost: 2, rarity: "basic", collectible: false,
    attack: 2, health: 2, tribes: ["beast"], keywords: {}, abilities: [],
  },
  {
    ...core("bear-cub"), type: "mob", cost: 2, rarity: "basic", collectible: false,
    attack: 2, health: 2, tribes: ["beast"], keywords: { rush: true }, abilities: [],
  },
  {
    ...core("mana-spark"), type: "spell", cost: 0, rarity: "basic", collectible: false,
    abilities: [{ id: "cast", trigger: { on: "play" }, effects: [{ type: "gainMana", amount: 1, kind: "temporary" }] }],
  },
];
