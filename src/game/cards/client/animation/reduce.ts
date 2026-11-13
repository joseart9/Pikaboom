// Presentation reducer (§18.2, Phase 13 G.1): patches the rendered BoardModel one event at a time while events
// animate. Events carry post-state values (`healthAfter`, `unit` snapshots, mana totals), so no rule logic lives
// here. Anything this misses is fixed by the reconcile step (`toBoardModel(latestView)`) when the queue empties.
import { CATALOG } from "../../catalog";
import type { UnitSnapshot } from "../../engine/events";
import type { EntityId, Seat } from "../../engine/types";
import type { HandCardView, MeView, SideView, ViewEvent } from "../../server/view";
import type { BoardModel } from "../boardModel";

type Side = "me" | "foe";

function sideOf(model: BoardModel, seat: Seat): Side {
  return seat === model.mySeat ? "me" : "foe";
}

function withSide(model: BoardModel, side: Side, patch: (s: SideView) => Partial<MeView>): BoardModel {
  if (side === "me") return { ...model, me: { ...model.me, ...patch(model.me) } };
  return { ...model, foe: { ...model.foe, ...patch(model.foe) } };
}

/** The side whose board holds `iid`, or null. */
function boardSideOf(model: BoardModel, iid: EntityId): Side | null {
  if (model.me.board.some((u) => u.iid === iid)) return "me";
  if (model.foe.board.some((u) => u.iid === iid)) return "foe";
  return null;
}

function patchUnit(model: BoardModel, iid: EntityId, patch: (u: UnitSnapshot) => UnitSnapshot): BoardModel {
  const side = boardSideOf(model, iid);
  if (!side) return model;
  return withSide(model, side, (s) => ({ board: s.board.map((u) => (u.iid === iid ? patch(u) : u)) }));
}

/** `h0`/`h1` → the hero's side. */
function heroSide(model: BoardModel, id: EntityId): Side | null {
  if (id === model.me.hero.id) return "me";
  if (id === model.foe.hero.id) return "foe";
  return null;
}

function setHealth(model: BoardModel, target: EntityId, health: number): BoardModel {
  const hero = heroSide(model, target);
  if (hero) return withSide(model, hero, (s) => ({ hero: { ...s.hero, health } }));
  return patchUnit(model, target, (u) => ({ ...u, health }));
}

function addToHand(model: BoardModel, seat: Seat, card: HandCardView | null, fromDeck: boolean): BoardModel {
  return withSide(model, sideOf(model, seat), (s) => {
    const patch: Partial<MeView> = { handCount: s.handCount + 1 };
    if (fromDeck) patch.deckCount = Math.max(0, s.deckCount - 1);
    if (card && s === model.me) patch.hand = [...model.me.hand, card];
    return patch;
  });
}

function handCard(iid: EntityId, defId: string): HandCardView {
  return { iid, defId, cost: CATALOG[defId]?.cost ?? 0 };
}

/**
 * Applies one (redacted) event to the presentation model. Pure: returns `model` itself when nothing changes.
 * Covered: MOB_SUMMONED, MOB_DESTROYED, DAMAGE, HEAL, STATS_CHANGED, KEYWORDS_CHANGED, STATUS_APPLIED, STATUS_REMOVED,
 * MOB_SILENCED, MOB_TRANSFORMED, MOB_RETURNED_TO_HAND, CONTROL_CHANGED, CARD_STOLEN, CARD_PLAYED, CARD_DRAWN,
 * CARD_ADDED_TO_HAND, MULLIGAN_DONE, CARD_BURNED, MANA_CHANGED, TURN_STARTED, GAME_OVER. Everything else: no-op. (STATUS_APPLIED carries no expiry: a new status shows `null` until the
 * reconcile step; the numbers it changes arrive in the STATS_CHANGED that follows.)
 */
export function presentationReducer(model: BoardModel, e: ViewEvent): BoardModel {
  switch (e.type) {
    case "MOB_SUMMONED": {
      if (boardSideOf(model, e.unit.iid)) return model;
      return withSide(model, sideOf(model, e.seat), (s) => {
        const board = [...s.board];
        board.splice(Math.max(0, Math.min(e.index, board.length)), 0, e.unit);
        return { board };
      });
    }
    case "MOB_DESTROYED": {
      const side = boardSideOf(model, e.iid);
      if (!side) return model;
      return withSide(model, side, (s) => ({ board: s.board.filter((u) => u.iid !== e.iid), graveyardCount: s.graveyardCount + 1 }));
    }
    case "DAMAGE":
    case "HEAL":
      return setHealth(model, e.target, e.healthAfter);
    case "STATS_CHANGED":
      return patchUnit(model, e.iid, (u) => ({ ...u, attack: e.attack, health: e.health, maxHealth: e.maxHealth }));
    case "KEYWORDS_CHANGED":
      return patchUnit(model, e.iid, (u) => ({ ...u, keywords: e.keywords, shieldCharges: e.shieldCharges }));
    case "STATUS_APPLIED":
      return patchUnit(model, e.iid, (u) => {
        const existing = u.statuses.find((st) => st.id === e.status);
        const statuses = existing
          ? u.statuses.map((st) => (st.id === e.status ? { ...st, magnitude: e.magnitude } : st))
          : [...u.statuses, { id: e.status, magnitude: e.magnitude, expiresAfterTurn: null }];
        return { ...u, statuses };
      });
    case "STATUS_REMOVED":
      return patchUnit(model, e.iid, (u) => ({ ...u, statuses: u.statuses.filter((st) => st.id !== e.status) }));
    case "MOB_SILENCED":
      return patchUnit(model, e.iid, (u) => ({ ...u, silenced: true, keywords: {}, shieldCharges: 0, statuses: [] }));
    case "MOB_TRANSFORMED": {
      // Same slot, new iid and stats.
      const side = boardSideOf(model, e.iid);
      if (!side) return model;
      return withSide(model, side, (s) => ({ board: s.board.map((u) => (u.iid === e.iid ? e.unit : u)) }));
    }
    case "MOB_RETURNED_TO_HAND": {
      const side = boardSideOf(model, e.iid);
      const unit = side ? model[side].board.find((u) => u.iid === e.iid) : undefined;
      const removed = side ? withSide(model, side, (s) => ({ board: s.board.filter((u) => u.iid !== e.iid) })) : model;
      if (e.newIid === null) return removed; // burned: a CARD_BURNED follows
      return addToHand(removed, e.seat, e.newIid && unit ? handCard(e.newIid, unit.defId) : null, false);
    }
    case "CONTROL_CHANGED": {
      const fromSide = boardSideOf(model, e.iid);
      const unit = fromSide ? model[fromSide].board.find((u) => u.iid === e.iid) : undefined;
      if (!fromSide || !unit) return model;
      // It counts as summoned this turn on its new side: sleeping unless Carga/Embestida.
      const moved = { ...unit, controller: e.to, sleeping: !unit.keywords.charge && !unit.keywords.rush };
      const removed = withSide(model, fromSide, (s) => ({ board: s.board.filter((u) => u.iid !== e.iid) }));
      return withSide(removed, sideOf(model, e.to), (s) => {
        const board = [...s.board];
        board.splice(Math.max(0, Math.min(e.index, board.length)), 0, moved);
        return { board };
      });
    }
    case "CARD_STOLEN": {
      const lost = withSide(model, sideOf(model, e.from), (s) => {
        const patch: Partial<MeView> = { handCount: Math.max(0, s.handCount - 1) };
        if (s === model.me && e.fromIid) patch.hand = model.me.hand.filter((c) => c.iid !== e.fromIid);
        return patch;
      });
      return e.iid === null ? lost : addToHand(lost, e.to, handCard(e.iid, e.defId), false);
    }
    case "CARD_PLAYED":
      return withSide(model, sideOf(model, e.seat), (s) => {
        const patch: Partial<MeView> = { handCount: Math.max(0, s.handCount - 1) };
        if (s === model.me) patch.hand = model.me.hand.filter((c) => c.iid !== e.iid);
        return patch;
      });
    case "CARD_DRAWN":
      return addToHand(model, e.seat, "hidden" in e ? null : handCard(e.iid, e.defId), true);
    case "CARD_ADDED_TO_HAND":
      return addToHand(model, e.seat, "hidden" in e ? null : handCard(e.iid, e.defId), false);
    case "CARD_BURNED":
      // Burned on a draw (deck − 1) or when an effect adds a card to a full hand (deck unchanged): the event does
      // not say which, so the deck counter waits for the reconcile step.
      return model;
    case "MULLIGAN_DONE": {
      if (e.seat !== model.mySeat || e.replaced.length === 0) {
        return withSide(model, sideOf(model, e.seat), () => ({ mulliganDone: true }));
      }
      // Same order as the engine: kept cards, then the new ones (fewer if the deck ran out).
      const hand = [...model.me.hand.filter((c) => !e.replaced.includes(c.iid)), ...e.drawn.map((d) => handCard(d.iid, d.defId))];
      return withSide(model, "me", () => ({ hand, handCount: hand.length, mulliganDone: true }));
    }
    case "MANA_CHANGED":
      return withSide(model, sideOf(model, e.seat), () => ({ mana: { current: e.current, max: e.max, temporary: e.temporary } }));
    case "TURN_STARTED": {
      // Every unit on the board entered before this turn, so none is summoning sick any more.
      const wake = (s: SideView) => (s.board.some((u) => u.sleeping) ? { board: s.board.map((u) => (u.sleeping ? { ...u, sleeping: false } : u)) } : {});
      const next = withSide(withSide(model, "me", wake), "foe", wake);
      return {
        ...next,
        phase: "playing",
        turn: e.turn,
        activeSeat: e.seat,
        isMyTurn: e.seat === model.mySeat,
      };
    }
    case "GAME_OVER":
      return { ...model, phase: "finished", winner: e.winner, endReason: e.reason, isMyTurn: false };
    default:
      return model;
  }
}

function statusKey(u: UnitSnapshot): string {
  const list = u.statuses.map((st) => `${st.id}:${st.magnitude}`).join(",");
  return u.silenced ? `silenced ${list}` : list;
}

/** Applies a list of events in order. */
export function reduceEvents(model: BoardModel, events: readonly ViewEvent[]): BoardModel {
  let m = model;
  for (const e of events) m = presentationReducer(m, e);
  return m;
}

/**
 * Differences between two models in the fields the reducer covers (Phase 13 I/K): hero health, board order,
 * unit attack/health/maxHealth/shields, statuses (id and magnitude, not expiry) and silence, hand (ids for me,
 * count for both), deck count, mana, turn and active seat.
 * Empty ⇔ the reduced model matches the reconciled one. Used by tests and the dev-only reconcile assertion.
 */
export function boardMismatches(reduced: BoardModel, truth: BoardModel): string[] {
  const out: string[] = [];
  const cmp = (path: string, a: unknown, b: unknown) => {
    if (a !== b) out.push(`${path}: ${String(a)} ≠ ${String(b)}`);
  };
  cmp("turn", reduced.turn, truth.turn);
  cmp("activeSeat", reduced.activeSeat, truth.activeSeat);
  for (const side of ["me", "foe"] as const) {
    const a = reduced[side];
    const b = truth[side];
    cmp(`${side}.hero.health`, a.hero.health, b.hero.health);
    cmp(`${side}.handCount`, a.handCount, b.handCount);
    cmp(`${side}.mana`, `${a.mana.current}/${a.mana.max}+${a.mana.temporary}`, `${b.mana.current}/${b.mana.max}+${b.mana.temporary}`);
    cmp(`${side}.board`, a.board.map((u) => u.iid).join(","), b.board.map((u) => u.iid).join(","));
    for (const u of a.board) {
      const v = b.board.find((x) => x.iid === u.iid);
      if (!v) continue;
      cmp(`${side}.${u.iid}`, `${u.attack}/${u.health}/${u.maxHealth} s${u.shieldCharges}`, `${v.attack}/${v.health}/${v.maxHealth} s${v.shieldCharges}`);
      cmp(`${side}.${u.iid}.statuses`, statusKey(u), statusKey(v));
    }
  }
  cmp("me.hand", reduced.me.hand.map((c) => c.iid).join(","), truth.me.hand.map((c) => c.iid).join(","));
  return out;
}
