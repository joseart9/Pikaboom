// Rules configuration (§9.8). Every gameplay number comes from here — never hardcode them elsewhere.
import type { CardId } from "../catalog/types";

export interface HeroRules {
  startingHealth: number;
  maxHealth: number;
}

export interface ManaRules {
  startingMax: number;
  gainPerTurn: number;
  cap: number;
}

export interface RulesConfig {
  id: "standard";
  hero: HeroRules;
  mana: ManaRules;
  hand: { max: number; firstPlayerStart: number; secondPlayerStart: number; secondPlayerBonusCard: CardId | null };
  draw: { perTurn: number; fatigueStart: number; fatigueIncrement: number };
  board: { normalLimit: number; hardLimit: number };
  turn: { seconds: number; warningSeconds: number; mulliganSeconds: number; maxTurns: number; timeoutsToForfeit: number };
  chain: { maxDepth: number; maxResolutionsPerCommand: number };
}

export const STANDARD_RULES: RulesConfig = {
  id: "standard",
  hero: { startingHealth: 30, maxHealth: 30 },
  mana: { startingMax: 0, gainPerTurn: 1, cap: 10 },
  hand: { max: 10, firstPlayerStart: 3, secondPlayerStart: 4, secondPlayerBonusCard: "mana-spark" },
  draw: { perTurn: 1, fatigueStart: 1, fatigueIncrement: 1 },
  board: { normalLimit: 6, hardLimit: 10 },
  turn: { seconds: 75, warningSeconds: 15, mulliganSeconds: 30, maxTurns: 80, timeoutsToForfeit: 3 },
  chain: { maxDepth: 32, maxResolutionsPerCommand: 500 },
};

// Future classes: per-player overrides merged at createMatch (not used in V1)
export interface PlayerSetup {
  userId: string;
  name: string;
  /** 30 ids, order irrelevant (shuffled). */
  deck: CardId[];
  heroOverrides?: Partial<HeroRules>;
  manaOverrides?: Partial<ManaRules>;
}
