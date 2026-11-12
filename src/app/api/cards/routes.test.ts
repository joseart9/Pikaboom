// Route-level tests for /api/cards/matches* (Phase 9): the real handlers over the dev memory store, with the
// session mocked (`session.user` plays the role of the auth cookie). Covers 401/415/413/404, T1, T12, T15.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GUEST, HOST, STRANGER } from "@/game/cards/testing/server";

const session = vi.hoisted(() => {
  // Always the in-memory store here, even if the shell has DB credentials (DB coverage lives in *.db.test.ts).
  delete process.env.SUPABASE_DB_URL;
  delete process.env.SUPABASE_DB_PASSWORD;
  return { user: null as string | null };
});

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  const names: Record<string, string> = {
    "11111111-1111-4111-8111-111111111111": "Ana",
    "22222222-2222-4222-8222-222222222222": "Beto",
  };
  return {
    ...actual,
    requireUser: async () => {
      if (!session.user) throw new actual.AuthError();
      return { id: session.user, email: null, username: names[session.user] ?? "Ceci" };
    },
  };
});

const createRoute = await import("./matches/route");
const joinRoute = await import("./matches/join/route");
const currentRoute = await import("./matches/current/route");
const pollRoute = await import("./matches/[id]/route");
const commandRoute = await import("./matches/[id]/commands/route");

type Body = Record<string, unknown> & { view?: Record<string, unknown> & { game?: Record<string, unknown> | null } };

function request(user: string | null, url: string, init: RequestInit = {}): Request {
  const h = new Headers(init.headers);
  if (init.body !== undefined && !h.has("content-type")) h.set("content-type", "application/json");
  session.user = user;
  return new Request(`http://localhost${url}`, { ...init, headers: h });
}

type MatchRoute = "/api/cards/matches/[id]" | "/api/cards/matches/[id]/commands";
const ctx = <T extends MatchRoute>(id: string) => ({ params: Promise.resolve({ id }) }) as unknown as RouteContext<T>;

async function call(res: Promise<Response>): Promise<{ status: number; body: Body; cache: string | null }> {
  const r = await res;
  return { status: r.status, body: (await r.json()) as Body, cache: r.headers.get("cache-control") };
}

const create = (user: string | null, init: RequestInit = { method: "POST", body: "{}" }) => call(createRoute.POST(request(user, "/api/cards/matches", init)));
const join = (user: string, code: string) =>
  call(joinRoute.POST(request(user, "/api/cards/matches/join", { method: "POST", body: JSON.stringify({ code }) })));
const poll = (user: string | null, id: string, qs = "") => call(pollRoute.GET(request(user, `/api/cards/matches/${id}${qs}`), ctx<"/api/cards/matches/[id]">(id)));
let n = 0;
const command = (user: string | null, id: string, cmd: unknown, init: RequestInit = {}) =>
  call(
    commandRoute.POST(
      request(user, `/api/cards/matches/${id}/commands`, { method: "POST", body: JSON.stringify({ commandId: `cmd-${String(++n).padStart(16, "0")}`, command: cmd }), ...init }),
      ctx<"/api/cards/matches/[id]/commands">(id),
    ),
  );

const FAKE_ID = "00000000-0000-4000-8000-0000000000ff";

beforeEach(() => {
  session.user = null;
});

describe("/api/cards/matches*", () => {
  it("every route answers 401 JSON without a session, with Cache-Control: no-store", async () => {
    const results = [
      await create(null),
      await call(joinRoute.POST(request(null, "/api/cards/matches/join", { method: "POST", body: '{"code":"ABCDEF"}' }))),
      await call(currentRoute.GET()),
      await poll(null, FAKE_ID),
      await command(null, FAKE_ID, { t: "endTurn" }),
    ];
    for (const r of results) {
      expect(r.status).toBe(401);
      expect(r.body).toEqual({ error: "Inicia sesión para jugar.", code: "unauthenticated" });
      expect(r.cache).toBe("no-store");
    }
  });

  it("rejects non-JSON (415), oversize (413), malformed (400) bodies and bad ids (404)", async () => {
    const form = await create(HOST, { method: "POST", body: "{}", headers: { "content-type": "text/plain" } });
    expect(form).toMatchObject({ status: 415, body: { code: "unsupported_media_type" } });
    const big = await command(HOST, FAKE_ID, { t: "endTurn", pad: "x".repeat(5000) });
    expect(big).toMatchObject({ status: 413, body: { code: "payload_too_large" } });
    const bad = await call(
      commandRoute.POST(request(HOST, `/api/cards/matches/${FAKE_ID}/commands`, { method: "POST", body: "{nope" }), ctx<"/api/cards/matches/[id]/commands">(FAKE_ID)),
    );
    expect(bad).toMatchObject({ status: 400, body: { code: "bad_request" } });
    const extra = await command(HOST, FAKE_ID, { t: "endTurn", seat: 1 });
    expect(extra).toMatchObject({ status: 400, body: { code: "bad_request", error: "Solicitud no válida." } });
    expect(await poll(HOST, "not-a-uuid")).toMatchObject({ status: 404, body: { code: "not_found" } });
    expect(await command(HOST, "../../etc", { t: "endTurn" })).toMatchObject({ status: 404 });
    expect(await poll(HOST, FAKE_ID)).toMatchObject({ status: 404, body: { code: "not_found" } });
  });

  it("create → join → select decks → ready → active; poll, same, idempotent retry, T1 and T12", async () => {
    const created = await create(HOST);
    expect(created.status).toBe(200);
    const id = created.body.view!.matchId as string;
    const code = (created.body.view!.lobby as { code: string }).code;
    session.user = HOST;
    expect(await call(currentRoute.GET())).toMatchObject({ status: 200, body: { matchId: id } });

    const joined = await join(GUEST, code);
    expect(joined).toMatchObject({ status: 200, body: { view: { matchId: id, seat: 1 } } });
    expect(await join(STRANGER, code)).toMatchObject({ status: 409, body: { code: "full" } });
    expect(await poll(STRANGER, id)).toMatchObject({ status: 403, body: { code: "not_in_match" } }); // T12

    for (const [user, deck] of [
      [HOST, "starter-undead"],
      [GUEST, "starter-beast"],
    ] as const) {
      expect((await command(user, id, { t: "lobby.selectDeck", deck: { kind: "starter", id: deck } })).status).toBe(200);
    }
    await command(HOST, id, { t: "lobby.ready", ready: true });
    const started = await command(GUEST, id, { t: "lobby.ready", ready: true });
    expect(started.body.view).toMatchObject({ status: "active" });

    const hostView = await poll(HOST, id);
    const game = hostView.body.view!.game as { me: { hand: unknown[] }; foe: Record<string, unknown> };
    expect([3, 4]).toContain(game.me.hand.length);
    expect(game.foe).toHaveProperty("handCount");
    expect(game.foe).not.toHaveProperty("hand");
    const version = hostView.body.view!.version as number;
    const same = await poll(HOST, id, `?v=${version}&since=999`);
    expect(same.body).toMatchObject({ same: true, version });
    expect(JSON.stringify(same.body).length).toBeLessThan(200);

    // Same commandId twice → same version (idempotent).
    const body = JSON.stringify({ commandId: "retry-0000000000000001", command: { t: "mulligan", replace: [] } });
    const send = () =>
      call(commandRoute.POST(request(HOST, `/api/cards/matches/${id}/commands`, { method: "POST", body }), ctx<"/api/cards/matches/[id]/commands">(id)));
    const first = await send();
    const second = await send();
    expect(first.status).toBe(200);
    expect(second.body.view!.version).toBe(first.body.view!.version);

    await command(GUEST, id, { t: "mulligan", replace: [] });
    const playing = (await poll(HOST, id)).body.view!.game as { activeSeat: 0 | 1 };
    const inactive = playing.activeSeat === 0 ? GUEST : HOST;
    expect(await command(inactive, id, { t: "endTurn" })).toMatchObject({ status: 409, body: { code: "not_your_turn", error: "No es tu turno." } }); // T1
  });
});
