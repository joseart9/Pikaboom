// Helpers for the server-layer tests (Phase 8/9): fake clock, service over any store, started matches, synthetic rows.
import { expect } from "vitest";
import type { MatchState, Seat } from "../engine/types";
import type { ClientCommand, CommandRequest } from "../server/commands";
import { isServiceError, type ServiceError } from "../server/errors";
import { CODE_ALPHABET, CODE_LENGTH, MatchService } from "../server/matchService";
import { MemoryMatchStore } from "../server/memoryStore";
import type { MatchRow, MatchStore } from "../server/store";
import type { MatchView } from "../server/view";

export const HOST = "11111111-1111-4111-8111-111111111111";
export const GUEST = "22222222-2222-4222-8222-222222222222";
export const STRANGER = "33333333-3333-4333-8333-333333333333";

export class FakeClock {
  t: number;
  constructor(iso = "2026-11-12T12:00:00.000Z") {
    this.t = Date.parse(iso);
  }
  now = (): Date => new Date(this.t);
  advance(ms: number): void {
    this.t += ms;
  }
}

let commandCounter = 0;
/** A fresh valid client command id (32 hex chars). */
export function cid(): string {
  commandCounter += 1;
  return commandCounter.toString(16).padStart(32, "0");
}

export function req(command: ClientCommand, commandId = cid()): CommandRequest {
  return { commandId, command };
}

export interface TestService {
  service: MatchService;
  store: MatchStore;
  clock: FakeClock;
}

export interface MakeServiceOptions {
  seeds?: string[];
  codes?: string[];
  /** Store factory (default: a `MemoryMatchStore` on the fake clock). DB tests pass a `PgMatchStore` on PGlite. */
  store?: (clock: FakeClock) => MatchStore;
}

export function makeService(opts: MakeServiceOptions = {}): TestService {
  const clock = new FakeClock();
  const store = opts.store ? opts.store(clock) : new MemoryMatchStore({ now: clock.now });
  const seeds = [...(opts.seeds ?? [])];
  const codes = [...(opts.codes ?? [])];
  let n = 0;
  const codeFor = (k: number): string => {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++, k = Math.floor(k / CODE_ALPHABET.length)) code = CODE_ALPHABET[k % CODE_ALPHABET.length] + code;
    return code;
  };
  const service = new MatchService({
    store,
    now: clock.now,
    randomSeed: () => seeds.shift() ?? (++n).toString(16).padStart(32, "0"),
    randomCode: () => codes.shift() ?? codeFor(++n),
  });
  return { service, store, clock };
}

/** create → join → selectDeck ×2 → ready ×2 (host undead, guest beast). Returns the active match's id and views. */
export async function startMatch(t: TestService): Promise<{ matchId: string; host: MatchView; guest: MatchView }> {
  const created = await t.service.createLobby(HOST, "Ana");
  const lobby = await t.store.load(created.matchId);
  await t.service.joinByCode(GUEST, "Beto", lobby!.code);
  const id = created.matchId;
  await t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: { kind: "starter", id: "starter-undead" } }));
  await t.service.submitCommand(id, GUEST, req({ t: "lobby.selectDeck", deck: { kind: "starter", id: "starter-beast" } }));
  const host = await t.service.submitCommand(id, HOST, req({ t: "lobby.ready", ready: true }));
  const guest = await t.service.submitCommand(id, GUEST, req({ t: "lobby.ready", ready: true }));
  return { matchId: id, host, guest };
}

export function userOf(seat: Seat): string {
  return seat === 0 ? HOST : GUEST;
}

/** A synthetic active row around a state, for calling `viewFor` without a store. */
export function rowFor(state: MatchState, now = new Date("2026-11-12T12:00:00.000Z")): MatchRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    code: "ABCDEF",
    status: state.phase === "finished" ? "finished" : "active",
    hostId: HOST,
    guestId: GUEST,
    hostName: state.players[0].name,
    guestName: state.players[1].name,
    lobby: { host: { deck: null, ready: true }, guest: { deck: null, ready: true } },
    state,
    setup: null,
    version: 2,
    turnDeadline: null,
    seenHost: now,
    seenGuest: now,
    winnerId: null,
    result: null,
    endReason: null,
    totalTurns: 0,
    rewardsGrantedAt: null,
    createdAt: now,
    updatedAt: now,
    startedAt: now,
    finishedAt: null,
    now,
  };
}

/** Awaits `p` and asserts it rejects with a `ServiceError` of that status and code. */
export async function expectError(p: Promise<unknown>, status: number, code: string): Promise<ServiceError> {
  try {
    await p;
  } catch (e) {
    if (!isServiceError(e)) throw e;
    expect({ status: e.status, code: e.code }).toEqual({ status, code });
    return e;
  }
  return expect.fail(`expected ${status} ${code}`);
}

export async function loadRow(t: TestService, id: string): Promise<MatchRow> {
  return (await t.store.load(id))!;
}

/** Both seats keep their opening hands (phase → playing). */
export async function finishMulligan(t: TestService, id: string): Promise<MatchState> {
  await t.service.submitCommand(id, HOST, req({ t: "mulligan", replace: [] }));
  await t.service.submitCommand(id, GUEST, req({ t: "mulligan", replace: [] }));
  const s = (await loadRow(t, id)).state!;
  expect(s.phase).toBe("playing");
  return s;
}
