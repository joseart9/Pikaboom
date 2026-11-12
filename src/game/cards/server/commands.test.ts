import { describe, expect, it } from "vitest";
import { MAX_COMMAND_BODY_BYTES, parseCommandBody, parseCommandRequest, RequestError } from "./commands";

const ID = "4f1c0d2a9b7e4c11a2b3c4d5e6f70812";

function rejects(body: unknown): void {
  expect(() => parseCommandRequest(body)).toThrow(RequestError);
}

describe("parseCommandRequest (Phase 8 row 12, T16)", () => {
  it("accepts the §10.2 example payloads and every command kind", () => {
    expect(parseCommandRequest({ commandId: ID, command: { t: "play", card: "c14", position: 2, target: "c33" } })).toEqual({
      commandId: ID,
      command: { t: "play", card: "c14", position: 2, target: "c33" },
    });
    const ok = [
      { t: "attack", attacker: "c9", target: "h1" },
      { t: "endTurn" },
      { t: "concede" },
      { t: "mulligan", replace: [] },
      { t: "mulligan", replace: ["c1", "c2", "c3", "c4"] },
      { t: "play", card: "c1" },
      { t: "play", card: "c1", position: 0 },
      { t: "play", card: "c1", position: 10, target: "h0" },
      { t: "lobby.selectDeck", deck: { kind: "starter", id: "starter-undead" } },
      { t: "lobby.selectDeck", deck: { kind: "saved", id: "0b1c2d3e-4f50-4172-8394-a5b6c7d8e9f0" } },
      { t: "lobby.ready", ready: true },
      { t: "lobby.ready", ready: false },
      { t: "lobby.leave" },
    ];
    for (const command of ok) expect(parseCommandRequest({ commandId: ID, command }).command).toEqual(command);
  });

  it("rejects a missing or malformed commandId", () => {
    rejects({ command: { t: "endTurn" } });
    rejects({ commandId: "short", command: { t: "endTurn" } });
    rejects({ commandId: "x".repeat(65), command: { t: "endTurn" } });
    rejects({ commandId: "sys:timeout:0000000000001", command: { t: "endTurn" } }); // ':' is server-only
    rejects({ commandId: 12345678901234567, command: { t: "endTurn" } });
  });

  it("rejects extra fields at every level", () => {
    rejects({ commandId: ID, command: { t: "endTurn" }, seat: 1 });
    rejects({ commandId: ID, command: { t: "endTurn", seat: 0 } });
    rejects({ commandId: ID, command: { t: "play", card: "c1", mana: 10 } });
    rejects({ commandId: ID, command: { t: "lobby.selectDeck", deck: { kind: "starter", id: "starter-undead", cards: [] } } });
  });

  it("rejects bad field types and values", () => {
    rejects({ commandId: ID, command: { t: "play", card: "c1", position: 1.5 } });
    rejects({ commandId: ID, command: { t: "play", card: "c1", position: -1 } });
    rejects({ commandId: ID, command: { t: "play", card: "c1", position: 11 } });
    rejects({ commandId: ID, command: { t: "play", card: "c1", position: "1" } });
    rejects({ commandId: ID, command: { t: "play", card: "c1", target: "x" } });
    rejects({ commandId: ID, command: { t: "play", card: "h2" } });
    rejects({ commandId: ID, command: { t: "play" } });
    rejects({ commandId: ID, command: { t: "attack", attacker: "c1" } });
    rejects({ commandId: ID, command: { t: "attack", attacker: "c1234567", target: "h0" } });
    rejects({ commandId: ID, command: { t: "mulligan", replace: ["c1", "c2", "c3", "c4", "c5"] } });
    rejects({ commandId: ID, command: { t: "mulligan", replace: ["h0"] } });
    rejects({ commandId: ID, command: { t: "mulligan", replace: "c1" } });
    rejects({ commandId: ID, command: { t: "lobby.ready", ready: "yes" } });
    rejects({ commandId: ID, command: { t: "lobby.selectDeck", deck: { kind: "starter", id: "starter-dragons" } } });
    rejects({ commandId: ID, command: { t: "lobby.selectDeck", deck: { kind: "saved", id: "not-a-uuid" } } });
    rejects({ commandId: ID, command: { t: "lobby.selectDeck", deck: { kind: "shared", id: "x" } } });
  });

  it("rejects unknown and server-only command types", () => {
    for (const t of ["fly", "timeout", "mulliganTimeout", "lobby.join", "lobby.start", undefined]) {
      rejects({ commandId: ID, command: { t } });
    }
    rejects({ commandId: ID, command: null });
    rejects({ commandId: ID, command: [] });
    rejects(null);
    rejects([]);
    rejects("endTurn");
  });

  it("rejects inherited or exotic objects", () => {
    rejects(Object.assign(Object.create({ evil: true }), { commandId: ID, command: { t: "endTurn" } }));
    rejects({ commandId: ID, command: new Map([["t", "endTurn"]]) });
  });

  it("returns a fresh object, not the input", () => {
    const body = { commandId: ID, command: { t: "mulligan", replace: ["c1"] } };
    const parsed = parseCommandRequest(body);
    expect(parsed.command).not.toBe(body.command);
    expect((parsed.command as { replace: string[] }).replace).not.toBe(body.command.replace);
  });
});

describe("parseCommandBody", () => {
  it("parses JSON text and enforces the 4 KB limit", () => {
    expect(parseCommandBody(JSON.stringify({ commandId: ID, command: { t: "endTurn" } })).command).toEqual({ t: "endTurn" });
    expect(() => parseCommandBody("{nope")).toThrow(RequestError);
    const big = JSON.stringify({ commandId: ID, command: { t: "endTurn" }, pad: "x".repeat(MAX_COMMAND_BODY_BYTES) });
    expect(() => parseCommandBody(big)).toThrow(/too large/);
  });
});
