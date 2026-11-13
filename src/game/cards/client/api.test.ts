import { afterEach, describe, expect, it, vi } from "vitest";
import { commandRequest, newCommandId, pollMatch, purchasePack } from "./api";

const MATCH = "00000000-0000-4000-8000-000000000001";

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("client api", () => {
  it("newCommandId is 32 hex chars and unique", () => {
    const a = newCommandId();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(newCommandId()).not.toBe(a);
  });

  it("commandRequest retries network errors and 5xx with the SAME commandId, then returns the view", async () => {
    const bodies: string[] = [];
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async (_u: string, init: RequestInit) => {
        bodies.push(String(init.body));
        throw new TypeError("network down");
      })
      .mockImplementationOnce(async (_u: string, init: RequestInit) => {
        bodies.push(String(init.body));
        return respond(503, { error: "x", code: "busy" });
      })
      .mockImplementationOnce(async (_u: string, init: RequestInit) => {
        bodies.push(String(init.body));
        return respond(200, { view: { version: 9 } });
      });
    vi.stubGlobal("fetch", fetchMock);
    const r = await commandRequest(MATCH, { t: "endTurn" }, { since: 3 });
    expect(r.ok).toBe(true);
    expect(r.ok && r.view.version).toBe(9);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/cards/matches/${MATCH}/commands?since=3`);
    expect(new Set(bodies).size).toBe(1);
    expect(JSON.parse(bodies[0])).toEqual({ commandId: r.commandId, command: { t: "endTurn" } });
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ "content-type": "application/json" });
  });

  it("4xx answers are final (no retry) and keep code/error/matchId", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(409, { error: "No es tu turno.", code: "not_your_turn" }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await commandRequest(MATCH, { t: "endTurn" });
    expect(r).toMatchObject({ ok: false, status: 409, code: "not_your_turn", error: "No es tu turno." });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("purchasePack (Phase 17) retries a lost answer with the SAME idempotency key; 409 insufficient_funds is final", async () => {
    vi.useFakeTimers();
    try {
      const bodies: string[] = [];
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(async (_u: string, init: RequestInit) => {
          bodies.push(String(init.body));
          throw new TypeError("network down");
        })
        .mockImplementationOnce(async (_u: string, init: RequestInit) => {
          bodies.push(String(init.body));
          return respond(200, { openingId: "o1", cards: ["ignis"], balance: 200, replayed: true });
        })
        .mockResolvedValueOnce(respond(409, { error: "No tienes suficiente Oro.", code: "insufficient_funds" }));
      vi.stubGlobal("fetch", fetchMock);
      const key = newCommandId();
      const pending = purchasePack("arcane", key);
      await vi.runAllTimersAsync();
      expect(await pending).toEqual({ ok: true, openingId: "o1", cards: ["ignis"], balance: 200, replayed: true });
      expect(fetchMock.mock.calls[0][0]).toBe("/api/cards/store/purchase");
      expect(new Set(bodies).size).toBe(1);
      expect(JSON.parse(bodies[0])).toEqual({ packType: "arcane", idempotencyKey: key });
      const broke = await purchasePack("arcane", newCommandId());
      expect(broke).toMatchObject({ ok: false, status: 409, code: "insufficient_funds" });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("pollMatch passes v and since and does not retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(503, { error: "x", code: "unavailable" }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await pollMatch(MATCH, 4, 17);
    expect(r).toMatchObject({ ok: false, status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/cards/matches/${MATCH}?v=4&since=17`);
  });
});
