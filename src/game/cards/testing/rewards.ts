// Phase 16 test double for the rewards port over the memory match store. It pays flat amounts (the real anti-farm
// rules live in SQL and are tested in server/rewards.db.test.ts); what it reproduces faithfully is the contract the
// match service relies on: only finished matches with a guest, once per match, `rewardsGrantedAt` + a version bump.
import type { MatchReward } from "../collection/wallet";
import { ECONOMY } from "../config/economy";
import type { MemoryMatchStore } from "../server/memoryStore";
import type { RewardsPort } from "../server/rewards";

export class FakeRewards implements RewardsPort {
  /** Every `grantMatchRewards` call, in order (including failed ones). */
  readonly calls: string[] = [];
  /** The next N grant calls throw (a DB hiccup). */
  failNext = 0;
  private readonly granted = new Map<string, Map<string, MatchReward>>();

  constructor(private readonly store: MemoryMatchStore) {}

  async grantMatchRewards(matchId: string): Promise<void> {
    this.calls.push(matchId);
    if (this.failNext > 0) {
      this.failNext -= 1;
      throw new Error("simulated DB hiccup");
    }
    const row = await this.store.load(matchId);
    if (!row || row.status !== "finished" || row.rewardsGrantedAt || !row.guestId) return;
    if (!(await this.store.markRewardsGranted(matchId))) return;
    const r = ECONOMY.rewards;
    const out = new Map<string, MatchReward>();
    for (const user of [row.hostId, row.guestId]) {
      if (row.result === "draw") out.set(user, { amount: r.draw, reason: "draw" });
      else if (row.winnerId === user) out.set(user, { amount: r.win, reason: "win" });
      else out.set(user, { amount: r.loss, reason: "loss" });
    }
    this.granted.set(matchId, out);
  }

  async getMatchReward(matchId: string, userId: string): Promise<MatchReward | null> {
    const reward = this.granted.get(matchId)?.get(userId);
    return reward ? { ...reward } : null;
  }
}
