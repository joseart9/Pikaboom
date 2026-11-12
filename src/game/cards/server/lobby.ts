// Lobby rules (§13.7). Pure: the service decides what to persist and when to start the match.
import type { Seat } from "../engine/types";
import type { LobbyCommand } from "./commands";
import { ServiceError } from "./errors";
import type { LobbySeat, LobbyState } from "./store";

export type { LobbyState } from "./store";

export function newLobby(): LobbyState {
  return { host: emptySeat(), guest: emptySeat() };
}

function emptySeat(): LobbySeat {
  return { deck: null, ready: false };
}

export function lobbySeat(lobby: LobbyState, seat: Seat): LobbySeat {
  return seat === 0 ? lobby.host : lobby.guest;
}

export interface LobbyOutcome {
  lobby: LobbyState;
  /** `cancel`: the host left (match → `cancelled`); `guestLeft`: the guest seat is freed. */
  leave: "cancel" | "guestLeft" | null;
  /** Both seats are ready with a deck (the service also requires a guest before starting). */
  bothReady: boolean;
}

/**
 * Applies a lobby command for `seat` (0 = host). Never mutates `prev`.
 * `selectDeck` sets the deck and clears `ready`; `ready: true` requires a deck (`no_deck`).
 * Deck *validity* (starter id, saved deck ownership) is the service's job (`resolveDeckChoice`).
 */
export function applyLobbyCommand(prev: LobbyState, seat: Seat, cmd: LobbyCommand): LobbyOutcome {
  const lobby = structuredClone(prev);
  const mine = lobbySeat(lobby, seat);
  let leave: LobbyOutcome["leave"] = null;
  switch (cmd.t) {
    case "lobby.selectDeck":
      mine.deck = structuredClone(cmd.deck);
      mine.ready = false;
      break;
    case "lobby.ready":
      if (cmd.ready && !mine.deck) throw new ServiceError(409, "no_deck");
      mine.ready = cmd.ready;
      break;
    case "lobby.leave":
      if (seat === 0) leave = "cancel";
      else {
        lobby.guest = emptySeat();
        leave = "guestLeft";
      }
      break;
  }
  const bothReady = lobby.host.ready && lobby.guest.ready && lobby.host.deck !== null && lobby.guest.deck !== null;
  return { lobby, leave, bothReady };
}
