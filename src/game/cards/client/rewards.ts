// What the game-over screen says about a match reward (Phase 16, §6.12). Pure: the amounts were decided in SQL; this
// only explains them (headline "+100 Oro", the first-win bonus, the daily-cap trim, or why nothing was paid).
import type { MatchReward } from "../collection/wallet";
import { ECONOMY } from "../config/economy";
import { t } from "../i18n";

export interface RewardSummary {
  /** "+{amount} Oro" when something was paid, otherwise null. */
  headline: string | null;
  /** Secondary lines, in display order. */
  notes: string[];
}

type RewardRules = { win: number; loss: number; draw: number; firstWinOfDayBonus: number };

export function rewardSummary(reward: MatchReward, rules: RewardRules = ECONOMY.rewards): RewardSummary {
  if (reward.amount <= 0) {
    switch (reward.reason) {
      case "too_short":
      case "opponent_limit":
      case "daily_cap":
      case "abandon":
        return { headline: null, notes: [t(`rewards.${reward.reason}`)] };
      default:
        return { headline: null, notes: [t("rewards.none")] };
    }
  }
  const notes: string[] = [];
  if (reward.reason === "win_first") {
    const bonus = Math.min(rules.firstWinOfDayBonus, Math.max(0, reward.amount - rules.win));
    if (bonus > 0) notes.push(t("rewards.firstWinBonus", { amount: bonus }));
  }
  const full: Partial<Record<MatchReward["reason"], number>> = {
    win: rules.win,
    win_first: rules.win + rules.firstWinOfDayBonus,
    loss: rules.loss,
    draw: rules.draw,
  };
  const expected = full[reward.reason];
  if (expected !== undefined && reward.amount < expected) notes.push(t("rewards.capped"));
  return { headline: t("rewards.amount", { amount: reward.amount }), notes };
}
