// AnimationQueue (§18.2–§18.3, Phase 13): one sequential timeline per client. Events are grouped by `step`; each
// group's handlers run in parallel and are capped by a timeout, then the group is applied to the presentation
// model, then "enter" animations run on elements that exist only after the apply (a summoned unit, a drawn card).
// When the queue drains — or is skipped — the client reconciles to the latest view, so a missing reducer or a
// broken handler can never leave the board wrong. Framework-free; timing via setTimeout (fake timers in tests).
import type { ViewEvent } from "../../server/view";

export interface QueueOptions {
  /** Cap for one group phase at speed 1 (divided by the speed). */
  maxGroupMs: number;
  /** More events than this waiting → speed ×2. */
  speedUpAt: number;
  /** More events than this waiting → skip to reconcile. */
  skipAt: number;
  /** A single push with more events than this (reconnect / background return) → skip at once. */
  skipGapAt: number;
  /** One continuous playback never locks input longer than this (Phase 13 K: < 4 s, minus timer/frame slack). */
  maxBlockMs: number;
  /** Cap for a group that holds a Legendaria/Única cinematic (Phase 20: ≤ 1.6 s at 1×), divided by the speed. */
  cinematicGroupMs: number;
}

export const DEFAULT_QUEUE_OPTIONS: QueueOptions = { maxGroupMs: 1200, speedUpAt: 12, skipAt: 30, skipGapAt: 40, maxBlockMs: 3800, cinematicGroupMs: 1600 };

/** The player's own command results play at this speed (§18.3). */
export const OWN_SPEED = 1.5;

export interface GroupControl {
  speed: number;
  /** Aborted when the group is skipped (tap) or the queue is skipped/cancelled: handlers stop chaining steps. */
  signal: AbortSignal;
}

export interface QueueHooks {
  /** Animations on the current elements, before the group is applied. */
  play(group: readonly ViewEvent[], ctl: GroupControl): Promise<void>;
  /** Applies the group's events to the presentation model. */
  apply(group: readonly ViewEvent[]): void;
  /** Animations on elements that exist only after `apply`. */
  enter(group: readonly ViewEvent[], ctl: GroupControl): Promise<void>;
  /** Queue drained (`complete`: every pushed event was applied) or skipped (`complete: false`). */
  reconcile(complete: boolean): void;
  /** Stops every running effect instantly (skip). */
  finishFx(): void;
  onPlayingChange(playing: boolean): void;
  /** True while the page is hidden: playback skips straight to reconcile. */
  hidden?(): boolean;
  /** The group plays a cinematic entrance (Phase 20): longer cap, and a tap skips straight to reconcile. */
  cinematic?(group: readonly ViewEvent[]): boolean;
  /** The player's animation-speed setting (1, 1.5 or 2; Phase 20), multiplied into every group's speed. */
  userSpeed?(): number;
  now?(): number;
}

/**
 * Events that start a command (or a turn): a new group always begins there, even when two commands share step 0
 * (steps restart at 0 for every command).
 */
const COMMAND_START = new Set<ViewEvent["type"]>(["CARD_PLAYED", "ATTACK_DECLARED", "TURN_ENDED", "TURN_STARTED", "MULLIGAN_DONE"]);

/** Consecutive events with the same `step` form a group; a command-start event always opens a new one. */
export function groupEvents(events: readonly ViewEvent[]): ViewEvent[][] {
  const groups: ViewEvent[][] = [];
  let cur: ViewEvent[] | null = null;
  for (const e of events) {
    if (!cur || cur[0].step !== e.step || COMMAND_START.has(e.type)) {
      cur = [e];
      groups.push(cur);
    } else {
      cur.push(e);
    }
  }
  return groups;
}

interface QueuedGroup {
  events: ViewEvent[];
  speed: number;
}

export class AnimationQueue {
  private readonly opts: QueueOptions;
  private groups: QueuedGroup[] = [];
  private run = 0; // generation: bumped by skipAll/cancel so a stale loop stops after its current await
  private isPlaying = false;
  private tapSpeed = 1;
  private startedAt = 0;
  private skipGroup: (() => void) | null = null;
  private groupAbort: AbortController | null = null;
  private inCinematic = false;

  constructor(
    private readonly hooks: QueueHooks,
    opts: Partial<QueueOptions> = {},
  ) {
    this.opts = { ...DEFAULT_QUEUE_OPTIONS, ...opts };
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  /** Events waiting (not yet started). */
  get pendingEvents(): number {
    return this.groups.reduce((n, g) => n + g.events.length, 0);
  }

  /**
   * Appends events (already filtered to the unseen ones). `speed`: 1 for the opponent, `OWN_SPEED` for my own
   * command. Starts playback when idle. Large gaps and hidden pages skip straight to reconcile.
   */
  push(events: readonly ViewEvent[], speed = 1): void {
    if (events.length === 0) {
      if (!this.isPlaying) this.hooks.reconcile(true);
      return;
    }
    if (events.length > this.opts.skipGapAt || this.hooks.hidden?.()) {
      this.skipAll();
      return;
    }
    for (const g of groupEvents(events)) this.groups.push({ events: g, speed });
    if (!this.isPlaying) void this.loop();
  }

  /**
   * Tap to skip (§18.3): the current group finishes instantly and the rest plays twice as fast. During a cinematic
   * the whole playback is skipped and the board reconciles (Phase 20 H).
   */
  skipCurrent(): void {
    if (!this.isPlaying) return;
    if (this.inCinematic) {
      this.skipAll();
      return;
    }
    this.tapSpeed *= 2;
    this.endGroup();
  }

  /** Drops everything and snaps to the latest view. */
  skipAll(): void {
    this.groups = [];
    this.run += 1;
    this.endGroup();
    this.finish(false);
  }

  /** Stops without reconciling (unmount, different match). */
  cancel(): void {
    this.groups = [];
    this.run += 1;
    this.endGroup();
    this.setPlaying(false);
  }

  private now(): number {
    return this.hooks.now?.() ?? Date.now();
  }

  private endGroup(): void {
    this.inCinematic = false;
    this.groupAbort?.abort();
    this.hooks.finishFx();
    this.skipGroup?.();
  }

  private setPlaying(playing: boolean): void {
    if (playing === this.isPlaying) return;
    this.isPlaying = playing;
    if (!playing) this.tapSpeed = 1;
    this.hooks.onPlayingChange(playing);
  }

  private finish(complete: boolean): void {
    this.hooks.reconcile(complete);
    this.setPlaying(false);
  }

  /** Runs one phase of a group: resolves when the handlers finish, the timeout hits, or the group is skipped. */
  private async phase(fn: QueueHooks["play"], group: readonly ViewEvent[], speed: number, cinematic = false): Promise<void> {
    const abort = new AbortController();
    this.groupAbort = abort;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const capped = new Promise<void>((resolve) => {
      this.skipGroup = resolve;
      // Capped per group, and by what is left of the input-block budget (so the 4 s limit holds mid-group too).
      const left = this.opts.maxBlockMs - (this.now() - this.startedAt);
      const cap = (cinematic ? Math.max(this.opts.maxGroupMs, this.opts.cinematicGroupMs) : this.opts.maxGroupMs) / speed;
      timer = setTimeout(resolve, Math.max(0, Math.min(cap, left)));
    });
    let work: Promise<void>;
    try {
      work = Promise.resolve(fn(group, { speed, signal: abort.signal })).catch(() => {});
    } catch {
      work = Promise.resolve();
    }
    await Promise.race([work, capped]);
    clearTimeout(timer);
    this.skipGroup = null;
    if (this.groupAbort === abort) this.groupAbort = null;
    // A skipped group leaves nothing running behind it.
    if (abort.signal.aborted) return;
    abort.abort();
  }

  private async loop(): Promise<void> {
    const run = this.run;
    this.startedAt = this.now();
    this.setPlaying(true);
    while (this.groups.length > 0) {
      const waiting = this.pendingEvents;
      if (waiting > this.opts.skipAt || this.now() - this.startedAt >= this.opts.maxBlockMs || this.hooks.hidden?.()) {
        this.skipAll();
        return;
      }
      const group = this.groups.shift()!;
      const user = Math.max(1, this.hooks.userSpeed?.() ?? 1);
      const speed = Math.max(group.speed, waiting > this.opts.speedUpAt ? 2 : 1) * this.tapSpeed * user;
      const cinematic = this.hooks.cinematic?.(group.events) ?? false;
      this.inCinematic = cinematic;
      await this.phase(this.hooks.play, group.events, speed, cinematic);
      this.inCinematic = false;
      if (run !== this.run) return;
      this.hooks.apply(group.events);
      await this.phase(this.hooks.enter, group.events, speed);
      if (run !== this.run) return;
    }
    this.finish(true);
  }
}
