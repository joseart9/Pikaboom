// Phase 16: what the game-over screen says for every reward reason.
import { describe, expect, it } from "vitest";
import { REWARD_REASONS } from "../collection/wallet";
import { rewardSummary } from "./rewards";

describe("rewardSummary", () => {
  it("first win of the day: total + the bonus line", () => {
    expect(rewardSummary({ amount: 100, reason: "win_first" })).toEqual({ headline: "+100 Oro", notes: ["Primera victoria del día +50"] });
  });

  it("plain win, loss and draw: just the amount", () => {
    expect(rewardSummary({ amount: 50, reason: "win" })).toEqual({ headline: "+50 Oro", notes: [] });
    expect(rewardSummary({ amount: 20, reason: "loss" })).toEqual({ headline: "+20 Oro", notes: [] });
    expect(rewardSummary({ amount: 25, reason: "draw" })).toEqual({ headline: "+25 Oro", notes: [] });
  });

  it("an amount trimmed by the daily cap says so", () => {
    expect(rewardSummary({ amount: 10, reason: "win" })).toEqual({ headline: "+10 Oro", notes: ["Recompensa reducida por el límite diario."] });
    expect(rewardSummary({ amount: 70, reason: "win_first" })).toEqual({
      headline: "+70 Oro",
      notes: ["Primera victoria del día +20", "Recompensa reducida por el límite diario."],
    });
    expect(rewardSummary({ amount: 30, reason: "win_first" }).notes).toEqual(["Recompensa reducida por el límite diario."]);
  });

  it("zero rewards explain why (plan texts)", () => {
    expect(rewardSummary({ amount: 0, reason: "too_short" })).toEqual({ headline: null, notes: ["Partida demasiado corta: sin recompensa."] });
    expect(rewardSummary({ amount: 0, reason: "opponent_limit" }).notes).toEqual(["Ya ganaste suficientes recompensas contra este rival hoy."]);
    expect(rewardSummary({ amount: 0, reason: "daily_cap" }).notes).toEqual(["Alcanzaste el límite diario de recompensas."]);
    expect(rewardSummary({ amount: 0, reason: "abandon" }).notes).toEqual(["Sin recompensa por abandono."]);
    expect(rewardSummary({ amount: 0, reason: "loss" }).notes).toEqual(["Sin recompensa."]);
  });

  it("every reason produces text without raw keys", () => {
    for (const reason of REWARD_REASONS) {
      for (const amount of [0, 5, 100]) {
        const s = rewardSummary({ amount, reason });
        for (const line of [s.headline ?? "", ...s.notes]) expect(line).not.toMatch(/rewards\./);
      }
    }
  });
});
