// Economy configuration (§16.1). Used from Phase 16 on; defined now so all numbers live in one place.

export const ECONOMY = {
  currencyId: "gold", // Spanish label: "Oro"
  startingBalance: 300,
  rewards: {
    win: 50,
    loss: 20,
    draw: 25,
    firstWinOfDayBonus: 50, // UTC day
    minTotalTurns: 8, // match shorter than this ⇒ 0 for both
    dailyCap: 400, // max match-reward Oro per user per UTC day (bonus included)
    perOpponentDailyLimit: 5, // max rewarded matches vs the same opponent per UTC day
    abandonLoserGetsNothing: true,
  },
  packs: {
    arcane: {
      price: 100,
      size: 5,
      // per-slot weights out of 10000 for slots 1..4
      weights: { common: 6900, rare: 2300, magic: 550, legendary: 220, unique: 30 },
      // slot 5 is guaranteed Rara or better
      guaranteed: { rare: 8200, magic: 1300, legendary: 420, unique: 80 },
    },
  },
} as const;

export type PackType = keyof typeof ECONOMY.packs;
