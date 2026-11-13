// Match rewards on the server (Phase 16, §6.12, §16.5). Every rule and amount is applied inside the SQL function
// `cards_grant_match_rewards` (single call, idempotent per match); this module only calls it and reads the result.
// The match service depends on the `RewardsPort` interface: Postgres in production, a no-op with the dev memory store.
import "server-only";
import { isRewardReason, type MatchReward } from "../collection/wallet";
import { ECONOMY } from "../config/economy";
import type { Queryable } from "./pgStore";

export interface RewardsPort {
  /**
   * Grants the rewards of a finished match to both players once. No-op for matches that are not `finished`, have no
   * guest, or were already granted. On success the match row gets `rewardsGrantedAt` and a version bump.
   */
  grantMatchRewards(matchId: string): Promise<void>;
  /** What `userId` got from `matchId`, or null when nothing was granted (yet). */
  getMatchReward(matchId: string, userId: string): Promise<MatchReward | null>;
}

/** Reward rules sent to SQL (`p_cfg`). Amounts come only from `ECONOMY.rewards` (§16.5). */
export type RewardConfig = { [K in keyof typeof ECONOMY.rewards]: (typeof ECONOMY.rewards)[K] extends boolean ? boolean : number };

export class PgRewards implements RewardsPort {
  constructor(
    private readonly db: Queryable,
    private readonly config: RewardConfig = ECONOMY.rewards,
  ) {}

  async grantMatchRewards(matchId: string): Promise<void> {
    await this.db.query(`select public.cards_grant_match_rewards($1::uuid, $2::jsonb)`, [matchId, JSON.stringify(this.config)]);
  }

  async getMatchReward(matchId: string, userId: string): Promise<MatchReward | null> {
    const { rows } = await this.db.query(`select amount, reason from public.cards_match_rewards where match_id = $1::uuid and user_id = $2::uuid`, [
      matchId,
      userId,
    ]);
    const row = rows[0] as { amount: number; reason: string } | undefined;
    if (!row || !isRewardReason(row.reason)) return null;
    return { amount: Number(row.amount), reason: row.reason };
  }
}

/** Dev memory store (no Postgres): matches are never rewarded. */
export const NO_REWARDS: RewardsPort = {
  async grantMatchRewards() {},
  async getMatchReward() {
    return null;
  },
};
