// Dev sandbox transport (Phase 10): runs the real engine in the browser for BOTH seats, so the battlefield UI can be
// developed without networking. Not used for real matches — the full state (both hands, the RNG) lives here.
import { STARTER_DECKS, type StarterDeckId } from "../catalog/starterDecks";
import { expandDeck } from "../decks/validate";
import { applyCommand } from "../engine/apply";
import { isEngineError } from "../engine/errors";
import { createMatch } from "../engine/setup";
import type { GameCommand } from "../engine/commands";
import type { MatchState, Seat } from "../engine/types";
import type { ClientCommand } from "../server/commands";
import { errorText } from "../server/errors";
import { buildSetup } from "../server/setup";
import type { MatchRow } from "../server/store";
import { viewFor, type MatchView } from "../server/view";
import type { MatchTransport, SendResult, TransportUpdate } from "./transport";

export const SANDBOX_MATCH_ID = "00000000-0000-4000-8000-000000000000";
const USER_IDS: [string, string] = ["00000000-0000-4000-8000-000000000a00", "00000000-0000-4000-8000-000000000b00"];

export interface LocalTransportOptions {
  seed: string;
  names: [string, string];
  decks?: [StarterDeckId, StarterDeckId];
  /** Keep both opening hands automatically (no mulligan UI in Phase 10). Default true. */
  autoKeep?: boolean;
  viewer?: Seat;
  /** Switch the viewer to the active seat after every command. */
  follow?: boolean;
}

/** 32 hex chars from `crypto.getRandomValues` (sandbox seeds). */
export function randomSeed(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class LocalTransport implements MatchTransport {
  private state: MatchState;
  private version = 1;
  private viewer: Seat;
  private follow: boolean;
  private onUpdate: ((u: TransportUpdate) => void) | null = null;
  private readonly startedAt = new Date();

  constructor(opts: LocalTransportOptions) {
    const decks = opts.decks ?? ["starter-undead", "starter-beast"];
    const lists = [expandDeck(STARTER_DECKS[decks[0]].entries), expandDeck(STARTER_DECKS[decks[1]].entries)] as [string[], string[]];
    this.state = createMatch(buildSetup(lists, opts.names, USER_IDS, opts.seed));
    if (opts.autoKeep ?? true) {
      for (const seat of [0, 1] as const) this.state = applyCommand(this.state, seat, { t: "mulligan", replace: [] }).state;
    }
    this.viewer = opts.viewer ?? this.state.turn.activeSeat;
    this.follow = opts.follow ?? true;
  }

  /** The full engine state (sandbox/tests only). */
  getState(): MatchState {
    return this.state;
  }

  getViewer(): Seat {
    return this.viewer;
  }

  setViewer(seat: Seat): void {
    if (seat === this.viewer) return;
    this.viewer = seat;
    this.emit();
  }

  setFollow(follow: boolean): void {
    this.follow = follow;
    if (follow) this.setViewer(this.state.turn.activeSeat);
  }

  private row(): MatchRow {
    const now = new Date();
    const s = this.state;
    return {
      id: SANDBOX_MATCH_ID,
      code: "SANDBX",
      status: s.phase === "finished" ? "finished" : "active",
      hostId: USER_IDS[0],
      guestId: USER_IDS[1],
      hostName: s.players[0].name,
      guestName: s.players[1].name,
      lobby: { host: { deck: null, ready: true }, guest: { deck: null, ready: true } },
      state: s,
      setup: null,
      version: this.version,
      turnDeadline: null, // no timers in the sandbox
      seenHost: now,
      seenGuest: now,
      winnerId: null,
      result: null,
      endReason: null,
      totalTurns: s.turn.number,
      rewardsGrantedAt: null,
      createdAt: this.startedAt,
      updatedAt: now,
      startedAt: this.startedAt,
      finishedAt: null,
      now,
    };
  }

  view(): MatchView {
    return viewFor(this.row(), this.viewer);
  }

  private emit(): void {
    this.onUpdate?.({ view: this.view(), status: "online" });
  }

  start(onUpdate: (u: TransportUpdate) => void): void {
    this.onUpdate = onUpdate;
    this.emit();
  }

  stop(): void {
    this.onUpdate = null;
  }

  async send(command: ClientCommand): Promise<SendResult> {
    if (command.t.startsWith("lobby.")) return { ok: false, error: errorText("wrong_phase"), code: "wrong_phase" };
    try {
      this.state = applyCommand(this.state, this.viewer, command as GameCommand).state;
    } catch (e) {
      const code = isEngineError(e) ? e.code : "bad_request";
      return { ok: false, error: errorText(code), code };
    }
    this.version += 1;
    if (this.follow && this.state.phase === "playing") this.viewer = this.state.turn.activeSeat;
    return { ok: true, view: this.view() };
  }
}
