// Wallet, ledger and match-reward shapes as the client sees them (Phase 16, §16). Pure; shared by server and client.

/** Why a player got what they got from a finished match (`cards_match_rewards.reason`, computed in SQL). */
export type RewardReason = "win" | "win_first" | "loss" | "draw" | "too_short" | "abandon" | "opponent_limit" | "daily_cap";

export const REWARD_REASONS: readonly RewardReason[] = ["win", "win_first", "loss", "draw", "too_short", "abandon", "opponent_limit", "daily_cap"];

/** One player's reward for one match (`MatchView.rewards`). `amount` is 0 when an anti-farm rule applied. */
export interface MatchReward {
  amount: number;
  reason: RewardReason;
}

export function isRewardReason(v: unknown): v is RewardReason {
  return typeof v === "string" && (REWARD_REASONS as readonly string[]).includes(v);
}

/** `cards_currency_transactions.kind`. */
export type TransactionKind = "starter_grant" | "match_reward" | "pack_purchase" | "admin_adjustment";

/** One ledger row, newest first in `WalletResponse.transactions`. */
export interface CurrencyTransaction {
  id: number;
  amount: number; // + credit, − debit
  balanceAfter: number;
  kind: TransactionKind;
  createdAt: string; // ISO
}

/** How many ledger rows `GET /api/cards/wallet` returns. */
export const WALLET_TRANSACTIONS_LIMIT = 20;

/** `GET /api/cards/wallet` response body (Phase 16). */
export interface WalletResponse {
  balance: number;
  transactions: CurrencyTransaction[];
}
