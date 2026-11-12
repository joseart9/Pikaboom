# Duelo Arcano — Implementation Status

**Current phase:** Phase 11 — Lobby & complete PvP flow (code done; the two-device manual test that proves M1 is pending — see Pending manual tests). Phase 9's migration is still **not applied** to Supabase.
**Next phase:** Phase 12 — Drag & drop, long-press inspect, target arrow, desktop & keyboard controls (MVP complete)
**Engine MVP:** done (Phases 4–7)
**Milestones:** M1 friend-vs-friend playable (Phase 11): ☐ (UI flow complete; awaiting the two-account/two-device run after `db:setup`) · M2 MVP complete (Phase 12): ☐ · V1 complete (Phase 21): ☐

## Phase log
| Phase | Status | Date | Notes |
|---|---|---|---|
| 1 Foundation | ✅ | 2026-11-12 | vitest 4.1.12 (see DEC-001) |
| 2 Accounts | ✅ | 2026-11-12 | migration applied; end-to-end email flows and dashboard settings pending (owner) — see DEC-004…DEC-006 |
| 3 Card model & catalog | ✅ | 2026-11-12 | 41 collectible + 4 tokens; interpretations in DEC-007, extra validator checks DEC-008, helper details DEC-009 |
| 4 Engine core | ✅ | 2026-11-12 | all 16 test rows green; engine details in DEC-010 |
| 5 Combat & core keywords | ✅ | 2026-11-12 | all 20 test rows + legal-attacks property test green; details in DEC-011 |
| 6 Effects, spells, Gritos de Guerra | ✅ | 2026-11-12 | all 20 test rows, catalog sweep, legal-plays property test, no-per-card-code guard green; details in DEC-012 |
| 7 Triggers, deaths, conditions | ✅ | 2026-11-12 | all 18 test rows green (fuzz: 300 games in ~12.5 s); every catalog card has a behavior test; details in DEC-013. **Engine MVP done.** |
| 8 Server match layer | ✅ | 2026-11-12 | all 14 test rows green (leak test: 50 games, both viewers, every step, ~8.5 s); details in DEC-014 |
| 9 Persistence & HTTP API | ✅ (code) | 2026-11-12 | `npm run test:db` green (23); route tests green; `db:setup` and the two-account manual test still pending (owner) — see DEC-015 |
| 10 Battlefield UI | ✅ | 2026-11-12 | tap-mode battlefield + dev sandbox; reducer, store, sandbox-transport and source-guard tests green; checked in the browser at 1280×720, 568×320 and portrait phone — see DEC-016 |
| 11 Lobby & PvP flow | ✅ (code) | 2026-11-12 | menu, lobby, invite (share/QR), deck picker, ready, mulligan/game-over overlays, turn banner, timer warning, sounds; resume via `current`. Automated tests green; the two-device run (J.1–J.10) and M1 pending — see DEC-017 |

## Last test run
- `npm run typecheck` → OK (`✓ Types generated successfully`, `tsc --noEmit` no errors)
- `npm run lint` → OK (no output)
- `npm test` → `Test Files 36 passed (36)` · `Tests 428 passed (428)`
- `npm run test:db` → `Test Files 1 passed (1)` · `Tests 24 passed (24)`
- `npm run build` → OK (`✓ Compiled successfully`; `/cards`, `/cards/play`, `/cards/match/[id]` listed as ƒ dynamic)

## Delivered in the last phase (Phase 11)
- [ ] **A full match is completable on two phones with no console errors** — not run: needs the Phase 9 migration applied (`db:setup`) and two signed-in accounts on two devices; the agent cannot create accounts on the live Supabase project. Every step of the flow exists in the UI: home tile → `/cards` menu → Jugar → Crear partida → Compartir/QR → (guest) link → login if needed → auto-join → deck → ¡Listo! ×2 → battlefield → mulligan → play → concede/game over → Volver al menú.
- [ ] **Identical public state on both clients after every action (10 checkpoints)** — pending (same reason). By construction both clients render `viewFor` of the same row; the leak/redaction tests (Phase 8) and `routes.test.ts` cover the server side.
- [~] **Refresh/lock/background never restarts or desyncs** — resume is server-driven: the lobby screen resumes through `GET /matches/current`, the match page re-polls on `visibilitychange`/`focus`/`pageshow` (Phase 10 transport). New shared service test "resume — GET /matches/current" (memory **and** PGlite): lobby → host only, guest after join, guest leave / host leave → none, active → both, a re-read returns the same version/turn, finished → none but still readable. Device lock test pending.
- [~] **Turn timer and forfeit** — timer warning at `turn.warningSeconds` (15 s) with pulse + tick sound while you can act; timeouts/forfeit are server-side (Phase 8 test T13). Device run pending.
- [x] **Invite link joins, including signed-out → login → join** — browser-checked on `next dev`: signed-out `/cards/play?sala=k7qx2m` → `/auth/login?next=%2Fcards%2Fplay%3Fsala%3Dk7qx2m` (needed a proxy header, see DEC-017); a spoofed `x-pikaboom-path` is overwritten. The post-login auto-join itself needs an account → Pending manual tests.
- [ ] **M1 friend-vs-friend playable** — not claimed until the two-device run passes.
- [x] UI checked in the browser through a temporary unauthenticated preview route (removed) at **568×320** and 1280×720: lobby room (seats, deck select, ready toggle, share fallback toast, QR; no overflow at 568×320), lobby home (code input normalizes `k7-qx 2m` → `K7QX2M`; input widened after the check), menu (no overflow), mulligan overlay (marking/unmarking, confirm replaced exactly the marked card, "Esperando a tu rival…", "Empieza tu rival. Recibirás una Chispa de Maná."), turn banner (both turn changes; look verified with the animation frozen because the pane was hidden), concede → "¡Victoria!"/"Derrota" + "Rendición" per seat. Console: only the expected 401 from the menu's `current` call while signed out.
- [x] Phase 11 I tests: `client/mulligan.test.ts` (selection reducer, 5), `client/boardModel.test.ts` (`gameOutcome` + every end-reason text, 4), shared service suite "resume" (×2 stores). Existing suites green; i18n/hex guards still pass with the new components.
- [x] H edge cases: host closes the tab → lobby persists and `/cards` shows "Volver a la partida" (menu reads `current`); guest joins a cancelled/unknown lobby → toast, stays on the lobby screen with the code; simultaneous ready → single start (Phase 8 race test); phone lock → the transport re-polls on return; host opens own invite → own lobby; user already in another match → conflict screen.

Deviations/decisions: DEC-017 (incl. the `src/proxy.ts` change).

### Lobby/PvP handoff (Phase 11) — what Phase 12–13 need
- **Routes:** `/cards` → `menu/CardsMenu`; `/cards/play[?sala=CODE]` → `lobby/LobbyScreen` (stages loading/home/conflict/room; the room is a `MatchClient` over `HttpTransport`, forwards to `/cards/match/[id]` once active); `/cards/match/[id]` → `MatchScreen` (forwards `lobby` to `/cards/play`).
- **Overlays in `Battlefield`:** `MulliganOverlay` (phase `mulligan`), `GameOverOverlay` (`gameOutcome(...)` non-null), `TurnBanner` (in the divider), `MatchSounds` (renders nothing). Phase 13 can replace the view-diff triggers of the banner/sounds with event-queue hooks.
- **Sounds:** `playCardSound(kind)` / `armAudioUnlock()` in `client/sounds.ts`; kinds `tick`, `myTurn`, `error`, `victory`, `defeat`, `draw`, `foeJoined`, `matchStart`, `select`.
- **Auth redirects:** the `/cards` layout uses `REQUEST_PATH_HEADER` (set by `src/proxy.ts`) to keep path + query in `next`.
- **UX notes for Phase 12/13 polish:** rules text on mulligan cards is small at 568×320 (inspect comes in Phase 12); the copy-success path and the real `navigator.share` sheet were not exercised (the test browser denied clipboard access); there is no separate "copy code" button; the menu does not show the player's name; the turn banner and sounds react to view changes, so a long reconnect announces only the final turn.

## Delivered in Phase 10 (kept for reference)
- [x] **Every MVP engine action is performable via taps in the sandbox:** play a mob into a chosen slot (gap, left/right half of a unit, or the empty board → right end), mob with a targeted Grito de Guerra (slot → target), targeted spell (target), untargeted spell ("Lanzar"), attack (unit → target), end turn, concede (menu → confirm), keep the opening hand (minimal stand-in, see DEC-016). Browser check at 1280×720: mob placed, rush unit attacked, heal cast on own hero, end turn for both seats with "Seguir turno".
- [x] **Highlights match `legal`:** derived only from `legal` + the reducer state (playable glow ⇔ `legal.play[iid]`; can-attack ring ⇔ `legal.attacks[iid]` non-empty; target glow ⇔ the selected card's/attacker's targets from `legal`). Spot-checked in the browser: Embestida unit → only the enemy mob glows (not the hero); Toque Sanador → only my hero glows; unaffordable cards dim; tapping a non-target → "Objetivo no válido." toast and the selection stays. Reducer tests cover the rest (`client/interaction.test.ts`, 11 tests). The 10-situation manual spot-check (incl. Provocar) is listed under Pending manual tests.
- [x] **No Spanish literals outside `i18n/`** — `i18n/uiGuards.test.ts` greps `src/components/cards/**` and `src/app/cards/**` (quoted strings and JSX text with `[áéíóúñ¿¡]`).
- [x] **No hex colors outside `skin/`** — same test file (`src/components/cards/**` minus `skin/` and `cards.css`, which defines the tokens); plus "skin never imports the engine".
- [~] **Sandbox not reachable in production** — `/cards/dev/sandbox` calls `notFound()` when `NODE_ENV === "production"`; on `next start` a signed-out request is redirected to login by the `/cards` gate. The signed-in 404 was not checked (no account in the agent's browser) → Pending manual tests.
- [~] **No re-render on `{ same: true }` polls** — verified by construction and by `client/matchClient.test.ts` ("a { same: true } poll notifies nobody": no subscriber call, identical snapshot). The React Profiler check itself was not run (needs a signed-in real match).
- [x] Phase 10 H edge cases: view arrives while a card is selected → re-validated against the new `legal` (`viewChanged`); iPhone SE 568×320 → hand and FIN DE TURNO visible and reachable (screenshot check); portrait + touch → "Gira tu dispositivo" overlay (pure CSS); focus no longer scrolls the battlefield (`overflow: clip`, a bug found in the browser check).

Deviations/decisions: DEC-016.

### Battlefield handoff (Phase 10) — what Phase 11–13 need
- **Store:** `new MatchClient(transport)` (`client/matchClient.ts`); `start()`/`stop()`, `send(gameCommand) → Promise<boolean>` (one pending at a time), `showError(text)`, `useMatchSelector(client, s => s.field)` (select fields/primitives only). State: `view`, `board` (`toBoardModel(view)`), `pending`, `status`, `error {id,text}`, `fatal`, `clockOffsetMs`, `foeOnline`. Older views are ignored; a different seat/match always replaces the view.
- **Transports** (`client/transport.ts`): `HttpTransport(matchId)` (polling 1 s / 2 s with realtime, wake events, nudges, 6 s → reconnecting, 401/403/404 fatal, broadcast after each command) and `LocalTransport({ seed, names, decks?, autoKeep?, viewer?, follow? })` (sandbox: engine in the browser, `setViewer`, `setFollow`, `getState`). Lobby commands go through `transport.send` too (Phase 11 adds `MatchClient` support for them).
- **Interaction** (`client/interaction.ts`): `interactionReducer(state, input, legal) → { state, command?, hint? }`; helpers `selectedCard`, `currentTargets`, `canCast`. Phase 12's drag/arrow feeds the same inputs.
- **Components** (`src/components/cards/`): `LandscapeShell` (wraps every /cards page via the layout), `RotateOverlay`, `skin/*` (all visuals; `index.ts` re-exports), `card/{CardFace,CardText}`, `match/{MatchScreen,Battlefield (in MatchScreen.tsx),TopBar,FoeArea,PlayerArea,Board,UnitToken,Hand,HandCard,HeroButton,TurnTimer,ConnectionBadge,Toasts}`, `dev/Sandbox`. Interactive elements carry `data-cg-tap` (a click anywhere else cancels) and `data-iid` (Phase 12/13 can find units/cards in the DOM).
- **Placeholders to replace:** (the Phase 10 mulligan and game-over stand-ins were replaced in Phase 11); toasts show only the latest message; no animations (Phase 13); `CardArt` always draws a generated placeholder.
- **Known visual gaps:** card rules text is small on phones (inspect arrives in Phase 12); keyword icons are simple glyphs; at most 4 keyword icons per unit; Provocar is shown as a thicker grey frame rather than a shield shape.

## Delivered in Phase 9 (kept for reference)
- [ ] **Migration applies twice in a row (`npm run db:setup` ×2)** — not run: the agent's attempt to run `db:setup` against the live project was blocked by the session's permission policy. Idempotency is covered by the DB test "migrations are idempotent" (applies every Duelo Arcano migration a second time on PGlite). **Owner: run `npm run db:setup` twice.**
- [x] `npm run test:db` green, including privilege assertions (anon/authenticated × both tables × select/insert/update/delete all false, `set role anon` → permission denied, RLS on) and the harness self-test (default grants are real, so the revokes are not vacuous).
- [ ] Manual steps J.1–J.7 (two accounts) — pending: needs the migration applied and two signed-in accounts. The same flow (create → join → selectDeck ×2 → ready ×2 → active, `me.hand` 3/4, `foe.handCount` without `hand`, same `commandId` twice → same version, T1, T12) is automated in `src/app/api/cards/routes.test.ts` against the real route handlers on the memory store.
- [x] Unauthenticated calls to every `/api/cards/matches*` route return 401 JSON (`{ error: "Inicia sesión para jugar.", code: "unauthenticated" }`, `Cache-Control: no-store`) — automated in `routes.test.ts` and verified on `next dev` in the browser for all five routes.
- [x] Charades/Batalla Naval unaffected — smoke: `/battleship`, `/charades`, `/api/words` → 200 on `next dev`; no battleship/charades files changed.
- [x] Phase 8 rows 4, 5, 6, 7, 10 and the simultaneous-ready race run on **both** stores (`testing/serviceSuite.ts`, called from `matchService.test.ts` and `pgStore.db.test.ts`).
- [x] H edge cases: invalid UUID path → 404; non-JSON → 415; body > 4 KB → 413 (Content-Length and actual size); malformed JSON / extra fields → 400; unknown errors (DB down) → 503 "El servidor no responde. Reintentando…" with `code: "unavailable"`; the client retries network/5xx with the same `commandId`.

Deviations/decisions: DEC-015.

### Persistence/API handoff (Phase 9) — what Phase 10/11 need
- **Service singleton:** `getMatchService()` in `src/game/cards/server/instance.ts` (`server-only`). Postgres (`PgMatchStore(db())`) when `SUPABASE_DB_URL`/`SUPABASE_DB_PASSWORD` is set or in production; otherwise an in-memory store with a console warning (dev only — matches vanish on restart). `hasMatchDb` tells which.
- **Routes** (`src/app/api/cards/**`, all `force-dynamic`, `no-store`): `POST /matches` (`{}` → `{ view }`), `POST /matches/join` (`{ code }` → `{ view }`, 409 `already_in_match` + `matchId`), `GET /matches/current` (`{ matchId }`), `GET /matches/[id]?v=&since=` (`{ same, version, foeOnline, serverNow }` or `{ view }`), `POST /matches/[id]/commands?since=` (`CommandRequest` → `{ view }`). Errors are always `{ error, code, ...details }`.
- **Route helpers** (`src/app/api/cards/_shared.ts`): `json`, `errorResponse(e, where)`, `readJson(request, maxBytes)`, `matchIdFrom(id)`, `intParam(url, name)`, `requirePlayer()` (session id + `profiles.username`, created on first use), `HttpError`. Reuse them for the Phase 14–17 routes.
- **Client** (`src/game/cards/client/api.ts`): `createMatch()`, `joinMatch(code)`, `currentMatch()`, `pollMatch(id, version?, since?)` (single attempt — the poll loop is the retry), `commandRequest(id, command, { since?, commandId? })` (10 attempts, backoff 400 ms ×1.8 ≤ 4 s, same `commandId`; returns the `commandId` so a UI can resume it). All return `{ ok: true, ...body } | { ok: false, status, error, code, matchId? }`; status 0 / `code: "network"` = no answer. 8 s timeout per request.
- **Realtime:** `connectNudger(matchId, onNudge)` in `src/game/cards/client/realtime.ts`, channel `pikaboom-cards-<matchId>`, payload `{ v }` only. Send after every successful command response.
- **DB tests:** `npm run test:db` (`vitest.db.config.mts`, `src/**/*.db.test.ts`). Harness `src/game/cards/testing/pglite.ts`: `createTestDb()`, `createTestUser(db, id, name)`, `applyMigrations(db)`, `SUPABASE_STUB_SQL`. New migrations named `*_cards_*.sql` (or `*_profiles*`) are picked up automatically. Share one PGlite per file and `truncate ... cascade` in `beforeEach`.
- **pgStore** (`server/pgStore.ts`): `new PgMatchStore(queryable)` takes anything with `query(sql, params) → { rows }` (`pg.Pool`, PGlite). Dynamic `SET` from the patch keys over a whitelisted column map; JSON params as `JSON.stringify(...)::jsonb`, dates as ISO strings `::timestamptz`.
- **Env on Vercel:** `SUPABASE_DB_PASSWORD` (or `SUPABASE_DB_URL`) must be set in **Production and Preview**; `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for auth and the realtime nudge.

## Delivered in Phase 8 (kept for reference)
- [x] All 14 Phase 8 test rows green: rows 1–3 in `server/view.test.ts`; rows 4–11 and 14 in `server/matchService.test.ts`; row 12 in `server/commands.test.ts`; row 13 in `server/replay.test.ts`.
- [x] **Leak test** (row 1) over **50** random games (shared fuzz driver), checking `viewFor` for **both** viewers after **every** command: no foe hand/deck iid, no own-deck iid the owner never held, no `"rng"`/`"seed"`/`"defs"`/`"userId"`/`"rules"`/`"log"`/`"deck"` keys, foe private events only in redacted form, and per-defId counts (foe side + events) never above the public count (foe board + every log event not private to the foe). Mutation-checked: making `CARD_DRAWN` keep its iid, or only its defId, fails the test. Plus: the opponent gets no `CARD_DRAWN` for the other seat's mulligan and an empty `MULLIGAN_DONE`.
- [x] Threat-model tests T1 (wrong seat → 409 `not_your_turn`, stranger → 403), T2 (leak test), T5 (10 identical concurrent requests ⇒ one effect, same version everywhere), T6 (interleaved concurrent batches from both seats ⇒ final state equals `replay(setup, listCommands())`), T13 (turn timeout once per turn, forfeit after 3), T16 (strict parser + 4 KB body check).
- [x] Phase 8 H edge cases: late command after the deadline → timeout first, then "Se acabó tu tiempo."; two simultaneous `ready` → exactly one start; host `lobby.leave` → `cancelled`, guest → seat freed; `lobby.*` when not in lobby → `wrong_phase`; game commands in lobby → `wrong_phase`; finished match reads OK, commands → `game_over`.
- [x] `matchService` depends only on the `MatchStore` interface (no SQL).
- [x] `view.ts` has no `server-only` import and no Node APIs (asserted by a test).
- [x] `ENGINE_VERSION` still 1; no engine source changed (only `fuzz.test.ts` now imports its driver from `testing/driver.ts`).

Deviations/decisions: DEC-014.

### Server handoff (Phase 8) — what Phase 9 needs
- **`MatchStore` contract** (`server/store.ts`, doc comment above the interface; implement it in SQL with identical semantics):
  - `insertLobby` → new row `status "lobby"`, `version 1`, `seenHost = now`, guest/game columns null/0; codes are unique across **all** rows (`code text unique`); conflict → `null`.
  - `load`/`loadByCode` → deep copy with `now` = DB clock; `findOpenForUser` → most recent `lobby|active` row where the user is host or guest.
  - `update(id, expectedVersion, patch, cmd, touchSeat)` → atomic: version mismatch or missing row → `StoreConflict`; duplicate `(match_id, command_id)` → `DuplicateCommand` with **nothing written** (version unchanged); otherwise patch only the keys present (`null` writes NULL), `version += 1`, `updated_at = now()`, `seen_host`/`seen_guest = now()` for `touchSeat` 0/1 (null for system writes), command inserted with `seq = new version`. The §13.4 CTE does exactly this.
  - `hasCommand`, `listCommands` (ordered by `seq`), `touch(id, seat)` (seen only, **no** version bump), `markStale(now)` (active idle > 30 min → `abandoned`, lobby idle > 2 h → `cancelled`; both bump `version`, set `updated_at`, clear `turn_deadline`).
  - Column map: `hostName`/`guestName` ↔ `host_name`/`guest_name`, `turnDeadline` ↔ `turn_deadline`, etc. Dates are `Date` objects.
- **Service** (`server/matchService.ts`, `import "server-only"`): `new MatchService({ store, now, randomSeed: randomMatchSeed, randomCode: randomLobbyCode })`. Methods: `createLobby(userId, name)`, `joinByCode(userId, name, code)`, `currentMatchFor(userId)`, `readMatch(matchId, userId, { knownVersion, since })` → `{ same: true, version, foeOnline, serverNow } | { view }`, `submitCommand(matchId, userId, request, { since })` → `MatchView`, `applyDueTimeouts(row, now)`, `cleanupStale()`. Errors are `ServiceError(status, code, message, details)` (`server/errors.ts`); `already_in_match` carries `details.matchId`. Routes map `ServiceError` → `{ error: message, code, ...details }` with `status`, and `RequestError` → 400 `{ error: errorText("bad_request"), code: "bad_request" }`.
- **Request parsing:** routes call `parseCommandBody(await request.text())` (4 KB limit + JSON + strict guards) or `parseCommandRequest(json)`.
- **Spanish texts:** `es.matchErrors` (service codes) + `es.errors` (engine codes); `errorText(code)` looks up both.
- **System command ids:** `sys:timeout:<turn>`, `sys:mulligan-timeout:<seat>`; join log entries `join:<userId>:<version>` with `{ t: "lobby.join" }`. Client ids cannot contain `:`.
- **Constants:** `ONLINE_MS = 9000` (`view.ts`), `TIMEOUT_GRACE_MS = 1500`, `TOUCH_INTERVAL_MS = 3000`, `CODE_ALPHABET`, `CODE_LENGTH = 6` (`matchService.ts`), `STALE_ACTIVE_MS`, `STALE_LOBBY_MS` (`store.ts`).
- **Test helpers:** `testing/server.ts` (`FakeClock`, `makeService`, `startMatch`, `req`, `cid`, `rowFor`, `HOST`/`GUEST`/`STRANGER`), `testing/driver.ts` (`randomCommand`, `seedHex`). `MemoryMatchStore({ now })` doubles as a dev fallback.

## Delivered in Phase 7 (kept for reference)
- [x] All 18 Phase 7 rows green: rows 1–5, 8–11 in `engine/deaths.test.ts`; rows 6, 7, 12–14, 17 in `engine/triggers.test.ts`; rows 15–16 in `engine/conditions.test.ts`; row 18 in `engine/fuzz.test.ts`.
- [x] Fuzz test: 300 games (seeds 1..300, both starter decks, uniformly random legal play/attack/endTurn with a random legal target and position, ≤ 400 commands) in **~12.5 s** (< 20 s). Invariants are checked after **every** command: hand ≤ 10, board ≤ 10, mana 0..10 and temporary ≥ 0, no unit with health ≤ 0 or `pendingDestroy` on a board, unique iids across hand/deck/board.
- [x] Phase 7 H edge cases: deathrattle into a full board fizzles; simultaneous deathrattles in board order (active seat first); Último Aliento before Renacer (Renacer fizzles if the deathrattle filled the board, otherwise returns at the slot); silenced unit → no deathrattle or Renacer; killer that died in the same combat → no `kill`; units dying in the same step do not see each other via `otherDied`; game ending mid-queue discards the rest (and skips the draw); echo pair stops at the hard limit; endless ping-pong stops at depth 32; branching loop stops at 500 resolutions — each with a single `CHAIN_LIMIT_REACHED`.
- [x] Every MVP catalog card has at least one behavior test (table below). `engine/cards.test.ts` covers the keyword/vanilla cards with their real defs and **enforces** coverage: it fails if any catalog id is not used by some engine test.
- [x] `ATTACK_CANCELLED` is now reachable and tested (`test-guardian`).
- [x] `ENGINE_VERSION` still 1.
- [x] Validator: `if` accepted (its handler exists); `hasStatus` condition rejected until Phase 18 (`IMPLEMENTED_CONDITION_KINDS`); `TEST_DEFS` are validated too.

Deviations/decisions: DEC-013.

### Engine handoff (Phase 7)
- **Trigger matching** (`engine/triggers.ts`): `emit` → `matchTriggers` for every event while `phase === "playing"`. Listeners = `listenersInBoardOrder` (active seat board 0→n, then the other board), skipping silenced and dead/dying units; abilities in definition order; `triggerMatches` implements the §9.3 table (`play`/`death`/`kill` never match there). `limit` is checked at queue **and** resolution time; uses are recorded at resolution (`abilityUses[id]`, `thisTurn` reset when the turn changes). Resistencia Final marks `thresholdsFired` when queued.
- **Queue & depth:** FIFO `ctx.queue`. Queued depth = `ctx.depth + 1`. `ctx.depth` is set to a trigger depth when it starts and stays there until the next one starts, so triggers caused by its events *and by the deaths it caused* are one level deeper; `resolveAll` restores the outer depth. Depth > 32 → dropped + `CHAIN_LIMIT_REACHED` (once per command). > 500 resolutions → `CHAIN_LIMIT_REACHED`, queue cleared, final death step (its triggers discarded), game-over check.
- **Death processing** (`engine/resolve.ts → processDeaths`): dying units (board order) removed together and stored in `ctx.departed` (per-command map, not state); graveyard/death counters; `MOB_DESTROYED` per unit (queues `otherDied` among survivors); then per unit: its `death` abilities, Renacer (pseudo-trigger `kind: "reborn"`), the killer `kill` abilities (killer alive on board). Repeats until no deaths.
- **Resolution** (`resolveTrigger`): reborn → `placeUnit` at `min(index, length)`, new iid, 1 health, no `reborn`, `rebornUsed`, cause `reborn` (fizzles at 6). Abilities: source must be alive, on board and not silenced (death abilities use `ctx.departed` + snapshot) → limit → conditions → `ctx.step += 1` → `recordUse` → `TRIGGER_ACTIVATED` → `runEffects` with `{ controller, sourceId, sourceDefId, sourceIndex (snapshot or current), event, depth }`.
- **Conditions** (`effects/conditions.ts`): all MVP kinds; subjects resolve dead units through `ctx.departed`; `Side "any"` = both seats (sum for counts, either for `heroHealth`). `if` handler in `effects/handlers/if.ts` (runner injected to avoid an import cycle).
- **Event subjects:** `MOB_DESTROYED` source = the dead unit `lastDamagedBy`.
- **Test cards** (`testing/testCards.ts`): `test-echo-a/b`, `test-limited`, `test-turnstart-dmg`, `test-guardian` (attacked → destroy attacker), `test-if` (damageTaken → if ≤ 50% +2 attack else +1 health). `makeState({ defs })` registers inline test-only defs.

## Delivered in Phase 6 (kept for reference)
- [x] Every MVP spell and every `play` ability in the catalog resolves: `spells.test.ts` → "every catalog play ability resolves" loops over all 21 cards with a `play` ability (listed as playable, plays with its first legal target, emits `SPELL_CAST` / one `TRIGGER_ACTIVATED` per play ability, and produces effect events), plus the explicit rows.
- [x] All 20 Phase 6 test rows green: rows 1–19 in `engine/spells.test.ts`; row 20 (catalog valid with rule 10) in `catalog/validate.test.ts`. Phase 6 H edge cases covered: lethal earlier effect makes later `chosen` effects fizzle, `random` with 0 candidates uses no RNG, Grito de Guerra summon fizzling at 6, Skeleton King to 10, Morvath (7 deaths, one death step, board order), `drain-life` on own hero → `invalid_target`, `apprentice-mage` with/without enemy mobs, untargeted spell with target → `unexpected_target`, unplayable `soul-harvest` → `no_valid_targets`.
- [x] Legal-actions property test extended to plays: 50 random states, every hand card × (no target, both heroes, every unit). A choice is accepted iff it is listed (`targets` contains it, or no target and `!targetRequired`).
- [x] No per-card code: `effects/execute.test.ts` scans every non-test `.ts` under `engine/` (comments stripped) for every catalog id; verified it fails on a probe file containing `"necromancer"`.
- [x] Validator rule 10 active: effect types must be in `IMPLEMENTED_EFFECT_TYPES` (`if` and V1 effects rejected until their phases).
- [x] Determinism scripts now play targeted spells/Gritos too (random legal target).

Deviations/decisions: DEC-012.

### Engine handoff (Phase 6)
- **Handlers implemented** (`engine/effects/handlers/*.ts`, registered in `effects/execute.ts → EFFECT_HANDLERS`): `damage`, `heal`, `summon`, `destroy`, `draw`, `addToHand`, `buff`, `grantKeyword`, `gainMana`. **Not yet:** `if` (Phase 7), V1 effects (Phases 18–19). `IMPLEMENTED_EFFECT_TYPES` = handler keys (used by validator rule 10).
- **`runEffects(ctx, effects, a: AbilityContext)`**: in order, stops when the game is over, throws on a missing handler.
- **Selectors** (`effects/selectors.ts`): `groupMembers` order — friendly/enemy mobs = that board 0→n; `allMobs` = active board then other; `friendlyCharacters`/`enemyCharacters` = mobs then hero; `allCharacters` = active board, other board, active hero, other hero. Dead/`pendingDestroy` units are never returned. `random` = `rngPick` over candidates in that order (distinct, no RNG use when empty). `adjacent` = ±1 on the reference unit's board (reference may be dying; neighbours must be alive). `eventSubjects(event)` maps DAMAGE/HEAL/MOB_SUMMONED/MOB_DESTROYED/ATTACK_DECLARED (Phase 7 fills MOB_DESTROYED's killer). `matchesFilter`: heroes match only a `damaged`-only filter. `validTargets(s, seat, spec, sourceId)` never includes the card itself.
- **Play flow** (`play.ts`): validation order phase → turn → in hand → mana → (mob) board/position → target (§6.5 rule 5). Mob: `CARD_PLAYED` → `MANA_CHANGED` → `MOB_SUMMONED` → per `play` ability `TRIGGER_ACTIVATED` + effects (`sourceIndex` = current index; `chosen` only for the targeted ability). Spell: `CARD_PLAYED` → `MANA_CHANGED` → effects → `SPELL_CAST`. `resolveAll` then runs from `applyCommand`. `playTargets(s, seat, card)` is shared by `play` and `legal`.
- **Summon positions:** right of the source if it is on the target board; else `min(sourceIndex, length)` (Phase 7 passes the death snapshot index); else the right end; `position: "end"` forces the end. Overflow → `hardLimit`; leftovers → one `SUMMON_FIZZLED`.
- **Phase 7 hooks:** `AbilityContext.event` / `sourceIndex`, `eventSubjects`, `resolveAmount` `eventAmount` (DAMAGE → `dealt`, HEAL → `amount`).

## Delivered in Phase 5 (kept for reference)
- [x] All 20 Phase 5 test rows green: rows 1–8, 13, 16, 20 in `engine/combat.test.ts`; rows 9–12, 14, 15, 17–19 in `engine/keywords.test.ts` (one `it` each), plus the Phase 5 H edge cases (0-attack, third Golpe Doble attack, `rush_no_hero`, `must_attack_taunt`, own target → `invalid_target`, mutual kills, Barrido at index 0, Espinas + kill → both die, Escudo(1) vs Barrido, blocked Robo de Vida, Furia losing its bonus when healed).
- [x] Combat damage is simultaneous (rows 1, 15; Furia retaliation uses the pre-combat attack).
- [x] Shield semantics match ADR-21 for combat: attack, retaliation, Barrido splash and Espinas each consume one charge; zero-damage instances don't; `effect` damage pierces (unit test on `applyDamageInstances`). End-to-end spell piercing is Phase 6 row 1.
- [x] `getLegalActions(...).attacks` equals what `applyCommand` accepts: property test over 50 random fixture states (random stats, damage, sleeping, used attacks, keyword sets incl. Provocar/Embestida/Carga/Golpe Doble/Escudo). Every listed (attacker, target) succeeds; every unlisted one, own targets included, throws `EngineError`.
- [x] The determinism test now drives attacks too, plus a 200-command replay that includes attacks and deaths.
- [x] `attack` is dispatched in `applyCommand` and counts as acting (resets the timeout streak). Spells remain `not_supported` (Phase 6).

Deviations/decisions: DEC-011.

### Engine handoff (Phase 5)
- **Damage API** (`engine/damage.ts`): `DamageInstance`, `DamageResult`, `applyDamageInstances(ctx, inst[])` (prevention in list order → apply → one DAMAGE each → KEYWORDS_CHANGED for changed shields); `preventDamage(ctx, inst)` is the **extension point**, with commented slots for Vulnerabilidad (2), Inmune (3), Escudo Divino (5); `damageHero` (fatigue, now routed through the batch); `heal(ctx, sourceId, targetId, amount) → restored` (Maldición hook commented).
- **Keywords** (`engine/keywords.ts`): `hasKeyword`, `keywordValue` (both return nothing for silenced units), `maxAttacks`. All rules read keywords through these.
- **Combat** (`engine/combat.ts`): `attack(ctx, seat, cmd)` follows §8.4: `attacksThisTurn += 1` → `ATTACK_DECLARED` → `resolveAll` → re-check / `ATTACK_CANCELLED` → one damage batch [main, retaliation, Barrido splash left/right, Espinas] → Robo de Vida → `resolveAll`. Also `attackBlocker(s, u)` (error code or null), `canAttack`, `attackTargets`. V1 hooks (Sigilo, Vuelo, Desarmado, Aturdido, Congelado, Veneno, Sangrado) are commented in place.
- **Stats:** `getAttack` includes Furia; `summonedThisTurn` added; `isSleeping` is silence-aware.
- **Turns:** Regeneración ticks after `TURN_ENDED` (active seat, board order), before modifier expiry. `attacksThisTurn` resets at turn start (unchanged from Phase 4).
- **Fixtures:** `UnitSpec.attack` / `UnitSpec.health` override base stats (`{ defId: "test-1-1", attack: 3, health: 2 }`).
- **Not reachable yet:** `ATTACK_CANCELLED` (needs Phase 7 triggers).

## Delivered in Phase 4 (kept for reference)
- [x] Engine files import nothing from React/Next/DB/`node:`/`@/`; no `Math.random`/`Date.now`/`new Date` — enforced by `determinism.test.ts` (scans `engine/**/*.ts` except `*.test.ts`/`*.bench.ts`, ignoring comments; verified it fails on a probe file that calls `Math.random`).
- [x] All 16 Phase 4 test rows implemented and green: rows 1–2 `setup.test.ts`; row 3 `mulligan.test.ts`; rows 4, 8–15 `turns.test.ts`; rows 5–7 `play.test.ts`; row 16 `determinism.test.ts` (40 random legal commands from a separate driver RNG, replayed twice and again from the recorded command list).
- [x] `applyCommand` never mutates its input: 30 commands applied to deep-frozen states (`deepFreeze` fixture), plus row 5 compares before/after.
- [x] Mana, draw, fatigue, hand limit (burn), timeouts/forfeit, concede, turn limit, hero-destroyed and mutual-destruction game end behave per §6. Phase 4 H edge cases covered: short opening deck (no fatigue), invalid/duplicate mulligan ids, second mulligan, `invalid_position` (−1, > length, 1.5, NaN), `endTurn` by the inactive seat, non-mulligan commands during mulligan, lethal fatigue at turn start ends the game before the player acts.
- [x] Spells and attacks intentionally inert: playing a spell and `attack` throw `not_supported` ("Esta carta aún no se puede jugar." added to `es.errors`); mob Gritos de Guerra are skipped; `getLegalActions` lists only affordable mobs with board room.
- [x] `getLegalActions` agrees with `applyCommand` for plays (every listed play accepted, every unlisted hand card rejected).
- [x] State is JSON round-trippable (it will be stored as JSONB).

Deviations/decisions: DEC-010.

### Engine handoff (Phase 4)
- **Entry points** (`engine/index.ts`): `createMatch(setup)`, `applyCommand(state, seat, cmd) → { state, events }`, `getLegalActions(state, seat)`, `defsClosure(ids, catalog)` (pass deck ids **plus** `rules.hand.secondPlayerBonusCard`), `ENGINE_VERSION = 1`, `EngineError` (`code`, `params`), `ENGINE_ERROR_CODES`.
- **Trigger stub:** `engine/triggers.ts → matchTriggers(ctx, event)` is a no-op called by `emit` (`engine/ctx.ts`) for every event. Phase 7 replaces it; `ctx.queue` (`PendingTrigger[]`) stays empty until then. `resolve.ts → resolveAll` is the Phase 4 version (deaths + game over).
- **Inert on purpose:** spells (`not_supported`), `attack` (`not_supported`), all abilities (Grito de Guerra skipped; no triggers), Regeneración, statuses.
- **Extension points:** `damage.ts` (Phase 5 adds `applyDamageInstances`, `preventDamage`, `heal`), `stats.ts → getAttack` (Furia), comments in `turns.ts` mark where Regeneración and status expiry go, a comment in `play.ts` marks where play abilities run.
- **Fixtures API** (`src/game/cards/testing/`):
  - `fixtures.ts`: `makeState({ p0?, p1?, active?, turn?, seed? })` — `playing` phase, firstSeat 0, defs = `CATALOG` + `TEST_DEFS`, mana 10/10 unless `mana`/`maxMana`, health 30, empty decks, units awake unless `sleeping: true`, iids p0 board → hand → deck → p1 board → hand → deck. `SideSpec = { hand, deck, board: (CardId | UnitSpec)[], health, mana, maxMana }`; `UnitSpec = { defId, damage, sleeping, attacksThisTurn, keywords, shieldCharges, modifiers }`. Helpers: `act`, `unitAt`, `handIds`, `eventTypes`, `eventsOf(events, type)`, `deepFreeze`, `TEST_SEED`.
  - `testCards.ts`: `TEST_DEFS` — `test-1-1` (cost 1), `test-2-3` (2), `test-5-5` (5), `test-0-3` (cost 1, 0 attack), `test-spell-noop` (cost 1).
  - `matches.ts`: `newMatch(seed?, decks?)`, `makeSetup(...)`, `UNDEAD_DECK`, `BEAST_DECK` — real `createMatch` from the starter decks.

### Catalog file layout
- `src/game/cards/catalog/types.ts` — all §9.2–§9.3 types (+ `StatusId` re-export, `TriggerOn`, `EffectType`, `MVP_EFFECT_TYPES`)
- `catalog/keywords.ts` (`KEYWORDS`, `KEYWORD_IDS`), `catalog/statuses.ts` (`StatusId`, `StatusDef`, `STATUS_DEFS`)
- `catalog/cards/{basic,undead,beast,neutral,tokens}.ts` — card data arrays (`*_DEFS`); `cards/core.ts` — shared `core(id)` fields
- `catalog/index.ts` — `CATALOG`, `hasDef`, `getDef`, `isMob`, `isSpell`, `compareCards`, `COLLECTIBLE_CARDS`, `BASIC_CARDS`, `cardsByRarity`, `RARITIES`
- `catalog/validate.ts` — `validateCatalog(defs, dict)`
- `catalog/starterDecks.ts` — `STARTER_DECKS`, `StarterDeckId`, `STARTER_DECK_IDS`
- `decks/validate.ts` — `DeckEntry`, `DeckProblem`, `validateDeck`, `expandDeck`, `countCards`
- Tests: `catalog/{catalog,validate,catalog.snapshot}.test.ts`, `decks/validate.test.ts`
- **Balance-change workflow:** edit def → bump `version` → `UPDATE_CARD_SNAPSHOT=1 npx vitest run catalog.snapshot` → commit def + JSON together.

### Phase 2 summary (kept for reference)
Accounts are done: proxy only refreshes sessions; `src/lib/auth.ts` (`getUser`, `requireUser`, `ensureProfile`, …); auth pages, `/account`, `/api/account/*`, `/cards` gate; SW exclusions (`v4`). Email flows end-to-end are still a pending manual test (see below).

## How to use auth (handoff for later phases)
- **Route handlers:** `const user = await requireUser();` inside `try`; map `AuthError` → `401 { error: t("auth.loginToPlay") }` (see `src/app/api/account/profile/route.ts`). Use only `user.id` for authorization; never read user ids from bodies.
- **Server pages:** `const user = await getUser(); if (!user) redirect("/auth/login?next=" + encodeURIComponent(pathAndQuery));`. The `/cards` layout already gates `/cards/**`, but layouts don't re-run on client navigation — pages/APIs that load user data must check themselves.
- **Profiles:** call `ensureProfile(user)` before anything that needs a `profiles` row (it is idempotent and cheap: one statement).
- **Session/cookies:** `@supabase/ssr` cookies. `src/proxy.ts` refreshes them only on the matched paths and never redirects. Server reads use `getClaims()` (JWT verified), never `getSession()`.
- **Redirect targets:** always pass user-supplied `next` through `safeNext()`.

## Known issues
| Severity | Issue | Since | Notes |
|---|---|---|---|
| minor | Supabase Data API (PostgREST) returns `503 PGRST002 "Could not query the database for the schema cache"` for every table, including `charades_words` | Phase 2 (observed) | Not caused by the new table as far as we can tell (it affects all tables; nothing in the app uses the Data API — DB access is via `pg`, Auth/Realtime are separate services and Auth answered 200). Owner: check the project's API/PostgREST status in the dashboard, then re-run manual test 7. |
| minor | Without DB credentials in local dev, `/api/cards/*` uses an in-memory match store (lost on every server restart) and the player name comes from sign-up metadata instead of `profiles` | Phase 9 | By design (mirrors Batalla Naval); production always uses Postgres. |
| minor | `npm audit` reports advisories in the dependency tree after installing Vitest | Phase 1 | Not investigated; no runtime dependency was added. Do not run `npm audit fix --force` blindly. |

## Pending manual tests
| Test | Phase | Reason pending |
|---|---|---|
| **Phase 11 J.1–J.10 (M1):** two devices/browsers, two accounts: home → Duelo Arcano → Jugar → Crear partida → Compartir → open link on B; both pick decks (A undead, B beast) → Listo → battlefield; A replaces 2, B keeps; 6 full turns comparing boards/health/hand/deck counts; refresh B mid-turn (back within 2 s); sleep A 2 min on A's turn (timeout, B continues); B concedes (A "¡Victoria!" "Rendición", B "Derrota"); new match, A idles 3 turns → "Abandono por inactividad"; DevTools: B's responses never contain A's hand card names | 11 | Needs `npm run db:setup` (Phase 9 migration) and two signed-in accounts; the agent cannot create accounts on the live project. Record results with dates and tick M1. |
| Phase 11: signed-out invite → log in → lands on `/cards/play?sala=…` and auto-joins; real `navigator.share` sheet on a phone; "¡Enlace copiado!" on desktop | 11 | The redirect to login with the right `next` was checked; the rest needs an account / a phone (the test browser denied clipboard access, so only the fallback toast was seen). |
| Phase 2 J.3–J.6: sign up with a real email + `prueba_1`, confirm via email → `/cards`; sign out/in; password reset; second account with `Prueba_1` → "Ese nombre ya está en uso." | 2 | Requires a real inbox and creating accounts; the agent does not create accounts on the live Supabase project. Also depends on the dashboard steps below. |
| Phase 2 J.7: `profiles` has 2 rows; `fetch(URL + "/rest/v1/profiles", { headers: { apikey } })` returns an error or `[]` | 2 | Rows depend on J.3–J.6. REST check currently returns 503 PGRST002 for all tables (see Known issues); DB-level lockdown verified. |
| `/cards` placeholder and `/account` rendering while signed in | 2 | Needs a signed-in account (same as above). |
| Phase 9 G.1 / K.1: `npm run db:setup` twice (applies `20261113010000_cards_matches.sql`) with no errors | 9 | The agent's `db:setup` run was blocked by the session permission policy. Owner runs it. |
| Phase 10 J.1–J.5 on a real phone (LAN) and DevTools: sandbox 5 turns per seat, rotate to portrait and back, Provocar spot-check (only taunt units glow), 568×320 nothing clipped | 10 | The agent checked the sandbox only through a temporary unauthenticated preview route (removed) at 1280×720, 568×320 and a portrait phone emulation; `/cards/dev/sandbox` itself needs a signed-in account. |
| Phase 10 J.6: `npm run build && npm run start`, signed in → `/cards/dev/sandbox` is 404 | 10 | Signed-out it redirects to login (checked); the signed-in 404 needs an account. |
| Phase 10 L: `/cards/match/[id]` renders a real match (Phase 9 manual steps) + React Profiler shows no render on `{ same: true }` polls | 10 | Needs the Phase 9 migration applied and two accounts. The no-re-render rule is unit-tested in `client/matchClient.test.ts`. |
| Phase 10 H: a board with 10 units fits without scrolling; desktop window resized to portrait shows the layout (no overlay) | 10 | Not reached in the sandbox session; sizes are bounded by `--cg-unit-h: min(22dvh, 9.5dvw)` (10 units ≈ 74% of the width at 568×320). |
| Phase 9 J.1–J.7: two accounts in two browsers, create/join/selectDeck/ready via DevTools `fetch`, poll, duplicate `commandId`, Table Editor rows, REST call with the publishable key returns nothing/error | 9 | Needs the migration applied and two signed-in accounts (Phase 2 tests). The same flow is automated in `src/app/api/cards/routes.test.ts`. |

## Environment, migrations & dashboard
| Item | State |
|---|---|
| `20261113000000_profiles.sql` | applied 2026-11-12 (`npm run db:setup`: `applying 20261113000000_profiles.sql`, no errors) |
| `20261113010000_cards_matches.sql` | **not applied yet** — run `npm run db:setup` (twice, to confirm idempotency). Until then `/api/cards/*` answers 503 wherever DB credentials are set. |
| Vercel env | `SUPABASE_DB_PASSWORD` (or `SUPABASE_DB_URL`) must exist in **Production and Preview** (Phase 9 routes need Postgres) |
| Env vars | none added (uses existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD`) |
| Auth settings (read from `/auth/v1/settings`) | email provider enabled, sign-ups enabled, email confirmation **on** (`mailer_autoconfirm: false`) |
| Supabase Auth → URL Configuration: Site URL = production domain; Redirect URLs `http://localhost:3000/**` and `https://<production-domain>/**` | **pending (owner)** |
| Email template "Confirm signup" link → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/cards` | **pending (owner)** (without it, the default PKCE `?code=` link also works via `/auth/confirm`, but only in the same browser that signed up) |
| Email template "Reset password" link → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password` | **pending (owner)** |
| Custom SMTP (built-in sender allows only a few emails/hour) | **pending (owner)** — recommended before inviting more than a couple of friends |

## Engine card-behavior coverage
| Card id | Behavior test file |
|---|---|
GAME TESTS — every MVP catalog card has at least one behavior test (enforced by `engine/cards.test.ts` → "catalog coverage").

| Card id | Behavior test file |
|---|---|
| `arcane-spark`, `bone-storm`, `soul-harvest`, `skeleton-king`, `morvath`, `wild-roar`, `savage-strike`, `drain-life`, `mana-spark`, `growing-crystal`, `scholar`, `arcane-insight`, `storm-weaver`, `chain-lightning`, `apprentice-mage`, `grave-digger`, `pack-call`, `ursaria` (+ `bear-cub`), `dawn-paladin`, `healing-touch`, `flame-lance` | `engine/spells.test.ts` |
| `necromancer` | Grito: `engine/spells.test.ts`; Último Aliento: `engine/deaths.test.ts` |
| `ignis` | Grito: `engine/spells.test.ts`, `engine/triggers.test.ts`; Renacer: `engine/deaths.test.ts` |
| `restless-skeleton` (+ `skeleton`), `hungry-ghoul`, `crypt-banshee`, `last-stand-knight` | `engine/deaths.test.ts` |
| `alpha-wolf` (+ `wolf`) | `engine/triggers.test.ts` |
| `charging-rhino` | `engine/combat.test.ts` |
| `squire`, `wolf-pup`, `shield-bearer`, `forest-boar`, `iron-guard`, `stone-golem`, `berserker-bear`, `thornback-tortoise`, `twin-claw-panther`, `line-breaker`, `swamp-ent`, `vampire-bat`, `bone-wall` | `engine/cards.test.ts` |
| keyword rules on fixture units | `engine/keywords.test.ts`, `engine/combat.test.ts` |

## File locations
- Config: `src/game/cards/config/{rules,deckRules,economy}.ts`
- i18n: `src/game/cards/i18n/{es,index}.ts`
- RNG: `src/game/cards/engine/rng.ts`
- Test stub for `server-only`: `src/game/cards/testing/empty.ts`
- Auth: `src/proxy.ts`, `src/lib/{middleware,auth,safeNext,username}.ts`, `src/components/auth/{AuthCard.tsx,authErrors.ts}`, `src/app/auth/**`, `src/app/account/**`, `src/app/api/account/**`, `src/app/cards/{layout,page}.tsx`
- Migrations: `supabase/migrations/20261113000000_profiles.sql`, `20261113010000_cards_matches.sql`
- Lobby & PvP flow (Phase 11): `src/app/cards/{page.tsx,play/page.tsx}`, `src/components/cards/menu/CardsMenu.tsx`, `lobby/{LobbyScreen,DeckPicker,InviteShare}.tsx`, `match/{MulliganOverlay,GameOverOverlay,TurnBanner,MatchSounds}.tsx`, `skin/QrCode.tsx`; client `src/game/cards/client/{mulligan,sounds}.ts`; `src/game/cards/server/lobbyCode.ts`; proxy header in `src/proxy.ts` + `src/lib/safeNext.ts` (`REQUEST_PATH_HEADER`) used by `src/app/cards/layout.tsx`; home tile in `src/app/page.tsx`; tests `client/{mulligan,boardModel}.test.ts`, "resume" in `testing/serviceSuite.ts`
- Battlefield UI (Phase 10): `src/components/cards/{cards.css,LandscapeShell.tsx,RotateOverlay.tsx}`, `skin/*`, `card/*`, `match/*`, `dev/Sandbox.tsx`; client `src/game/cards/client/{transport,boardModel,interaction,matchClient,httpTransport,localTransport}.ts`; pages `src/app/cards/match/[id]/page.tsx`, `src/app/cards/dev/sandbox/page.tsx`; layout `src/app/cards/layout.tsx` (shell + CSS); tests `client/{interaction,matchClient,localTransport}.test.ts`, `i18n/uiGuards.test.ts`
- Persistence & API (Phase 9): `src/game/cards/server/{pgStore,instance}.ts`; `src/app/api/cards/{_shared.ts,matches/**/route.ts}`; client `src/game/cards/client/{api,realtime}.ts`; DB harness `src/game/cards/testing/pglite.ts`; shared service suite `src/game/cards/testing/serviceSuite.ts`; tests `server/pgStore.db.test.ts` (`npm run test:db`), `src/app/api/cards/routes.test.ts`, `client/api.test.ts`; config `vitest.db.config.mts`
- Server match layer (Phase 8): `src/game/cards/server/{store,memoryStore,matchService,view,commands,lobby,setup,replay,errors}.ts`; tests `server/{view,matchService,commands,replay}.test.ts`; helpers `src/game/cards/testing/{server,driver}.ts`
- Catalog & decks: see "Catalog file layout" above
- Engine: `src/game/cards/engine/{types,errors,commands,events,ids,ctx,triggers,defs,setup,stats,board,damage,draw,mana,turns,mulligan,play,gameOver,resolve,legal,apply,index}.ts`; tests `engine/{setup,mulligan,turns,play,determinism}.test.ts`; Phase 5 adds `engine/{keywords,combat}.ts` and tests `engine/{combat,keywords}.test.ts`; Phase 6 adds `engine/effects/{context,selectors,amount,execute}.ts`, `engine/effects/handlers/{damage,heal,summon,destroy,draw,addToHand,buff,grantKeyword,gainMana,side}.ts` and tests `engine/spells.test.ts`, `engine/effects/{selectors,execute}.test.ts`; Phase 7 adds `engine/effects/conditions.ts`, `engine/effects/handlers/if.ts` (and rewrites `triggers.ts`, `resolve.ts`) with tests `engine/{triggers,deaths,conditions,fuzz,cards}.test.ts`
