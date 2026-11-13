# Duelo Arcano — UI/UX & Custom SVG Art Implementation Plan

> **Version:** 1.0 — November 13, 2026  
> **Audience:** Claude Sonnet coding agents with repository access; one phase per fresh context/session  
> **Approach:** **10 phases (UI-01 through UI-10), not one gigantic implementation prompt.**  
> **Game:** Duelo Arcano, the Spanish-language, landscape-first PvP card game in the Pikaboom Next.js PWA.  
> **Status:** The original engineering phases 1–21 are implemented in code; this is a **new visual development track**. Production release and owner/device checks remain pending in `STATUS.md`.

## 1. Executive decision and goal

Do **not** rebuild the game. Its server-authoritative match system, deck/collection/store data model, drag controller, tap and keyboard controls, SVG skin primitives and animation queue already exist. Our job is to make it feel like a polished, original fantasy card game: cohesive, richly drawn, playful and readable. The aesthetic is **stylized 2D fantasy arcade**, with cel-shaded illustrations, bolder shapes, carved purple tabletop materials, elegant engraved frames, gemstone highlights, and restrained cinematic accents — **not photorealistic, not emoji-based, not generic SaaS UI**.

Why phases? Art direction has to be established before creating 80 illustrations; each generation wave should reuse the same grammar; and UI refinements must never break existing gameplay or exceed performance budgets. Validate **8 pilot artworks** in the real game before scaling to the other **72**. Do one phase per agent session, verify, update handoff notes, start the next session with clean context.

**What the uploaded docs actually say:** `ART_GUIDE.md` lists **74 collectible art keys and 6 token keys = 80**. Four Legendarias are `morvath`, `skeleton-king`, `ursaria`, `vaelra`; two Únicas are `ignis`, `nyxara`. There are **52 unit/creature images and 28 spells**, counting tokens. The existing SVG pipeline includes registration in `src/components/cards/skin/assets.ts` and a validator in `skin/assets.test.ts`. At the original Phase 20 snapshot, file registries were empty and placeholders were expected; **audit actual repository state** before assuming that is still true.

### 1.1 Sources of truth: mandatory per-session reading

In this order, read (1) `AGENTS.md` and relevant current Next docs; (2) `docs/cards/CARD_GAME_IMPLEMENTATION_PLAN.md` §§17–19, §21 Phase 20, §22; (3) **all** of `docs/cards/ART_GUIDE.md`; (4) `docs/cards/STATUS.md`, `DECISIONS.md` (particularly DEC-016, 018, 019, 023, 026–028), `PERFORMANCE.md`, `SECURITY_REVIEW.md`; (5) this plan, assigned phase, and actual existing source files. The original game rules, accepted decisions and SVG contracts override suggestions here. Never silently override them; log material deviations in `DECISIONS.md`.

**The exact architecture already exists:** `src/components/cards/cards.css` (`--cg-*` design tokens), `src/components/cards/skin/` (card back, frames, badges, icons, hero, backdrop), `card/`, `match/`, `menu/`, `lobby/`, `collection/`, `decks/`, `store/`; `src/game/cards/catalog/visuals.ts` and `src/game/cards/client/animation/` for event-driven FX. Routes: `/cards`, `/cards/play`, `/cards/match/[id]`, `/cards/collection`, `/cards/decks`, `/cards/decks/[id]`, `/cards/store`, `/cards/dev/sandbox`.

### 1.2 Non-negotiable constraints

1. **ZERO emoji icons/decorations in Duelo Arcano's user-visible UI.** Replace health, mana, attack, buttons, navigation, empty states, settings, shop, timer, rarity, statuses, feedback, and rotate overlay with custom SVG paths/illustrations or plain Spanish labels. Do not modify other games or user-generated content just to enforce this rule. The fact that an SVG path depicts a flame/star/heart does *not* make it an emoji.
2. **ONE centralized design system.** `cards.css` stays the runtime source of truth for `--cg-*` tokens; extend it, don't create conflicting token registries. Use shared skin primitives rather than hardcoded SVG/colors/styling independently in each screen. Create `docs/cards/UI_VISUAL_SYSTEM.md` to define art/material/typography/spacing/icon conventions; it is documentation, not a second live style authority. SVG files loaded by `<img>` cannot inherit page CSS variables, so fixed art hex colors must align with the documented palette.
3. **Every current card art key gets a valid, individually identifiable SVG file.** Reusable recipes, reusable path geometry, creature archetypes, backgrounds and effects are welcome. You do **not** need 80 unrelated hand-painted masterpieces, but **80 identical silhouettes with different colors also fail**. Each key needs a recognizable subject/action, pose, prop, and/or scene. The real contract is **one `public/cards/art/<key>.svg` file per key**; some may derive from shared build-time recipes.
4. **Legendary/Unique cards get standout artwork and distinct animation** — BUT the SVGs themselves remain **static**. Art-specific motion belongs in existing CSS/WAAPI/particle layer/`AnimationQueue` around the artwork. No SMIL or internal SVG animation. Subtle inspect/reveal highlights are good; 80 simultaneous endless animations are not. Cinematic presentations must be skippable and **≤1.6 seconds at 1×** as in original plan.
5. **Spanish UI, English code/identifiers/docs.** Continue using existing i18n `src/game/cards/i18n/es.ts`; don't inject literal Spanish copy into React code.
6. **Mobile-first landscape, not desktop-only.** All UI must be usable at **568×320**, desktop 1280×720, unusual wide phones and side notches. Tap targets ≥44px; End Turn ≥56px, and keyboard focus/labels. Check the existing portrait rotate overlay and safe-area handling.
7. **Preserve ALL behavior**: server auth, seat privacy, redacted opponent hands, match rules, idempotent commands, pending/rollback states, drag/tap/keyboard/long-press, settings, animation skipping/reconcile, reduced motion, mute, rewards, pack odds, deck validation and other games. No DB migrations, gameplay mechanics, new card definitions, new animation library, WebGL or global app redesign.
8. **Preserve budgets.** Existing match route baseline **196.8KB gzip JS** vs **220KB limit**, engine/payload budgets and drag/performance requirements in `PERFORMANCE.md`. Prefer self-contained static public SVG assets over runtime React SVG generators. Existing dynamic assets are network-loaded (not SW-precached); do not change proxy/SW cache rules casually.

### 1.3 Mandatory UX priorities from live screenshots (must be implemented)

These points come from direct review of the current Duelo Arcano UI and are **mandatory**, not optional polish. Treat them as acceptance criteria for the UI track. Use the uploaded screenshots of the current board/menu and the referenced Hearthstone mobile screenshot as **layout/readability inspiration only** — do **not** copy Hearthstone assets or branding. The goal is an original Duelo Arcano UI with similarly strong information hierarchy on mobile.

#### A. Battlefield readability priorities

1. **The enemy board state must be understandable at a glance.** A player should be able to quickly tell what an enemy unit is, what its important keywords are, and whether it currently has a shield, buff, debuff or other special state.
2. **The current giant `Turno rival` label wastes space.** Replace the large centered text with a compact turn-indicator treatment such as a slim banner, pill, divider chip or timer-linked header that consumes much less vertical space. The board must feel open, not covered by labels.
3. **Mana visibility is currently too weak.** My mana crystals/shards must be larger, brighter, and easier to read against the background, with clear `current / max` communication and visually distinct temporary mana when present.
4. **The `Turno rival` / End Turn action area is currently too large and visually heavy.** Replace the large floating rectangle with a more integrated control that is still highly tappable, but occupies less space and uses a stronger custom visual treatment.
5. **Status visibility must be explicit.** Shield, divine shield, taunt, stealth, frozen, sleeping/ready state, buffs and debuffs need clear, persistent visual language on the board — not only in the inspect panel.
6. **Inspecting enemy units must be easy.** Tap/long-press on an enemy unit must open a clean inspect view showing: large art, card name, attack/health, rules text, keywords, and active modifiers/statuses. This inspect path complements the board indicators; it does not replace them.

#### B. Menu / non-match UI priorities

1. **The current main menu is visually too plain.** It feels like generic floating buttons instead of a custom card-game front end. The redesign must introduce a structured layout with actual surfaces/panels, header treatment, iconography and visual depth.
2. **Main menu buttons need custom SVG icons.** Jugar, Colección, Mazos, Tienda and Mi cuenta should use a shared icon family and better visual grouping. No emoji icons.
3. **The menu should feel like a game hub, not a form.** Use framed sections/cards/panels, a crest/title lockup, resource display treatment, and grouped navigation hierarchy.
4. **The visual system must remain consistent between menu and battle.** The same materials, icon language, border radii, glows, type scale and decorative motifs should connect the main menu, lobby, collection, store and battlefield.

#### C. Concrete board UX solutions to implement

The implementation should include all of the following unless the repository architecture makes a specific variant impossible:

- A **compact battlefield HUD** where turn state, timer, mana, deck count and hand count each have clear homes and do not compete for the same central space.
- A **small but readable enemy-turn indicator**, ideally near the timer or center divider, instead of a large standalone block of text.
- **Prominent mana gems/shards** with stronger contrast and an accompanying numeric readout where helpful.
- An **End Turn / enemy turn control** visually integrated into the HUD rather than a giant isolated button.
- **On-board status markers** for units: at minimum, shield/divine shield, taunt/provocar, stealth/sigilo, frozen, sleeping/ready, buffs, debuffs, silence and damage state must have clear cues. Use rings, corner badges, icon chips, glows, overlays, stat-delta pips or small banners as appropriate.
- **Prioritized status display**: if a unit has many modifiers, show the most important ones persistently on the token and reveal the full list in inspect/glossary. Avoid unreadable icon soup.
- A **clean enemy card inspection flow** so a user can easily understand what the enemy card does without reading tiny board text.

### 1.3 Visual direction / palette

**Core motifs:** carved indigo tabletop, polished violet/obsidian panels, brushed warm gold trim on exceptional items, cyan mana gems, amber attack gems, ruby health drops. Bold dark silhouettes, clear rim light, 2–4 major highlight planes, painted gradient backdrops and limited runic/leaf/bone accents. Light comes from upper-left. Decorative detail never obscures stats/text/targets. Use restrained depth in three layers: ambient background → raised surface → interactive face/highlight.

Existing semantic colors that should remain recognizable:

| Role | Hex | Rule |
|---|---|---|
| Game backdrop | `#1b1036`, `#120a26` | Quiet deep purple |
| Board | `#2a1a52`, `#22144a` | Low contrast underneath units |
| Card / spell body | `#3b2a6b`, `#2c3f7a` | Different frames for mob vs spell |
| Outline ink | `#1d0842` | Strong unified dark strokes |
| Mana / attack / health | `#3fa9ff`, `#ffbe0b`, `#ff4d6d` | Resource identity; readable numbers |
| Common / rare / magic | `#e9ecef`, `#3a86ff`, `#b5179e` | Rarity identity |
| Legendary / unique | `#ff9f1c`, `#ff006e` | Gold vs vivid magenta, plus different frame shapes |
| Heal / valid | `#06d6a0` | Positive state, not the only cue |

Retain existing fonts (Lilita One / Nunito) unless change has compelling measured justification. Establish semantic **surface, typography, spacing (4px scale), border, depth, focus, duration, easing, rarity, elemental and accessibility tokens**. Rarity, locked, valid, selected and disabled must be distinguishable **without color alone**. Maintain recognizable 12px keyword/status icon silhouettes and visible focus rings.

---

## 2. Existing SVG contracts: do not break them

### 2.1 Technical specifications from ART_GUIDE.md

- Card files: `public/cards/art/<CardDef.art>.svg`, exact `viewBox="0 0 512 512"`, no root width/height. Art fills background edge-to-edge; one clear subject inside **x=96..416, y=112..400**; both landscape crop (x 0–512, y 87–425) and portrait crop (x 56–456, y 0–512) must work. No frame/text/rarity badge baked into artwork; UI overlays them.
- Skin files: `public/cards/skin/<name>.svg`, listed below with exact `viewBox`. Register in `SKIN_FILES` when present. Card files register in `CARD_ART_FILES`. Preserve placeholder fallback while assets are incomplete. Validate `src/components/cards/skin/assets.test.ts`.
- **Every SVG ≤30,720 bytes** after optimization, UTF-8, self-contained. No `<image>`/raster, external href/import/URL, scripts, event handlers, `<foreignObject>`, `<text>`, internal animations, or expensive filters. Use hex values in files; prefix SVG IDs with the file key to avoid clashes. Gradients are welcome; false glow via translucent radial gradients is better than blur filters.
- Keywords/statuses: existing **single-path** glyph maps `skin/icons/keywordGlyphs.tsx` and `statusGlyphs.ts`, viewBox `0 0 24 24`, visible at 12px, central x/y 2..22, no hairline strokes. Do not create 30 unrelated icon files or change public icon APIs without need.
- SVGs are rendered in collection, card window, board unit, inspect, pack reveal, and cinematic large art. Test all contexts and the dev sandbox.

| Skin file | Exact `viewBox` | Keep clear for UI overlays |
|---|---|---|
| `card-back.svg` | `0 0 360 500` | Symmetric emblem, reads from 40px to 300px |
| `board-backdrop.svg` | `0 0 1600 900` | Quiet center, landscape cover crop |
| `frame-mob.svg` | `0 0 360 500` | Art x 8–92%, y 6–46%; name y 47–56%; description x 7–93%, y 58–88%; badges/corners |
| `frame-spell.svg` | `0 0 360 500` | Same zones, clearly magical ornament instead of creature armor |
| `hero-mine.svg`, `hero-foe.svg` | `0 0 256 256` | Central 100×100 calm for initial; circle crop |
| `badge-gem.svg`, `badge-diamond.svg`, `badge-drop.svg`, `badge-circle.svg` | `0 0 100 100` | Central number legibility; drop number sits slightly low |

Code-drawn components (`ManaCrystals`, `EndTurnButton`, `RarityGem`, `TribeLabel`, `CurrencyBadge`, `QrCode`) should be refined **in existing skin code**, not needlessly converted to file slots. UI-specific new icons may use a shared `GameIcon` mapping in `skin/`, with a consistent 24px glyph language and no emoji fallback.

### 2.2 Reusable art grammar, not identical illustrations

Choose author-time SVG or an **offline build-time recipe pipeline**. Optional helper script may combine shared SVG path motifs (quadrupeds, humanoids, dragons, armor, blades, flames, leaves, rocks, wisps, runes, backgrounds) with per-card composition choices and export **self-contained final files**, committed in `public/cards/art/`. Never require a runtime JSON renderer or external shared SVG `<use href="/…">` files, and do not bundle a large generator into the `/cards/match` JS route.

The style system is common, but content is individual. Recipe fields can include `archetype`, `pose`, `silhouette`, `subjectColors`, `environment`, `prop`, `effect`, `rarityAccent`, `composition`. **Geometry/pose/action must vary**, especially among related cards. For spells, picture the effect/action (strike, shield, summoning, frost, transformation, silence) rather than 28 interchangeable glowing circles. For token art, simpler shapes are fine but not duplicate art from collectible versions.

Quality test on every wave: **semantic match → distinctive silhouette at 64×64 → both crop windows → contrast/value → consistent art grammar → valid SVG & registered file**. Automated tests can validate files; they **cannot** certify visual art quality. Inspect screenshots/contact sheets for duplicate-looking cards and revise weak ones. No clone-by-recolor signoff.

### 2.3 UI surface inventory

| Route | Visual target | Untouchable behavior |
|---|---|---|
| `/cards` | Distinctive branded home, mode panels, premium nav, clear “Jugar” | Auth, resume, gold balance, navigation |
| `/cards/play` | Inviting lobby, visible invite/QR, seats, deck choice, ready | Create/join/link flow, status, privacy |
| `/cards/match/[id]` | Low-noise board, refined heroes/HUD, readable hand/counters, targeting | MatchClient, commands, gestures, input reconciliation |
| `/cards/collection` | Artwork-first grid, rarity, search/filter/locked, inspect | Owned inventory, filters, locked state |
| `/cards/decks` / `[id]` | Illustrated deck identity, card list and mana curve | Validation/save/unsaved guard |
| `/cards/store` | Original arcane pack art, visible price/odds, dramatic reveal | Prices, purchases, pack odds, inventory grant |
| Shared | Settings/toasts/dialogs, consistent focus/feedback/icons | i18n, reduced motion, keyboard, orientation |

---

## 3. Global rules for every visual phase

**Before coding:** `git status` (preserve unrelated work), read all §1.1 docs, inspect current source APIs and phase prerequisites, run a baseline typecheck/tests and identify any pre-existing failure. Make a task/file checklist for **only the assigned phase**. No sweeping refactors, gameplay edits, DB migrations or new dependencies merely for decoration.

**During implementation:** Keep CSS scoped to `.cg-root` / `cg-` naming; consume `--cg-*` tokens; place bespoke vector implementation in shared `skin/` primitives; keep player text in Spanish i18n. Do not delete `data-cg-*` gesture attributes or change pointer capture/click semantics. The server state is authoritative, even if the client shows a pending ghost. SVGs must be valid, registered and self-contained. Log any accepted architectural deviation in `DECISIONS.md` with the next available decision number.

**Visual inspection:** With a browser, check 568×320 phone landscape and 1280×720 desktop. Also inspect small art and both crop windows, selected/playable/disabled/locked/pending/errors, focus, reduced motion, large hand and full board as relevant. **No browser? Report visual QA as pending, not passed.** Prefer dev sandbox for behavior needing live credentials. Avoid claiming device/PWA tests that weren't performed.

**Mandatory test reporting:**

```bash
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
node scripts/route-size.mjs "/cards/match/[id]"
```

Run each available command; if missing local DB/env prevents `test:db` or a real match, state precisely what is unavailable. Match JS ≤220KB gzipped; existing supplied baseline 196.8KB. Drag should have **zero React renders per pointermove**, frame ≤16ms; combat FX ≥50fps at 4× CPU throttle; one canvas, particle budget from `PERFORMANCE.md`; heap <150MB/no growth after 30m. Manual phone metrics remain explicitly **pending** until measured. Preserve tests from `SECURITY_REVIEW.md` including auth-first, data leakage, RLS and service-worker protections.

**Handoff:** Update **a NEW `UI/UX visual track` section** inside `docs/cards/STATUS.md`, with phase result, exact assets/files, tests actually run, visual screenshots observed, known issues, what still requires owner/hardware, and next UI phase. Don't rewrite original 1–21 log or mark original V1 production released. Maintain `docs/cards/UI_ASSET_STATUS.md` (or equivalent machine-readable manifest) listing all keys, registered/missing status, source recipe and quality notes. Don't silently skip incomplete assets.

---

## 4. Ten-phase roadmap

| Phase | Deliverable | Dependency | Expected art completion |
|---|---|---|---|
| **UI-01** | Visual audit, unified design tokens, art direction proof | Original Phase 21 code | 0/80 |
| **UI-02** | 10 shared skin SVGs, keyword/status/vector icon system, UI kit | UI-01 | 0/80 |
| **UI-03** | Reusable SVG workflow + **8 excellent pilot cards** | UI-02 | 8/80 |
| **UI-04** | **30** humans, beasts, constructs, elementals | UI-03 | 38/80 |
| **UI-05** | **16** undead, demons, dragons | UI-04 | 54/80 |
| **UI-06** | **26** remaining spells; 100% catalog coverage | UI-05 | 80/80 |
| **UI-07** | Home, lobby, collection, decks, store UI redesign | UI-02, UI-06 | 80/80 |
| **UI-08** | Battlefield, HUD, hand, card inspect and input-feedback polish | UI-02, UI-06 | 80/80 |
| **UI-09** | Distinct signature visuals for six Legendary/Unique cards, microanimations | UI-07, UI-08 | 80/80 |
| **UI-10** | Cross-screen QA, accessibility, real-device and performance gates | UI-01–09 | 80/80 verified |

A **single one-shot prompt is explicitly discouraged**: the first 8 art files are the art-direction gate, and the agent must not generate all 80 before checking the pilot inside the game.

---

## 5. Detailed phase specifications

### UI-01 — Visual audit and system definition

**Goal:** Establish one production-worthy style that every later agent will follow.

**Read:** Current `cards.css`, `/cards` layout and all skin components, `CardFace`, `UnitToken`, `HandCard`, `CardInspect`, `ART_GUIDE.md`.

**Steps:** (1) Inventory every game route and source of hardcoded styling/emojis/placeholders. (2) Inspect existing `--cg-*` tokens and list shared elements/duplicates, performance concerns and layout bugs at 568×320. (3) Create `docs/cards/UI_VISUAL_SYSTEM.md` detailing fixed palette/material rules, component state semantics, type scale/spacing/radii, icon guidelines, creature/spell art grammar, visual do/don't examples, accessibility and responsive constraints. (4) Implement **two small contrasting style explorations** in a **dev-only sandbox panel**: each contains a title, button, resource gem, card-frame corner and modal surface. Choose a single winner by mobile readability/identity and remove the unused variant from production. (5) Organize semantic tokens in `cards.css` without broad restyling; create a 80-art + 10-skin `UI_ASSET_STATUS.md` manifest from actual catalog/files. (6) Record baseline screenshots when possible and next-phase priorities.

**Tests/edge cases:** CSS scope no other-game bleed; safe areas, portrait orientation hint, readability at 568×320; existing typecheck/test/build. No screenshots = explicitly unverified visual QA.

**Acceptance:** One chosen style and one runtime token authority, coherent written visual language, all current art keys inventoried, no gameplay changes, prototype visually evaluated where browser available, ready for shared primitives.

**Handoff:** chosen direction and tokens, inventory, unfinished checks, actual file paths.

### UI-02 — Skin files, custom SVG icons and reusable controls

**Goal:** Every screen can use the same high-quality visual DNA.

**Steps:** (1) Create **all 10** `public/cards/skin/*.svg` slots from §2.1, respecting exact viewBoxes and overlay zones; board must be quiet. (2) Register validated files in `SKIN_FILES`; maintain existing fallback for not-yet-existing card art. (3) Polish skin primitives including `CardFrame`, `CardBack`, `BoardBackdrop`, `HeroPortrait`, badge types, `ManaCrystals`, `EndTurnButton`, `RarityGem`, `CurrencyBadge`, `TribeLabel`. Preserve existing exported props and dynamic number placement. (4) Audit/redraw all keyword and status path icons in ART_GUIDE §4; they must have coherent strokes and recognizable shape at 12px. (5) Add/reuse a small shared `GameButton`/`GamePanel`/dialog/focus/icon/tooltip family **only as needed**. Use token-based variants primary, secondary, danger, quiet, selected, loading, disabled. (6) Eliminate visible emoji decorations in shared UI and rotate/settings icons without damaging user content or other games. (7) Inspect mobile and keyboard states.

**Tests:** Asset validator, 10/10 registration, no broken images, a **scoped** regression guard on emoji *icon literals* (avoid false positives in tests/user text); existing typecheck/lint/build. Verify no numeral/body-text obstruction, hot/cold control state and focus.

**Acceptance:** All 10 skin assets valid, icons cohesive, custom reusable controls usable across screens, shared SVGs not generic placeholders, zero emoji decorations in shared Duelo Arcano UI. **Do not** redesign all screens yet.

### UI-03 — Art recipe infrastructure + 8 pilot cards

**Goal:** Prove visual quality and generation workflow before mass production.

**Exact roster:** `squire`, `wolf-pup`, `stone-golem`, `restless-skeleton`, `arcane-spark`, `flame-lance`, `morvath`, `ignis`.

**Steps:** (1) Audit `CardDef.art` and choose author-time composition or lightweight **offline** recipe/generator (shared geometries + per-card shape/pose/action/color/scene); never ship a runtime art generator or external SVG references. (2) Document the art grammar in `UI_VISUAL_SYSTEM.md` with sample templates for quadruped, humanoid, construct, undead, spell burst/beam, legendary figure and dragon. (3) Create the **8 exact files** at `public/cards/art/<key>.svg`, self-contained, 512×512, focused safe box; register these exact keys in `CARD_ART_FILES`. (4) Give **Morvath** a striking skeletal crypt lord image and **Ignis** a genuinely original ancient fire dragon silhouette, not generic glowing symbols. (5) Add a dev gallery to existing `/cards/dev/sandbox` to view images at **64px**, both real crop masks, full card, board token, inspect and pack reveal. (6) Actually compare all 8 at mobile scale and fix cloning, excessive decoration, crop issues and unreadable dark areas. (7) Add coverage validator and manifest updates.

**Acceptance:** 8/8 valid registered files, distinguishable silhouettes/actions even in small crop, chosen lighting/outline coherent, flagship hero art stronger, dev preview documented, no internal SVG animation. **Do not generate remaining 72 in UI-03.**

### UI-04 — 30 humanoid, beast, construct, elemental illustrations

**Scope:** **Exactly 30 keys** allocated in Appendix A, not the 8 pilots.

**Steps:** (1) Cross-check actual catalog. (2) Reuse the approved silhouette templates, but vary **major geometry, pose, prop and setting** for every key. (3) Closely compare `wolf`/`wolf-pup`/`alpha-wolf`; `bear-cub`/`berserker-bear`/`ursaria`; armored humans vs spellcasters; little `clockwork-sentinel` vs massive `iron-colossus` vs patched `scrap-golem`. (4) Give Legendary **Ursaria** a bespoke protective forest matriarch focal composition. (5) Produce/register/validate all 30 files. (6) Create contact sheet and inspect all 38 existing pilot+wave artworks for clone-like silhouettes. (7) Run tests + update manifest.

**Acceptance:** Art coverage reaches **38/80** and all 30 new keys are genuinely identifiable, consistent and crop-safe. Never claim complete if even one is missing; track partial accurately.

### UI-05 — 16 undead, demon, dragon illustrations

**Scope:** **Exactly 16 keys** in Appendix A, excluding pilot `restless-skeleton`, `morvath`, `ignis`.

**Steps:** (1) Make skull/ghost/ghoul/imp/demon cards **recognizably different**, not tinted skull icons. (2) Draw distinct dragon silhouettes: small larva, serpentine wyrm, ash drake, storm drake, ice queen, versus the big winged ancient Ignis. (3) Treat `skeleton-king` as a crowned skeletal monarch; `vaelra` as a royal ice dragon; `nyxara` as an asymmetric void empress. These three need individual art direction and sufficiently premium presence without violating 30KB. (4) Produce/register all 16 and inspect a six-card flagship sheet: Morvath, Skeleton King, Ursaria, Vaelra, Ignis, Nyxara. (5) Test and hand off character signature traits to UI-09.

**Acceptance:** Art coverage **54/80**, 16 new valid SVGs, **all 6** premium illustrations present and distinctive; still NO animation inside any art SVG.

### UI-06 — 26 spell illustrations + strict full-catalog gate

**Scope:** **Exactly 26 keys** in Appendix A, excluding pilot `arcane-spark`, `flame-lance`.

**Steps:** (1) Group spells by actions: blast, channel, summon, heal, shield, strike, transform, curse, control, banish and ritual. (2) Each illustration **depicts the actual effect**, not a generic orb; vary motion direction, object, environment and focal element. (3) Specifically distinguish `arcane-spark`/`mana-spark`, `ice-shard`/`frozen-gale`, `arcane-insight`/`arcane-echo`, `blessing-of-light`/`purify`. (4) Export/register all 26 and compare against the live catalog's **entire** art list. (5) Add automated test: every current `CardDef.art` has exactly one registered, existing, SVG-contract-compliant file (do not disable fallback for *future* cards). (6) Preview **all 80** in a 64px contact sheet and the real card/board/inspect/pack contexts. Fix near-duplicates and mismatched spelling/action/crop. (7) Keep recipe compiler off the runtime client bundle.

**Acceptance:** **80/80** valid and registered current keys, no current-card placeholders or 404s, distinct spells and mobs, tests green. Record total SVG output size.

### UI-07 — Non-match screen redesign: menu, lobby, collection, decks, store

**Steps:** (1) **Menu:** strong original crest/logo using the shared graphic vocabulary, clear Jugar, secondary game areas with custom vector icons, balance, Resume. Replace the current “floating buttons on a flat background” look with a proper game-hub composition: framed panels/surfaces, grouped navigation, icon-led secondary actions, a stronger title lockup and visible hierarchy between primary and secondary actions. (2) **Lobby:** clear seats/host/guest, invite/QR actions, selected deck and ready/waiting/connection states; visual state must reflect server confirmation. (3) **Collection:** art-first tiles, legible search/filter/rarity/locked states, inspect and empty/error states; lazy-load long art lists. (4) **Decks:** illustrated deck identity, quantity controls, actual mana curve, distinct validation/unsaved cues and accessible focus. (5) **Store:** bespoke drawn arcane pack, visible price and real odds, clear purchase state, pack flips with card art and restrained rarity reveal; preserve currency/idempotency/odds. (6) Restyle common modal/toast/settings/section headings using the same components and no emoji; check long Spanish names, mobile landscape, keyboard, reduced motion and loading/empty/error.

**Non-goals:** No new store offerings, pack probabilities or match flows, no economy/DB/API edits.

**Acceptance:** All non-match pages feel like **one game**, not separately themed pages; all behaviors/links/focus states work, no decorative emojis or unreadable overlays/scroll traps. Document live-project checks that cannot be completed in the sandbox.

### UI-08 — Battlefield, card face, hand, HUD and interaction feedback

**Steps:** (1) Refine existing landscape grid, safe-area padding, opponent hero/HP/mana/**hidden hand count**/deck count/timer/connection. Never show enemy secret hand. Rework the HUD hierarchy so the enemy turn state, timer and counters do not consume excessive vertical space; replace the oversized centered `Turno rival` presentation with a compact chip/banner/divider treatment. (2) Refine own hero/health, current/max/temporary mana, hand fan, deck, End Turn and actionable state hierarchy. Mana shards must become clearly visible and readable at a glance, with stronger contrast, larger gem treatment and a clear current/max state; temporary mana must be visually distinct. The End Turn / enemy-turn control must be redesigned to remain comfortably tappable while taking much less space than the current large button. (3) Improve `CardFace`, `UnitToken` art masks and number badges, rarity/keyword/status/sleeping/ready cues; ensure no tiny text collision. A player must be able to clearly identify if a unit has a shield or buff from the board itself. Implement persistent, prioritized on-board status communication (for example via icon chips, rings, glows, pips, overlays or banners) for shield/divine shield, taunt, stealth, frozen, sleep/ready, silence, buffs and debuffs. (4) Make enemy-card understanding easy: tapping or long-pressing an enemy unit must surface a polished inspect sheet/modal with large art, card name, stats, card text, keywords and active modifiers/statuses. The board itself should expose only the highest-value status cues; the inspect flow reveals the full explanation. (5) Visually enhance current tap/drag selection, legal placement gaps, attack arrow, invalid drops, pending ghost and rejection slide-back. **Do not rewrite** `DragController` or remove `data-cg-*` hooks; preserve 0 React renders per pointermove. (6) Polish inspect via long press/hover/keyboard, glossary, mulligan, banners, settings, turn timer and game-over overlays; retain skip and reconciling animation semantics. (7) Regression states: full six-unit boards, ten-card hand, long card description, taunt, stealth, divine shield, disabled/end-turn, turn timeout, disconnect, command rollback, reduced motion and mute. (8) Measure JS route size and drag FPS where tooling exists.

**Acceptance:** Readable **568×320** battlefield, clear enemy vs player zones, accurate art/stats, all tap/drag/keyboard/long-press actions work; enemy turn state no longer wastes major vertical space; mana is clearly visible; the End Turn / enemy-turn control is more compact; shield/buff/status visibility is obvious on board; enemy card meaning is understandable through board cues plus inspect; card art and decoration never intercept input or disclose private state; match JS remains ≤220KB gzipped.

### UI-09 — Six signature premium effects and coherent microinteractions

**Must reuse:** `src/game/cards/catalog/visuals.ts`, `src/game/cards/client/animation/cinematics.ts`, handlers, existing `FxApi`, `AnimationQueue`, `FxLayer` single canvas and existing reduced-motion/speed/mute preferences. **No new competing scheduler, no gameplay logic in effects.**

**Target signatures** (static art with UI effects *around* it):

| Card | Distinct reveal (≤1.6s at 1×) |
|---|---|
| Morvath — Legendary | Shadow ritual ring, violet tomb light and soft bone motes |
| Skeleton King — Legendary | Crown glint and tiny rising bone fragments |
| Ursaria — Legendary | Protective verdant leaf/aurora arc |
| Vaelra — Legendary | Brief cyan crystalline ice-shard sweep |
| Ignis — Unique | Fiery wing/halo reveal with short ember burst and strong impact |
| Nyxara — Unique | Dark asymmetric eclipse with magenta void flare |

**Steps:** (1) Implement Morvath and Ignis as timing/performance pilot animations, fully skippable and respecting queue reconciliation. (2) Add other four as **data-driven visual variants** reusing FX primitives, not six code forks. (3) In packs and inspect, add a **subtle rarity effect** (no permanent 80-card loops); rarity must be identifiable even with all motion off. (4) Polish minor interactions such as gem spend, card focus, button feedback and attack landing using existing UI animation conventions. (5) Test two consecutive cinematics, queue backlog/skip, tab hidden, reconnection, reduced motion, speed 1×/1.5×/2×, mute, low-end particle limit, unmount cleanup. No camera shake/particles under reduced motion; static rim + fade substitute. (6) Verify no growing rAF loops or longer input lock.

**Acceptance:** **Six** individualized, brief premium signatures, not internal SVG animations; existing queue/state protected; skip, reduced motion, sound and speed behavior maintained; no measured FPS regression. Mark unavailable phone measurements pending.

### UI-10 — Visual QA, accessibility, responsive/device performance, final handoff

**Steps:** (1) Audit **80/80** registered art and **10/10** skin files, 24px glyph consistency, zero broken images/404s, correct sizes/viewBoxes/no scripts/external references. (2) Inspect **all** artwork at thumbnail scale and both art crop modes, with contact-sheet comparisons; correct cloned/unclear pieces, especially six premium artworks. (3) Compare routes for unified materials, typography, spacing, iconography, rarity, focus, status/error/disabled and zero decorative emojis. (4) Run end-to-end UX path **menu → lobby → deck → mulligan → match → inspect → play/end → reward → collection → deck edit → store → pack** as far as the actual environment permits. Real two-player authentication/PvP flows remain **pending** until live DB owner checklist is performed; don't fake them. (5) Test 568×320, 667×375, 812×375 notch-safe landscape, desktop 1280×720 and wide monitors; portrait overlay, keyboard and screen-reader labels. (6) Re-run automated tests, build, route JS and all manual FPS/drag/30-min memory checks possible. Preserve security, account data, server redaction and other games. (7) Finalize design guide, asset manifest, maintenance instructions and UI track in `STATUS.md` without falsifying original V1 release status.

**Final definition of done:** The entire current card art catalog is illustrated, consistently drawn, recognizable and registered; all UI icons are custom vectors (not emojis); all screens and state variants share the design system; the main menu feels like a custom game hub rather than floating buttons; the battlefield clearly communicates enemy turn state, mana and statuses; six premium cards look and reveal distinctively; tested mobile play retains responsiveness and accessibility; performance/security remain within existing budgets or any unresolved manual measurements are explicitly recorded.

---

## 6. Exact art-key assignment and per-card direction

**Agent rule:** Appendix A below is a bounded work list. It comes from `ART_GUIDE.md` §5. Treat the live catalog as the definitive source for any future additions/renames. The cues are *visual direction*, not a request to change card behavior. **Only work on keys allocated to the assigned phase.** A given key may use parts from other art, but must export its own valid SVG with distinctive subject/action.

