// The match service (§13): everything between HTTP and the engine. Depends only on the MatchStore contract —
// no SQL, no auth calls (route handlers pass the authenticated user id), no ambient clock or randomness.
import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { applyCommand } from "../engine/apply";
import type { GameCommand, SystemCommand } from "../engine/commands";
import { createMatch } from "../engine/setup";
import type { MatchState, Seat } from "../engine/types";
import type { CardId } from "../catalog/types";
import { isLobbyCommand, type CommandRequest, type DeckChoice, type LobbyCommand } from "./commands";
import { fromEngineError, isServiceError, ServiceError } from "./errors";
import { applyLobbyCommand, newLobby } from "./lobby";
import { CODE_ALPHABET, CODE_LENGTH, normalizeCode } from "./lobbyCode";
import { NO_REWARDS, type RewardsPort } from "./rewards";
import { buildSetup, resolveDeckChoice, type DeckChoiceDeps } from "./setup";
import { DuplicateCommand, seatOfUser, StoreConflict, type CommandLogEntry, type MatchPatch, type MatchRow, type MatchStore } from "./store";
import { viewFor, type MatchView } from "./view";

export { CODE_ALPHABET, CODE_LENGTH, normalizeCode } from "./lobbyCode";

/** Grace after a playing-turn deadline before the server times the turn out (§13.6). */
export const TIMEOUT_GRACE_MS = 1500;
/** `readMatch` refreshes the reader's `seen*` at most this often. */
export const TOUCH_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 5;
const MAX_CODE_ATTEMPTS = 12;

/** Production seed: 16 random bytes as 32 hex chars (ADR-04). */
export function randomMatchSeed(): string {
  return randomBytes(16).toString("hex");
}

/** Production lobby code. */
export function randomLobbyCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export interface MatchServiceDeps {
  store: MatchStore;
  now: () => Date;
  randomSeed: () => string;
  randomCode: () => string;
  decks?: DeckChoiceDeps;
  /** Match rewards (Phase 16). Default: none (the dev memory store). */
  rewards?: RewardsPort;
}

export type ReadResult =
  | { same: true; version: number; foeOnline: boolean; serverNow: string }
  | { same?: undefined; view: MatchView };

function isTerminal(row: MatchRow): boolean {
  return row.status === "finished" || row.status === "abandoned" || row.status === "cancelled";
}

export class MatchService {
  private readonly store: MatchStore;
  private readonly now: () => Date;
  private readonly randomSeed: () => string;
  private readonly randomCode: () => string;
  private readonly decks: DeckChoiceDeps;
  private readonly rewards: RewardsPort;

  constructor(deps: MatchServiceDeps) {
    this.store = deps.store;
    this.now = deps.now;
    this.randomSeed = deps.randomSeed;
    this.randomCode = deps.randomCode;
    this.decks = deps.decks ?? {};
    this.rewards = deps.rewards ?? NO_REWARDS;
  }

  // ---------------------------------------------------------------- lobby lifecycle

  /** Creates a lobby (you are host), or returns your open lobby/match instead (resume). */
  async createLobby(userId: string, name: string): Promise<MatchView> {
    await this.cleanupStale();
    const open = await this.store.findOpenForUser(userId);
    if (open) return viewFor(open, seatOfUser(open, userId)!);
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
      const row = await this.store.insertLobby({ code: this.randomCode(), hostId: userId, hostName: name, lobby: newLobby() });
      if (row) return viewFor(row, 0);
    }
    throw new ServiceError(503, "busy");
  }

  async joinByCode(userId: string, name: string, rawCode: string): Promise<MatchView> {
    const code = normalizeCode(rawCode);
    if (code.length !== CODE_LENGTH) throw new ServiceError(404, "not_found");
    await this.cleanupStale();
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const row = await this.store.loadByCode(code);
      if (!row) throw new ServiceError(404, "not_found");
      const seat = seatOfUser(row, userId);
      if (seat === 0 && row.status === "lobby") throw new ServiceError(409, "own_lobby");
      if (seat !== null && (row.status === "lobby" || row.status === "active")) return viewFor(row, seat); // your seat
      if (row.status !== "lobby") throw new ServiceError(404, "not_found");
      const other = await this.store.findOpenForUser(userId);
      if (other && other.id !== row.id) {
        throw new ServiceError(409, "already_in_match", undefined, { matchId: other.id });
      }
      if (row.guestId !== null) throw new ServiceError(409, "full");
      const cmd: CommandLogEntry = { commandId: `join:${userId}:${row.version}`, userId, seat: 1, command: { t: "lobby.join" } };
      const lobby = structuredClone(row.lobby);
      lobby.guest = { deck: null, ready: false };
      try {
        const next = await this.store.update(row.id, row.version, { guestId: userId, guestName: name, lobby }, cmd, 1);
        return viewFor(next, 1);
      } catch (e) {
        if (e instanceof StoreConflict || e instanceof DuplicateCommand) continue; // reload and re-check
        throw e;
      }
    }
    throw new ServiceError(503, "busy");
  }

  /** The user's lobby/active match id (for "Volver a la partida"), or null. */
  async currentMatchFor(userId: string): Promise<string | null> {
    await this.cleanupStale();
    return (await this.store.findOpenForUser(userId))?.id ?? null;
  }

  /** §6.11 stale rules (runs opportunistically). */
  async cleanupStale(): Promise<void> {
    await this.store.markStale(this.now());
  }

  // ---------------------------------------------------------------- reads

  private async loadForUser(matchId: string, userId: string): Promise<{ row: MatchRow; seat: Seat }> {
    const row = await this.store.load(matchId);
    if (!row) throw new ServiceError(404, "not_found");
    const seat = seatOfUser(row, userId);
    if (seat === null) throw new ServiceError(403, "not_in_match");
    return { row, seat };
  }

  async readMatch(matchId: string, userId: string, opts: { knownVersion?: number; since?: number } = {}): Promise<ReadResult> {
    let grantTried = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { row, seat } = await this.loadForUser(matchId, userId);
      if (await this.applyDueTimeouts(row, this.now())) continue; // reload after a write
      if (row.status === "finished" && row.rewardsGrantedAt === null && !grantTried) {
        // The grant after the finishing write failed or never ran (Phase 16 H): retry once per read, then reload
        // (a successful grant bumps the version, so this read already answers with the rewards).
        grantTried = true;
        await this.grantRewards(row.id);
        continue;
      }
      const seen = seat === 0 ? row.seenHost : row.seenGuest;
      if (!seen || row.now.getTime() - seen.getTime() >= TOUCH_INTERVAL_MS) {
        await this.store.touch(row.id, seat);
        if (seat === 0) row.seenHost = row.now;
        else row.seenGuest = row.now;
      }
      const view = viewFor(row, seat, { since: opts.since });
      if (opts.knownVersion === row.version) {
        return { same: true, version: row.version, foeOnline: view.foeOnline, serverNow: view.serverNow };
      }
      return { view: await this.withRewards(view, row, seat) };
    }
    throw new ServiceError(503, "busy");
  }

  // ---------------------------------------------------------------- rewards (Phase 16)

  /** Grants a finished match's rewards. Failures are logged, never fatal: the next read of the match retries. */
  private async grantRewards(matchId: string): Promise<void> {
    try {
      await this.rewards.grantMatchRewards(matchId);
    } catch (e) {
      console.error(`[cards] reward grant failed for match ${matchId}:`, e);
    }
  }

  /** Adds the viewer's reward to the view of a finished match whose rewards were granted. */
  private async withRewards(view: MatchView, row: MatchRow, seat: Seat): Promise<MatchView> {
    if (row.status !== "finished" || row.rewardsGrantedAt === null) return view;
    const rewards = await this.rewards.getMatchReward(row.id, userIdOf(row, seat));
    return rewards ? { ...view, rewards } : view;
  }

  /** `viewFor` + rewards (for paths that may return a finished match). */
  private async viewOf(row: MatchRow, seat: Seat, opts: { since?: number }): Promise<MatchView> {
    return this.withRewards(viewFor(row, seat, opts), row, seat);
  }

  // ---------------------------------------------------------------- timeouts (§13.6)

  /**
   * Applies at most one due system command (mulligan timeout for one seat, or a turn timeout) and returns true if
   * anything was written — or if another request wrote first (conflict/duplicate) — so the caller reloads.
   */
  async applyDueTimeouts(row: MatchRow, now: Date): Promise<boolean> {
    const s = row.state;
    if (row.status !== "active" || !s || !row.turnDeadline) return false;
    let cmd: SystemCommand;
    let commandId: string;
    let seat: Seat;
    if (s.phase === "mulligan") {
      if (now.getTime() <= row.turnDeadline.getTime()) return false;
      const pending = ([0, 1] as const).find((x) => !s.players[x].mulliganDone);
      if (pending === undefined) return false;
      cmd = { t: "mulliganTimeout", seat: pending };
      commandId = `sys:mulligan-timeout:${pending}`;
      seat = pending;
    } else if (s.phase === "playing") {
      if (now.getTime() <= row.turnDeadline.getTime() + TIMEOUT_GRACE_MS) return false;
      cmd = { t: "timeout" };
      commandId = `sys:timeout:${s.turn.number}`;
      seat = s.turn.activeSeat;
    } else return false;

    const next = applyCommand(s, seat, cmd).state;
    try {
      const written = await this.store.update(row.id, row.version, this.gamePatch(row, next, now), { commandId, userId: null, seat, command: cmd }, null);
      if (written.status === "finished") await this.grantRewards(written.id); // forfeit after 3 timeouts
    } catch (e) {
      if (!(e instanceof StoreConflict || e instanceof DuplicateCommand)) throw e;
    }
    return true;
  }

  /** State + derived columns after an engine transition (§13.6 step 4, §21 Phase 8 G.6). */
  private gamePatch(row: MatchRow, next: MatchState, now: Date): MatchPatch {
    const prev = row.state;
    const patch: MatchPatch = { state: next };
    if (next.phase === "finished") {
      patch.status = "finished";
      patch.turnDeadline = null;
      patch.result = next.winner === "draw" ? "draw" : "win";
      patch.winnerId = next.winner === "draw" || next.winner === null ? null : next.winner === 0 ? row.hostId : row.guestId;
      patch.endReason = next.endReason;
      patch.totalTurns = next.turn.number;
      patch.finishedAt = now;
    } else if (!prev || prev.turn.number !== next.turn.number || prev.phase !== next.phase) {
      const seconds = next.phase === "mulligan" ? next.rules.turn.mulliganSeconds : next.rules.turn.seconds;
      patch.turnDeadline = new Date(now.getTime() + seconds * 1000);
    }
    return patch;
  }

  // ---------------------------------------------------------------- commands

  async submitCommand(matchId: string, userId: string, req: CommandRequest, opts: { since?: number } = {}): Promise<MatchView> {
    let timedOut = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { row, seat } = await this.loadForUser(matchId, userId);
      if (await this.store.hasCommand(row.id, req.commandId)) return this.viewOf(row, seat, opts);
      const now = this.now();
      if (await this.applyDueTimeouts(row, now)) {
        timedOut = true;
        continue;
      }
      const cmd = req.command;
      let patch: MatchPatch;
      if (isTerminal(row)) throw new ServiceError(409, "game_over");
      if (isLobbyCommand(cmd)) {
        if (row.status !== "lobby") throw new ServiceError(409, "wrong_phase");
        patch = await this.lobbyPatch(row, seat, cmd as LobbyCommand, now);
      } else {
        if (row.status !== "active" || !row.state) throw new ServiceError(409, "wrong_phase");
        let next: MatchState;
        try {
          next = applyCommand(row.state, seat, cmd as GameCommand).state;
        } catch (e) {
          throw fromEngineError(e, timedOut);
        }
        patch = this.gamePatch(row, next, now);
      }
      try {
        const next = await this.store.update(row.id, row.version, patch, { commandId: req.commandId, userId, seat, command: cmd }, seat);
        if (next.status !== "finished") return viewFor(next, seat, opts);
        // This command finished the match: grant the rewards now and answer with the view that contains them.
        await this.grantRewards(next.id);
        return this.viewOf((await this.store.load(next.id)) ?? next, seat, opts);
      } catch (e) {
        if (e instanceof StoreConflict) continue;
        if (e instanceof DuplicateCommand) {
          const fresh = await this.loadForUser(matchId, userId);
          return this.viewOf(fresh.row, fresh.seat, opts);
        }
        throw e;
      }
    }
    throw new ServiceError(503, "busy");
  }

  private async lobbyPatch(row: MatchRow, seat: Seat, cmd: LobbyCommand, now: Date): Promise<MatchPatch> {
    if (cmd.t === "lobby.selectDeck") await resolveDeckChoice(cmd.deck, userIdOf(row, seat), this.decks); // validates
    const out = applyLobbyCommand(row.lobby, seat, cmd);
    if (out.leave === "cancel") return { status: "cancelled", lobby: out.lobby };
    if (out.leave === "guestLeft") return { guestId: null, guestName: null, lobby: out.lobby };
    if (!out.bothReady || row.guestId === null) return { lobby: out.lobby };

    // Both ready: snapshot decks (reloaded and validated now, §15.5), build the setup, start the match (§13.7 step 5).
    const host = await this.snapshotDeck(out.lobby.host.deck!, row.hostId);
    const guest = await this.snapshotDeck(out.lobby.guest.deck!, row.guestId);
    if (!host || !guest) {
      // A deck was deleted/edited/lost ownership after it was selected (Phase 15 H): back to deck selection instead of
      // failing the ready command. The other player's choice is kept; both must confirm "Listo" again.
      const lobby = structuredClone(out.lobby);
      if (!host) lobby.host.deck = null;
      if (!guest) lobby.guest.deck = null;
      lobby.host.ready = false;
      lobby.guest.ready = false;
      lobby.lastError = { seat: host ? 1 : 0, code: "deck_unavailable" };
      return { lobby };
    }
    const setup = buildSetup([host, guest], [row.hostName, row.guestName ?? ""], [row.hostId, row.guestId], this.randomSeed());
    const state = createMatch(setup);
    return {
      status: "active",
      lobby: out.lobby,
      setup,
      state,
      startedAt: now,
      turnDeadline: new Date(now.getTime() + state.rules.turn.mulliganSeconds * 1000),
    };
  }

  /** The deck's card ids, or null when it is no longer available/valid (other errors propagate). */
  private async snapshotDeck(choice: DeckChoice, userId: string): Promise<CardId[] | null> {
    try {
      return await resolveDeckChoice(choice, userId, this.decks);
    } catch (e) {
      if (isServiceError(e) && (e.code === "deck_unavailable" || e.code === "deck_invalid")) return null;
      throw e;
    }
  }
}

function userIdOf(row: MatchRow, seat: Seat): string {
  return seat === 0 ? row.hostId : row.guestId!;
}
