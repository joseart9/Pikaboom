// Helpers for the server-layer tests (Phase 8/9): fake clock, service over any store, started matches, synthetic rows.
import { expect } from "vitest";
import type { MatchState, Seat } from "../engine/types";
import { t as tr } from "../i18n";
import { MemoryCollectionStore } from "../server/collection";
import type { ClientCommand, CommandRequest, DeckChoice } from "../server/commands";
import { DeckService, MemoryDeckStore } from "../server/decks";
import { isServiceError, type ServiceError } from "../server/errors";
import { CODE_ALPHABET, CODE_LENGTH, MatchService } from "../server/matchService";
import { MemoryMatchStore } from "../server/memoryStore";
import type { RewardsPort } from "../server/rewards";
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
  /** Saved decks (Phase 15): memory stores; the match service loads lobby decks through `decks.choiceDeps()`. */
  decks: DeckService;
  deckStore: MemoryDeckStore;
  collection: MemoryCollectionStore;
}

export interface MakeServiceOptions {
  seeds?: string[];
  codes?: string[];
  /** Store factory (default: a `MemoryMatchStore` on the fake clock). DB tests pass a `PgMatchStore` on PGlite. */
  store?: (clock: FakeClock) => MatchStore;
  /** Rewards port (Phase 16; default: none, like the dev memory store). Gets the store the service uses. */
  rewards?: (store: MatchStore) => RewardsPort;
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
  const deckStore = new MemoryDeckStore();
  const collection = new MemoryCollectionStore(undefined, deckStore);
  const decks = new DeckService({ decks: deckStore, collection });
  const service = new MatchService({
    store,
    now: clock.now,
    randomSeed: () => seeds.shift() ?? (++n).toString(16).padStart(32, "0"),
    randomCode: () => codes.shift() ?? codeFor(++n),
    decks: decks.choiceDeps(),
    rewards: opts.rewards?.(store),
  });
  return { service, store, clock, decks, deckStore, collection };
}

/**
 * The user's granted starter deck as a lobby choice (Phase 15: the code-defined starter decks are saved decks now).
 * Performs the starter grant first (idempotent).
 */
export async function starterChoice(t: TestService, userId: string, which: "undead" | "beast"): Promise<DeckChoice> {
  await t.collection.ensureStarterGrant(userId);
  const name = tr(`starterDecks.${which}`);
  const deck = (await t.decks.listDecks(userId)).find((d) => d.name === name);
  if (!deck) throw new Error(`no starter deck ${name} for ${userId}`);
  return { kind: "saved", id: deck.id };
}

/** create → join → selectDeck ×2 → ready ×2 (host undead, guest beast). Returns the active match's id and views. */
export async function startMatch(t: TestService): Promise<{ matchId: string; host: MatchView; guest: MatchView }> {
  const created = await t.service.createLobby(HOST, "Ana");
  const lobby = await t.store.load(created.matchId);
  await t.service.joinByCode(GUEST, "Beto", lobby!.code);
  const id = created.matchId;
  await t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: await starterChoice(t, HOST, "undead") }));
  await t.service.submitCommand(id, GUEST, req({ t: "lobby.selectDeck", deck: await starterChoice(t, GUEST, "beast") }));
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
