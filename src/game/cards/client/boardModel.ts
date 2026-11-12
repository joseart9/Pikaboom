// What the battlefield components render (§17.6): a projection of `MatchView.game`. Phase 13 turns it into a
// presentation model that lags behind the view while events animate; until then it is the view, minus events.
import type { EndReason, LegalActions, Phase, Seat } from "../engine/types";
import type { MatchStatus } from "../server/store";
import type { MatchView, MeView, SideView } from "../server/view";

export interface BoardModel {
  phase: Phase;
  turn: number;
  mySeat: Seat;
  activeSeat: Seat;
  firstSeat: Seat;
  isMyTurn: boolean;
  me: MeView;
  foe: SideView;
  /** null when you cannot act (foe's turn, finished, or mulligan already sent). */
  legal: LegalActions | null;
  winner: Seat | "draw" | null;
  endReason: EndReason | null;
}

export function toBoardModel(view: MatchView | null): BoardModel | null {
  const g = view?.game;
  if (!view || !g) return null;
  return {
    phase: g.phase,
    turn: g.turn,
    mySeat: view.seat,
    activeSeat: g.activeSeat,
    firstSeat: g.firstSeat,
    isMyTurn: g.phase === "playing" && g.activeSeat === view.seat,
    me: g.me,
    foe: g.foe,
    legal: g.legal,
    winner: g.winner,
    endReason: g.endReason,
  };
}

/** True when it is your turn and nothing but "end turn" is left (the end-turn button pulses, §17.3). */
export function onlyEndTurnLeft(legal: LegalActions | null): boolean {
  if (!legal?.endTurn) return false;
  return Object.keys(legal.play).length === 0 && Object.keys(legal.attacks).length === 0;
}

export type GameOutcome = "victory" | "defeat" | "draw" | "abandoned";
export type EndReasonKey = EndReason | "stale";

/**
 * What the game-over overlay shows (Phase 11 G.9), or null while the match goes on. `abandoned` = the match went
 * stale (§6.11): no winner, no engine end reason.
 */
export function gameOutcome(
  status: MatchStatus,
  winner: Seat | "draw" | null,
  mySeat: Seat,
  endReason: EndReason | null,
): { outcome: GameOutcome; reason: EndReasonKey | null } | null {
  if (status === "abandoned") return { outcome: "abandoned", reason: "stale" };
  if (status !== "finished" || winner === null) return null;
  const outcome: GameOutcome = winner === "draw" ? "draw" : winner === mySeat ? "victory" : "defeat";
  return { outcome, reason: endReason };
}
