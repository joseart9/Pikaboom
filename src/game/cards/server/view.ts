// Per-seat redacted projection of a match (§10.3–§10.4, ADR-22). Pure and browser-safe: no `server-only`,
// no Node APIs (the Phase 10 dev sandbox runs it in the browser).
//
// Never included: `rng`, `defs`, `rules`, user ids, any deck contents/order/iids (own deck too), the opponent's
// hand contents/iids, and private events of the opponent beyond their redacted form.
import type { CardId } from "../catalog/types";
import type { MatchReward } from "../collection/wallet";
import { snapshotUnit } from "../engine/board";
import type { GameEvent, UnitSnapshot } from "../engine/events";
import { heroId } from "../engine/ids";
import { getLegalActions } from "../engine/legal";
import { effectiveCost } from "../engine/play";
import type { EndReason, EntityId, LegalActions, MatchState, Phase, Seat, Unit } from "../engine/types";
import type { DeckChoice } from "./commands";
import type { MatchRow, MatchStatus } from "./store";

export type { LegalActions } from "../engine/types";

/** A seat counts as online if it polled within this window (same constant as Batalla Naval, §6.11). */
export const ONLINE_MS = 9000;

export type HiddenEvent =
  | { type: "CARD_DRAWN" | "CARD_ADDED_TO_HAND"; seq: number; step: number; seat: Seat; hidden: true }
  | (Omit<Extract<GameEvent, { type: "MOB_RETURNED_TO_HAND" }>, "newIid"> & { newIid?: undefined })
  | (Omit<Extract<GameEvent, { type: "CARD_STOLEN" }>, "fromIid"> & { fromIid?: undefined });
export type ViewEvent = GameEvent | HiddenEvent;

export interface HandCardView {
  iid: EntityId;
  defId: CardId;
  cost: number;
}
export interface HeroView {
  id: "h0" | "h1";
  health: number;
  maxHealth: number;
}
export interface SideView {
  seat: Seat;
  name: string;
  hero: HeroView;
  mana: { current: number; max: number; temporary: number };
  board: UnitSnapshot[];
  deckCount: number;
  handCount: number;
  graveyardCount: number;
  fatigue: number;
  mulliganDone: boolean;
}
export interface MeView extends SideView {
  hand: HandCardView[];
}

export interface GameView {
  phase: Phase;
  turn: number;
  activeSeat: Seat;
  firstSeat: Seat;
  me: MeView;
  foe: SideView;
  events: ViewEvent[]; // redacted, seq > `since`
  lastSeq: number;
  eventsTruncated: boolean; // true when `since` is older than the ring buffer
  legal: LegalActions | null; // null when you cannot act
  winner: Seat | "draw" | null;
  endReason: EndReason | null;
}

export interface LobbySeatView {
  name: string;
  deckChosen: boolean;
  ready: boolean;
  online: boolean;
}
export interface LobbyView {
  code: string;
  host: LobbySeatView;
  guest: LobbySeatView | null;
  myDeck: DeckChoice | null;
  /** Phase 15 H: the match could not start because this seat's deck is no longer available. */
  lastError?: { seat: Seat; code: string };
}

export interface MatchView {
  matchId: string;
  version: number;
  status: MatchStatus;
  seat: Seat;
  serverNow: string; // ISO, for client clock offset
  turnDeadline: string | null; // ISO
  foeOnline: boolean;
  lobby: LobbyView | null;
  game: GameView | null;
  /** Your reward once a finished match has been granted (Phase 16); null before that and for every other status. */
  rewards: MatchReward | null;
}

/** Public description of a unit (same shape as in events). */
export function unitSnapshot(s: MatchState, unit: Unit): UnitSnapshot {
  return snapshotUnit(s, unit);
}

/** §10.3 redaction table. Events for the viewer's own seat, and public events, pass through unchanged. */
export function redactEvent(e: GameEvent, viewer: Seat): ViewEvent {
  switch (e.type) {
    case "CARD_DRAWN":
    case "CARD_ADDED_TO_HAND":
      if (e.seat === viewer) return e;
      return { type: e.type, seq: e.seq, step: e.step, seat: e.seat, hidden: true };
    case "MULLIGAN_DONE":
      if (e.seat === viewer) return e;
      return { type: e.type, seq: e.seq, step: e.step, seat: e.seat, replaced: [], drawn: [] };
    case "MOB_RETURNED_TO_HAND": {
      // `newIid: null` (burned, a public CARD_BURNED follows) hides nothing.
      if (e.seat === viewer || e.newIid === null) return e;
      return { type: e.type, seq: e.seq, step: e.step, iid: e.iid, seat: e.seat };
    }
    case "CARD_STOLEN": {
      // The card and its new iid are public; the iid it had in the victim's hand is the victim's business only.
      if (e.from === viewer) return e;
      return { type: e.type, seq: e.seq, step: e.step, from: e.from, to: e.to, iid: e.iid, defId: e.defId };
    }
    default:
      return e;
  }
}

function sideView(s: MatchState, seat: Seat): SideView {
  const p = s.players[seat];
  return {
    seat,
    name: p.name,
    hero: { id: heroId(seat), health: p.hero.health, maxHealth: p.hero.maxHealth },
    mana: { current: p.mana.current, max: p.mana.max, temporary: p.mana.temporary },
    board: p.board.map((u) => unitSnapshot(s, u)),
    deckCount: p.deck.length,
    handCount: p.hand.length,
    graveyardCount: p.graveyard.length,
    fatigue: p.fatigue,
    mulliganDone: p.mulliganDone,
  };
}

/** Whether `seat` may act right now (mulligan pending, or their turn while playing). */
function canAct(s: MatchState, seat: Seat): boolean {
  if (s.phase === "mulligan") return !s.players[seat].mulliganDone;
  return s.phase === "playing" && s.turn.activeSeat === seat;
}

/** The game part of a view: both sides, redacted events with `seq > since`, and legal actions. */
export function projectGame(s: MatchState, seat: Seat, since: number): GameView {
  const p = s.players[seat];
  const foeSeat: Seat = seat === 0 ? 1 : 0;
  const after = Number.isFinite(since) && since > 0 ? Math.floor(since) : 0;
  const oldest = s.log[0]?.seq ?? 0;
  return {
    phase: s.phase,
    turn: s.turn.number,
    activeSeat: s.turn.activeSeat,
    firstSeat: s.firstSeat,
    me: { ...sideView(s, seat), hand: p.hand.map((c) => ({ iid: c.iid, defId: c.defId, cost: effectiveCost(s, c) })) },
    foe: sideView(s, foeSeat),
    events: s.log.filter((e) => e.seq > after).map((e) => redactEvent(e, seat)),
    lastSeq: s.seq,
    eventsTruncated: after < oldest - 1,
    legal: canAct(s, seat) ? getLegalActions(s, seat) : null,
    winner: s.winner,
    endReason: s.endReason,
  };
}

function isOnline(seen: Date | null, now: Date): boolean {
  return seen !== null && now.getTime() - seen.getTime() <= ONLINE_MS;
}

export interface ViewOptions {
  since?: number;
  rewards?: MatchView["rewards"];
}

export function viewFor(row: MatchRow, seat: Seat, opts: ViewOptions = {}): MatchView {
  const seenFoe = seat === 0 ? row.seenGuest : row.seenHost;
  const foePresent = seat === 0 ? row.guestId !== null : true;
  let lobby: LobbyView | null = null;
  if (row.status === "lobby") {
    const seatView = (s: Seat): LobbySeatView => {
      const l = s === 0 ? row.lobby.host : row.lobby.guest;
      const seen = s === 0 ? row.seenHost : row.seenGuest;
      return {
        name: (s === 0 ? row.hostName : row.guestName) ?? "",
        deckChosen: l.deck !== null,
        ready: l.ready,
        online: s === seat || isOnline(seen, row.now),
      };
    };
    lobby = {
      code: row.code,
      host: seatView(0),
      guest: row.guestId !== null ? seatView(1) : null,
      myDeck: structuredClone((seat === 0 ? row.lobby.host : row.lobby.guest).deck),
      ...(row.lobby.lastError ? { lastError: { seat: row.lobby.lastError.seat, code: row.lobby.lastError.code } } : {}),
    };
  }
  let game: GameView | null = null;
  if (row.state) {
    game = projectGame(row.state, seat, opts.since ?? 0);
    if (row.status !== "active") game.legal = null; // abandoned/finished: nobody acts
  }
  return {
    matchId: row.id,
    version: row.version,
    status: row.status,
    seat,
    serverNow: row.now.toISOString(),
    turnDeadline: row.turnDeadline ? row.turnDeadline.toISOString() : null,
    foeOnline: foePresent && isOnline(seenFoe, row.now),
    lobby,
    game,
    rewards: opts.rewards ?? null,
  };
}
