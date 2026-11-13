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
const collectionRoute = await import("./collection/route");
const walletRoute = await import("./wallet/route");
const storeRoute = await import("./store/route");
const purchaseRoute = await import("./store/purchase/route");
const decksRoute = await import("./decks/route");
const deckRoute = await import("./decks/[id]/route");

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

type DeckCtx = RouteContext<"/api/cards/decks/[id]">;
const deckCtx = (id: string) => ({ params: Promise.resolve({ id }) }) as unknown as DeckCtx;
const listDecks = (user: string | null) => {
  session.user = user;
  return call(decksRoute.GET());
};
const createDeck = (user: string | null, body: unknown) =>
  call(decksRoute.POST(request(user, "/api/cards/decks", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) })));
const getDeckRoute = (user: string | null, id: string) => call(deckRoute.GET(request(user, `/api/cards/decks/${id}`), deckCtx(id)));
const putDeck = (user: string | null, id: string, body: unknown) =>
  call(deckRoute.PUT(request(user, `/api/cards/decks/${id}`, { method: "PUT", body: JSON.stringify(body) }), deckCtx(id)));
const delDeck = (user: string | null, id: string) => call(deckRoute.DELETE(request(user, `/api/cards/decks/${id}`, { method: "DELETE" }), deckCtx(id)));

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

    // Phase 15: code starter decks are rejected; each player's granted saved copy is used instead.
    expect(await command(HOST, id, { t: "lobby.selectDeck", deck: { kind: "starter", id: "starter-undead" } })).toMatchObject({
      status: 409,
      body: { code: "deck_unavailable" },
    });
    for (const user of [HOST, GUEST]) {
      const deckId = ((await listDecks(user)).body.decks as { id: string }[])[0].id;
      expect((await command(user, id, { t: "lobby.selectDeck", deck: { kind: "saved", id: deckId } })).status).toBe(200);
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

describe("GET /api/cards/collection (Phase 14)", () => {
  const collection = (user: string | null) => {
    session.user = user;
    return call(collectionRoute.GET());
  };

  it("401 JSON when signed out", async () => {
    const r = await collection(null);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe("unauthenticated");
    expect(r.cache).toBe("no-store");
  });

  it("grants the starter collection once: 300 Oro, 31 cards owned; a refresh does not grant again", async () => {
    const first = await collection(STRANGER);
    expect(first.status).toBe(200);
    expect(first.cache).toBe("no-store");
    const body = first.body as unknown as { inventory: Record<string, number>; wallet: { balance: number } };
    expect(body.wallet).toEqual({ balance: 300 });
    expect(Object.keys(body.inventory)).toHaveLength(31);
    expect(body.inventory.necromancer).toBe(2);
    expect(body.inventory.morvath).toBe(1);
    expect(body.inventory.squire).toBe(2);
    const again = await collection(STRANGER);
    expect(again.body).toEqual(first.body);
  });
});

describe("GET /api/cards/wallet (Phase 16)", () => {
  const W = "77777777-7777-4777-8777-777777777777"; // a fresh account
  const wallet = (user: string | null) => {
    session.user = user;
    return call(walletRoute.GET());
  };

  it("401 JSON when signed out", async () => {
    const r = await wallet(null);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe("unauthenticated");
    expect(r.cache).toBe("no-store");
  });

  it("first call grants the starter balance; balance + newest ledger rows; a refresh does not grant again", async () => {
    const first = await wallet(W);
    expect(first.status).toBe(200);
    expect(first.cache).toBe("no-store");
    const body = first.body as unknown as { balance: number; transactions: { amount: number; balanceAfter: number; kind: string; createdAt: string }[] };
    expect(body.balance).toBe(300);
    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0]).toMatchObject({ amount: 300, balanceAfter: 300, kind: "starter_grant" });
    const again = await wallet(W);
    expect(again.body).toEqual(first.body);
  });
});

describe("/api/cards/store* (Phase 17)", () => {
  const S = "88888888-8888-4888-8888-888888888888"; // a fresh account with the starter 300 Oro
  const T = "99999999-9999-4999-8999-999999999999";
  const key = (n: number) => n.toString(16).padStart(32, "0");
  const store = (user: string | null) => {
    session.user = user;
    return call(storeRoute.GET());
  };
  const buy = (user: string | null, body: unknown, init: RequestInit = {}) =>
    call(purchaseRoute.POST(request(user, "/api/cards/store/purchase", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), ...init })));
  type Purchase = { openingId: string; cards: string[]; balance: number; replayed: boolean };

  it("401 JSON when signed out, with Cache-Control: no-store", async () => {
    for (const r of [await store(null), await buy(null, { packType: "arcane", idempotencyKey: key(1) })]) {
      expect(r.status).toBe(401);
      expect(r.body.code).toBe("unauthenticated");
      expect(r.cache).toBe("no-store");
    }
  });

  it("GET: offers from config, balance (starter grant), no openings yet", async () => {
    const r = await store(S);
    expect(r.status).toBe(200);
    expect(r.cache).toBe("no-store");
    const body = r.body as unknown as { packs: { type: string; price: number; size: number }[]; balance: number; openings: unknown[] };
    expect(body.packs.map((p) => [p.type, p.price, p.size])).toEqual([["arcane", 100, 5]]);
    expect(body.balance).toBe(300);
    expect(body.openings).toEqual([]);
  });

  it("bad bodies: 415 non-JSON, 400 malformed key, 400 invalid_pack for an unknown type; nothing charged", async () => {
    expect((await buy(T, { packType: "arcane", idempotencyKey: key(1) }, { headers: { "content-type": "text/plain" } })).status).toBe(415);
    expect((await buy(T, "{oops")).status).toBe(400);
    const badKey = await buy(T, { packType: "arcane", idempotencyKey: "nope" });
    expect([badKey.status, badKey.body.code]).toEqual([400, "bad_request"]);
    const badType = await buy(T, { packType: "x", idempotencyKey: key(1) });
    expect([badType.status, badType.body.code, badType.body.error]).toEqual([400, "invalid_pack", "Ese sobre no existe."]);
    expect((await store(T)).body.balance).toBe(300);
  });

  it("300 Oro buys exactly 3 packs; a replayed key returns the same cards without charging; then 409 insufficient_funds", async () => {
    const bought: Purchase[] = [];
    for (let i = 1; i <= 3; i++) {
      const r = await buy(S, { packType: "arcane", idempotencyKey: key(i) });
      expect(r.status).toBe(200);
      bought.push(r.body as unknown as Purchase);
    }
    expect(bought.map((b) => b.balance)).toEqual([200, 100, 0]);
    for (const b of bought) {
      expect(b.cards).toHaveLength(5);
      expect(b.replayed).toBe(false);
    }
    const replay = await buy(S, { packType: "arcane", idempotencyKey: key(2) });
    expect(replay.body).toEqual({ ...bought[1], balance: 0, replayed: true }); // the current balance, not the one at purchase time
    const broke = await buy(S, { packType: "arcane", idempotencyKey: key(4) });
    expect([broke.status, broke.body.code, broke.body.error]).toEqual([409, "insufficient_funds", "No tienes suficiente Oro."]);
    const after = (await store(S)).body as unknown as { balance: number; openings: { id: string; cards: string[] }[] };
    expect(after.balance).toBe(0);
    expect(after.openings.map((o) => o.id)).toEqual([bought[2].openingId, bought[1].openingId, bought[0].openingId]);
    // The collection counts the 15 new cards and the wallet history lists the three debits.
    session.user = S;
    const wallet = (await call(walletRoute.GET())).body as unknown as { transactions: { kind: string; amount: number }[] };
    expect(wallet.transactions.filter((t) => t.kind === "pack_purchase").map((t) => t.amount)).toEqual([-100, -100, -100]);
  });

  it("the client cannot choose the cards: extra body fields are ignored", async () => {
    const r = await buy(T, { packType: "arcane", idempotencyKey: key(9), cards: ["morvath", "morvath", "morvath", "morvath", "morvath"] });
    expect(r.status).toBe(200);
    expect((r.body as unknown as Purchase).cards.filter((c) => c === "morvath").length).toBeLessThan(5);
  });
});

describe("/api/cards/decks* (Phase 15)", () => {
  const D = "55555555-5555-4555-8555-555555555555"; // a fresh account for these tests
  const E = "66666666-6666-4666-8666-666666666666";

  it("every route answers 401 JSON without a session, with Cache-Control: no-store", async () => {
    for (const r of [await listDecks(null), await createDeck(null, { name: "x", entries: [] }), await getDeckRoute(null, FAKE_ID), await putDeck(null, FAKE_ID, {}), await delDeck(null, FAKE_ID)]) {
      expect(r).toMatchObject({ status: 401, body: { code: "unauthenticated" }, cache: "no-store" });
    }
  });

  it("the first list grants the two starter decks (playable) once; max 10", async () => {
    const first = await listDecks(D);
    expect(first.status).toBe(200);
    expect(first.cache).toBe("no-store");
    const decks = first.body.decks as { name: string; cardCount: number; problems: unknown[] }[];
    expect(decks.map((d) => d.name)).toEqual(["Furia Salvaje", "Legión de Huesos"]);
    expect(decks.every((d) => d.cardCount === 30 && d.problems.length === 0)).toBe(true);
    expect(first.body.max).toBe(10);
    expect(((await listDecks(D)).body.decks as unknown[]).length).toBe(2);
  });

  it("create (incomplete ok) → get → update → delete; validation, ownership and other users' decks", async () => {
    const created = await createDeck(D, { name: " Rápido ", entries: [{ cardId: "squire", count: 2 }, { cardId: "wolf-pup", count: 1 }] });
    expect(created.status).toBe(200);
    const deck = created.body.deck as { id: string; name: string; cardCount: number; problems: { code: string }[] };
    expect(deck).toMatchObject({ name: "Rápido", cardCount: 3 });
    expect(deck.problems).toEqual([{ code: "wrong_size", required: 30, actual: 3 }]);

    expect(await getDeckRoute(D, deck.id)).toMatchObject({ status: 200, body: { deck: { id: deck.id } } });
    expect(await getDeckRoute(D, deck.id.toUpperCase())).toMatchObject({ status: 200 });
    expect(await getDeckRoute(E, deck.id)).toMatchObject({ status: 404, body: { code: "deck_not_found", error: "Ese mazo no existe." } });
    expect(await putDeck(E, deck.id, { name: "Mío", entries: [] })).toMatchObject({ status: 404 });
    expect(await delDeck(E, deck.id)).toMatchObject({ status: 404 });
    expect(await getDeckRoute(D, "nuevo")).toMatchObject({ status: 404, body: { code: "deck_not_found" } });

    const third = await putDeck(D, deck.id, { name: "Rápido", entries: [{ cardId: "squire", count: 3 }] });
    expect(third).toMatchObject({ status: 400, body: { code: "invalid_deck", error: "Máximo 2 copias de «Escudero»." } });
    expect(third.body.problems).toContainEqual({ code: "too_many_copies", cardId: "squire", max: 2 });
    expect(await putDeck(D, deck.id, { name: "Rápido", entries: [{ cardId: "ignis", count: 1 }] })).toMatchObject({
      status: 400,
      body: { code: "invalid_deck", error: "No tienes suficientes copias de «Ignis, el Dragón Eterno»." },
    });
    expect(await putDeck(D, deck.id, { name: "", entries: [] })).toMatchObject({ status: 400, body: { code: "invalid_name" } });
    expect(await putDeck(D, deck.id, { name: "x", entries: [], userId: E })).toMatchObject({ status: 400, body: { code: "bad_request" } });
    expect(await createDeck(D, "{nope")).toMatchObject({ status: 400 });

    const updated = await putDeck(D, deck.id, { name: "Lento", entries: [{ cardId: "stone-golem", count: 2 }] });
    expect(updated).toMatchObject({ status: 200, body: { deck: { id: deck.id, name: "Lento", cardCount: 2 } } });
    expect(await delDeck(D, deck.id)).toMatchObject({ status: 200, body: { deleted: true } });
    expect(await delDeck(D, deck.id)).toMatchObject({ status: 404 });
  });

  it("the 11th deck → 409 deck_limit", async () => {
    await listDecks(E); // 2 starters
    for (let i = 0; i < 8; i++) expect((await createDeck(E, { name: `M${i}`, entries: [] })).status).toBe(200);
    expect(await createDeck(E, { name: "Once", entries: [] })).toMatchObject({ status: 409, body: { code: "deck_limit", error: "Máximo 10 mazos." } });
  });
});
