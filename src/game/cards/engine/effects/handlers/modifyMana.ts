// `modifyMana` (Phase 19 F): adds the `max` and `current` deltas to the side's mana, each clamped to 0..cap; a `max`
// reduction also clamps `current ≤ max`. Temporary mana is untouched. MANA_CHANGED only when something moved.
import { emit } from "../../ctx";
import type { EffectHandler } from "../execute";
import { seatFor } from "./side";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const modifyMana: EffectHandler<"modifyMana"> = (ctx, e, a) => {
  const seat = seatFor(a, e.side);
  const m = ctx.s.players[seat].mana;
  const [current, max] = [m.current, m.max];
  const dMax = e.max ?? 0;
  m.max = clamp(m.max + dMax, 0, m.cap);
  m.current = clamp(m.current + (e.current ?? 0), 0, m.cap);
  if (dMax < 0) m.current = Math.min(m.current, m.max);
  if (m.current === current && m.max === max) return;
  emit(ctx, { type: "MANA_CHANGED", seat, current: m.current, max: m.max, temporary: m.temporary });
};
