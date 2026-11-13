# Duelo Arcano — UI asset status (manifest)

UI-01 deliverable (`DUELO_UI_UX_ENHANCEMENT_PLAN.md` §3 "Handoff"). One row per art key of the live catalog
(`CardDef.art`) and per skin slot. **Status** is `registered` only when the key is in `CARD_ART_FILES` / `SKIN_FILES`
(`src/components/cards/skin/assets.ts`) and the file passes `skin/assets.test.ts`; otherwise `missing` (the placeholder
is drawn). `skin/assets.test.ts` fails if this table drops a catalog key or skin slot, lists an unknown one, or its
status disagrees with the registries — update the row in the same change that registers a file.

Columns: key · Spanish name · rarity · tribe (or Hechizo) · element · token · planned phase · status · source recipe
(how the file was produced; `—` until it exists) · quality notes (visual review findings, not automated checks).

**Coverage:** card art **8/80** registered (UI-03 pilots, 2026-11-13; 130.1 KB total, largest 30217 B) · skin **10/10** registered (UI-02, 2026-11-13; total skin output 25.7 KB,
largest file 4.6 KB).

## Card art (80 = 74 collectible + 6 tokens)

| Key | Name | Rarity | Tribe | Element | Token | Phase | Status | Recipe | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `squire` | Escudero | basic | Humano | — |  | UI-03 (pilot) | registered | `scripts/cards-art/art.mjs` (13982 B) | Humanoid template. Young squire 3/4 left, big round plank shield (blue chevron) forward, short sword raised; courtyard wall + banner. Reads at 40 px (shield disc + sword) |
| `wolf-pup` | Lobezno | basic | Bestia | nature |  | UI-03 (pilot) | registered | `scripts/cards-art/art.mjs` (13833 B) | Quadruped template. Play-bow pounce (Embestida), oversized head/ears/paws, wagging tail; forest glade with light shafts. Pup proportions keep it apart from future `wolf`/`alpha-wolf` |
| `arcane-spark` | Chispa Arcana | basic | Hechizo | arcane |  | UI-03 (pilot) | registered | `scripts/cards-art/art.mjs` (10636 B) | Spell burst template. Crystal-tipped wand (lower left) looses two crackling violet arcs that strike a ward plate (upper right); rune circle behind. Diagonal ↗ |
| `stone-golem` | Gólem de Piedra | basic | Constructo | — |  | UI-03 (pilot) | registered | `scripts/cards-art/art.mjs` (11202 B) | Construct template. Frontal boulder golem, head sunk between mossy shoulders, fists planted, glowing cyan chest rune + visor; quarry rocks. Widest silhouette of the set (Provocar) |
| `restless-skeleton` | Esqueleto Inquieto | common | No-muerto | shadow |  | UI-03 (pilot) | registered | `scripts/cards-art/art.mjs` (19211 B) | Undead template. Skeleton clawing out of its grave mound, notched rusty steel sword raised; tombstone, dead tree, moon, violet fog and sockets |
| `morvath` | Morvath, Señor de la Cripta | legendary | No-muerto | shadow |  | UI-03 (pilot) | registered | `scripts/cards-art/art.mjs` (21063 B) | Legendary figure template. Hooded lich in a flared tattered cloak, gold spiked crown, angled glowing sockets, exposed ribcage, soul staff + casting wisp; crypt arch, tomb-light rays, ritual circle; gold rim light. Static — signature FX in UI-09 |
| `flame-lance` | Lanza de Fuego | common | Hechizo | fire |  | UI-03 (pilot) | registered | `scripts/cards-art/art.mjs` (13044 B) | Spell beam template. Lance of fire with a white-gold core streaks ↘ and impales the ground in a burst; rock shards, embers, volcanic spires. Opposite direction to `arcane-spark` |
| `ignis` | Ignis, el Dragón Eterno | unique | Dragón | fire |  | UI-03 (pilot) | registered | `scripts/cards-art/art.mjs` (30217 B) | Dragon template. Original obsidian-and-magma dragon: molten veins on body and wings, both wings raised high, golden horn crown swept back like flames, roaring a fire cone left; magenta (Única) rim; volcanic sky. Largest file (≈30 KB, at the cap) |
| `shield-bearer` | Portaescudos | basic | Humano | — |  | UI-04 | missing | — | |
| `forest-boar` | Jabalí del Bosque | basic | Bestia | nature |  | UI-04 | missing | — | |
| `iron-guard` | Guardia de Hierro | basic | Humano | — |  | UI-04 | missing | — | |
| `berserker-bear` | Oso Berserker | common | Bestia | nature |  | UI-04 | missing | — | |
| `charging-rhino` | Rinoceronte Embestidor | common | Bestia | nature |  | UI-04 | missing | — | |
| `thornback-tortoise` | Tortuga Espinosa | rare | Bestia | nature |  | UI-04 | missing | — | |
| `alpha-wolf` | Lobo Alfa | rare | Bestia | nature |  | UI-04 | missing | — | |
| `twin-claw-panther` | Pantera de Doble Garra | rare | Bestia | nature |  | UI-04 | missing | — | |
| `line-breaker` | Minotauro Rompefilas | rare | Bestia | nature |  | UI-04 | missing | — | |
| `ursaria` | Ursaria, Madre del Bosque | legendary | Bestia | nature |  | UI-04 | missing | — | |
| `apprentice-mage` | Aprendiz de Mago | common | Humano | arcane |  | UI-04 | missing | — | |
| `grave-digger` | Sepulturero | common | Humano | — |  | UI-04 | missing | — | |
| `scholar` | Erudito del Archivo | common | Humano | arcane |  | UI-04 | missing | — | |
| `dawn-paladin` | Paladín del Alba | rare | Humano | holy |  | UI-04 | missing | — | |
| `necromancer` | Nigromante | rare | Humano | shadow |  | UI-04 | missing | — | |
| `swamp-ent` | Ent del Pantano | rare | Elemental | nature |  | UI-04 | missing | — | |
| `storm-weaver` | Tejedora de Tormentas | magic | Elemental | lightning |  | UI-04 | missing | — | |
| `last-stand-knight` | Caballero Inquebrantable | magic | Humano | holy |  | UI-04 | missing | — | |
| `blood-hound` | Sabueso Sangriento | rare | Bestia | nature |  | UI-04 | missing | — | |
| `silence-monk` | Monje del Silencio | rare | Humano | holy |  | UI-04 | missing | — | |
| `sun-cleric` | Clériga Solar | common | Humano | holy |  | UI-04 | missing | — | |
| `clockwork-sentinel` | Centinela de Engranajes | common | Constructo | — |  | UI-04 | missing | — | |
| `venom-spider` | Araña Venenosa | rare | Bestia | nature |  | UI-04 | missing | — | |
| `phoenix-chick` | Cría de Fénix | rare | Elemental | fire |  | UI-04 | missing | — | |
| `iron-colossus` | Coloso de Hierro | magic | Constructo | — |  | UI-04 | missing | — | |
| `soul-thief` | Ladrona de Almas | magic | Humano | shadow |  | UI-04 | missing | — | |
| `wolf` | Lobo | basic | Bestia | nature | token | UI-04 | missing | — | |
| `bear-cub` | Osezno | basic | Bestia | nature | token | UI-04 | missing | — | |
| `toad` | Sapo | basic | Bestia | nature | token | UI-04 | missing | — | |
| `scrap-golem` | Gólem de Chatarra | basic | Constructo | — | token | UI-04 | missing | — | |
| `vampire-bat` | Murciélago Vampírico | common | No-muerto | shadow |  | UI-05 | missing | — | |
| `bone-wall` | Muralla de Huesos | rare | No-muerto | shadow |  | UI-05 | missing | — | |
| `hungry-ghoul` | Necrófago Hambriento | rare | No-muerto | shadow |  | UI-05 | missing | — | |
| `crypt-banshee` | Banshee de la Cripta | magic | No-muerto | shadow |  | UI-05 | missing | — | |
| `skeleton-king` | Rey de los Huesos | legendary | No-muerto | shadow |  | UI-05 | missing | — | |
| `ember-imp` | Diablillo de Brasas | common | Demonio | fire |  | UI-05 | missing | — | |
| `flame-wyrm` | Sierpe Flamígera | rare | Dragón | fire |  | UI-05 | missing | — | |
| `curse-weaver` | Tejedora de Maldiciones | magic | Demonio | shadow |  | UI-05 | missing | — | |
| `shadow-stalker` | Acechador Sombrío | common | Demonio | shadow |  | UI-05 | missing | — | |
| `ash-drake` | Draco de Ceniza | common | Dragón | fire |  | UI-05 | missing | — | |
| `storm-drake` | Draco de Tormenta | rare | Dragón | lightning |  | UI-05 | missing | — | |
| `larval-drake` | Larva de Dragón | magic | Dragón | fire |  | UI-05 | missing | — | |
| `mana-leech` | Sanguijuela de Maná | magic | Demonio | arcane |  | UI-05 | missing | — | |
| `vaelra` | Vaelra, Reina de la Escarcha | legendary | Dragón | ice |  | UI-05 | missing | — | |
| `nyxara` | Nyxara, Señora del Vacío | unique | Demonio | shadow |  | UI-05 | missing | — | |
| `skeleton` | Esqueleto | basic | No-muerto | shadow | token | UI-05 | missing | — | |
| `healing-touch` | Toque Sanador | basic | Hechizo | holy |  | UI-06 | missing | — | |
| `drain-life` | Drenar Vida | common | Hechizo | shadow |  | UI-06 | missing | — | |
| `savage-strike` | Zarpazo | common | Hechizo | nature |  | UI-06 | missing | — | |
| `pack-call` | Llamada de la Manada | common | Hechizo | nature |  | UI-06 | missing | — | |
| `wild-roar` | Rugido Salvaje | common | Hechizo | nature |  | UI-06 | missing | — | |
| `arcane-insight` | Intuición Arcana | common | Hechizo | arcane |  | UI-06 | missing | — | |
| `soul-harvest` | Cosecha de Almas | rare | Hechizo | shadow |  | UI-06 | missing | — | |
| `bone-storm` | Tormenta de Huesos | rare | Hechizo | shadow |  | UI-06 | missing | — | |
| `chain-lightning` | Rayo en Cadena | rare | Hechizo | lightning |  | UI-06 | missing | — | |
| `growing-crystal` | Cristal Creciente | magic | Hechizo | arcane |  | UI-06 | missing | — | |
| `ice-shard` | Fragmento de Hielo | common | Hechizo | ice |  | UI-06 | missing | — | |
| `blessing-of-light` | Bendición de la Luz | common | Hechizo | holy |  | UI-06 | missing | — | |
| `purify` | Purificar | common | Hechizo | holy |  | UI-06 | missing | — | |
| `shatter-armor` | Quebrar Armadura | common | Hechizo | shadow |  | UI-06 | missing | — | |
| `disarming-strike` | Golpe Desarmante | common | Hechizo | lightning |  | UI-06 | missing | — | |
| `stone-sleep` | Sueño de Piedra | rare | Hechizo | lightning |  | UI-06 | missing | — | |
| `aegis-ward` | Égida | rare | Hechizo | holy |  | UI-06 | missing | — | |
| `frozen-gale` | Vendaval Helado | magic | Hechizo | ice |  | UI-06 | missing | — | |
| `banish` | Destierro | common | Hechizo | shadow |  | UI-06 | missing | — | |
| `dark-pact` | Pacto Oscuro | common | Hechizo | shadow |  | UI-06 | missing | — | |
| `golem-forge` | Forja de Gólems | rare | Hechizo | arcane |  | UI-06 | missing | — | |
| `toad-hex` | Maleficio Batracio | rare | Hechizo | arcane |  | UI-06 | missing | — | |
| `raise-dead` | Alzar a los Muertos | rare | Hechizo | shadow |  | UI-06 | missing | — | |
| `arcane-echo` | Eco Arcano | rare | Hechizo | arcane |  | UI-06 | missing | — | |
| `mind-thrall` | Dominación Mental | magic | Hechizo | arcane |  | UI-06 | missing | — | |
| `mana-spark` | Chispa de Maná | basic | Hechizo | arcane | token | UI-06 | missing | — | |

Per phase: UI-03 pilots 8 · UI-04 humans/beasts/constructs/elementals 30 · UI-05 undead/demons/dragons 16 · UI-06 spells 26.
Premium (UI-05/UI-09 flagship sheet): `morvath`, `skeleton-king`, `ursaria`, `vaelra` (Legendaria), `ignis`, `nyxara` (Única).

## Skin (10 slots, ART_GUIDE §3)

| Key | ViewBox | Primitive | Phase | Status | Recipe | Notes |
|---|---|---|---|---|---|---|
| `card-back` | 0 0 360 500 | CardBack | UI-02 | registered | `scripts/cards-art/skin.mjs` (3951 B) | Violet lattice, magenta inner rim, symmetric 8-point star + hex gem emblem; reads at 40 px (star) and 300 px |
| `board-backdrop` | 0 0 1600 900 | BoardBackdrop | UI-02 | registered | `scripts/cards-art/skin.mjs` (4557 B) | Carved indigo slab, faint rune circle/hexagram at ≤5% contrast, vignette darkest at the edges |
| `frame-mob` | 0 0 360 500 | CardFrame (mob) | UI-02 | registered | `scripts/cards-art/skin.mjs` (3502 B) | Riveted violet armor: steel bezel around the art oval, notched name band, recessed text box |
| `frame-spell` | 0 0 360 500 | CardFrame (spell) | UI-02 | registered | `scripts/cards-art/skin.mjs` (4351 B) | Blue body, cyan rune ticks around the oval, sparkles, crescents and corner filigree — no rivets |
| `hero-mine` | 0 0 256 256 | HeroPortrait (mine) | UI-02 | registered | `scripts/cards-art/skin.mjs` (3098 B) | Violet carved rim with lilac rune studs; calm centre for the initial |
| `hero-foe` | 0 0 256 256 | HeroPortrait (foe) | UI-02 | registered | `scripts/cards-art/skin.mjs` (3004 B) | Crimson rim with inward spikes (shape differs from mine, not only hue); calm centre |
| `badge-gem` | 0 0 100 100 | CostBadge | UI-02 | registered | `scripts/cards-art/skin.mjs` (1076 B) | Hexagonal table-cut mana gem, 6 bezel facets lit from the upper left |
| `badge-diamond` | 0 0 100 100 | AttackBadge | UI-02 | registered | `scripts/cards-art/skin.mjs` (865 B) | Amber faceted diamond |
| `badge-drop` | 0 0 100 100 | HealthBadge | UI-02 | registered | `scripts/cards-art/skin.mjs` (1113 B) | Ruby drop, widest low; highlight upper left, number sits 12% low |
| `badge-circle` | 0 0 100 100 | Badge | UI-02 | registered | `scripts/cards-art/skin.mjs` (784 B) | Carved violet disc with a steel rim |
