// What the HTTP API accepts (§10.2) and its strict request parser (T16). Pure: no `server-only`.
import { STARTER_DECK_IDS, type StarterDeckId } from "../catalog/starterDecks";
import type { GameCommand } from "../engine/commands";

export type DeckChoice = { kind: "starter"; id: StarterDeckId } | { kind: "saved"; id: string /* uuid */ };

export type LobbyCommand =
  | { t: "lobby.selectDeck"; deck: DeckChoice }
  | { t: "lobby.ready"; ready: boolean }
  | { t: "lobby.leave" };

export type ClientCommand = GameCommand | LobbyCommand;

export interface CommandRequest {
  commandId: string; // 16–64 chars [A-Za-z0-9-]
  command: ClientCommand;
}

/** Max request body size for commands (T16). */
export const MAX_COMMAND_BODY_BYTES = 4096;

/** Client command ids. `:` is reserved for server ids (`sys:timeout:N`, `join:…`), so clients can never pre-empt them. */
export const COMMAND_ID_RE = /^[A-Za-z0-9-]{16,64}$/;
/** Card / unit / hero ids as they appear in commands. */
export const ENTITY_ID_RE = /^(c\d{1,6}|h[01])$/;
const CARD_IID_RE = /^c\d{1,6}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_POSITION = 10;
const MAX_MULLIGAN = 4;

/** A malformed request (always HTTP 400). */
export class RequestError extends Error {
  readonly status = 400;
  constructor(public readonly reason: string) {
    super(`bad request: ${reason}`);
    this.name = "RequestError";
  }
}

export function isRequestError(e: unknown): e is RequestError {
  return e instanceof RequestError;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Requires exactly the `required` keys plus any subset of `optional`, nothing else. */
function checkKeys(o: Record<string, unknown>, required: readonly string[], optional: readonly string[], where: string): void {
  for (const k of required) {
    if (!Object.prototype.hasOwnProperty.call(o, k)) throw new RequestError(`${where}: missing ${k}`);
  }
  for (const k of Object.keys(o)) {
    if (!required.includes(k) && !optional.includes(k)) throw new RequestError(`${where}: unexpected ${k}`);
  }
}

function entityId(v: unknown, field: string): string {
  if (typeof v !== "string" || !ENTITY_ID_RE.test(v)) throw new RequestError(`invalid ${field}`);
  return v;
}

function parseDeckChoice(v: unknown): DeckChoice {
  if (!isPlainObject(v)) throw new RequestError("invalid deck");
  checkKeys(v, ["kind", "id"], [], "deck");
  if (v.kind === "starter") {
    if (typeof v.id !== "string" || !(STARTER_DECK_IDS as readonly string[]).includes(v.id)) throw new RequestError("invalid deck id");
    return { kind: "starter", id: v.id as StarterDeckId };
  }
  if (v.kind === "saved") {
    if (typeof v.id !== "string" || !UUID_RE.test(v.id)) throw new RequestError("invalid deck id");
    return { kind: "saved", id: v.id.toLowerCase() };
  }
  throw new RequestError("invalid deck kind");
}

function parseCommand(v: unknown): ClientCommand {
  if (!isPlainObject(v)) throw new RequestError("command must be an object");
  switch (v.t) {
    case "mulligan": {
      checkKeys(v, ["t", "replace"], [], "mulligan");
      const r = v.replace;
      if (!Array.isArray(r) || r.length > MAX_MULLIGAN) throw new RequestError("invalid replace");
      for (const id of r) if (typeof id !== "string" || !CARD_IID_RE.test(id)) throw new RequestError("invalid replace");
      return { t: "mulligan", replace: [...(r as string[])] };
    }
    case "play": {
      checkKeys(v, ["t", "card"], ["position", "target"], "play");
      const cmd: Extract<GameCommand, { t: "play" }> = { t: "play", card: entityId(v.card, "card") };
      if (v.position !== undefined) {
        const p = v.position;
        if (typeof p !== "number" || !Number.isInteger(p) || p < 0 || p > MAX_POSITION) throw new RequestError("invalid position");
        cmd.position = p;
      }
      if (v.target !== undefined) cmd.target = entityId(v.target, "target");
      return cmd;
    }
    case "attack":
      checkKeys(v, ["t", "attacker", "target"], [], "attack");
      return { t: "attack", attacker: entityId(v.attacker, "attacker"), target: entityId(v.target, "target") };
    case "endTurn":
      checkKeys(v, ["t"], [], "endTurn");
      return { t: "endTurn" };
    case "concede":
      checkKeys(v, ["t"], [], "concede");
      return { t: "concede" };
    case "lobby.selectDeck":
      checkKeys(v, ["t", "deck"], [], "selectDeck");
      return { t: "lobby.selectDeck", deck: parseDeckChoice(v.deck) };
    case "lobby.ready":
      checkKeys(v, ["t", "ready"], [], "ready");
      if (typeof v.ready !== "boolean") throw new RequestError("invalid ready");
      return { t: "lobby.ready", ready: v.ready };
    case "lobby.leave":
      checkKeys(v, ["t"], [], "leave");
      return { t: "lobby.leave" };
    default:
      throw new RequestError("unknown command");
  }
}

/** Strict type guard for an already-parsed JSON body. Returns a fresh object (never the input). Throws `RequestError`. */
export function parseCommandRequest(body: unknown): CommandRequest {
  if (!isPlainObject(body)) throw new RequestError("body must be an object");
  checkKeys(body, ["commandId", "command"], [], "request");
  if (typeof body.commandId !== "string" || !COMMAND_ID_RE.test(body.commandId)) throw new RequestError("invalid commandId");
  return { commandId: body.commandId, command: parseCommand(body.command) };
}

/** Size check + JSON parse + `parseCommandRequest`, for route handlers that read the raw body text. */
export function parseCommandBody(text: string): CommandRequest {
  if (new TextEncoder().encode(text).length > MAX_COMMAND_BODY_BYTES) throw new RequestError("body too large");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new RequestError("invalid JSON");
  }
  return parseCommandRequest(body);
}

export function isLobbyCommand(cmd: { t: string }): cmd is LobbyCommand | { t: "lobby.join" } {
  return cmd.t.startsWith("lobby.");
}
