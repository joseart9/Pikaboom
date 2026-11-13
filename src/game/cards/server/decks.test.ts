// Phase 15: the memory deck store follows the DeckStore contract (Postgres: decks.db.test.ts); DeckService rules
// (normalization, save-mode validation with Spanish messages, ownership, 404s); and the lobby with saved decks —
// snapshot at start, edits after the start, a deck deleted after selection (Phase 15 H).
import { describe, expect, it } from "vitest";
import { STARTER_DECKS } from "../catalog/starterDecks";
import { expandDeck } from "../decks/validate";
import { t } from "../i18n";
import { defineDeckStoreTests } from "../testing/deckSuite";
import { expectError, GUEST, HOST, loadRow, makeService, req, starterChoice, STRANGER, type TestService } from "../testing/server";
import { MemoryCollectionStore } from "./collection";
import { DeckService, MemoryDeckStore } from "./decks";
import { isServiceError } from "./errors";

describe("MemoryDeckStore (shared contract)", () => {
  defineDeckStoreTests(() => new MemoryDeckStore(), [HOST, GUEST]);
});

function service(): { decks: DeckService; collection: MemoryCollectionStore; store: MemoryDeckStore } {
  const store = new MemoryDeckStore();
  const collection = new MemoryCollectionStore(undefined, store);
  return { decks: new DeckService({ decks: store, collection }), collection, store };
}

async function rejection(p: Promise<unknown>): Promise<{ status: number; code: string; message: string; details: Record<string, unknown> }> {
  const e = await p.then(
    () => expect.fail("expected a rejection"),
    (err: unknown) => err,
  );
  if (!isServiceError(e)) throw e;
  return { status: e.status, code: e.code, message: e.message, details: e.details };
}

describe("DeckService", () => {
  it("the collection's starter grant also saves both starter decks, once (memory store)", async () => {
    const { decks, collection } = service();
    expect(await decks.listDecks(HOST)).toEqual([]);
    await collection.ensureStarterGrant(HOST);
    await collection.ensureStarterGrant(HOST);
    const list = await decks.listDecks(HOST);
    expect(list.map((d) => d.name).sort()).toEqual([t("starterDecks.beast"), t("starterDecks.undead")].sort());
    for (const d of list) {
      expect(d).toMatchObject({ format: "standard", cardCount: 30, problems: [] }); // playable with the granted cards
      expect(Date.parse(d.updatedAt)).not.toBeNaN();
    }
  });

  it("normalizes: trims/collapses the name, merges duplicate entries, sorts by card id, counts server-side", async () => {
    const { decks, collection } = service();
    await collection.ensureStarterGrant(HOST);
    const d = await decks.createDeck(HOST, {
      name: "  Mi   mazo  ",
      entries: [{ cardId: "squire", count: 1 }, { cardId: "arcane-spark", count: 2 }, { cardId: "squire", count: 1 }],
    });
    expect(d).toMatchObject({ name: "Mi mazo", cardCount: 4, entries: [{ cardId: "arcane-spark", count: 2 }, { cardId: "squire", count: 2 }] });
  });

  it("incomplete decks save (22/30) and report wrong_size for play", async () => {
    const { decks, collection } = service();
    await collection.ensureStarterGrant(HOST);
    const entries = STARTER_DECKS["starter-undead"].entries.filter((e) => !["necromancer", "soul-harvest", "morvath", "stone-golem", "bone-storm"].includes(e.cardId));
    const d = await decks.createDeck(HOST, { name: "Incompleto", entries });
    expect(d.cardCount).toBe(22);
    expect(d.problems).toEqual([{ code: "wrong_size", required: 30, actual: 22 }]);
  });

  it("rejects bad names, a 3rd copy, a 2nd legendary copy, two Únicas, unowned cards and > 30 cards (400 + Spanish + problems)", async () => {
    const { decks, collection } = service();
    await collection.ensureStarterGrant(HOST);
    for (const name of ["", "   ", "x".repeat(31)]) {
      expect(await rejection(decks.createDeck(HOST, { name, entries: [] }))).toMatchObject({ status: 400, code: "invalid_name" });
    }
    const third = await rejection(decks.createDeck(HOST, { name: "A", entries: [{ cardId: "squire", count: 3 }] }));
    expect(third).toMatchObject({ status: 400, code: "invalid_deck", message: "Máximo 2 copias de «Escudero»." });
    expect(third.details.problems).toContainEqual({ code: "too_many_copies", cardId: "squire", max: 2 });
    expect(await rejection(decks.createDeck(HOST, { name: "A", entries: [{ cardId: "morvath", count: 2 }] }))).toMatchObject({
      message: "Máximo 1 copias de «Morvath, Señor de la Cripta».",
    });
    // Ignis is not granted: ownership is checked against the inventory.
    expect(await rejection(decks.createDeck(HOST, { name: "A", entries: [{ cardId: "ignis", count: 1 }] }))).toMatchObject({
      code: "invalid_deck",
      message: "No tienes suficientes copias de «Ignis, el Dragón Eterno».",
    });
    expect(await rejection(decks.createDeck(HOST, { name: "A", entries: [{ cardId: "skeleton", count: 1 }] }))).toMatchObject({ code: "invalid_deck" });
    expect(await rejection(decks.createDeck(HOST, { name: "A", entries: [{ cardId: "nope", count: 1 }] }))).toMatchObject({ code: "invalid_deck" });
    expect(await rejection(decks.createDeck(HOST, { name: "A", entries: [{ cardId: "squire", count: 1.5 }] }))).toMatchObject({ code: "invalid_deck" });
    const big = [...STARTER_DECKS["starter-undead"].entries, { cardId: "wolf-pup", count: 2 }];
    expect(await rejection(decks.createDeck(HOST, { name: "A", entries: big }))).toMatchObject({ code: "invalid_deck", message: "El mazo no puede tener más de 30 cartas." });
    expect(await decks.listDecks(HOST)).toHaveLength(2); // only the starters
  });

  it("get/update/delete: 404 deck_not_found for unknown or someone else's deck", async () => {
    const { decks, collection } = service();
    await collection.ensureStarterGrant(HOST);
    const [first] = await decks.listDecks(HOST);
    expect(await rejection(decks.getDeck(GUEST, first.id))).toMatchObject({ status: 404, code: "deck_not_found", message: "Ese mazo no existe." });
    expect(await rejection(decks.updateDeck(GUEST, first.id, { name: "Mío", entries: [] }))).toMatchObject({ status: 404 });
    expect(await rejection(decks.deleteDeck(GUEST, first.id))).toMatchObject({ status: 404 });
    const renamed = await decks.updateDeck(HOST, first.id, { name: "Renombrado", entries: first.entries });
    expect(renamed).toMatchObject({ id: first.id, name: "Renombrado", cardCount: 30 });
    await decks.deleteDeck(HOST, first.id);
    expect(await rejection(decks.getDeck(HOST, first.id))).toMatchObject({ status: 404 });
  });

  it("the 11th deck → 409 deck_limit «Máximo 10 mazos.»", async () => {
    const { decks, collection } = service();
    await collection.ensureStarterGrant(HOST); // 2 starters
    for (let i = 0; i < 8; i++) await decks.createDeck(HOST, { name: `M${i}`, entries: [] });
    expect(await rejection(decks.createDeck(HOST, { name: "M9", entries: [] }))).toEqual({ status: 409, code: "deck_limit", message: "Máximo 10 mazos.", details: {} });
  });
});

describe("lobby with saved decks (Phase 15 I service tests)", () => {
  async function lobby(t: TestService): Promise<string> {
    const { matchId, lobby: l } = await t.service.createLobby(HOST, "Ana");
    await t.service.joinByCode(GUEST, "Beto", l!.code);
    return matchId;
  }

  it("start snapshots the saved deck; editing or deleting it afterwards does not change the match", async () => {
    const t = makeService();
    const id = await lobby(t);
    const hostDeck = await starterChoice(t, HOST, "undead");
    await t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: hostDeck }));
    await t.service.submitCommand(id, GUEST, req({ t: "lobby.selectDeck", deck: await starterChoice(t, GUEST, "beast") }));
    await t.service.submitCommand(id, HOST, req({ t: "lobby.ready", ready: true }));
    const started = await t.service.submitCommand(id, GUEST, req({ t: "lobby.ready", ready: true }));
    expect(started.status).toBe("active");

    const before = await loadRow(t, id);
    const composition = (ids: readonly string[]) => [...ids].sort();
    const expected = composition(expandDeck(STARTER_DECKS["starter-undead"].entries));
    expect(composition(before.setup!.players[0].deck)).toEqual(expected);
    const inMatch = () => {
      const p = before.state!.players[0];
      const bonus = before.setup!.rules.hand.secondPlayerBonusCard; // a token the second player gets on top
      return composition([...p.deck, ...p.hand].map((c) => c.defId).filter((d) => d !== bonus));
    };
    expect(inMatch()).toEqual(expected);

    await t.decks.updateDeck(HOST, hostDeck.id, { name: "Cambiado", entries: [{ cardId: "squire", count: 2 }] });
    await t.decks.deleteDeck(HOST, hostDeck.id);
    const after = await loadRow(t, id);
    expect(after.setup).toEqual(before.setup);
    expect(after.state).toEqual(before.state);
  });

  it("selecting: someone else's deck → deck_unavailable; an incomplete deck → deck_invalid with the problem text", async () => {
    const t = makeService();
    const id = await lobby(t);
    const guestDeck = await starterChoice(t, GUEST, "beast");
    await expectError(t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: guestDeck })), 409, "deck_unavailable");
    await t.collection.ensureStarterGrant(HOST);
    const small = await t.decks.createDeck(HOST, { name: "Corto", entries: [{ cardId: "squire", count: 2 }] });
    const err = await expectError(t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: { kind: "saved", id: small.id } })), 409, "deck_invalid");
    expect(err.message).toBe("El mazo necesita exactamente 30 cartas (tiene 2).");
    expect((await loadRow(t, id)).lobby.host.deck).toBeNull();
  });

  it("deck deleted after selection → no start: that deck cleared, both unready, lastError; re-selecting clears it", async () => {
    const t = makeService();
    const id = await lobby(t);
    const hostDeck = await starterChoice(t, HOST, "undead");
    const guestDeck = await starterChoice(t, GUEST, "beast");
    await t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: hostDeck }));
    await t.service.submitCommand(id, GUEST, req({ t: "lobby.selectDeck", deck: guestDeck }));
    await t.service.submitCommand(id, HOST, req({ t: "lobby.ready", ready: true }));
    await t.decks.deleteDeck(HOST, hostDeck.id);

    const view = await t.service.submitCommand(id, GUEST, req({ t: "lobby.ready", ready: true }));
    expect(view.status).toBe("lobby");
    expect(view.lobby).toMatchObject({ host: { deckChosen: false, ready: false }, guest: { deckChosen: true, ready: false }, lastError: { seat: 0, code: "deck_unavailable" } });
    const row = await loadRow(t, id);
    expect(row.lobby.host.deck).toBeNull();
    expect(row.lobby.guest.deck).toEqual(guestDeck);
    expect(row.state).toBeNull();
    const hostRead = (await t.service.readMatch(id, HOST)) as { view: typeof view };
    expect(hostRead.view.lobby!.lastError).toEqual({ seat: 0, code: "deck_unavailable" });

    // The guest re-selecting does not clear the host's notice; the host picking another deck does, and play proceeds.
    await t.service.submitCommand(id, GUEST, req({ t: "lobby.selectDeck", deck: guestDeck }));
    expect((await loadRow(t, id)).lobby.lastError).toEqual({ seat: 0, code: "deck_unavailable" });
    const picked = await t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: await starterChoice(t, HOST, "beast") }));
    expect(picked.lobby!.lastError).toBeUndefined();
    await t.service.submitCommand(id, HOST, req({ t: "lobby.ready", ready: true }));
    expect((await t.service.submitCommand(id, GUEST, req({ t: "lobby.ready", ready: true }))).status).toBe("active");
  });

  it("the guest's deck losing validity after selection is reported for seat 1", async () => {
    const t = makeService();
    const id = await lobby(t);
    await t.service.submitCommand(id, HOST, req({ t: "lobby.selectDeck", deck: await starterChoice(t, HOST, "undead") }));
    const guestDeck = await starterChoice(t, GUEST, "beast");
    await t.service.submitCommand(id, GUEST, req({ t: "lobby.selectDeck", deck: guestDeck }));
    await t.service.submitCommand(id, GUEST, req({ t: "lobby.ready", ready: true }));
    // Edited down to 2 cards in another tab.
    await t.decks.updateDeck(GUEST, guestDeck.id, { name: "Furia", entries: [{ cardId: "wolf-pup", count: 2 }] });
    const view = await t.service.submitCommand(id, HOST, req({ t: "lobby.ready", ready: true }));
    expect(view.lobby).toMatchObject({ guest: { deckChosen: false, ready: false }, host: { ready: false }, lastError: { seat: 1, code: "deck_unavailable" } });
  });

  it("a stranger cannot use a lobby to probe someone's deck ids", async () => {
    const t = makeService();
    const { matchId, lobby: l } = await t.service.createLobby(STRANGER, "Ceci");
    await t.service.joinByCode(GUEST, "Beto", l!.code);
    const hostDeck = await starterChoice(t, HOST, "undead");
    await expectError(t.service.submitCommand(matchId, STRANGER, req({ t: "lobby.selectDeck", deck: hostDeck })), 409, "deck_unavailable");
  });
});
