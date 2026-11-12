"use client";

// Real matches over HTTP (§13.5): a port of src/game/battleship/useRoom.ts's sync loop without React.
// - Polls GET /matches/[id]?v=&since= every 1 s (2 s while the realtime nudge channel is live); unchanged → `{ same }`.
// - Pauses while the page is hidden; polls immediately on visibilitychange/online/focus/pageshow and on a nudge.
// - "reconnecting" after 6 s without a successful sync; 401/403/404 are fatal.
// - Commands go through `commandRequest` (same commandId on every retry); each success is broadcast as `{ v }`.
import { t } from "../i18n";
import type { ClientCommand } from "../server/commands";
import type { MatchView } from "../server/view";
import { commandRequest, pollMatch } from "./api";
import { connectNudger, type Nudger } from "./realtime";
import type { ConnStatus, MatchTransport, SendResult, TransportUpdate } from "./transport";

export const POLL_MS = 1000;
export const POLL_MS_REALTIME = 2000;
export const STALE_MS = 6000;

const WAKE_EVENTS = ["online", "focus", "pageshow"] as const;

export class HttpTransport implements MatchTransport {
  private onUpdate: (u: TransportUpdate) => void = () => {};
  private version = -1;
  private lastSeq = 0;
  private lastOk = 0;
  private status: ConnStatus = "connecting";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inflight = false;
  private stopped = true;
  private nudger: Nudger | null = null;
  private readonly wake = () => {
    if (document.visibilityState === "visible") void this.poll();
  };

  constructor(private readonly matchId: string) {}

  start(onUpdate: (u: TransportUpdate) => void): void {
    this.onUpdate = onUpdate;
    this.stopped = false;
    this.lastOk = Date.now();
    document.addEventListener("visibilitychange", this.wake);
    for (const e of WAKE_EVENTS) window.addEventListener(e, this.wake);
    this.nudger = connectNudger(this.matchId, (v) => {
      if (v > this.version) void this.poll();
    });
    void this.poll();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    document.removeEventListener("visibilitychange", this.wake);
    for (const e of WAKE_EVENTS) window.removeEventListener(e, this.wake);
    this.nudger?.close();
    this.nudger = null;
  }

  private setStatus(status: ConnStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.onUpdate({ status });
  }

  private schedule(): void {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.poll(), this.nudger?.isLive() ? POLL_MS_REALTIME : POLL_MS);
  }

  private accept(view: MatchView): void {
    if (view.version < this.version) return;
    this.version = view.version;
    if (view.game) this.lastSeq = Math.max(this.lastSeq, view.game.lastSeq);
    this.lastOk = Date.now();
    this.setStatus("online");
    this.onUpdate({ view, serverNow: view.serverNow });
  }

  private async poll(): Promise<void> {
    if (this.stopped || this.inflight) return;
    if (document.visibilityState === "hidden") {
      this.schedule();
      return;
    }
    this.inflight = true;
    try {
      const r = await pollMatch(this.matchId, this.version >= 0 ? this.version : undefined, this.lastSeq || undefined);
      if (this.stopped) return;
      if (r.ok) {
        if ("view" in r && r.view) this.accept(r.view);
        else if (r.same) {
          this.lastOk = Date.now();
          this.setStatus("online");
          this.onUpdate({ serverNow: r.serverNow, foeOnline: r.foeOnline });
        }
      } else if (r.status === 401) {
        this.onUpdate({ fatal: t("auth.loginToPlay") });
        this.stop();
        return;
      } else if (r.status === 403 || r.status === 404) {
        this.onUpdate({ fatal: r.error || t("matchErrors.not_found") });
        this.stop();
        return;
      } else if (Date.now() - this.lastOk > STALE_MS) {
        this.setStatus("reconnecting");
      }
    } finally {
      this.inflight = false;
      this.schedule();
    }
  }

  async send(command: ClientCommand): Promise<SendResult> {
    const r = await commandRequest(this.matchId, command, { since: this.lastSeq || undefined });
    if (r.ok) {
      this.accept(r.view);
      this.nudger?.send(r.view.version);
      return { ok: true, view: r.view };
    }
    if (r.status === 409) void this.poll(); // resync after a rejected command (state may have moved on)
    if (r.status === 0 || r.status >= 500) return { ok: false, error: t("match.noConnection"), code: r.code };
    return { ok: false, error: r.error || t("errors.invalid_target"), code: r.code };
  }
}
