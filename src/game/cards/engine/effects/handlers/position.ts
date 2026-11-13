// Where effect summons go on `seat`'s board (§6.9), shared by `summon` and `resurrect`. "auto": right of the source
// if it is on that board; else the source's former index (death snapshot, same side only); else the right end.
// "end": always the right end. Returns null for "the right end at the time of each placement".
import { boardIndexOf } from "../../board";
import type { Ctx, Seat } from "../../types";
import type { AbilityContext } from "../context";

export function summonBase(ctx: Ctx, a: AbilityContext, seat: Seat, position: "auto" | "end" | undefined): number | null {
  if (position === "end") return null;
  const at = boardIndexOf(ctx.s, a.sourceId);
  if (at && at.seat === seat) return at.index + 1;
  if (a.sourceIndex !== undefined && seat === a.controller) return Math.min(a.sourceIndex, ctx.s.players[seat].board.length);
  return null;
}
