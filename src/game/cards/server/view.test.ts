import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { applyCommand } from "../engine/apply";
import type { GameEvent } from "../engine/events";
import { seedToRng } from "../engine/rng";
import type { EntityId, MatchState, Seat } from "../engine/types";
import { randomCommand, seedHex } from "../testing/driver";
import { newMatch } from "../testing/matches";
import { rowFor } from "../testing/server";
import { projectGame, redactEvent, viewFor, type ViewEvent } from "./view";

const LEAK_GAMES = 50;
const MAX_COMMANDS = 400;

/** §10.3: events private to `seat` (the only ones whose defIds/iids the opponent may not learn). */
function isPrivateTo(e: GameEvent, seat: Seat): boolean {
  return (e.type === "CARD_DRAWN" || e.type === "CARD_ADDED_TO_HAND" || e.type === "MULLIGAN_DONE") && e.seat === seat;
}

function countDefIds(json: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of json.matchAll(/"defId":"([^"]+)"/g)) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  return counts;
}

function iidsIn(json: string): Set<string> {
  return new Set([...json.matchAll(/"(c\d+)"/g)].map((m) => m[1]));
}

/**
 * Row 1 checks for one viewer. `known` = iids that have ever been in the viewer's own hand (the owner legitimately
 * saw them, e.g. opening-hand cards that the mulligan shuffled back into the deck).
 */
function checkLeaks(s: MatchState, viewer: Seat, known: ReadonlySet<EntityId>, where: string): void {
  const foe: Seat = viewer === 0 ? 1 : 0;
  const view = viewFor(rowFor(s), viewer);
  const json = JSON.stringify(view);
  const present = iidsIn(json);

  // Hidden iids: the foe's hand and deck (nothing in MVP ever reveals them), and own deck cards never seen.
  for (const c of s.players[foe].hand) if (present.has(c.iid)) expect.fail(`${where}: foe hand iid ${c.iid} leaked`);
  for (const c of s.players[foe].deck) if (present.has(c.iid)) expect.fail(`${where}: foe deck iid ${c.iid} leaked`);
  for (const c of s.players[viewer].deck) {
    if (present.has(c.iid) && !known.has(c.iid)) expect.fail(`${where}: own deck iid ${c.iid} leaked`);
  }
  for (const key of ['"rng"', '"seed"', '"defs"', '"userId"', '"rules"', '"log"', '"deck"']) {
    if (json.includes(key)) expect.fail(`${where}: key ${key} present`);
  }

  // The foe's private events appear only in their redacted form.
  for (const e of view.game!.events) {
    if ((e.type === "CARD_DRAWN" || e.type === "CARD_ADDED_TO_HAND") && e.seat === foe) {
      expect(Object.keys(e).sort(), where).toEqual(["hidden", "seat", "seq", "step", "type"]);
    }
    if (e.type === "MULLIGAN_DONE" && e.seat === foe) {
      expect(e.replaced, where).toEqual([]);
      expect(e.drawn, where).toEqual([]);
    }
  }

  // defId counts: what the view shows about the foe side and in events never exceeds what is public
  // (foe board + every event that is not private to the foe). Counts, not absence: mirror decks share defIds.
  const shown = countDefIds(JSON.stringify({ foe: view.game!.foe, events: view.game!.events }));
  const pub = countDefIds(
    JSON.stringify({ foe: view.game!.foe, events: s.log.filter((e) => !isPrivateTo(e, foe)) }),
  );
  for (const [defId, n] of shown) {
    if (n > (pub.get(defId) ?? 0)) expect.fail(`${where}: defId ${defId} shown ${n}× but public ${pub.get(defId) ?? 0}×`);
  }
}

describe("viewFor — hidden information (Phase 8 row 1)", () => {
  it(`never leaks hidden cards over ${LEAK_GAMES} random games (both viewers, every step)`, () => {
    let steps = 0;
    for (let g = 1; g <= LEAK_GAMES; g++) {
      let s = newMatch(seedHex(500 + g));
      const driver = { rng: seedToRng(seedHex(900_000 + g)) };
      const known: [Set<EntityId>, Set<EntityId>] = [new Set(), new Set()];
      for (let n = 0; ; n++) {
        for (const seat of [0, 1] as const) {
          for (const c of s.players[seat].hand) known[seat].add(c.iid);
          checkLeaks(s, seat, known[seat], `game ${g} step ${n} viewer ${seat}`);
        }
        steps++;
        if (s.phase === "finished" || n >= MAX_COMMANDS) break;
        const [seat, cmd] = randomCommand(s, driver);
        s = applyCommand(s, seat, cmd).state;
      }
    }
    expect(steps).toBeGreaterThan(LEAK_GAMES * 20);
  }, 60_000);

  it("the opponent gets no CARD_DRAWN for the other seat's mulligan, only an empty MULLIGAN_DONE", () => {
    let s = newMatch(seedHex(77));
    const drawnFor1 = (st: MatchState) =>
      projectGame(st, 0, 0).events.filter((e) => e.type === "CARD_DRAWN" && e.seat === 1).length;
    const opening = drawnFor1(s);
    expect(opening).toBe(s.players[1].hand.length);
    s = applyCommand(s, 1, { t: "mulligan", replace: s.players[1].hand.slice(0, 3).map((c) => c.iid) }).state;
    expect(s.phase).toBe("mulligan");
    expect(drawnFor1(s)).toBe(opening);
    const done = projectGame(s, 0, 0).events.find((e) => e.type === "MULLIGAN_DONE");
    expect(done).toMatchObject({ seat: 1, replaced: [], drawn: [] });
    // The owner sees the details.
    const own = projectGame(s, 1, 0).events.find((e) => e.type === "MULLIGAN_DONE");
    expect(own && "replaced" in own ? own.replaced : []).toHaveLength(3);
  });
});

describe("redaction (Phase 8 row 2)", () => {
  it("CARD_DRAWN is { hidden: true } without iid/defId for the opponent, complete for the owner", () => {
    const s = newMatch(seedHex(3));
    const drawn = s.log.filter((e): e is Extract<GameEvent, { type: "CARD_DRAWN" }> => e.type === "CARD_DRAWN");
    expect(drawn.length).toBe(7);
    for (const e of drawn) {
      const own = redactEvent(e, e.seat);
      expect(own).toEqual(e);
      const other = redactEvent(e, e.seat === 0 ? 1 : 0) as ViewEvent & { iid?: string; defId?: string };
      expect(other).toEqual({ type: "CARD_DRAWN", seq: e.seq, step: e.step, seat: e.seat, hidden: true });
      expect(other.iid).toBeUndefined();
      expect(other.defId).toBeUndefined();
    }
  });

  it("CARD_ADDED_TO_HAND and MOB_RETURNED_TO_HAND follow the §10.3 table", () => {
    const added: GameEvent = { type: "CARD_ADDED_TO_HAND", seq: 5, step: 1, seat: 1, iid: "c40", defId: "mana-spark" };
    expect(redactEvent(added, 1)).toEqual(added);
    expect(redactEvent(added, 0)).toEqual({ type: "CARD_ADDED_TO_HAND", seq: 5, step: 1, seat: 1, hidden: true });
    const returned: GameEvent = { type: "MOB_RETURNED_TO_HAND", seq: 6, step: 2, iid: "c3", seat: 0, newIid: "c41" };
    expect(redactEvent(returned, 0)).toEqual(returned);
    expect(redactEvent(returned, 1)).toEqual({ type: "MOB_RETURNED_TO_HAND", seq: 6, step: 2, iid: "c3", seat: 0 });
    const burned: GameEvent = { type: "CARD_BURNED", seq: 7, step: 0, seat: 1, defId: "squire" };
    expect(redactEvent(burned, 0)).toBe(burned);
  });
});

describe("legal actions in views (Phase 8 row 3)", () => {
  it("legal is present for both seats during mulligan until they submit", () => {
    let s = newMatch(seedHex(11));
    expect(projectGame(s, 0, 0).legal?.mulligan).toBe(true);
    expect(projectGame(s, 1, 0).legal?.mulligan).toBe(true);
    s = applyCommand(s, 0, { t: "mulligan", replace: [] }).state;
    expect(projectGame(s, 0, 0).legal).toBeNull();
    expect(projectGame(s, 1, 0).legal?.mulligan).toBe(true);
  });

  it("legal is null for the inactive player and present for the active one", () => {
    let s = newMatch(seedHex(12));
    s = applyCommand(s, 0, { t: "mulligan", replace: [] }).state;
    s = applyCommand(s, 1, { t: "mulligan", replace: [] }).state;
    expect(s.phase).toBe("playing");
    const active = s.turn.activeSeat;
    const inactive: Seat = active === 0 ? 1 : 0;
    expect(projectGame(s, inactive, 0).legal).toBeNull();
    const legal = projectGame(s, active, 0).legal;
    expect(legal?.endTurn).toBe(true);
    // A finished or abandoned match offers nobody any action.
    expect(viewFor({ ...rowFor(s), status: "abandoned" }, active).game?.legal).toBeNull();
  });
});

describe("view shape", () => {
  it("hand costs, counts, events since, truncation and online flags", () => {
    let s = newMatch(seedHex(21));
    s = applyCommand(s, 0, { t: "mulligan", replace: [] }).state;
    s = applyCommand(s, 1, { t: "mulligan", replace: [] }).state;
    const row = rowFor(s);
    const v = viewFor(row, 0, { since: 3 });
    const g = v.game!;
    expect(g.me.hand.map((c) => c.iid)).toEqual(s.players[0].hand.map((c) => c.iid));
    for (const c of g.me.hand) expect(c.cost).toBe(s.defs[c.defId].cost);
    expect(g.foe).not.toHaveProperty("hand");
    expect(g.foe.handCount).toBe(s.players[1].hand.length);
    expect(g.me.deckCount).toBe(s.players[0].deck.length);
    expect(g.events.every((e) => e.seq > 3)).toBe(true);
    expect(g.lastSeq).toBe(s.seq);
    expect(g.eventsTruncated).toBe(false);
    expect(v.foeOnline).toBe(true);
    expect(viewFor({ ...row, seenGuest: new Date(row.now.getTime() - 9001) }, 0).foeOnline).toBe(false);
    expect(viewFor({ ...row, seenGuest: new Date(row.now.getTime() - 9000) }, 0).foeOnline).toBe(true);
    // A since older than the ring buffer is reported as truncated.
    const long = { ...s, log: s.log.slice(5) };
    expect(projectGame(long, 0, 2).eventsTruncated).toBe(true);
    expect(projectGame(long, 0, s.log[4].seq).eventsTruncated).toBe(false);
  });

  it("view.ts stays browser-safe: no server-only import and no Node APIs", () => {
    const src = readFileSync(fileURLToPath(new URL("./view.ts", import.meta.url)), "utf8");
    expect(src).not.toMatch(/from ["']server-only["']|import ["']server-only["']/);
    expect(src).not.toMatch(/from ["']node:|from ["'](fs|path|crypto)["']/);
  });
});
