# Duelo Arcano — UI Visual System

UI-01 deliverable (`DUELO_UI_UX_ENHANCEMENT_PLAN.md` §5 UI-01). This is the **written** design language for every later
UI/art phase. It is documentation, not a style authority: the only runtime source of truth is the `--cg-*` token block
in `src/components/cards/cards.css`. SVG art loaded through `<img>` cannot read CSS variables, so its fixed hex values
must come from the palette tables below (they mirror the tokens). The plan's §1.2 constraints, `ART_GUIDE.md` and the
accepted decisions in `DECISIONS.md` override anything here.

---

## 1. Chosen direction — "Grimorio grabado"

**Stylized 2D fantasy arcade:** carved obsidian/violet surfaces, a strong dark ink outline around every raised face,
brushed-gold trim reserved for exceptional things (titles, primary frames, Legendaria), faceted gems for resources,
cel-shaded art with light from the **upper left**.

Chosen in UI-01 against a contrasting **"Cristal arcano"** variant (translucent glass panels, hairline cyan borders,
neon glows, no outlines). Both were drawn on the same five samples (title, button, resource gem, card-frame corner,
modal surface) and compared in the browser at 568×320 and 1280×720 (DEC-029):

| Criterion | Grimorio grabado | Cristal arcano |
|---|---|---|
| Silhouette at 568×320 | Ink outline separates gem/button/card from the dark table | Hairlines vanish; shapes merge into the backdrop |
| Number legibility | Ink-stroked Lilita numerals on a faceted gem stay crisp | Glow blurs small numerals; the orb reads as a dot |
| Identity | Card-game material (carved table, gold trim, gems) | Generic sci-fi/SaaS glass |
| Performance | Gradients + box-shadows only | Needs `backdrop-filter` (costly on phones, layered over a canvas) |
| States without color | Bevel, ledge and trim weight change | Mostly glow intensity (color-only) |

The losing variant was removed. The winner stays as a dev reference: **sandbox toolbar → "Prueba de estilo"**
(`src/components/cards/dev/StyleProof.tsx`, styles `.cg-proof*` at the end of `cards.css`). UI-02 ports it into the
shared `skin/` primitives; nothing in production uses `.cg-proof*`.

---

## 2. Tokens (runtime: `cards.css` → `.cg-root`)

Two layers in one block:

1. **Palette tokens** (pre-existing, unchanged values): `--cg-bg`, `--cg-board`, `--cg-card`, `--cg-mana`, rarity,
   `--cg-fx-*` … Existing rules keep using them.
2. **Semantic tokens** (UI-01): what new or restyled UI should consume. Most alias a palette token.

| Group | Tokens | Notes |
|---|---|---|
| Materials | `--cg-ink` `#1d0842`, `--cg-mana-deep`/`-hi`/`-shine` (gem facets), `--cg-obsidian` `#160b2e`, `--cg-violet` `#4b2f8f`, `--cg-violet-hi` `#6a48b8`, `--cg-gold` `#f2c14e`, `--cg-gold-deep` `#a8742a`, `--cg-gold-shine` `#fff1c1`, `--cg-button-hi`/`-lo` | Gold = exceptional only (title, primary trim, Legendaria). Never gold on every button |
| Surfaces | `--cg-surface-0` (= `--cg-bg-2`) → `-1` `#22154a` → `-2` `#2f1f62` → `-3` `#3d2a7c`, `--cg-surface-scrim` `#07031acc` | Three-layer depth: ambient → raised panel → interactive face / highlight |
| Text | `--cg-text-strong`, `--cg-text-muted`, `--cg-text-faint`; ink `--cg-ink` on light faces | Body text never below `--cg-text-muted` on `surface-1+` |
| Borders | `--cg-border-subtle`, `--cg-border-strong`, `--cg-border-trim` (gold), `--cg-border-w` 2px, `--cg-outline-w` 3px | Ink outline (`0 0 0 var(--cg-outline-w) var(--cg-ink)`) on every raised face |
| Focus | `--cg-focus` (= `--cg-selected` `#ffe066`), `--cg-focus-w` 3px, `--cg-focus-offset` 2px | `outline`, not box-shadow, so it survives `overflow: clip` parents |
| Spacing | `--cg-space-1…10` = 4, 8, 12, 16, 20, 24, 32, 40 px | 4px scale; viewport-relative `clamp()` stays allowed for battlefield geometry |
| Radii | `--cg-radius-sm` 6, `--cg-radius-md` 12 (= `--cg-radius`), `--cg-radius-lg` 18, `--cg-radius-pill` | Cards/panels `md`, framed screens `lg`, chips/pills `pill` |
| Type | `--cg-font-display` (Lilita One), `--cg-font-body` (Nunito 600/800/900); `--cg-text-xs/sm/md/lg/xl/hero` | Sizes `clamp()` on `dvh` (the short side in landscape). Numbers always display font |
| Depth | `--cg-bevel`, `--cg-elev-1/2/3`, `--cg-glow-mana`, `--cg-glow-gold` | Bevel = 1px top highlight + 3px bottom shade. Glows are box-shadows, never `filter: blur` |
| Motion | `--cg-dur-fast/--cg-dur/--cg-dur-slow`, `--cg-ease-out`, `--cg-ease-pop`, `--cg-ease-in-out` | Reduced motion shortens durations in the token block itself |
| State | `--cg-disabled-opacity` 0.5 | Disabled also loses the ledge/bevel (not color only) |
| Targets | `--cg-tap` 44px, `--cg-tap-primary` 56px | End Turn and the main "Jugar" use `--cg-tap-primary` |

Rules: no raw hex in `cards.css` rules outside the token block (UI-01 leaves zero); components outside `skin/`
reference tokens only; new token families extend this block instead of creating another registry; every selector is
`cg-`-prefixed and lives under `.cg-root` (the `/cards` layout) so nothing bleeds into other games.

### 2.1 Fixed palette for SVG art (mirrors tokens)

| Role | Hex |
|---|---|
| Backdrop / board | `#1b1036`, `#120a26` / `#2a1a52`, `#22144a` |
| Surfaces | `#160b2e`, `#22154a`, `#2f1f62`, `#3d2a7c`, violet `#4b2f8f` / `#6a48b8` |
| Ink outline | `#1d0842` |
| Gold trim | `#a8742a` → `#f2c14e` → `#fff1c1` (shade → base → shine) |
| Mana / attack / health | `#3fa9ff` (facets `#1f6fd1`, `#7cc8ff`, `#e6f6ff`), `#ffbe0b`, `#ff4d6d` |
| Rarity | basic `#9aa0a6`, common `#e9ecef`, rare `#3a86ff`, magic `#b5179e`, legendary `#ff9f1c`, unique `#ff006e` |
| Elements | fire `#ff7b00`, ice `#9be7ff`, arcane `#c77dff`, lightning `#ffe066`, shadow `#8e5bd8`, nature `#7bd389`, holy `#fff3b0`; heal/valid `#06d6a0` |

---

## 3. Materials and component grammar

**Raised face** (button, gem, card, panel): gradient lit from the top-left → ink outline → bevel → ledge
(`0 4–5px 0 var(--cg-ink)`) for pressable things. Pressing removes the ledge and translates 2–4px down.

**Framed screen / modal**: `surface-2 → surface-1 → obsidian` gradient at 160°, outer ink outline, inner gold-deep
hairline, inner ink line, `--cg-elev-3`. Gold trim on modals that announce something (reward, Legendaria reveal);
plain `border-strong` on utility sheets (settings, filters).

**Resource gems**: faceted hexagon (mana), diamond (attack), drop (health), disc (generic). Four planes: ink silhouette,
base, lit top facet, side facet, one highlight sliver. Numeral in the display font, white with a 3px ink stroke
(`paint-order: stroke fill`), centred (drop: 12% low).

**Rarity** is never color alone: gem shape/weight + label + frame treatment.

| Rarity | Rim | Extra cue |
|---|---|---|
| Básica / Normal | thin neutral rim | none |
| Rara | blue rim | small gem |
| Mágica | magenta rim | gem + rune filigree |
| Legendaria | gold rim + gold trim | crest corner, rim light in art |
| Única | vivid magenta double rim | asymmetric crest, distinct frame cut |

### 3.1 State semantics (every interactive component)

| State | Visual | Non-color cue |
|---|---|---|
| Default | raised face, ledge | — |
| Hover (pointer) | `surface-3` / +6% light | — |
| Pressed | ledge removed, 2–4px down | movement |
| Focus | 3px `--cg-focus` outline, 2px offset | ring |
| Selected | gold trim + `--cg-selected` ring | thicker ring, check glyph |
| Playable / valid | `--cg-valid` glow | pulse (off with reduced motion) |
| Pending (server not confirmed) | 60% opacity ghost, dashed outline | dashed outline |
| Disabled | `--cg-disabled-opacity`, no ledge/bevel | flat |
| Locked (collection) | desaturated art, lock glyph | glyph + label |
| Error / rejected | `--cg-invalid` ring, slide-back | shake / slide |

---

## 4. Typography and spacing

- **Lilita One** (display): titles, buttons, every number (cost, attack, health, mana, timer, gold). Outline numerals
  on art with a 2–3px ink stroke.
- **Nunito 800** (body): rules text, labels, chips. 900 for keyword lead-ins (`**Grito de Guerra:**`). Rules text ≥
  `--cg-text-sm` (12px at 320px tall); never smaller than 11px anywhere.
- Spanish strings run ~20–30% longer than English: buttons wrap to 2 lines before truncating; names use
  `text-wrap: balance` and shrink one step before ellipsis.
- Spacing on the 4px scale; panel padding `space-3` (phone) → `space-5` (desktop) via `clamp()`.

---

## 5. Icons

- One family: **24×24 viewBox, single path, filled shapes**, ≥2-unit strokes-as-shapes, content in x/y 2–22, holes
  ≥1.5 units, readable at 12px. Keyword/status glyphs keep their maps (`skin/icons/keywordGlyphs.tsx`,
  `statusGlyphs.ts`); UI-specific icons go in one shared `GameIcon` mapping (`skin/GameIcon.tsx`,
  `skin/icons/gameIcons.ts`: play, collection, decks, store, account, settings, check, close, warning, lock, hourglass,
  sparkle, back, endTurn, coin, hand). Overlapping shapes use the glyph's `rule: "nonzero"`; holes use the default
  `evenodd`. Every glyph is a different path (tested).
- Icons sit in a dark ink disc or directly on a raised face; color from the token set; never the only carrier of
  meaning (pair with a label or `aria-label`).
- **Zero emoji or dingbat characters** as icons/decorations (see audit §8 for the remaining literals). Typographic
  `×` in quantities ("×2", "1,5×") is text, not an icon, and stays.

---

## 6. Art grammar (card illustrations)

Technical contract: `ART_GUIDE.md` §2/§5 (512×512, safe box x 96–416 / y 112–400, both crops, ≤30 KB, no
text/raster/filters/animation, ids prefixed with the key). Style grammar on top:

- **Value structure:** dark background corners → mid-value environment → brightest values on the subject's lit side.
  Subject must read as a silhouette at 64px.
- **Outline:** `#1d0842`, ~2–4% of the viewBox (10–20 units) around the subject; interior lines thinner.
- **Shading:** cel-shaded, 2–4 flat planes per mass (shadow, base, light, highlight sliver); light from upper left;
  rim light on the right edge in the element color (rarity color for Legendaria/Única).
- **Glow:** translucent radial gradients, never `<filter>`.
- **Background:** element-mood gradient (`ART_GUIDE` §5) plus 1–3 quiet scene props (ground plane, ruins, foliage,
  runes); low contrast so the subject pops.
- **Mobs** show a creature in a characteristic pose with one prop/action; **spells** depict the effect acting on
  something (a lance striking, a shield forming, a gale freezing), never a generic orb.
- **Variety rule:** related cards differ in geometry/pose/action, not only hue (wolf-pup vs wolf vs alpha-wolf).
- **Tokens** are simpler than their collectible relatives and never reuse their art.
- **Premium (Legendaria/Única):** dramatic pose, richer scene, rarity-colored rim light; still static (motion lives in
  the FX layer, UI-09).

### 6.1 Workflow (UI-03, DEC-031)

Card art is **compiled offline** and committed: `scripts/cards-art/lib.mjs` (shared grammar) + `scripts/cards-art/art.mjs`
(one recipe per art key) → `public/cards/art/<key>.svg`. Nothing there is imported by the app.

1. Add a recipe `"<key>"() { const a = new Art("<key>"); …; return a; }` — pilots live in `RECIPES` in `art.mjs`; from
   UI-04 on, each wave group has its own module `scripts/cards-art/recipes/<wave>-<group>.mjs` (default export = object
   of recipes, listed in `art.mjs`; a key defined twice throws). Palette + material ramps are in `materials.mjs`. Start
   from the closest template below (copy its structure, **change geometry, pose, prop and scene** — never only colours).
2. `node scripts/cards-art/art.mjs <key>` (prints the byte size; keep ≤ 30 720 B).
3. Register the key in `CARD_ART_FILES` (`skin/assets.ts`), set its manifest row in `UI_ASSET_STATUS.md` to
   `registered` with the recipe/size/notes, run `npm test`.
4. Look at it: sandbox toolbar → **"Galería de arte"** (64/40 px thumbnails, both crop masks, full card, board token,
   inspect, pack opening) at 568×320 and 1280×720. Compare with related cards for clone-like silhouettes. Offline
   contact sheet: `node scripts/cards-art/sheet.mjs <out.png> <tile px> <cols> <key …>` (`CROP=1` overlays the safe box
   and both crop lines) — write the PNG outside the repo.

**Grammar primitives** (`lib.mjs`):

| Primitive | Use |
|---|---|
| `a.mass(d, { base, shade, light?, rim?, ow, sv, hv, rv })` | Every solid form. Ink outline `ow` (5–7 big masses, 3–4 small parts), shadow band offset `sv` (lower right, ~10 units), light band `hv` (upper left), rim `rv` on the right edge in the element colour — **gold `#ff9f1c` for Legendaria, magenta `#ff006e` for Única** |
| `limb(points, widths, { capEnd })` | Tapered capsule along a polyline: arms, legs, bones, necks, tails, horns/claws/flames (`capEnd: false` = sharp tip) |
| `blob(…, { seed })` / `shard(…, { seed })` | Organic (fur tufts, smoke, haunches, mounds) / faceted (rocks, crystals, debris) |
| `star`, `zigzag`, `ellipse`, `smooth`, `poly` | Bursts, arcs, discs, free curves |
| `a.backdrop`, `a.ground`, `a.glow`, `a.shadow`, `a.motes` | Scene: element-mood gradient + light pool, ground plane with lit spot, radial glows (never `<filter>`), contact shadow, embers/leaves/sparks |
| `a.begin(transform)` / `a.end()` | Scale a figure about its feet to clear the crop (premium figures) |
| `M` ramps in `art.mjs` | Shared material ramps: skin, hair, steel, leather, cloth, tabard, gold, rock, moss, fur, cream, bone |

Draw order is painter's: backdrop → far props → ground → contact shadow → far limbs → body → near limbs/props → head →
FX/motes. Interior detail (eyes, ribs, cracks, seams) is `a.line` / `a.fill` on top.

### 6.2 Templates (one pilot each — copy the structure, not the drawing)

| Template | Pilot | Structure | Vary per card |
|---|---|---|---|
| **Humanoid** | `squire` | 3/4 facing left; legs + boots → weapon arm → torso layers (under-armour, tabard, belt) → head (face, hair, ear) → shield/prop in front. Head ≈ 1/4 of height (playful proportions) | Silhouette prop (shield/staff/tome/lantern), headgear, pose (guard, cast, swing), outfit layers |
| **Quadruped** | `wolf-pup` | Tail → far legs (darker base) → body → near legs → head with ears and muzzle; big readable eyes; action pose (play-bow) | Body mass ratio (pup vs alpha vs bear), pose (pounce, howl, charge, rear), tail/horn/tusk features |
| **Construct** | `stone-golem` | Frontal and wide; stubby legs → arms → torso mass → small head → shoulder masses → fists in front; one glowing core/rune (cyan) + visor slit | Material ramp (stone, iron, scrap, clockwork), core shape, limb count/size |
| **Undead** | `restless-skeleton` | Bone ramp with violet rim; spine + ribcage (ink rib lines) → arms of thin `limb`s → skull with dark sockets and small glows; scene prop (grave/tomb) | Never a tinted skull: change body plan (ghost wisp, ghoul hunch, bat wings, wall of bones) |
| **Spell burst** | `arcane-spark` | Source object (wand) from a corner → burst at the source → arcs (`zigzag`, stroked ink/colour/white) → impact star on a target object | Source (hand, wand, tome, totem), effect geometry, the **target object** and direction |
| **Spell beam** | `flame-lance` | Long `limb` envelope + inner core + tip along a diagonal → trailing tongues → impact burst + debris on the ground | Projectile shape (lance, shard, chain, wave), direction (↘ here, ↗ in the burst), impact |
| **Legendary figure** | `morvath` | Rich backdrop (architecture + rays + ritual circle) → figure scaled 0.86 about the feet → wide cloak silhouette → focal head with crown → signature props on both sides; rarity rim on every mass | Body plan and signature props; never reuse the cloak triangle for another legend |
| **Dragon** | `ignis` | Wings first (scalloped membrane `mass` + finger-bone `limb`s) → tail → haunches → chest + belly plates → raised fore-claw → neck `limb` with spines → horned head with jaws and breath | Wing shape/pose, neck length (wyrm vs drake), material (Ignis = obsidian + molten veins), breath element |

Pilot review (UI-03): all 8 checked at 64/40 px, both crops, card, token, inspect and pack at 568×320 and 1280×720 —
distinct silhouettes and actions; two spells move in opposite diagonals; premium pair has richer scenes and rarity rims.

UI-04 wave (30 keys, 2026-11-13): new body plans beyond the templates — seated/kneeling/floating humanoids
(`silence-monk`, `last-stand-knight`, `sun-cleric` dome), biped beast (`line-breaker`), arachnid (`venom-spider`),
frontal token animals (`toad`, `bear-cub`), cloud-vortex elemental (`storm-weaver`), tree elemental (`swamp-ent`), and a
legendary quadruped group (`ursaria` over two cubs, gold rim, scaled 0.92 about the feet). Related sets were compared at
64 px: `wolf-pup` play-bow / `wolf` trot / `alpha-wolf` seated howl / `blood-hound` nose-down; `bear-cub` sitting /
`berserker-bear` rearing / `ursaria` standing guard; `clockwork-sentinel` small brass / `scrap-golem` junk / `stone-golem`
stone + cyan rune / `iron-colossus` frame-filling iron + orange furnace core.

UI-05 wave (16 keys, 2026-11-13): undead/demon/dragon body plans from `recipes/ui05-parts.mjs` (`wing`, `skull`,
`bone`, `drop`) — every undead and demon has its own body plan (standing skeleton, bat, wall, ghoul, ghost, enthroned
king; imp, smoke beast, four-armed weaver, leech, asymmetric empress) and the five dragons are separate silhouettes
(curled larva, coiled wingless wyrm, side-on flier, frontal diver, perched swan-neck) against Ignis. Merge repeated
small parts (spikes, claws, bone knobs) into one `mass` path: each `mass` costs ~0.4–0.6 KB.

UI-06 wave (26 spells, 2026-11-13; catalog **80/80**): four modules grouped by element/action —
`recipes/ui06-light-nature.mjs` (heal, buff, cleanse, ward, attack buff, summon, team buff), `ui06-shadow.mjs` (drain,
destroy, AoE, vulnerability, return-to-hand, sacrifice, revive), `ui06-arcane.mjs` (draw, copy, mana, summon,
transform, control), `ui06-storm-ice.mjs` (chain, freeze one, freeze all, disarm, stun). Spell rule: **draw the
effect acting on its object** (a hand being healed, armour cracking, a sword flying from a struck wrist, a knight half
turned into a toad), never a floating orb; one target vs many is shown literally (`ice-shard` one spear / one goblin vs
`frozen-gale` a gale over three ice blocks; `chain-lightning` one bolt forking to three shields). Cards drawn as props
are blank face-down backs or a spiral portal face — never text. Shadow spells avoid all-violet sameness through hue
accents: crimson (`drain-life`, `dark-pact`), teal (`soul-harvest`, `banish`), necrotic green (`raise-dead`), ember
(`shatter-armor`), bone white (`bone-storm`). Required pairs checked at 64 px: `arcane-spark` violet diagonal wand zap
vs `mana-spark` small cyan vertical flash over a palm; `ice-shard` vs `frozen-gale`; `arcane-insight` eye + grimoire +
two rising cards vs `arcane-echo` prism mirroring a wolf; `blessing-of-light` gold vertical sunbeam + light wings vs
`purify` cool diagonal chalice pour breaking taint chains.

### 6.3 Shared controls (UI-02)

| Need | Use |
|---|---|
| Any button | `.cg-button` (secondary violet) + `--primary` (one per screen, gold trim) · `--danger` · `--quiet` · `--active`/`--selected` · `--loading`; disabled via the attribute |
| End turn | `EndTurnButton` (`.cg-endturn--ready/readyIdle/foe/pending`) |
| Framed panel / modal | `.cg-panel`, `.cg-dialog`, or `.cg-surface` (+ `--trim` for announcements) |
| Inline status mark | `<GameIcon name="check" className="cg-mark cg-mark--ok" />` next to its label |
| Skin images | `public/cards/skin/*.svg`, regenerated by `scripts/cards-art/skin.mjs` |
| Card illustrations | `public/cards/art/<key>.svg`, compiled by `scripts/cards-art/art.mjs` (§6.1) |
| Screen header (UI-07) | `screen/ScreenHeader` — quiet back (label hides < 700px, stays the accessible name) · engraved title plate + gold icon medallion · end slot |
| Loading / empty / error (UI-07) | `screen/StateMessage kind="loading/empty/error"` (+ `fill` for full-page, + `action`) |
| Section heading (UI-07) | `<h2 className="cg-section-title"><GameIcon …/>Texto</h2>` (gold rule under it); `.cg-section-row` to put a link beside it |
| Oro plate (UI-07) | `<span className="cg-resource"><CurrencyBadge …/></span>` (`--optional` hides it on phones) |
| Crest / pack art (UI-07) | `skin/GameCrest`, `skin/PackArt` — import from their modules, not the barrel (keeps them off the match route) |
| Long art lists (UI-07) | `CardFace lazyArt` / `CardArt lazy` (lazy `<img>`); never on the battlefield |

All of it is visible in the sandbox → "Kit de UI".

---

## 7. Do / don't

| Do | Don't |
|---|---|
| Ink outline + bevel on raised faces | Hairline borders or glow-only shapes |
| Gold for exceptional elements only | Gold trim on every button |
| Numbers in Lilita with an ink stroke | Numbers in body font or without contrast backing |
| Glows as radial gradients / box-shadows | `filter: blur`, `backdrop-filter`, SVG `<filter>` |
| One shared primitive per element (skin/) | Per-screen SVG/colors for the same element |
| Spanish copy from `i18n/es.ts` | Literal Spanish in components, emoji icons |
| Status/rarity cue = shape + color | Color-only distinctions |
| Motion around static art, ≤1.6s, skippable | SMIL/CSS animation inside SVG files; 80 endless loops |

---

## 8. UI-01 audit (2026-11-13)

### 8.1 Routes and their screens

| Route | Component(s) | Notes for later phases |
|---|---|---|
| `/cards` | `menu/CardsMenu`, `WalletHistory` | Title + subtitle + stacked `.cg-button`s and a 4-column grid of plain pill buttons, wallet pill top-right: the "floating buttons" look (UI-07) |
| `/cards/play` | `lobby/LobbyScreen`, `DeckPicker`, `InviteShare`, `skin/QrCode` | ✓ dingbat chips |
| `/cards/match/[id]` | `match/*` (`MatchScreen`, `Board`, `UnitToken`, `HandCard`, `TopBar`, `TurnTimer`, `FoeArea`, `PlayerArea`, overlays, `FxLayer`) | HUD hierarchy, turn indicator, mana, End Turn size, on-board statuses (UI-08) |
| `/cards/collection` | `collection/CollectionScreen`, `Filters`, `card/CardInspect` | Art-first tiles once art exists |
| `/cards/decks`, `/cards/decks/[id]` | `decks/DeckList`, `DeckEditor`, `DeckCover`, `ManaCurve`, `ConfirmDialog` | ⚠ ✕ ✓ dingbats |
| `/cards/store` | `store/StoreScreen`, `PackOpening` | ✦ dingbat as pack art |
| `/cards/dev/sandbox` | `dev/Sandbox`, `dev/StyleProof` | Dev-only (404 in production); behind the `/cards` sign-in gate |
| shared | `LandscapeShell`, `RotateOverlay`, `match/SettingsSheet`, `Toasts` | Rotate overlay is a CSS phone outline (no emoji) |

### 8.2 Hardcoded styling, emoji, placeholders

- **Colors:** no hex literal in any component outside `skin/`; `cards.css` rules use tokens only (UI-01 removed the
  three it introduced). `skin/` holds ~55 hex literals (glyph fills, badge/placeholder colors) — allowed there, to be
  aligned with §2.1 in UI-02.
- **Pictographic literals in visible UI** — **replaced in UI-02** with `GameIcon` glyphs (+ guard `noEmoji.test.ts`):
  `decks/DeckEditor.tsx` "✓", `decks/DeckList.tsx` "⚠" and "✕", `lobby/DeckPicker.tsx` "✓",
  `lobby/LobbyScreen.tsx` "✓" ×2, `match/MulliganOverlay.tsx` "✕", `store/StoreScreen.tsx` "✦".
  No true emoji (U+1F300+) found in `src/components/cards`, `src/app/cards` or `i18n/es.ts`.
- **Placeholders:** card art 0/80 and skin 0/10 files (`public/cards/` does not exist); keyword/status glyph maps are
  marked "placeholder art" in their headers. Manifest: `UI_ASSET_STATUS.md`.

### 8.3 Shared elements, duplicates, concerns

- `cards.css` is organised by **phase** (Phase 11 shared bits, Phase 12 …) rather than component; e.g.
  `.cg-timer--warning` is declared twice (Controls and Phase 11), `.cg-home-wallet` in two places (Collection and
  Rewards sections). Consolidate when restyling those components (UI-07/08), not as a sweeping refactor.
- 134 ad-hoc `clamp()` font/spacing values and 19 literal `border-radius` px values: migrate to the type/space/radius
  tokens as each component is touched.
- `.cg-button` has no own `:focus-visible` rule (relies on the browser default); 12 other components define their own
  ring in slightly different ways → one focus treatment in UI-02.
- Performance: no `backdrop-filter` or blur filters (keep it that way); 9 `infinite` CSS animations (pulse, timer,
  rotate hint, glows) — all are state-bound or disabled under reduced motion; keep new loops to one per screen.
- Layout at 568×320: the plan's live-screenshot review (§1.3) — oversized centred "Turno rival", weak mana crystals,
  heavy End Turn block, statuses visible only in inspect — is the UI-08 brief. UI-01 could not re-capture the real
  screens: every `/cards` route (sandbox included) requires sign-in and no credentials were used (see `STATUS.md`).

---

## 9. Accessibility and responsive constraints

- Landscape-first: 568×320 minimum, 667×375, 812×375 with side notches (`env(safe-area-inset-*)` on `.cg-shell`),
  1280×720, ultrawide. Portrait + touch shows the rotate overlay.
- Tap targets ≥44px (`--cg-tap`); End Turn / Jugar ≥56px (`--cg-tap-primary`). Visual size may be smaller only if the
  hit area is not.
- Visible focus everywhere; keyboard paths from Phase 12 (arrows/Enter/Esc/E/I) must keep working.
- Contrast: text ≥4.5:1 on its surface, numerals on gems ≥3:1 plus ink stroke.
- Reduced motion (OS and in-game setting): no shakes/particles/loops; fades only.
- Overlays use `justify-content: safe center` (or equivalent) so content never clips above the fold at 320px tall.
- **UI-10 rules (enforced or checked):**
  - Touch (`pointer: coarse`) gets ≥ 44px on every compact control: filter chips, search fields, deck-editor rows,
    "−" and actions. Mouse layouts may stay compact (32px chips). Where the drawn size must stay small (editor "ⓘ",
    "−" on narrow phones, the foe hero portrait, board units at 568×320), an absolutely positioned `::after` extends the
    hit area — a pseudo-element hit-tests as its element, so `closest("[data-cg-…]")` and click handling are unchanged.
  - Every endless CSS animation must also be stopped in a `@media (prefers-reduced-motion: reduce)` block —
    `src/components/cards/reducedMotion.test.ts` fails otherwise. Battlefield motion is additionally governed by the
    in-game setting (`.cg-battlefield--reduced`).
  - Card rules text steps down by length (`cardTextClass` in `CardFace.tsx`: > 56 → `--long`, > 75 → `--xlong`)
    rather than clipping. Keep new card texts ≤ 100 visible characters (current max: Vaelra, 100).
  - Grids inside height-capped scrollers whose items have a `min-height` need `grid-auto-rows: max-content`, or rows
    shrink to the min-height and content overlaps (UI-10 lobby deck-picker bug).
  - Every overlay is a labelled dialog (`role="dialog"` + `aria-modal` + `aria-labelledby`); live state (turn chip,
    toasts, connection, rewards) uses `role="status"`.

## 10. Maintenance (UI-10 final handoff)

**Adding or changing a card's art.** (1) Add/adjust its recipe in `scripts/cards-art/recipes/<wave>.mjs` (or
`art.mjs` for the pilots), reusing `lib.mjs` grammar and `materials.mjs` ramps. (2) `node scripts/cards-art/art.mjs
<key>` writes `public/cards/art/<key>.svg`; regenerating everything must leave untouched files byte-identical.
(3) Register the key in `CARD_ART_FILES` (`skin/assets.ts`) and update its row in `UI_ASSET_STATUS.md`. (4) Review:
`CROP=1 node scripts/cards-art/sheet.mjs <tmp>/x.png 300 4 <key> <its siblings>` (safe box + both crops) and the 64px
sheet of all keys; then the dev sandbox → "Galería de arte" (card, token, inspect, pack). (5) `npm test` —
`skin/assets.test.ts` enforces the SVG contract (≤ 30 720 B, viewBox, no text/filter/animation/external refs, id
prefix), one file per catalog key (80/80 today) and no orphan files. A **new card** fails that gate until its art
exists; the runtime placeholder in `CardArt` still covers it in development.

**Skin files.** `node scripts/cards-art/skin.mjs` regenerates the 10 `public/cards/skin/*.svg` slots (exact viewBoxes
in `ART_GUIDE.md` §3); `SKIN_FILES` registers them.

**Icons.** Keyword/status glyphs: `skin/icons/keywordGlyphs.tsx`, `statusGlyphs.ts`; UI icons: `skin/icons/gameIcons.ts`
via `GameIcon`. One path per glyph inside 24×24 (tests check bounds and uniqueness); no emoji or dingbats anywhere in
the card game's UI or copy (`noEmoji.test.ts`).

**Premium reveals.** Add a `SignatureSpec` in `client/animation/signatures.ts`, a `CardVisual.signature` entry in
`catalog/visuals.ts` and two CSS variants (`.cg-fx-aura--<id>`, `.cg-fx-accent--<id>`); `cinematics.test.ts` checks the
≤ 1.6 s cap at every speed and the reduced-motion variant.

**Styling.** Tokens only from `cards.css` `.cg-root`; new components reuse `.cg-button` variants, `.cg-surface`,
`.cg-panel`, `.cg-dialog`, `ScreenHeader`, `StateMessage`. Check 568×320 and 1280×720 at least; with touch emulation
for tap targets.
