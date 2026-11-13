# Duelo Arcano — Art Guide (SVG asset specification)

Phase 20 deliverable (plan §21 Phase 20 C). This document is enough for a person **or another AI** to produce drop-in
SVGs for every skin primitive, every card illustration and every keyword/status icon. Nothing else needs to change:
place the file, register its key, run the tests.

The game never shows a broken image: a primitive uses a file **only** when its key is registered in
`src/components/cards/skin/assets.ts`; otherwise it keeps drawing its generated placeholder.

---

## 1. How to add art (the pipeline)

1. Produce the SVG following §2 (global rules) and the spec of its slot (§3–§5).
2. Save it at the exact path:
   - card illustration → `public/cards/art/<art key>.svg` (keys in §5; today the art key equals the card id)
   - skin image → `public/cards/skin/<name>.svg` (names in §3)
   - keyword / status icon → not a file: paste the path data into the glyph map (§4)
3. Register it in `src/components/cards/skin/assets.ts`:
   - card art: add the key to `CARD_ART_FILES`, e.g. `new Set<string>(["ignis", "morvath"])`
   - skin: add the name to `SKIN_FILES`, e.g. `new Set<SkinAsset>(["card-back"])`
4. Run `npm test`. `src/components/cards/skin/assets.test.ts` fails if a registered file is missing, over 30 KB, has the
   wrong `viewBox`, embeds a raster image, references anything external, or contains script.
5. Check it in the dev sandbox (`/cards/dev/sandbox`), the collection (`/cards/collection`) and a pack opening, at a
   phone landscape size (568×320) and a desktop size.

Files under `/cards/art/` and `/cards/skin/` skip the auth proxy (`src/proxy.ts`) and are plain static files. They are
not precached by the service worker (it leaves every `/cards*` URL to the network), so they load on first use.

---

## 2. Global rules (every SVG)

| Rule | Value |
|---|---|
| Format | SVG 1.1 / SVG 2 static markup, UTF-8, root `<svg xmlns="http://www.w3.org/2000/svg" viewBox="…">` |
| `viewBox` | Exactly the one given for the slot (the test checks the string) |
| `width` / `height` attributes | Omit them (the UI sizes the image) |
| Max size | **30 KB** per file (30 720 bytes), after optimisation (e.g. SVGO with default preset) |
| Raster | **None**: no `<image>`, no `data:image/…` |
| External references | **None**: no `http(s)://` or `//` in `href`/`src`/`url()`, no `@import`, no web fonts |
| Script | **None**: no `<script>`, no `on…=` attributes, no `<foreignObject>` |
| Text | **None**: no `<text>` (names, numbers and labels are drawn by the UI in Spanish; convert any lettering to paths) |
| Animation | None (no SMIL `<animate>`, no CSS animations inside the file): the game animates around the art |
| Filters | Avoid `<filter>` (blur, drop shadow): expensive on phones when scaled. Fake glows with radial gradients |
| IDs | Prefix every `id` with the file key (`ignis-grad1`) — several SVGs may be inlined later and ids must not collide |
| Colors | Opaque or alpha hex. The page's CSS variables are **not** available inside an `<image>`-loaded SVG, so use the hex values of the palette below |
| Style | Bold, readable at small sizes: flat or cel-shaded shapes, a clear silhouette, a dark outline (`#1d0842`, 2–4 % of the viewBox) around the subject, light from the top-left |

### Palette (the UI tokens, `src/components/cards/cards.css`)

| Token | Hex | Use |
|---|---|---|
| `--cg-bg` / `--cg-bg-2` | `#1b1036` / `#120a26` | night-purple backgrounds |
| `--cg-board` / `--cg-board-2` | `#2a1a52` / `#22144a` | table surface |
| `--cg-card` / `--cg-card-spell` | `#3b2a6b` / `#2c3f7a` | mob / spell card body |
| `--cg-card-back` / `--cg-card-back-2` | `#4a1791` / `#ff006e` | card back, its rim |
| `--cg-hero` / `--cg-foe-hero` | `#5a2d9c` / `#8a1c3a` | my / foe portrait |
| `--cg-text-ink` | `#1d0842` | outlines |
| `--cg-mana` | `#3fa9ff` | cost gem |
| `--cg-attack` | `#ffbe0b` | attack badge |
| `--cg-health` | `#ff4d6d` | health badge |
| Rarity: basic, common, rare, magic, legendary, unique | `#9aa0a6`, `#e9ecef`, `#3a86ff`, `#b5179e`, `#ff9f1c`, `#ff006e` | rims, glows |
| Elements: fire, ice, arcane, lightning, shadow, nature, holy | `#ff7b00`, `#9be7ff`, `#c77dff`, `#ffe066`, `#8e5bd8`, `#7bd389`, `#fff3b0` | effects, card mood (§5) |
| Heal | `#06d6a0` | healing |

---

## 3. Skin primitives (`public/cards/skin/<name>.svg`)

Every primitive is code in `src/components/cards/skin/`. The ones below accept a drop-in file; the rest are drawn from
path data (§4) or are pure layout (no art). Numbers, names, rims, glows and states are always drawn by the UI on top.

| File | Primitive | `viewBox` | What the UI draws on top | Safe area / notes |
|---|---|---|---|---|
| `skin/card-back.svg` | `CardBack` (foe hand, deck, pack cards face down) | `0 0 360 500` | a 6 %-of-height rim in `#ff006e`, rounded corners (10 % of height) | Shown from 40 px to 300 px tall. Keep a symmetric emblem inside the central 260×380; corners are clipped |
| `skin/board-backdrop.svg` | `BoardBackdrop` (the table) | `0 0 1600 900` | both boards, the divider line, hands, heroes | Scaled with `cover` to any landscape ratio (16:9 to 19.5:9): keep detail in the central 1400×700. Low contrast (units must read on top); darkest at the edges |
| `skin/frame-mob.svg` | `CardFrame` for mobs | `0 0 360 500` | rarity rim (CSS border), art window, name plate, text box, cost/attack/health badges, tribe ribbon | Zones (fractions of the card): art window x 8–92 %, y 6–46 % (oval); name plate y 47–56 %; text box x 7–93 %, y 58–88 %; badges at the top-left and bottom corners. Decorate around those zones; under them use flat mid-dark colors |
| `skin/frame-spell.svg` | `CardFrame` for spells | `0 0 360 500` | same as mob, no attack/health, no tribe | Same zones; a distinct, more "magical" ornament (runes, filigree) so spells read at a glance |
| `skin/hero-mine.svg` | `HeroPortrait` (my hero) | `0 0 256 256` | the player's initial (centre), health badge (bottom-right), targeting ring | Cropped to a circle (inscribed). Keep the centre (100×100) mid-tone and uncluttered: the initial sits there |
| `skin/hero-foe.svg` | `HeroPortrait` (foe hero) | `0 0 256 256` | same | Same; warm/red tone to tell sides apart |
| `skin/badge-gem.svg` | `CostBadge` | `0 0 100 100` | the number (white, outlined) | A hexagonal gem in `#3fa9ff`; outline inside the box (the number covers the central 60 %) |
| `skin/badge-diamond.svg` | `AttackBadge` | `0 0 100 100` | the number | A diamond in `#ffbe0b` |
| `skin/badge-drop.svg` | `HealthBadge` | `0 0 100 100` | the number (shifted 12 % down) | A drop in `#ff4d6d`, widest in the lower half |
| `skin/badge-circle.svg` | generic `Badge` circle | `0 0 100 100` | a number | A neutral disc |

Primitives without a file slot: `ManaCrystals`, `EndTurnButton`, `RarityGem`, `TribeLabel`, `CurrencyBadge`, `QrCode`
(small, code-drawn, theme-colored; change them in code if needed).

---

## 4. Keyword and status icons (path data, not files)

Icons are single-path glyphs inside a dark disc drawn by `KeywordIcon` / `StatusIcon`, shown as small as 12 px. To
replace one, edit the `d` (and optionally `fill`) of its entry:

- keywords: `src/components/cards/skin/icons/keywordGlyphs.tsx` → `KEYWORD_GLYPHS[<id>]`
- statuses: `src/components/cards/skin/icons/statusGlyphs.ts` → `STATUS_GLYPHS[<id>]`

Spec: **one path**, `viewBox 0 0 24 24` coordinates, fill rule `evenodd` allowed, content inside the central 20×20
(x 2–22, y 2–22), at least 2 units thick strokes-as-shapes, no holes thinner than 1.5 units, a single fill color from
the palette, recognisable as a silhouette at 12 px.

| Icon key | Meaning (Spanish name in `es.keyword` / `es.status`) | Suggested motif |
|---|---|---|
| `keyword:taunt` | Provocar (drawn by the unit frame; icon used in the glossary) | heater shield |
| `keyword:shield` | Escudo (with charges) | round buckler with boss |
| `keyword:lifesteal` | Robo de Vida | blood drop |
| `keyword:rush` | Embestida | double chevron |
| `keyword:charge` | Carga | lightning bolt |
| `keyword:doubleStrike` | Golpe Doble | two crossed swords |
| `keyword:berserk` | Furia | flame / angry face |
| `keyword:thorns` | Espinas | spiky star |
| `keyword:cleave` | Barrido | curved blade |
| `keyword:regeneration` | Regeneración | cross |
| `keyword:reborn` | Renacer | phoenix feather / circular arrow |
| `keyword:poison` | Veneno | skull drop |
| `keyword:stealth` | Sigilo | eye with slash / hood |
| `keyword:divineShield` | Escudo Divino | halo bubble |
| `keyword:flying` | Vuelo | wing |
| `status:burn` | Quemadura | flame |
| `status:freeze` | Congelado | snowflake / crystal |
| `status:stun` | Aturdido | star burst |
| `status:weakness` | Debilidad | broken sword |
| `status:vulnerability` | Vulnerabilidad | cracked shield |
| `status:curse` | Maldición | spiral eye |
| `status:blessing` | Bendición | sun / halo |
| `status:disarm` | Desarmado | dropped sword |
| `status:bleed` | Sangrado | drops |
| `status:immune` | Inmune | closed dome |
| `status:silenced` | Silencio (marker, not a status) | crossed-out mouth / speech bubble |

---

## 5. Card illustrations (`public/cards/art/<art key>.svg`)

| Rule | Value |
|---|---|
| `viewBox` | `0 0 512 512` |
| Where it shows | card face art window (landscape ≈ 1.5 : 1 oval), unit token on the board (portrait 0.78 : 1 oval), inspect modal, pack opening, collection, cinematic reveal (large, centre screen) |
| Cropping | Always "cover" (`xMidYMid slice`): a landscape crop keeps x 0–512, y 87–425; a portrait crop keeps x 56–456, y 0–512. **Keep the subject's silhouette inside the centred box x 96–416, y 112–400** (320×288); the background must fill the full square |
| Background | Full-bleed, painterly gradient in the card's element mood; no frame, no border, no vignette (the UI adds those) |
| Subject | One clear subject, ~60 % of the safe box, facing slightly left or front; tokens (`token` below) simpler than collectible cards |
| Rarity feel | basic/common: simple shapes, 3–5 colors; rare/magic: more detail and a glow; legendary/unique: dramatic pose, rim light in the rarity color, rich background — these are shown huge in the cinematic entrance |
| Element mood | fire: orange/red embers; ice: pale cyan crystals; arcane: violet runes and sparks; lightning: yellow arcs on dark blue; shadow: deep purple smoke; nature: greens and browns, leaves; holy: warm white-gold light; `—` (neutral): the card's tribe colors on a muted purple |

Columns: art key · Spanish name · rarity · cost · tribe (or Hechizo) · attack/health · effect element (also the color of
its projectiles and particles, `catalog/visuals.ts`) · entrance (`cinematic` = full-screen reveal, `heavy` = slam) ·
token.

| Art key | Name | Rarity | Cost | Tribe | A/H | Element | Entrance | |
|---|---|---|---|---|---|---|---|---|
| `squire` | Escudero | basic | 1 | Humano | 1/2 | — | normal |  |
| `wolf-pup` | Lobezno | basic | 1 | Bestia | 1/1 | nature | normal |  |
| `arcane-spark` | Chispa Arcana | basic | 1 | Hechizo | — | arcane | normal |  |
| `healing-touch` | Toque Sanador | basic | 1 | Hechizo | — | holy | normal |  |
| `shield-bearer` | Portaescudos | basic | 2 | Humano | 1/3 | — | normal |  |
| `forest-boar` | Jabalí del Bosque | basic | 2 | Bestia | 3/2 | nature | normal |  |
| `iron-guard` | Guardia de Hierro | basic | 3 | Humano | 2/4 | — | normal |  |
| `stone-golem` | Gólem de Piedra | basic | 4 | Constructo | 3/5 | — | normal |  |
| `restless-skeleton` | Esqueleto Inquieto | common | 2 | No-muerto | 2/1 | shadow | normal |  |
| `vampire-bat` | Murciélago Vampírico | common | 2 | No-muerto | 2/2 | shadow | normal |  |
| `bone-wall` | Muralla de Huesos | rare | 3 | No-muerto | 1/4 | shadow | normal |  |
| `hungry-ghoul` | Necrófago Hambriento | rare | 3 | No-muerto | 3/2 | shadow | normal |  |
| `crypt-banshee` | Banshee de la Cripta | magic | 4 | No-muerto | 3/3 | shadow | normal |  |
| `morvath` | Morvath, Señor de la Cripta | legendary | 8 | No-muerto | 6/6 | shadow | cinematic |  |
| `skeleton-king` | Rey de los Huesos | legendary | 6 | No-muerto | 4/5 | shadow | cinematic |  |
| `berserker-bear` | Oso Berserker | common | 4 | Bestia | 3/5 | nature | normal |  |
| `charging-rhino` | Rinoceronte Embestidor | common | 4 | Bestia | 4/2 | nature | normal |  |
| `thornback-tortoise` | Tortuga Espinosa | rare | 3 | Bestia | 1/5 | nature | normal |  |
| `alpha-wolf` | Lobo Alfa | rare | 3 | Bestia | 2/3 | nature | normal |  |
| `twin-claw-panther` | Pantera de Doble Garra | rare | 4 | Bestia | 3/3 | nature | normal |  |
| `line-breaker` | Minotauro Rompefilas | rare | 5 | Bestia | 4/4 | nature | normal |  |
| `ursaria` | Ursaria, Madre del Bosque | legendary | 7 | Bestia | 5/7 | nature | cinematic |  |
| `apprentice-mage` | Aprendiz de Mago | common | 2 | Humano | 2/2 | arcane | normal |  |
| `drain-life` | Drenar Vida | common | 2 | Hechizo | — | shadow | normal |  |
| `savage-strike` | Zarpazo | common | 1 | Hechizo | — | nature | normal |  |
| `grave-digger` | Sepulturero | common | 3 | Humano | 2/3 | — | normal |  |
| `pack-call` | Llamada de la Manada | common | 3 | Hechizo | — | nature | normal |  |
| `wild-roar` | Rugido Salvaje | common | 3 | Hechizo | — | nature | normal |  |
| `scholar` | Erudito del Archivo | common | 3 | Humano | 2/3 | arcane | normal |  |
| `flame-lance` | Lanza de Fuego | common | 4 | Hechizo | — | fire | normal |  |
| `arcane-insight` | Intuición Arcana | common | 3 | Hechizo | — | arcane | normal |  |
| `soul-harvest` | Cosecha de Almas | rare | 3 | Hechizo | — | shadow | normal |  |
| `bone-storm` | Tormenta de Huesos | rare | 4 | Hechizo | — | shadow | normal |  |
| `chain-lightning` | Rayo en Cadena | rare | 4 | Hechizo | — | lightning | normal |  |
| `dawn-paladin` | Paladín del Alba | rare | 4 | Humano | 3/3 | holy | normal |  |
| `necromancer` | Nigromante | rare | 5 | Humano | 3/4 | shadow | normal |  |
| `swamp-ent` | Ent del Pantano | rare | 5 | Elemental | 4/5 | nature | normal |  |
| `growing-crystal` | Cristal Creciente | magic | 2 | Hechizo | — | arcane | normal |  |
| `storm-weaver` | Tejedora de Tormentas | magic | 6 | Elemental | 4/4 | lightning | normal |  |
| `last-stand-knight` | Caballero Inquebrantable | magic | 5 | Humano | 4/6 | holy | normal |  |
| `ignis` | Ignis, el Dragón Eterno | unique | 10 | Dragón | 8/8 | fire | cinematic |  |
| `ember-imp` | Diablillo de Brasas | common | 1 | Demonio | 1/2 | fire | normal |  |
| `ice-shard` | Fragmento de Hielo | common | 1 | Hechizo | — | ice | normal |  |
| `blessing-of-light` | Bendición de la Luz | common | 2 | Hechizo | — | holy | normal |  |
| `purify` | Purificar | common | 1 | Hechizo | — | holy | normal |  |
| `shatter-armor` | Quebrar Armadura | common | 2 | Hechizo | — | shadow | normal |  |
| `disarming-strike` | Golpe Desarmante | common | 2 | Hechizo | — | lightning | normal |  |
| `flame-wyrm` | Sierpe Flamígera | rare | 4 | Dragón | 3/4 | fire | normal |  |
| `blood-hound` | Sabueso Sangriento | rare | 3 | Bestia | 3/3 | nature | normal |  |
| `silence-monk` | Monje del Silencio | rare | 3 | Humano | 3/2 | holy | normal |  |
| `stone-sleep` | Sueño de Piedra | rare | 3 | Hechizo | — | lightning | normal |  |
| `aegis-ward` | Égida | rare | 2 | Hechizo | — | holy | normal |  |
| `frozen-gale` | Vendaval Helado | magic | 5 | Hechizo | — | ice | normal |  |
| `curse-weaver` | Tejedora de Maldiciones | magic | 4 | Demonio | 3/4 | shadow | normal |  |
| `shadow-stalker` | Acechador Sombrío | common | 3 | Demonio | 3/2 | shadow | normal |  |
| `sun-cleric` | Clériga Solar | common | 2 | Humano | 2/2 | holy | normal |  |
| `ash-drake` | Draco de Ceniza | common | 5 | Dragón | 4/5 | fire | normal |  |
| `clockwork-sentinel` | Centinela de Engranajes | common | 2 | Constructo | 2/2 | — | normal |  |
| `banish` | Destierro | common | 2 | Hechizo | — | shadow | normal |  |
| `dark-pact` | Pacto Oscuro | common | 1 | Hechizo | — | shadow | normal |  |
| `venom-spider` | Araña Venenosa | rare | 2 | Bestia | 1/2 | nature | normal |  |
| `storm-drake` | Draco de Tormenta | rare | 6 | Dragón | 5/5 | lightning | normal |  |
| `golem-forge` | Forja de Gólems | rare | 4 | Hechizo | — | arcane | normal |  |
| `toad-hex` | Maleficio Batracio | rare | 4 | Hechizo | — | arcane | normal |  |
| `raise-dead` | Alzar a los Muertos | rare | 4 | Hechizo | — | shadow | normal |  |
| `arcane-echo` | Eco Arcano | rare | 2 | Hechizo | — | arcane | normal |  |
| `phoenix-chick` | Cría de Fénix | rare | 3 | Elemental | 2/1 | fire | normal |  |
| `larval-drake` | Larva de Dragón | magic | 2 | Dragón | 1/3 | fire | normal |  |
| `iron-colossus` | Coloso de Hierro | magic | 7 | Constructo | 7/7 | — | heavy |  |
| `mind-thrall` | Dominación Mental | magic | 9 | Hechizo | — | arcane | heavy |  |
| `mana-leech` | Sanguijuela de Maná | magic | 3 | Demonio | 2/3 | arcane | normal |  |
| `soul-thief` | Ladrona de Almas | magic | 3 | Humano | 2/3 | shadow | normal |  |
| `vaelra` | Vaelra, Reina de la Escarcha | legendary | 8 | Dragón | 6/7 | ice | cinematic |  |
| `nyxara` | Nyxara, Señora del Vacío | unique | 9 | Demonio | 6/6 | shadow | cinematic |  |
| `skeleton` | Esqueleto | basic | 1 | No-muerto | 1/1 | shadow | normal | token |
| `wolf` | Lobo | basic | 2 | Bestia | 2/2 | nature | normal | token |
| `bear-cub` | Osezno | basic | 2 | Bestia | 2/2 | nature | normal | token |
| `toad` | Sapo | basic | 1 | Bestia | 1/1 | nature | normal | token |
| `scrap-golem` | Gólem de Chatarra | basic | 2 | Constructo | 2/3 | — | normal | token |
| `mana-spark` | Chispa de Maná | basic | 0 | Hechizo | — | arcane | normal | token |

---

## 6. Checklist for a delivery

- [ ] File at the exact path and name; key registered in `assets.ts`.
- [ ] `viewBox` exact; no `width`/`height`; ≤ 30 KB; no raster, external refs, text, script, filters or animation.
- [ ] Subject inside the safe box (card art) / zones respected (frames) / centre left calm (portraits).
- [ ] Palette hex values; ids prefixed with the key.
- [ ] `npm test` green (`skin/assets.test.ts`).
- [ ] Looked at in the sandbox, collection, pack opening and a phone-sized landscape window.
