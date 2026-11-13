// Dev sandbox transport (Phase 10): runs the real engine in the browser for BOTH seats, so the battlefield UI can be
// developed without networking. Not used for real matches — the full state (both hands, the RNG) lives here.
import { STARTER_DECKS, type StarterDeckId } from "../catalog/starterDecks";
import type { CardId } from "../catalog/types";
import { expandDeck } from "../decks/validate";
import { applyCommand } from "../engine/apply";
import { isEngineError } from "../engine/errors";
import { getLegalActions } from "../engine/legal";
import { createMatch } from "../engine/setup";
import type { GameCommand } from "../engine/commands";
import type { MatchState, Seat } from "../engine/types";
import type { ClientCommand } from "../server/commands";
import { errorText } from "../server/errors";
import { buildSetup } from "../server/setup";
import type { MatchRow } from "../server/store";
import { viewFor, type MatchView } from "../server/view";
import type { MatchTransport, SendResult, TransportUpdate } from "./transport";

/** Sandbox deck with every status card twice (Phase 18 manual tests) + Esqueleto Inquieto and Lobo Alfa ×2. */
export const SANDBOX_STATUS_DECK: CardId[] = expandDeck([
  { cardId: "ember-imp", count: 2 }, { cardId: "ice-shard", count: 2 }, { cardId: "frozen-gale", count: 2 },
  { cardId: "flame-wyrm", count: 2 }, { cardId: "blood-hound", count: 2 }, { cardId: "curse-weaver", count: 2 },
  { cardId: "blessing-of-light", count: 2 }, { cardId: "purify", count: 2 }, { cardId: "silence-monk", count: 2 },
  { cardId: "shatter-armor", count: 2 }, { cardId: "disarming-strike", count: 2 }, { cardId: "stone-sleep", count: 2 },
  { cardId: "aegis-ward", count: 2 }, { cardId: "restless-skeleton", count: 2 }, { cardId: "alpha-wolf", count: 2 },
]);

/** Sandbox deck with every Phase 19 card (manual tests): the 20 cards, a second copy of 8 of them, 2 Esqueletos Inquietos. */
export const SANDBOX_ADVANCED_DECK: CardId[] = expandDeck([
  { cardId: "venom-spider", count: 2 }, { cardId: "shadow-stalker", count: 2 }, { cardId: "sun-cleric", count: 2 },
  { cardId: "ash-drake", count: 1 }, { cardId: "storm-drake", count: 1 }, { cardId: "vaelra", count: 1 },
  { cardId: "larval-drake", count: 2 }, { cardId: "clockwork-sentinel", count: 1 }, { cardId: "iron-colossus", count: 1 },
  { cardId: "golem-forge", count: 1 }, { cardId: "toad-hex", count: 2 }, { cardId: "raise-dead", count: 1 },
  { cardId: "banish", count: 2 }, { cardId: "mind-thrall", count: 1 }, { cardId: "mana-leech", count: 1 },
  { cardId: "arcane-echo", count: 2 }, { cardId: "soul-thief", count: 2 }, { cardId: "phoenix-chick", count: 1 },
  { cardId: "dark-pact", count: 1 }, { cardId: "nyxara", count: 1 }, { cardId: "restless-skeleton", count: 2 },
]);

export const SANDBOX_MATCH_ID = "00000000-0000-4000-8000-000000000000";
const USER_IDS: [string, string] = ["00000000-0000-4000-8000-000000000a00", "00000000-0000-4000-8000-000000000b00"];

export interface LocalTransportOptions {
  seed: string;
  names: [string, string];
  decks?: [StarterDeckId, StarterDeckId];
  /** Explicit 30-card lists (overrides `decks`), e.g. the status deck. */
  deckLists?: [CardId[], CardId[]];
  /** Keep both opening hands automatically (no mulligan UI in Phase 10). Default true. */
  autoKeep?: boolean;
  viewer?: Seat;
  /** Switch the viewer to the active seat after every command. */
  follow?: boolean;
}

/** Pause between the sandbox bot's actions (lets the animations of each one play, Phase 13). */
export const BOT_DELAY_MS = 1100;
/** The bot ends its turn after this many plays/attacks. */
const BOT_MAX_ACTIONS = 5;

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
  /** Last event seq sent to each viewer (`since`), like the HTTP transport, so long games never look truncated. */
  private readonly sentSeq: [number, number] = [0, 0];
  private bot: Seat | null = null;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private botActions = 0;

  constructor(opts: LocalTransportOptions) {
    const decks = opts.decks ?? ["starter-undead", "starter-beast"];
    const lists = opts.deckLists ?? ([expandDeck(STARTER_DECKS[decks[0]].entries), expandDeck(STARTER_DECKS[decks[1]].entries)] as [string[], string[]]);
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
    this.sentSeq[seat] = 0; // a new viewer stream starts from a full view
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

  /** The view for the current viewer with only the events it has not been sent yet. */
  private nextView(): MatchView {
    const view = viewFor(this.row(), this.viewer, { since: this.sentSeq[this.viewer] });
    this.sentSeq[this.viewer] = this.state.seq;
    return view;
  }

  private emit(): void {
    this.onUpdate?.({ view: this.nextView(), status: "online" });
  }

  /**
   * Dev sandbox opponent (Phase 13): `seat` plays by itself — random legal plays/attacks one at a time, then ends
   * its turn — so the opponent's animations can be watched from the other seat. null turns it off.
   */
  setBot(seat: Seat | null): void {
    this.bot = seat;
    if (seat === null && this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    this.scheduleBot();
  }

  private scheduleBot(): void {
    if (this.botTimer || this.bot === null || !this.onUpdate) return;
    const s = this.state;
    if (s.phase !== "playing" || s.turn.activeSeat !== this.bot) {
      this.botActions = 0;
      return;
    }
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      this.botStep();
    }, BOT_DELAY_MS);
  }

  private botStep(): void {
    const seat = this.bot;
    const s = this.state;
    if (seat === null || !this.onUpdate || s.phase !== "playing" || s.turn.activeSeat !== seat) return;
    const legal = getLegalActions(s, seat);
    const options: GameCommand[] = [];
    if (this.botActions < BOT_MAX_ACTIONS) {
      const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
      for (const [card, entry] of Object.entries(legal.play)) {
        const position = Math.floor(Math.random() * (s.players[seat].board.length + 1));
        options.push(entry.targets && entry.targets.length > 0 ? { t: "play", card, position, target: pick(entry.targets) } : { t: "play", card, position });
      }
      for (const [attacker, targets] of Object.entries(legal.attacks)) options.push({ t: "attack", attacker, target: pick(targets) });
    }
    const cmd: GameCommand = options.length > 0 ? options[Math.floor(Math.random() * options.length)] : { t: "endTurn" };
    try {
      this.state = applyCommand(s, seat, cmd).state;
      this.botActions = cmd.t === "endTurn" ? 0 : this.botActions + 1;
    } catch {
      this.state = applyCommand(s, seat, { t: "endTurn" }).state;
      this.botActions = 0;
    }
    this.version += 1;
    this.emit();
    this.scheduleBot();
  }

  start(onUpdate: (u: TransportUpdate) => void): void {
    this.onUpdate = onUpdate;
    this.emit();
  }

  stop(): void {
    this.onUpdate = null;
    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = null;
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
    const view = this.nextView();
    this.scheduleBot();
    return { ok: true, view };
  }
}
