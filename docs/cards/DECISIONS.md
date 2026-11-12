# Duelo Arcano — Decision Log

Format: one entry per decision. Status: ACCEPTED | PROPOSED | SUPERSEDED.

## DEC-001 — Pin Vitest to 4.x instead of latest 5.x
- **Date:** 2026-11-12 · **Phase:** 1 · **Status:** ACCEPTED
- **Context:** Phase 1 step 1 says `npm i -D vitest`. The latest Vitest (5.1.0) declares the peer `@types/node@"^22 || >=24"`, but the repo pins `@types/node@^20`, so npm fails with `ERESOLVE`.
- **Decision:** Install `vitest@^4.1.12` (peer range includes `@types/node@^20`). Do not bump `@types/node` (would affect type-checking of the whole app) and do not use `--legacy-peer-deps`.
- **Relates to:** ADR-16 (only allowed dev dependency), ADR-23.
- **Consequences:** The config API used by the plan (`vitest/config`, `defineConfig`, `vitest bench --run`) is identical in 4.x. Upgrading to Vitest 5 later requires bumping `@types/node` to ≥ 22 (Node 24 is the local runtime, so `^24` would be the natural choice).

## DEC-002 — `MessageKey` excludes `es.cards`; one extra `match.turnNumber` key
- **Date:** 2026-11-12 · **Phase:** 1 · **Status:** ACCEPTED
- **Context:** §17.8/Phase 1 F type `es.cards` as `Record<string, CardText>`. Feeding that through `Leaves<Dictionary>` would make every `cards.<anything>.name` a valid `MessageKey`, defeating key checking. Phase 1 I also asks to test `{param}` replacement but no key in the listed sections has a placeholder.
- **Decision:** `MessageKey = Leaves<Omit<Dictionary, "cards">>`; card texts are read only through `cardName()` / `cardText()` (as §17.8 already intends). Added `match.turnNumber: "Turno {n}"` to exercise parameter replacement. Also added `auth.loginToPlay` ("Inicia sesión para jugar.", the 401 message from §14.1) so Phase 2 doesn't hardcode it.
- **Relates to:** ADR-17, §17.8, §14.1.
- **Consequences:** `t("cards.x.name")` is a type error by design.

## DEC-003 — `RngState` defined in `engine/rng.ts`
- **Date:** 2026-11-12 · **Phase:** 1 · **Status:** ACCEPTED
- **Context:** §10.1 lists `RngState` in `engine/types.ts`, while Phase 1 F defines it in `engine/rng.ts` (types.ts does not exist until Phase 4). The RNG functions also take a structural `{ rng: RngState }` holder, exported as `RngHolder`.
- **Decision:** `rng.ts` owns `RngState`; Phase 4 should re-export it from `engine/types.ts` (`export type { RngState } from "./rng"`) rather than declaring a second copy.
- **Relates to:** ADR-04, §10.1.
- **Consequences:** None beyond a single source of truth for the type.

## DEC-004 — Extra Phase 2 files and helpers beyond the §21 file table
- **Date:** 2026-11-12 · **Phase:** 2 · **Status:** ACCEPTED
- **Context:** The Phase 2 file table lists `page.tsx` only for `/auth/forgot` and `/auth/update-password`, and `auth.ts` exports only `getUser`, `requireUser`, `AuthError`, `ensureProfile`, `Profile`. The profile API and the signup form still need rename/availability logic and a Supabase-error mapping.
- **Decision:** Added `ForgotForm.tsx` and `UpdatePasswordForm.tsx` (client forms, so the pages stay server components with metadata), `src/components/auth/authErrors.ts` (Supabase `code` → `es.auth.*`), and in `auth.ts`: `UsernameError` (`invalid` → 400, `taken` → 409), `isUsernameAvailable`, `updateUsername`. `AuthCard.tsx` also exports `Field`, `FormMessage`, `inputClass`.
- **Relates to:** §14.1, §21 Phase 2 E.
- **Consequences:** None for later phases; all DB access for profiles stays in `src/lib/auth.ts`.

## DEC-005 — Profile is also created right after email confirmation; signup redirect keeps `next`
- **Date:** 2026-11-12 · **Phase:** 2 · **Status:** ACCEPTED
- **Context:** §14.1 creates the profile lazily "on the first authenticated call". The availability check only sees `profiles`, so a username stays unreserved until the first visit; also the signup `emailRedirectTo` hardcodes `next=/cards`.
- **Decision:** `ensureProfile` is called (non-fatally) by `/auth/confirm` after a successful verification, by the `/cards` layout, `/account` and `/api/account/profile`. `emailRedirectTo` uses the page's safe `next` (default `/cards`) so deep links survive sign-up. `/auth/confirm` and `/auth/signout` redirect with 303. Duplicate-email sign-ups with confirmation on (Supabase returns a user with `identities: []` and no error) show "Ya existe una cuenta con ese correo.".
- **Relates to:** §14.1, ADR-08.
- **Consequences:** Still lazy (no trigger on `auth.users`); the username race is handled by the `jugador_<digits>` fallback as specified.

## DEC-006 — Service worker exclusions match whole path segments
- **Date:** 2026-11-12 · **Phase:** 2 · **Status:** ACCEPTED
- **Context:** `sw.js` used `pathname.startsWith("/admin")`. Applying the same prefix test to `/cards` would also bypass unrelated future paths such as `/cardsXYZ`, and to `/auth` would match `/authors`.
- **Decision:** One `LIVE_ONLY` list (`/admin`, `/auth`, `/account`, `/cards`, `/api/cards`, `/api/account`) matched as `pathname === p || pathname.startsWith(p + "/")`. `VERSION` bumped to `v4`.
- **Relates to:** §3.10 item 7.
- **Consequences:** `/admin` behavior unchanged for every real admin URL.

## DEC-007 — Phase 3 card-notation interpretations
- **Date:** 2026-11-12 · **Phase:** 3 · **Status:** ACCEPTED
- **Context:** §20.2 writes abilities in shorthand (`B → damage(2) @chosen`); a few entries need choices that the table leaves implicit.
- **Decision:**
  - Ability ids: spells `cast`; Grito de Guerra `battlecry`; Último Aliento `deathrattle`; `hungry-ghoul` `onKill`; `alpha-wolf` `packLeader`; `last-stand-knight` `lastStand`; `crypt-banshee` `onUndeadDied`.
  - `storm-weaver` "×3" = one `random` selector with `count: 3` over `enemyCharacters` (three **distinct** targets, fewer if fewer exist — §9.3 selector semantics), not three independent 1-target hits.
  - `wild-roar` and the `hungry-ghoul`/`crypt-banshee`/`last-stand-knight` buffs are permanent (default `duration`); `savage-strike` uses `duration: "thisTurn"`.
  - `growing-crystal` = `gainMana { amount: 1, kind: "emptyMax" }`; `mana-spark` = `gainMana { amount: 1, kind: "temporary" }`; `scholar`/`arcane-insight` `draw` with default side (friendly).
  - `morvath` = `destroy @{ kind: "all", group: "allMobs", excludeSelf: true }`.
  - Every def is `version: 1`, `set: "core"`, `art` = id, via a tiny `core(id)` helper in `catalog/cards/core.ts`.
- **Relates to:** §20.2, §9.3, Phase 3 G.3.
- **Consequences:** Phase 6/7 implement these exact data shapes; `catalog.test.ts` pins the interpreted ones.

## DEC-008 — Validator checks beyond §9.6 and V1-effect gating
- **Date:** 2026-11-12 · **Phase:** 3 · **Status:** ACCEPTED
- **Context:** §9.6 lists the rules; several structural mistakes would still pass them (e.g. summoning a spell card, an ability with no effects).
- **Decision:** `validateCatalog` additionally rejects: unknown rarity/set/tribe/keyword/trigger/selector/condition/effect/group/status/filter field; duplicate tribes; `summon`/`transform` of a non-mob; abilities with no effects; empty `limit`; `healthThreshold.percent` outside 1..99; `grantKeyword berserk` (needs two values) and missing/extra `grantKeyword.value`; `buff` with neither attack nor health; numeric amounts outside 0..30; `draw` counts outside 1..7; `excludeChosen` / `eventAmount` used without target / event context (same spirit as rules 6–7). Rule 10 stays for Phase 6; until then `catalog.test.ts` asserts every effect type is in `MVP_EFFECT_TYPES` (exported from `catalog/types.ts`) and every keyword is `available: "mvp"`.
- **Relates to:** §9.6, ADR-12.
- **Consequences:** Phase 6 adds rule 10 next to these checks; `MVP_EFFECT_TYPES` can then be replaced by `EFFECT_HANDLERS` keys.

## DEC-009 — Catalog/deck helper details
- **Date:** 2026-11-12 · **Phase:** 3 · **Status:** ACCEPTED
- **Context:** Small API details not fixed by the plan.
- **Decision:**
  - `CATALOG` is a frozen null-prototype object; added `hasDef(id, catalog?)` (safe for untrusted ids like `"toString"`) and `compareCards`; `getDef` throws on unknown ids. `COLLECTIBLE_CARDS` is sorted by cost then Spanish name (§15.1), so `catalog/index.ts` imports `cardName` from `i18n` (pure; no runtime cycle — `i18n` only imports catalog *types*).
  - `validateDeck` ownership is strict: every card (Básicas included) must be in `owned` with enough copies. Phase 14 grants every Básica ×2, so this matches the inventory; `owned = null` still skips the check.
  - `expandDeck`/`countCards` merge duplicate entries and skip invalid counts, like `validateDeck`.
  - `es.deckErrors` has a message for every `DeckProblem` code (plan listed four examples); `es.abilityWords` entries are `{ name, text }`; added `es.starterDecks`.
  - Snapshot guard: stored at `catalog/__snapshots__/catalog-hashes.json`; the test also fails when the snapshot is stale (new card, or a legitimately bumped version) and refreshes only with `UPDATE_CARD_SNAPSHOT=1`, so a bumped card cannot later change again unnoticed. Removing a stored card fails.
- **Relates to:** §11, §15.1, §15.3.
- **Consequences:** Workflow for balance changes: edit def → bump `version` → `UPDATE_CARD_SNAPSHOT=1 npx vitest run catalog.snapshot` → commit both.

## DEC-010 — Phase 4 engine details not fixed by the plan
- **Date:** 2026-11-12 · **Phase:** 4 · **Status:** ACCEPTED
- **Context:** §6/§8/§10 leave a few mechanical choices open for the core engine.
- **Decision:**
  - **System commands ignore the `seat` argument** of `applyCommand`: `timeout` always acts on `turn.activeSeat`; `mulliganTimeout` uses `cmd.seat`. A `mulliganTimeout` for a seat that already mulliganed throws `already_mulliganed` (the server can ignore it).
  - **Forfeit by timeout** emits only `GAME_OVER` (no `TURN_ENDED`/next turn). A timeout in a turn where the player already acted does not increment the streak (their command reset it to 0).
  - **Opening hands** draw the first player's 3 cards, then the second player's 4 (each emitting private `CARD_DRAWN`). A mulligan with an empty `replace` does not reshuffle (no RNG use).
  - **`PlayerState.fatigue`** stores the last fatigue damage dealt (0 = never); next = `fatigueStart` the first time, else `fatigue + fatigueIncrement` (1, 2, 3 …). The §10.1 comment "next fatigue damage − 1" is equivalent with the standard increment of 1.
  - **`payCost` emits `MANA_CHANGED` after `CARD_PLAYED`** (matches §8.9 and Phase 4 test row 7); a 0-cost play emits no `MANA_CHANGED`.
  - **The summoned unit keeps the card's iid** (`CARD_PLAYED.iid === MOB_SUMMONED.unit.iid`, as in §8.9).
  - **Targets in Phase 4:** a `target` on a card without a play-target spec → `unexpected_target`; a mob *with* a spec (e.g. `apprentice-mage`) accepts any `target` unvalidated because its Grito de Guerra is skipped until Phase 6, which must add real validation.
  - **End of turn:** `endOfTurn` modifiers expire on both boards with one `STATS_CHANGED` per affected unit; temporary mana is cleared with `MANA_CHANGED` only if it was non-zero.
  - **`isGameOver(s)`** helper in `gameOver.ts` is used after calls that may end the game (TypeScript narrowing on `s.phase` would otherwise go stale).
  - Helpers beyond the file table: `engine/damage.ts` already holds `damageHero` (Phase 5 extends this file instead of moving it); `board.ts` exports `createUnit`, `snapshotUnit`, `unitsInBoardOrder`; `stats.ts` exports `isAlive`; `mana.ts` exports `availableMana`, `clearTemporaryMana`; `play.ts` exports `effectiveCost`, `playTargetSpec`; `testing/matches.ts` builds real matches from the starter decks.
  - The purity test ignores comments (Phase 1's `rng.ts` comment says "Never use Math.random").
- **Relates to:** §6.2–§6.6, §6.10, §8.1, §10.1–§10.3.
- **Consequences:** Phase 5 adds `applyDamageInstances`/`heal` to `damage.ts`; Phase 6 replaces the `not_supported` paths in `play.ts`/`apply.ts`; Phase 7 replaces `engine/triggers.ts` and extends `resolve.ts`.

## DEC-011 — Phase 5 combat details not fixed by the plan
- **Date:** 2026-11-12 · **Phase:** 5 · **Status:** ACCEPTED
- **Context:** §6.7/§6.8/§7.1/§8.4 leave a few mechanical choices open for combat and the core keywords.
- **Decision:**
  - **Escudo keyword disappears with its last charge.** `preventDamage` deletes `unit.keywords.shield` when `shieldCharges` reaches 0, so `keywords.shield` always means "has Escudo now" (UI and `KEYWORDS_CHANGED` need no special case). `shieldCharges` stays the live count. Phase 6's `grantKeyword shield N` must add N to `shieldCharges` and set `keywords.shield` again if absent.
  - **`preventDamage` returns the damage that gets through** (`amount: 0` when blocked) and consumes what it uses. `DamageResult.amount` keeps the instance's original amount; `dealt` is what landed.
  - **Each DAMAGE's `healthAfter` is the target's health after that instance**, applied in list order (thorns after retaliation shows 2 then 0). Prevention never depends on health and every attack value is read before the batch, so this equals simultaneous application.
  - **`damageHero` now goes through `applyDamageInstances`** (identical DAMAGE event; heroes have no prevention in V1).
  - **Attack error codes:** unknown attacker/target id → `unit_not_found`; an enemy unit given as attacker → `cannot_attack`; own hero/unit as target → `invalid_target`; an enemy target outside `attackTargets` → `rush_no_hero` (hero, Embestida on its summon turn), else `must_attack_taunt` (a Provocar unit exists), else `invalid_target`. Order: attacker exists → attacker is yours → attack > 0 → attacks left → summoning sickness → target.
  - **Robo de Vida** heals even if the attacker dies in the same exchange (the heal follows the damage batch; the value is read before it). A lifesteal defender's retaliation never heals.
  - **Healing** skips dead/dying units (health ≤ 0 or `pendingDestroy`); `HEAL.amount` = health actually restored.
  - **Regeneración** ticks right after `TURN_ENDED` (active seat's board left→right), before `endOfTurn` modifiers expire (§6.3 step 1 vs 2). Phase 7 queues `turnEnd` triggers in the same step.
  - **`isSleeping` is silence-aware** (uses `hasKeyword`). New `summonedThisTurn(s, u)` in `stats.ts` is the single place Phase 19 extends for "changed control this turn".
  - **`ATTACK_CANCELLED`** is implemented (re-check after the post-declaration `resolveAll`) but unreachable until Phase 7 adds `attack`/`attacked` triggers; it is not emitted when the game ended meanwhile.
  - **Test fixture:** `UnitSpec` gained `attack`/`health` overrides of the base stats, so tests can say "a 3/2 unit" without new test defs.
  - `ENGINE_VERSION` stays 1: no match has been persisted yet (Phase 9).
- **Relates to:** ADR-21, §6.7–§6.8, §7.1, §8.4.
- **Consequences:** Phase 6 must keep the shield keyword/charges pairing in `grantKeyword`; Phases 18/19 extend `preventDamage`, `heal`, `attackBlocker` and `attackTargets` at the commented hooks.

## DEC-012 — Phase 6 effect/targeting details not fixed by the plan
- **Date:** 2026-11-12 · **Phase:** 6 · **Status:** ACCEPTED
- **Context:** §6.5, §6.9, §8.5, §9.3–§9.4 leave some mechanical choices open for the effect executor and play targeting.
- **Decision:**
  - **Rule 10 source of truth:** `engine/effects/execute.ts` exports `IMPLEMENTED_EFFECT_TYPES` (the `EFFECT_HANDLERS` keys); `validateCatalog` imports it (catalog → engine runtime import; no cycle, the engine imports only catalog *types*). `validateCatalog(defs, dict, { implementedEffects? })` lets the structural `if` tests run as if Phase 7 were done; the default rejects `if` and V1 effects.
  - **Mob with a target spec but no valid targets:** played without a target; sending one anyway → `invalid_target`. `LegalActions.play` reports `targets: []`, `targetRequired: false` for it (spells with a spec and no targets are not listed at all; mobs/spells without a spec report `targets: null`).
  - **Spells ignore `position`** (the event's `position` is `null`). Rejecting it would add an error the client can't trigger from the UI; Phase 8's command guard may still strip it.
  - **`validTargets` never includes the card being played** (relevant once abilities can target friendly mobs including self).
  - **Only the targeted `play` ability receives `chosen`**; a card's other `play` abilities run with `chosen` undefined.
  - **No `TRIGGER_ACTIVATED` for spells**; mobs emit one per `play` ability before its effects (§8.9). Steps are not incremented for play abilities (§8.9 shows them at step 0).
  - **`grantKeyword shield N`** adds N to `shieldCharges` and sets `keywords.shield` to the new charge count (keeps DEC-011: keyword present ⇔ charges > 0). Numeric keywords default to value 1 if a (validator-rejected) def omits `value`. Granting to a silenced unit stores the keyword but it stays inactive while silenced (Phase 18 may revisit).
  - **`buff`/`grantKeyword`/`destroy` ignore heroes** in their selector results; `heal` and `damage` apply to heroes.
  - **`eventAmount`** = DAMAGE `dealt` (not the pre-prevention `amount`) or HEAL `amount` (restored); 0 otherwise.
  - **`random` selector** returns picks in pick order (from `rngPick`), so a `count ≥ candidates` selection is a random permutation; damage instances follow that order.
  - **Summon `side: "enemy"`** goes to the enemy board's right end unless the source is on that board; the death-snapshot `sourceIndex` applies only to the controller's own board.
- **Relates to:** §6.5, §6.9, §8.5, §8.7, §9.3–§9.6.
- **Consequences:** Phase 7 adds the `if` handler (rule 10 then accepts `if` automatically), passes `event`/`sourceIndex` in `AbilityContext`, and fills the killer for `MOB_DESTROYED` in `eventSubjects`.

## DEC-013 — Phase 7 trigger/death details not fixed by the plan
- **Date:** 2026-11-12 · **Phase:** 7 · **Status:** ACCEPTED
- **Context:** §8.1–§8.3 and §9.3 leave some mechanical choices open for the trigger queue and death processing.
- **Decision:**
  - **`Ctx.departed`** (per-command `Record<iid, Unit>`, not stored in `MatchState`) keeps the last state of every unit removed by death processing. Death abilities resolve from it, `otherDied` filters and conditions on dead subjects use it, and `MOB_DESTROYED`'s `eventSource` is the dead unit's `lastDamagedBy`. Cross-command death context is never needed, because death triggers always resolve in the command that killed the unit.
  - **Causal depth for deaths:** while a trigger resolves, `ctx.depth` stays at its depth until the next trigger starts, so death triggers caused by its effects (processed right after it) get depth + 1 too. Otherwise a deathrattle loop would reset to depth 1 every time; the 500-resolution cap is the backstop either way. `resolveAll` restores the outer depth on exit.
  - **Renacer** brings back a **new iid** (the old unit is in the graveyard; animations see `MOB_DESTROYED` then `MOB_SUMMONED { cause: "reborn", sourceId: oldIid }`). It emits no `TRIGGER_ACTIVATED`, and the returning unit does not run its Grito de Guerra. `placeUnit` gained an `init` callback so the 1-health unit is announced correctly.
  - **Limits** are checked when queuing (cheap skip) and again at resolution (several copies may be queued in one chain); uses are recorded at resolution as the plan says.
  - **No reactions outside `playing`:** `matchTriggers` ignores events during mulligan and after `GAME_OVER`. `CHAIN_LIMIT_REACHED` is never matched.
  - **Resolution cap:** after `CHAIN_LIMIT_REACHED`, the final `processDeaths` still removes dead units, but any triggers it queues are discarded too (the board settles and nothing more resolves in that command).
  - **Resistencia Final** is marked in `thresholdsFired` when queued (as the plan says). If the unit dies before it resolves, the mark stays, which is harmless because the unit is gone.
  - **`hasStatus` condition** is gated like rule 10: `IMPLEMENTED_CONDITION_KINDS` (exported by `effects/conditions.ts`) feeds `validateCatalog`'s new `implementedConditions` option, and the engine throws if it ever meets one.
  - **`if` handler injection:** `handlers/if.ts` exports `makeIfHandler(run)` and `execute.ts` passes `runEffects`, which avoids a module cycle that could hit the TDZ.
  - **Fuzz invariants** are plain checks run after every command, with `expect.fail` only on violation; this keeps 300 games at about 12.5 s. Mulligans in the fuzz replace a random third of the hand.
  - **Test-only cards** beyond the plan's list: `test-guardian` (makes `ATTACK_CANCELLED` reachable) and `test-if`. `makeState` accepts inline `defs` for one-off test cards (pinger loops, watchers).
- **Relates to:** §8.1–§8.3, §8.8, §9.3, §9.6, ADR-20.
- **Consequences:** Phase 8 views must treat `MOB_SUMMONED { cause: "reborn" }` as a new unit. Phase 18 adds `hasStatus` to `IMPLEMENTED_CONDITION_KINDS` and the Aturdido check in `matchTriggers` and `triggerSource`.

## DEC-014 — Phase 8 server-layer details not fixed by the plan
- **Date:** 2026-11-12 · **Phase:** 8 · **Status:** ACCEPTED
- **Context:** §10.3–§10.4, §13.4–§13.7 and the Phase 8 section leave some choices open, and one test wording (row 1) conflicts with the owner's own legitimate knowledge.
- **Decision:**
  - **Leak test, own deck:** row 1 says "no iid in either deck". A seat's own opening-hand cards that the mulligan shuffles back keep their iids, and the owner already saw them in its own `CARD_DRAWN`/`MULLIGAN_DONE` (both "as is" for the owner per §10.3). The test therefore forbids **every** foe hand/deck iid, and own-deck iids **only if the owner never held them**. Re-iiding shuffled-back cards would need an engine change (and `ENGINE_VERSION` bump) for no information gain, so it was not done.
  - **Leak test, defId counts:** per defId, occurrences in `foe` + view events must not exceed occurrences in `foe` + every unredacted log event that is not private to the foe (`CARD_DRAWN`, `CARD_ADDED_TO_HAND`, `MULLIGAN_DONE` of the foe). The test also checks the redacted shapes structurally and checks both viewers (the plan only required seat 0).
  - **Errors:** service codes get Spanish text in a new `es.matchErrors` section (`bad_request`, `not_found`, `own_lobby`, `full`, `already_in_match`, `not_in_match`, `busy`, `wrong_phase`, `game_over`, `time_up`, `no_deck`, `deck_unavailable`, `replay_unavailable`); `errorText(code)` checks `matchErrors` then `errors`. `ServiceError` has a 4th `details` argument (`{ matchId }` for `already_in_match`). Non-`EngineError` throws from the engine become 400 `bad_request`.
  - **Status precedence:** in `finished`/`abandoned`/`cancelled` matches **every** command (lobby ones included) is 409 `game_over`; `wrong_phase` is only for `lobby.*` in `active` and game commands in `lobby`. An already-recorded `commandId` returns the current view before any status check (idempotent retries after the game ended still succeed).
  - **Lobby:** `ready: true` without a deck → 409 `no_deck`. The host may be ready before a guest joins; the match starts only when both seats are ready, both have decks and a guest is present. The deck choice is validated (`resolveDeckChoice`) on `selectDeck` and again at start. Guest leave resets only the guest seat (the host keeps its deck and ready flag).
  - **Timeouts:** `applyDueTimeouts` applies **one** system command per call (mulligan: the lowest pending seat first) and returns `true` also on `StoreConflict`/`DuplicateCommand`, so callers just reload; two expired mulligans become two writes with ids `sys:mulligan-timeout:0` and `:1`. `turnDeadline` is recomputed whenever the turn number **or** phase changes, and cleared when the match finishes.
  - **`winnerId`** comes from the row (`hostId`/`guestId` by winning seat), not from `PlayerState.userId`.
  - **Stale cleanup** runs in `createLobby` (as planned) and also in `joinByCode` and `currentMatchFor`, so an expired lobby/match is never offered or joined. `markStale` bumps `version` and clears `turnDeadline`.
  - **Join:** check order is `not_found` → `own_lobby` → (already your seat → your view) → `already_in_match` → `full`. Codes shorter/longer than 6 after normalization are `not_found`. A non-lobby row is `not_found` unless you are one of its players.
  - **Reads:** `readMatch` refreshes `seen*` via `store.touch` (no version bump) at most every 3 s (`TOUCH_INTERVAL_MS`); `submitCommand` accepts `{ since }` for the events in its response (default 0).
  - **Parser:** mulligan `replace` must be card iids (`c\d{1,6}`), saved deck ids must be UUIDs (lower-cased), objects with a non-plain prototype are rejected, the result is a fresh object. `parseCommandBody(text)` adds the 4 KB limit (`MAX_COMMAND_BODY_BYTES`) and JSON parsing for the routes.
  - **Memory store:** ids are uuid-shaped counters (deterministic tests); every method awaits one microtask so concurrent requests interleave; contract semantics are documented once in `store.ts`.
  - **`buildSetup`** takes an optional `{ rules, catalog }` (defaults: `STANDARD_RULES`, `CATALOG`). `replay` throws `ServiceError(409, "replay_unavailable")` on an engine-version mismatch and sorts by `seq` when every entry has one.
  - **Shared fuzz driver:** `randomCommand`/`seedHex` moved from `engine/fuzz.test.ts` to `testing/driver.ts` (identical behavior) so the leak and concurrency tests reuse it.
- **Relates to:** ADR-02, ADR-03, ADR-05, ADR-22, §10.3–§10.4, §13.4–§13.8, §6.11.
- **Consequences:** Phase 9's `pgStore` must follow the `store.ts` contract (including "duplicate leaves the version unchanged" and "touch does not bump version"). Phase 15 extends `DeckChoiceDeps` with saved-deck loading and inventory instead of changing `resolveDeckChoice`'s callers.

## DEC-015 — Phase 9 persistence/API details not fixed by the plan
- **Date:** 2026-11-12 · **Phase:** 9 · **Status:** ACCEPTED
- **Context:** Phase 9 (§13.2–§13.5, §12) leaves some choices open, and a few plan details needed small adjustments.
- **Decision:**
  - **`markStale` uses the DB clock.** `PgMatchStore.markStale(now)` ignores its `now` argument and compares `updated_at` with `now()` in SQL, as Phase 9 G.2 says. `updated_at` is written by the DB clock, so this keeps one clock. The memory store still uses the service clock, so the Phase 8 stale test stays memory-only; the DB test backdates `updated_at` instead.
  - **`update` follows the contract, not the literal §13.4 SQL.** Every key present in the patch is written as is (no `coalesce` for `setup`/`started_at`), exactly like `MemoryMatchStore`. The SQL is the §13.4 CTE with a dynamic `SET` list from a whitelisted column map. Params are typed with casts (`::jsonb`, `::timestamptz`, `::uuid`); JSON is sent as `JSON.stringify`, dates as ISO strings, so `pg` and PGlite behave the same.
  - **Invalid ids never reach SQL.** `PgMatchStore` checks UUID shape before `::uuid` casts: `load` → null, `update` → `StoreConflict`, `hasCommand` → false. The routes also 404 on `/^[0-9a-f-]{36}$/` mismatches, as planned.
  - **`findOpenForUser`** is a `union all` of a host branch and a guest branch, so each can use its partial index, ordered by `created_at desc`.
  - **Shared service suite.** Rows 4, 5, 6, 7, 10 and the simultaneous-ready race moved unchanged from `matchService.test.ts` to `testing/serviceSuite.ts` (`defineSharedServiceTests(label, make)`). `matchService.test.ts` runs it on the memory store and `pgStore.db.test.ts` runs it on PGlite. `makeService` accepts a `store` factory, `TestService.store` is typed as `MatchStore`, and `expectError`/`loadRow`/`finishMulligan` moved to `testing/server.ts`. Row 6 (T1/T12) is included because the threat model lists it for Phase 9.
  - **PGlite harness** applies migrations whose names match `/_(profiles|cards_)/` with `exec` (multi-statement). `notify pgrst` and `create role` work in PGlite. The only PGlite limitation found: queries are serialized in one connection, so the concurrency tests check interleaving between statements, not true parallel transactions. The version guard is a single statement, so this is the relevant level. One PGlite per test file (`truncate … cascade` between tests).
  - **Route helper `requirePlayer()`** = `requireUser()` + `ensureProfile()` (the plan's two calls), with one dev-only branch: without DB credentials (memory store) there is no `profiles` table, so the name comes from sign-up metadata (or `jugador_NNNNNN`).
  - **HTTP errors** are always `{ error, code, ...details }`. New `es.matchErrors` codes: `unsupported_media_type` (415), `payload_too_large` (413), `unavailable` (503, "El servidor no responde. Reintentando…"); 401 uses `code: "unauthenticated"`. `readJson` checks `content-type` (T15), `Content-Length` and the real byte size (4 KB), and is required on **every** POST, including `POST /matches` with `{}`. Auth is checked before the body, so signed-out callers always get 401.
  - **Client API** returns results instead of throwing (`{ ok: true, ...body } | { ok: false, status, error, code, matchId? }`); `pollMatch` makes a single attempt (the poll loop retries), commands make up to 10 attempts, and other calls make 4. `commandRequest` accepts an existing `commandId` so a UI can resume a command whose outcome is unknown.
  - **Route-level tests** (optional in the plan) were added: `src/app/api/cards/routes.test.ts` runs the real handlers on the memory store with `@/lib/auth.requireUser` mocked (DB env vars cleared in the test).
  - **`db:setup` not run by the agent** (blocked by the session permission policy); the migration is idempotent and is applied twice on PGlite in the DB tests.
- **Relates to:** ADR-02, ADR-03, ADR-06, §12.3, §13.2–§13.5, §13.8 (T1–T3, T5, T6, T12, T15, T16).
- **Consequences:** The owner must run `npm run db:setup` before deploying, or `/api/cards/*` returns 503 in production. Later phases add `*_cards_*.sql` migrations, and the harness picks them up automatically. Phase 11's match client builds on `client/api.ts` + `client/realtime.ts`.

## DEC-016 — Phase 10 battlefield UI details not fixed by the plan
- **Date:** 2026-11-12 · **Phase:** 10 · **Status:** ACCEPTED
- **Context:** Phase 10 and §17 leave interaction and store details open, and a few planned signatures needed small additions.
- **Decision:**
  - **`tapHandCard` carries `kind: "mob" | "spell"`.** `LegalActions` cannot tell a mob on an empty board (`needsPosition: false`) from an untargeted spell, and the tap flows differ (slot vs "Lanzar"). The UI reads the kind from the catalog.
  - **Reducer result has an optional `hint`** (`"invalid_target"`): a non-target tapped while choosing a target or an attack target keeps the state and shows `errors.invalid_target`. Unplayable hand cards stay silent ("does nothing").
  - **Target semantics follow `legal.ts`:** `targets === null` → no target; `[]` → a mob plays straight away (its Grito fizzles); non-empty → a target is required. So "Lanzar" only appears for untargeted spells; there is no "optional target" case.
  - **Tap details:** while a mob is selected, tapping a unit on my board places left/right of it by the tap's x (large tap targets instead of 6–20 px gaps); tapping another ready unit switches the attacker; tapping the selected card/attacker again cancels; tapping anything without `data-cg-tap` cancels; `Escape` cancels.
  - **Store fields:** `error` is `{ id, text }` (a repeated identical error replays the toast); added `foeOnline`; `PendingCommand.commandId` is `null` because `api.commandRequest` generates the id inside the transport. `TransportUpdate` gained `serverNow` and `foeOnline` so `{ same }` polls update the clock/presence without a new view. A view is accepted if it is newer **or** for a different seat/match (sandbox viewer switch).
  - **Interaction re-validation** happens during render (React's "adjust state when a prop changes" pattern) instead of an effect, so a stale selection is never painted.
  - **Phase 11 stand-ins inside `Battlefield`:** a "Conservar mano" button during the mulligan (otherwise a real match from the Phase 9 manual steps could not leave the mulligan in the UI), a minimal victory/defeat/draw overlay, and concede in the ⚙ menu with a confirm step (concede is an engine action, and Phase 10 K asks for every action). Phase 11 replaces them.
  - **Skin props beyond §17.4:** sizes are CSS lengths (`size`), labels come from callers (skin stays i18n-free), `HeroPortrait` adds `mine`/`size`/`children`, `EndTurnButton` adds `label` and a `readyIdle` (pulsing) state, `ManaCrystals` adds `label`/`compact`. Keyword glyphs live in one file (`skin/icons/keywordGlyphs.tsx`) instead of one file per icon. `CardArt` always draws a generated placeholder, because no art files exist and requesting them would only 404.
  - **`keepAwake(true)`** is held by the mounted battlefield, not by the shell (menus do not need it).
  - **`overflow: clip`** on the battlefield: with `hidden`, focusing a hand card scrolled the grid and hid the top bar (found in the browser check).
  - **Toasts** show only the latest message and fade out through CSS (no timers or state).
  - **Sandbox extras:** "Seguir turno" (default on) switches the viewer to the active seat after each command; "Nueva partida" re-seeds. The toolbar sits at the left edge between the boards so it fits at 568×320.
  - **The layout wraps every /cards page** (including the current placeholder menu) in `LandscapeShell` + `cg-root`, as §17.1 says.
- **Relates to:** §17.2–§17.8, §13.5, ADR-13.
- **Consequences:** Phase 12's drag/arrow emits the same `InteractionInput`s. Phase 11 removes the stand-in overlays and adds lobby-command support to `MatchClient`. Phase 13 swaps `board` for a presentation model.

## DEC-017 — Phase 11 lobby & PvP-flow details not fixed by the plan
- **Date:** 2026-11-12 · **Phase:** 11 · **Status:** ACCEPTED
- **Context:** Phase 11 (§13.7, §17.1, §17.7) leaves the lobby flow's edge handling open, and one planned mechanism (the play page gating itself before the layout) does not work in Next 16.
- **Decision:**
  - **Invite → login → invite needs the layout's help (deviation: `src/proxy.ts` and `src/lib/safeNext.ts` changed).** In the browser check, a signed-out `GET /cards/play?sala=k7qx2m` was redirected by the `/cards` **layout** (to `next=/cards`), not by the page, so the page's own gate cannot win. The proxy now sets the request header `x-pikaboom-path` (`REQUEST_PATH_HEADER`, path + query, overwriting any client value); the layout redirects to `/auth/login?next=<that path>` after `safeNext` and only for `/cards…` paths. The play page still gates itself (normalized code) for client navigations, where layouts don't re-run. Verified: invite → `next=%2Fcards%2Fplay%3Fsala%3Dk7qx2m`; a spoofed header on `/cards` → `next=%2Fcards`.
  - **Lobby codes are a pure module** (`server/lobbyCode.ts`: `CODE_ALPHABET`, `CODE_LENGTH`, `normalizeCode`), re-exported by `matchService.ts`, so the client normalizes typed/linked codes with the server's rules.
  - **`MatchClient`:** `send` accepts any `ClientCommand` (lobby commands share the one-pending rule); `prime(view)` seeds the store with a create/join answer so the room paints at once; `showInfo(text)` and `ToastMessage.tone: "info"` for neutral notices ("¡Enlace copiado!"). `BoardModel` gains `firstSeat` and the pure `gameOutcome(status, winner, seat, endReason)`.
  - **Lobby flow:** `?sala=` joins once and is then removed from the address bar (`history.replaceState`), so a refresh resumes through `GET current` instead of re-joining. `own_lobby` (host opens their own invite) → resume. `already_in_match` → a conflict screen: "Volver a mi partida" or "Salir de esa sala y unirme" (sends `lobby.leave` to the other match, then joins; if that match already started, it opens it). Any other join error → toast and the home stage with the code kept. A room whose first poll is `active`/`finished`/`abandoned` forwards to `/cards/match/[id]`; `cancelled` → home + "La sala se cerró."; 403/404 → home + the error.
  - **"Volver a la partida"** in the menu links to `/cards/match/[id]`; `MatchScreen` forwards a match still in `lobby` to `/cards/play`.
  - **QR:** copied (not imported) from Batalla Naval into `skin/QrCode.tsx` — it needs literal colors, which the guard test allows only in `skin/`. Share uses `navigator.share` (skipping `AbortError`), else clipboard + "¡Enlace copiado!", else a toast with the code.
  - **Deck picker presentation** (tribe glyph + 3 highlight cards per starter deck) lives in `lobby/DeckPicker.tsx`, not in the catalog: it is display-only.
  - **Mulligan overlay** starts below the top bar, so the timer and the ⚙ menu (concede is legal during mulligan) stay reachable; it shows who starts ("Empieza tu rival. Recibirás una Chispa de Maná."). Selection is the pure `client/mulligan.ts` reducer (marks ⊆ hand, `replace` in hand order).
  - **Timer:** the warning threshold now comes from `STANDARD_RULES.turn.warningSeconds` (15 s; Phase 10 hard-coded 10 s); it pulses and plays `playTick` once per second while you can act (`legal != null`). The mulligan overlay's copy of the timer is silent so ticks are not doubled.
  - **Sounds/haptics:** `client/sounds.ts` = `playCardSound(kind)` mapping onto existing `src/game/audio.ts` functions + `lib/haptic`, and `armAudioUnlock()` (first `pointerdown`). `MatchSounds` plays your-turn, error and game-end sounds only for changes after the first loaded state (a refresh never replays a fanfare).
  - **Turn banner** is a CSS animation keyed by turn; the turn the screen opened on is not announced.
  - **Game over** also covers a stale-`abandoned` match (title "Partida cancelada", reason "Nadie jugó durante 30 minutos."); reason texts live in a new `es.endReason` section.
  - **Concede** keeps Phase 10's confirm step inside the ⚙ menu instead of a separate modal.
  - `match.keepHand` removed; `match.waitingFoe` is now "Esperando a tu rival…" (Phase 11 G.6 wording).
- **Relates to:** §13.5, §13.7, §14.1, §17.1–§17.8, §6.2, §6.10, §6.11, ADR-08.
- **Consequences:** Pages under `/cards` can rely on the layout preserving path + query on signed-out redirects. Phase 12 adds drag on top of the same overlays; Phase 13 can drive the turn banner and sounds from the event queue instead of view diffs.
