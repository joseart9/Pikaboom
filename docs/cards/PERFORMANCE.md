# Duelo Arcano — Performance measurements (Phase 21)

**Date:** 2026-11-13 · **Machine for the automated numbers:** Intel Core i7-14700K (28 threads), Node 24.12.0, Windows 11 —
a fast desktop, so the engine numbers are a lower bound for a Vercel function; the margins below are large enough
that this does not change any verdict.

## Summary (plan §19.1)

| Metric | Budget | Measured | Verdict | How |
|---|---|---|---|---|
| `/cards/match/[id]` route JS (gzipped, incl. shared) | ≤ 220 KB | **196.8 KB** (12 files, 643 KB raw) | ✅ met | `npm run build` + `node scripts/route-size.mjs` |
| Engine `applyCommand` p95 (server) | ≤ 15 ms | **≤ 1.4 ms** (p99, worst task: Morvath on a 10-unit board); mean 0.53–0.63 ms | ✅ met (~10×) | `npm run bench` (`engine/engine.bench.ts`) |
| Command round trip p50 (same region) | ≤ 350 ms | not measured | ⏳ pending (owner) | needs the deployed app + migrations + an account |
| Unchanged poll response | ≤ 300 bytes | **81 B** | ✅ met | `server/budgets.test.ts` (exact route JSON) |
| Full view payload | ≤ 30 KB (≤ 10 KB typical) | **max 4.1 KB** for a page load/reconnect (was 36.8 KB → fixed); typical p50 2.2 KB, p95 3.1 KB, max 5.0 KB | ✅ met after fix | `server/budgets.test.ts` |
| Drag frame time | ≤ 16 ms, 0 React renders per pointermove | not measured on a phone | ⏳ pending (owner) | design: `DragController` moves the ghost with `transform` outside React (Phase 12) |
| Re-renders on poll with no change | 0 | **0** (unit) | ✅ met (unit) / ⏳ Profiler pending | `matchClient.test.ts` "a { same: true } poll … notifies nobody — no re-render" |
| Animation FPS | ≥ 50 fps on 4× throttle | not measured | ⏳ pending (owner) | in-app browser cannot throttle or profile |
| Memory after 30 min | < 150 MB, no growth | not measured | ⏳ pending (owner) | needs a real 30-min match |

No budget is exceeded by a measured value; the five ⏳ rows need real devices / the deployed app (see "Manual
measurement steps"). They are recorded as pending, not as accepted exceptions.

## 1. Route JS (§19.1 row 1)

`next build` in Next 16 no longer prints per-route sizes, so `scripts/route-size.mjs` reads each route's client
reference manifest (`.next/server/app/<route>/page_client-reference-manifest.js`): framework root main files +
every JS chunk of the route's layouts and page, each gzipped at level 9. Async chunks (`import("@supabase/supabase-js")`
for the realtime nudge) and the legacy `nomodule` polyfill are not counted.

```
MSYS_NO_PATHCONV=1 node scripts/route-size.mjs "/cards/match/[id]" /cards /cards/play /cards/store /cards/collection /cards/decks "/cards/decks/[id]" /charades /battleship
/cards/match/[id]: 196.8 KB JS gzipped (643.2 KB raw, 12 files) · CSS 24.5 KB gzipped
/cards: 159.3 KB JS gzipped (520.4 KB raw, 9 files) · CSS 24.5 KB gzipped
/cards/play: 179.4 KB JS gzipped (587.0 KB raw, 12 files) · CSS 24.5 KB gzipped
/cards/store: 170.5 KB JS gzipped (561.8 KB raw, 10 files) · CSS 24.5 KB gzipped
/cards/collection: 166.3 KB JS gzipped (549.2 KB raw, 10 files) · CSS 24.5 KB gzipped
/cards/decks: 176.2 KB JS gzipped (576.9 KB raw, 11 files) · CSS 24.5 KB gzipped
/cards/decks/[id]: 178.5 KB JS gzipped (587.2 KB raw, 11 files) · CSS 24.5 KB gzipped
/charades: 148.6 KB JS gzipped (494.1 KB raw, 7 files) · CSS 13.2 KB gzipped
/battleship: 173.4 KB JS gzipped (579.6 KB raw, 9 files) · CSS 13.2 KB gzipped
```

The match route's own chunks are ~69 KB gz on top of ~127 KB of framework/React shared by every page (Charades is
148.6 KB). Headroom: 23 KB. (On Windows Git Bash, `MSYS_NO_PATHCONV=1` stops `/cards` from being rewritten to a path.)

## 2. Engine (§19.1 row 2)

`src/game/cards/engine/engine.bench.ts` — run with `npm run bench`. The bench board is deliberately heavier than a real
turn: 5 units per side (Lobo Alfa, Banshee, Nigromante, Minotauro, a damaged Oso Berserker vs Gólem, Tortuga Espinosa,
Esqueleto Inquieto, Ent del Pantano, Murciélago), 7 + 5 cards in hand, 20-card decks, the **full catalog** in `defs`
(a real match only carries its decks' closure) and the event log filled to `LOG_LIMIT` (300) from a real random game,
so `structuredClone` dominates. Each bench command is applied once at load, so an illegal one fails loudly.

```
applyCommand on a 10-unit board (budget p95 ≤ 15 ms)          hz     min     max    mean     p75     p99
 · attack a Provocar unit with Barrido (cleave hits 3)    1,886.50  0.4886  1.1207  0.5301  0.5303  0.7950
 · attack into Espinas (thorns retaliation)               1,902.92  0.4844  1.1545  0.5255  0.5257  0.7909
 · play bone-storm (damage to 5 units, deaths, Últ. Al.)  1,807.27  0.4899  1.0168  0.5533  0.5561  0.9266
 · play storm-weaver (Grito: 3 random hits)               1,712.87  0.4963  1.4296  0.5838  0.5572  1.1387
 · play morvath (destroy 9 units, death chain)            1,590.26  0.5049  1.5067  0.6288  0.6190  1.3124
 · endTurn (end/start triggers, draw, Regeneración)       1,641.01  0.4822  1.6459  0.6094  0.6206  1.0882
applyCommand over recorded all-cards games (real command mix)
 · next recorded command (723 commands, cycled)           2,344.70  0.1662  1.0544  0.4265  0.4617  0.9243
server view projection (not budgeted)
 · viewFor + JSON.stringify (full view, all events)      10,599.86  0.0674  1.1105  0.0943  0.1185  0.2508
```
(times in ms). Vitest reports p75/p99, not p95; p99 ≥ p95, so p95 ≤ 1.4 ms. A serverless CPU is maybe 2–4× slower
than this desktop — still ≥ 3× under the budget. The rest of a command's server time is the two Postgres round trips
(select + CTE write, §13.4), which the round-trip row measures.

## 3. Payloads (§19.1 rows 4–5)

`src/game/cards/server/budgets.test.ts` measures the exact JSON the routes return (`json(result)` / `json({ view })`)
at every step of 24 seeded random games (12 starter-deck, 12 random all-cards), from both seats (5 780 views), and
asserts the budgets, so a regression fails `npm test`.

| Payload | Starter decks | All-cards decks |
|---|---|---|
| Unchanged poll `{ same, version, foeOnline, serverNow }` | 81 B | — |
| Typical view (events since the viewer's last `lastSeq`) p50 / p95 / max | 2 157 / 3 001 / 4 232 B | 2 190 / 3 088 / 5 043 B |
| Page-load / long-reconnect view (`since` 0), Phase 21 cap — p50 / max | 1 764 / 4 141 B | 1 852 / 3 877 B |
| Same, **without** the cap (before Phase 21) — max | 36 808 B ❌ | 36 591 B ❌ |

**Finding fixed (DEC-027):** a view requested without `since` (every page load, and a reconnect after a long gap)
carried the whole 300-event log: up to 36.8 KB, over the 30 KB budget. The client never replays those events (it
draws a first view as is, and `AnimationQueue.push` skips any push of more than `skipGapAt = 40` events), so the match
service now sends a backlog of more than `MAX_VIEW_EVENTS = 40` events as `events: []` + `eventsTruncated: true` —
which the client already handles as "snap to the view". A test pins `MAX_VIEW_EVENTS === DEFAULT_QUEUE_OPTIONS.skipGapAt`.
Vercel also gzips JSON responses (these sizes are uncompressed).

## 4. Client rendering (rows 6–9) — what exists today

- **No re-render on unchanged polls:** `MatchClient` only notifies subscribers when the state object changes; a
  `{ same: true }` poll with the same clock offset and presence changes nothing (unit test above).
- **Drag:** `client/drag.ts` `DragController` + `match/DragLayer.tsx` move the dragged card with `transform` on a ref
  (React state changes only on discrete drag events, never per `pointermove`; Phase 12, DEC-018).
- **FX:** transform/opacity-only keyframes (`fx.test.ts` asserts it), one pooled canvas, 300-particle budget halved
  on low-end devices (`hardwareConcurrency ≤ 4` or > 24 ms frames), rAF stopped when idle or hidden, DPR ≤ 2
  (Phase 13/20, DEC-019/DEC-026).
- **Memory:** bounded structures — event log ring buffer (300), `MatchClient.defOf` map (400 entries, cleared per
  stream), particle pool (fixed), animation queue (skips above 30 waiting events).

## 5. Manual measurement steps — pending (owner)

Record date, device and numbers in `STATUS.md` (and here).

1. **Round trip p50:** deployed app, signed in, a match against a second account, DevTools → Network, filter
   `commands`, play 20 commands → take the median "Time" (budget ≤ 350 ms; the Vercel function region should match the
   Supabase region `us-east-1`).
2. **Poll / view sizes in the field:** same session, filter `matches/` → an unchanged poll's "Size" ≤ 300 B (resource
   size), a reload's first view ≤ 30 KB.
3. **Drag:** mid-range Android phone via `chrome://inspect`, Performance panel, record while dragging a card for 5 s →
   frames ≤ 16 ms; React DevTools Profiler → no commits during the drag.
4. **Re-renders on poll:** React Profiler while idle on the opponent's turn for 30 s → no commits from polls.
5. **FPS:** desktop Chrome with 4× CPU throttle and the phone: play Ignis, Morvath and Tormenta de Huesos on 3 units →
   ≥ 50 fps in the Performance panel's frames track.
6. **Memory:** 30-minute match, Memory panel heap snapshots at 0/10/20/30 min → < 150 MB and no upward trend.
