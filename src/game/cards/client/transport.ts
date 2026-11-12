// How a MatchClient talks to a match (Phase 10): over HTTP (real matches) or in-browser (dev sandbox).
import type { ClientCommand } from "../server/commands";
import type { MatchView } from "../server/view";

export type ConnStatus = "connecting" | "online" | "reconnecting";

export interface TransportUpdate {
  view?: MatchView;
  status?: ConnStatus;
  /** Unrecoverable (403/404/401): the UI leaves the match. Spanish text. */
  fatal?: string;
  /** Latest server clock (ISO), from views and `{ same }` polls, for `clockOffsetMs`. */
  serverNow?: string;
  /** Opponent presence from a `{ same }` poll (views carry it in `view.foeOnline`). */
  foeOnline?: boolean;
}

export type SendResult = { ok: true; view: MatchView } | { ok: false; error: string; code?: string };

export interface MatchTransport {
  start(onUpdate: (u: TransportUpdate) => void): void;
  send(command: ClientCommand): Promise<SendResult>;
  stop(): void;
}
