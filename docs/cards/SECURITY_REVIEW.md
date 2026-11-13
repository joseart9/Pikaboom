# Duelo Arcano — Security review (Phase 21)

**Date:** 2026-11-13 · **Scope:** plan §19.2 checklist, §12.3 security model, §13.8 threat model (T1–T16), service worker.
**Method:** every item has evidence that was produced in this session — a test that ran green (and, where noted, was
mutation-checked: the protection was removed and the test went red), a command output, or a check against the
production build (`npm run build` + `next start`). Items that need the live Supabase project or real accounts are
marked **pending (owner)** with the exact steps.

Automated guards added in this phase (they keep this review true for future changes):

| File | What it enforces |
|---|---|
| `src/game/cards/security.test.ts` | Every `/api/cards/*` + `/api/account/*` handler's first `await` is `requireUser()`/`requirePlayer()` (except `username-available`); no route source mentions `userId`/`seat`/`hostId`/`guestId`; only the Supabase URL + publishable/anon key are `NEXT_PUBLIC_`; no `service_role` anywhere; DB credentials read only in `server-only` modules; every card/auth module that talks to Postgres starts with `import "server-only"`; no `"use client"` file value-imports a `server-only` module; the realtime payload is exactly `{ v: version }` on `pikaboom-cards-${matchId}`; `public/sw.js` executed in a VM never answers account-aware URLs (17 cases + controls). |
| `src/game/cards/server/security.db.test.ts` | On PGlite with Supabase's default grants stubbed: enumerates **every** `cards_*`/`profiles` table and `cards_*` function (so a new one that forgets its revokes fails), RLS on, no policies, the plan's `role_table_grants` query returns 0 rows, `has_table_privilege` false for all 7 privileges × 2 roles, sequences locked, `set role anon/authenticated` → `permission denied` on every table, every function `search_path=""` + not `security definer` + not executable by client roles, `cards_purchase_pack` as `authenticated` → denied. |
| `src/app/api/account/profile/route.test.ts` | `PATCH /api/account/profile`: 401 first, 415 non-JSON, 413 > 1 KB, DB untouched in those cases. |
| `src/lib/logError.test.ts` | Server error lines carry the match id but never the error object's `detail`/`parameters` (values, emails, names). |

Mutation checks run in this session: removing `"/cards"` from the SW `LIVE_ONLY` list → 4 SW tests fail; inserting an
`await` before `requirePlayer()` in `wallet/route.ts` → the auth-order test fails; commenting out the two `revoke`
lines of `20261113050000_cards_packs.sql` → 6 DB tests fail. All three files were restored (`git checkout`).

## §19.2 checklist

- [x] **No `NEXT_PUBLIC_` secret; `SUPABASE_DB_PASSWORD` only in server env; every DB module imports `server-only`.**
  - `security.test.ts` → "only the Supabase URL and publishable (anon) key are NEXT_PUBLIC_", "no service_role key anywhere", "the DB credentials are read only by server-only modules", "every card-game / auth module that talks to Postgres starts with import \"server-only\"", "client code never imports a server-only module" — green.
  - Readers of `SUPABASE_DB_*`: `src/lib/db.ts`, `src/game/cards/server/instance.ts`, `src/game/battleship/rooms.ts` (all `server-only`), plus `scripts/db-setup.mts` (CLI, not bundled). `/admin` uses `@/lib/db` (itself `server-only`).
  - `.env.local` (git-ignored: `.gitignore:34 .env*`) holds only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD` (names checked, values not read).
- [x] **Every card-game table: RLS on, no policies, privileges revoked from `anon`/`authenticated`.**
  - `security.db.test.ts`: tables `cards_currency_transactions`, `cards_decks`, `cards_inventory`, `cards_match_commands`, `cards_match_rewards`, `cards_matches`, `cards_pack_openings`, `cards_wallets`, `profiles` — RLS on, `pg_policies` empty, plan query `select … from information_schema.role_table_grants where table_name like 'cards_%' and grantee in ('anon','authenticated')` → **0 rows**, reads as either role → `permission denied`.
  - Live project: **pending (owner)** — after `npm run db:setup`, run the same query in the SQL editor (expect 0 rows). Only `20261113000000_profiles.sql` is applied there today.
- [x] **Every card-game function: `revoke execute … from public, anon, authenticated`, `search_path = ''`.**
  - `security.db.test.ts`: `cards_create_deck`, `cards_grant_match_rewards`, `cards_grant_starter`, `cards_grant_starter_decks`, `cards_purchase_pack` — `proconfig` contains `search_path=""`, `prosecdef = false`, `has_function_privilege(anon|authenticated, …, 'execute')` false; calling `cards_purchase_pack` as `authenticated` → `permission denied`.
  - Live RPC attempt (`POST /rest/v1/rpc/cards_purchase_pack` with the publishable key): **pending (owner)** — the function does not exist on the live DB until `db:setup`, and the Data API currently answers `503 PGRST002` for every table (Known issues). Expected after `db:setup`: `401/403 permission denied for function cards_purchase_pack`.
- [x] **Every `/api/cards/*` and `/api/account/*` route (except `GET /api/account/username-available`) calls `requireUser()` first and never trusts ids from the body.**
  - `security.test.ts` (one case per route file × 2 checks: 13 route files, 16 handlers) + `routes.test.ts` "every route answers 401 JSON without a session, with Cache-Control: no-store" (cards, collection, wallet, store, decks) + `profile/route.test.ts` "401 signed out".
  - Production build, signed out: `/api/cards/matches/current`, `/api/cards/wallet`, `/api/account/profile` → 401; `/cards`, `/cards/match/<uuid>`, `/account` → redirect to `/auth/login?next=…`.
  - Seat/user come only from the session: `requirePlayer()` → `player.id`; the command body has no seat field (`server/commands.ts` `checkKeys` rejects any extra key).
- [x] **`viewFor` leak test passes; realtime payload is only `{ v }`.**
  - `server/view.test.ts` "viewFor — hidden information (Phase 8 row 1)" (50 games, both viewers, every step) and "… with every card (Phase 19 I)" — green in `npm test`.
  - `security.test.ts` "the nudge payload is { v } on a channel named by the match UUID". The channel name is the match UUID (`gen_random_uuid()`), so it is unguessable (T4).
  - Phase 21 change: views sent by the match service drop a backlog of > 40 events (`MAX_VIEW_EVENTS`, DEC-027). Redaction is unchanged (same `redactEvent`); fewer events are sent, never more.
- [x] **Commands validated by type guards; unknown fields rejected; body ≤ 4 KB; `content-type: application/json` required.**
  - `server/commands.test.ts` (T16): every command kind, "rejects extra fields at every level", bad types/values, unknown and server-only command types, exotic prototypes, 4 KB limit.
  - `routes.test.ts` "rejects non-JSON (415), oversize (413), malformed (400) bodies and bad ids (404)"; decks (8 KB) and purchase bodies use the same `readJson`.
  - **Finding fixed:** `PATCH /api/account/profile` used `request.json()` with no content-type or size check. A cross-site `PATCH` always needs a CORS preflight, so it was not exploitable for CSRF, but it now follows the same rules (415 / 413 at 1 KB) — `profile/route.test.ts`.
- [x] **Rewards/purchases idempotent and covered by DB tests.**
  - `server/rewards.db.test.ts` (22) and `server/shop.db.test.ts` (20) — green in `npm run test:db` (`Tests 129 passed (129)`): granting twice / concurrently → one ledger row per player; same purchase key 3× concurrently → one debit, same cards; two keys with funds for one → exactly one succeeds.
- [x] **Service worker does not cache `/cards`, `/auth`, `/account`, `/api/cards`, `/api/account`.**
  - `security.test.ts` runs `public/sw.js` in a VM: navigations, RSC (`?_rsc=`), art SVGs and API calls under those prefixes are never intercepted; `/`, `/charades`, `/_next/static/*`, `/api/words` still are (control); `/cardsharp` is not over-excluded; non-GET is never intercepted.
  - **Production build** (`npm run build` + `next start -p 3001`, in-app browser): SW `activated` and controlling, `GET /sw.js` → `Cache-Control: no-cache, no-store, must-revalidate`, `Content-Security-Policy: default-src 'self'; script-src 'self'`. After requesting 11 account-aware/public URLs and navigating to `/cards/match/<uuid>` (→ login), `caches` held 23 entries (`pikaboom-shell-v4`, `pikaboom-runtime-v4`) and **none** matched `^/(cards|auth|account|api/cards|api/account|admin)`.
  - Update path: `ServiceWorker.tsx` registers with `updateViaCache: "none"`; `sw.js` is served `no-store`; `install` → `skipWaiting()`, `activate` → deletes every cache not of the current `VERSION` + `clients.claim()`. The `/cards` exclusions shipped together with the `v3 → v4` bump (commit `f2931d4`), so an installed PWA that cached `/cards` pages under v3 dropped them on update. No caching rule changed in Phases 9–21, so no further bump is needed; bump `VERSION` whenever caching rules change. Real installed-PWA update on iOS/Android: **pending (owner)** (device matrix).
- [x] **Charades and Batalla Naval still work signed out.**
  - Production build, signed out, desktop (in-app browser): `/charades` loads and fetches "200 palabras de la nube ☁️"; `/battleship` renders "Crear sala / Unirme". `src/proxy.ts` matcher covers only `/cards`, `/account`, `/auth`, `/api/cards`, `/api/account`. Phones/installed PWAs: **pending (owner)** (device matrix).

## §13.8 threat model

| # | Threat | Evidence (this session) | Live check |
|---|---|---|---|
| T1 | Command for the opponent's seat | `routes.test.ts` "… T1 and T12" (B posts on A's turn → 409 `not_your_turn`); `serviceSuite` T1 rows; no seat in the body (`commands.test.ts` extra-field rejection) | pending (owner) |
| T2 | Reading the opponent's hand/deck | `view.test.ts` leak tests (starter + all-cards); tables locked (`security.db.test.ts`) | pending (owner): DevTools on B never shows A's hand names |
| T3 | Data API / RPC direct access | `security.db.test.ts` (catalog-wide) + per-phase DB tests | pending (owner): REST + RPC with the publishable key after `db:setup` |
| T4 | Realtime eavesdropping | `security.test.ts` payload/channel check; channel = random UUID; payload = version only | — |
| T5 | Replayed / duplicated command | `serviceSuite` "row 4: the same CommandRequest 10× concurrently has exactly one effect" (memory + PGlite); PK `(match_id, command_id)` | pending (owner): DevTools "Replay XHR" |
| T6 | Two commands at once | `serviceSuite` concurrent commands from a single snapshot (memory + PGlite) | — |
| T7 | Forged mana/damage/draw/random | client sends intents only (`commands.ts`); engine tests + fuzz (Phases 4–7, 18–19) | — |
| T8 | Unowned cards | `decks.test.ts` / `decks.db.test.ts` (save + play mode, start-time re-check) | — |
| T9 | Duplicate rewards | `rewards.db.test.ts` (PK, `rewards_granted_at`, row lock; concurrent grants) | — |
| T10 | Currency tampering / double spend | `shop.db.test.ts` (balance guard, idempotency key, concurrent keys) | pending (owner): replayed purchase body |
| T11 | Pack outcome manipulation | `routes.test.ts` "the client cannot choose the cards: extra body fields are ignored"; `node:crypto` roll (`packs.test.ts`) | — |
| T12 | Other users' matches | `routes.test.ts` "… T1 and T12" (stranger polls → 403 `not_in_match`); decks of another user → 404 | pending (owner): other account's match id in the URL |
| T13 | Stalling | turn timer + forfeit after 3 timeouts (`matchService.test.ts`) | — |
| T14 | Reward farming | `rewards.db.test.ts` rows 3–7 (min turns, per-opponent cap, daily cap, abandon) | — |
| T15 | CSRF | `readJson` requires `application/json` (415) on every card POST/PUT; profile PATCH now too; Supabase cookies `SameSite=Lax` | — |
| T16 | Oversized/malformed payloads | `commands.test.ts`, `routes.test.ts` 413/400/404; profile 413 | — |

## Error logging (Phase 21 C)

`src/lib/logError.ts` — `logServerError(where, e, { matchId })` prints one line: `[pikaboom] <where> match=<uuid> — Name [code]: message` + up to 8 stack frames. It never passes the error object to `console.error` (a `pg` error's `detail`/`parameters` contain values such as usernames), never logs request bodies, user ids, emails or names. Used by every card/account route (`_shared.errorResponse` with the match id on `GET /matches/[id]` and `POST /matches/[id]/commands`), the reward-grant failure in `matchService.ts`, and the `ensureProfile` failures in `/cards` layout, `/account`, `/auth/confirm`.

## Attack attempts on the deployed URL (plan G.2) — pending (owner)

Needs the migrations applied (`npm run db:setup`) and two signed-in accounts; the agent does not run `db:setup` against the live DB or create accounts. Steps (record date, browser and result in `STATUS.md`):

1. **Forged seat:** in a match, copy a `POST /api/cards/matches/<id>/commands` request as fetch, add `"seat": 1` to the body → expect `400 bad_request` (unknown field). Send B's command while it is A's turn → `409 not_your_turn`.
2. **Replayed command:** "Replay XHR" on a `play` request → same view, the card is not played twice.
3. **Other user's match:** open `/api/cards/matches/<id-of-a-match-you-are-not-in>` → `403 not_in_match`.
4. **RPC with the publishable key:** `fetch(SUPABASE_URL + "/rest/v1/rpc/cards_purchase_pack", { method: "POST", headers: { apikey: KEY, "content-type": "application/json" }, body: JSON.stringify({ p_user: "<your uuid>", p_pack: "arcane", p_price: 0, p_cards: ["ignis"], p_key: "x" }) })` → permission error; same for `/rest/v1/cards_wallets?select=*` → error or `[]`.
5. **Replayed purchase:** "Replay XHR" on `POST /api/cards/store/purchase` → same cards, balance unchanged; edit `packType` to `"x"` → `400 invalid_pack`.

## Residual risks (accepted)

- **Supabase built-in SMTP** limits sign-up emails per hour (owner task: custom SMTP) — availability, not confidentiality.
- **`npm audit`** advisories in the dev dependency tree (Phase 1 known issue); no runtime dependency was added in Phases 2–21.
- **Rate limiting:** there is no per-IP/user rate limit on the API beyond Vercel's platform limits; abuse is bounded by auth (every write needs an account), the 4 KB bodies, the per-match version check and the reward anti-farm rules. Candidate for the future list.
