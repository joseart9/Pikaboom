// Payload budgets (Phase 21, §19.1): "Unchanged poll response ≤ 300 bytes", "Full view payload ≤ 30 KB
// (≤ 10 KB typical)". Measured on the exact JSON the routes send (`json(result)` / `json({ view })`), over seeded random
// games with the starter decks and with random all-cards decks, from both seats, at every step.
import { describe, expect, it } from "vitest";
import { applyCommand } from "../engine/apply";
import { seedToRng } from "../engine/rng";
import type { MatchState, Seat } from "../engine/types";
import { randomCommand, seedHex } from "../testing/driver";
import { newMatch, randomCatalogDeck } from "../testing/matches";
import { makeService, rowFor, startMatch, HOST } from "../testing/server";
import { DEFAULT_QUEUE_OPTIONS } from "../client/animation/queue";
import { MAX_VIEW_EVENTS, projectGame, viewFor } from "./view";

const POLL_BUDGET = 300;
const FULL_BUDGET = 30 * 1024;
const TYPICAL_BUDGET = 10 * 1024;

const bytes = (body: unknown) => new TextEncoder().encode(JSON.stringify(body)).length;

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

interface Sizes {
  typical: number[]; // `{ view }` with the events since the viewer's previous lastSeq (what polls/commands return)
  full: number[]; // `{ view }` as the service sends it for `since` 0 (page load / long reconnect): backlog capped
  uncapped: number[]; // the same view without the Phase 21 cap (every event still in the log), for the record
}

function measureGames(games: number, decks: (g: number) => [string[], string[]] | undefined): Sizes {
  const sizes: Sizes = { typical: [], full: [], uncapped: [] };
  for (let g = 0; g < games; g++) {
    let s: MatchState = newMatch(seedHex(500 + g), decks(g));
    const driver = { rng: seedToRng(seedHex(900 + g)) };
    const lastSeq: [number, number] = [0, 0];
    for (let step = 0; step < 600 && s.phase !== "finished"; step++) {
      const [seat, cmd] = randomCommand(s, driver);
      s = applyCommand(s, seat, cmd).state;
      const row = rowFor(s);
      for (const viewer of [0, 1] as Seat[]) {
        sizes.typical.push(bytes({ view: viewFor(row, viewer, { since: lastSeq[viewer], maxEvents: MAX_VIEW_EVENTS }) }));
        lastSeq[viewer] = s.seq;
        if (step % 5 === 0) {
          sizes.full.push(bytes({ view: viewFor(row, viewer, { since: 0, maxEvents: MAX_VIEW_EVENTS }) }));
          sizes.uncapped.push(bytes({ view: viewFor(row, viewer, { since: 0 }) }));
        }
      }
    }
  }
  return sizes;
}

describe("§19.1 payload budgets", () => {
  it(`unchanged poll response ≤ ${POLL_BUDGET} bytes`, async () => {
    const t = makeService();
    const { matchId, host } = await startMatch(t);
    const latest = await t.service.readMatch(matchId, HOST, { knownVersion: host.version });
    const version = "view" in latest ? latest.view.version : latest.version;
    const result = await t.service.readMatch(matchId, HOST, { knownVersion: version });
    expect(result).toMatchObject({ same: true });
    const size = bytes(result);
    console.info(`[budget] unchanged poll: ${size} B`);
    expect(size).toBeLessThanOrEqual(POLL_BUDGET);
  });

  it.each([
    ["starter decks", 12, () => undefined],
    ["random all-cards decks", 12, (g: number) => [randomCatalogDeck(7000 + g), randomCatalogDeck(8000 + g)] as [string[], string[]]],
  ] as const)(`view payloads with %s: full ≤ 30 KB, typical p95 ≤ 10 KB`, (label, games, decks) => {
    const { typical, full, uncapped } = measureGames(games, decks);
    const report = {
      typicalP50: percentile(typical, 50),
      typicalP95: percentile(typical, 95),
      typicalMax: Math.max(...typical),
      fullP50: percentile(full, 50),
      fullMax: Math.max(...full),
      uncappedMax: Math.max(...uncapped),
      samples: typical.length,
    };
    console.info(`[budget] ${label}: ${JSON.stringify(report)}`);
    expect(report.typicalP95).toBeLessThanOrEqual(TYPICAL_BUDGET);
    expect(report.fullMax).toBeLessThanOrEqual(FULL_BUDGET);
  });

  it("the event cap matches the client's skip threshold, so capping never changes what is animated", () => {
    expect(MAX_VIEW_EVENTS).toBe(DEFAULT_QUEUE_OPTIONS.skipGapAt);
  });

  it("a backlog above the cap is sent as no events + eventsTruncated; at the cap it is sent whole", () => {
    let s: MatchState = newMatch(seedHex(77));
    const driver = { rng: seedToRng(seedHex(78)) };
    while (s.seq < 120 && s.phase !== "finished") {
      const [seat, cmd] = randomCommand(s, driver);
      s = applyCommand(s, seat, cmd).state;
    }
    const atCap = projectGame(s, 0, s.seq - MAX_VIEW_EVENTS, MAX_VIEW_EVENTS);
    expect(atCap.events).toHaveLength(MAX_VIEW_EVENTS);
    expect(atCap.eventsTruncated).toBe(false);
    const over = projectGame(s, 0, s.seq - MAX_VIEW_EVENTS - 1, MAX_VIEW_EVENTS);
    expect(over.events).toEqual([]);
    expect(over.eventsTruncated).toBe(true);
    expect(over.lastSeq).toBe(s.seq);
    expect(projectGame(s, 0, 0).events.length).toBeGreaterThan(MAX_VIEW_EVENTS); // default: uncapped
  });
});
