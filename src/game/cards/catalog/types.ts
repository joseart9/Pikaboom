// Card catalog types (§9.2–§9.3). Cards are data: stats + keywords + abilities (trigger + conditions + effects).
// Names and texts are not here: they live in `es.cards[id]` (§17.8).
import type { StatusId } from "./statuses";

export type { StatusId };

// ── §9.2 Card definitions ──────────────────────────────────────────────────────────────────────────

/** Kebab-case English slug, e.g. "grave-digger". Never reused, never renamed. */
export type CardId = string;

/** Spanish labels live in `es.rarity`: basic=Básica, common=Normal, rare=Rara, magic=Mágica, legendary=Legendaria, unique=Única. */
export type Rarity = "basic" | "common" | "rare" | "magic" | "legendary" | "unique";
export type CardType = "mob" | "spell";
export type Tribe = "dragon" | "undead" | "beast" | "human" | "demon" | "elemental" | "construct";
export type CardSet = "core"; // future: expansions

export type KeywordId =
  | "taunt" | "shield" | "lifesteal" | "rush" | "charge" | "doubleStrike" | "berserk"
  | "thorns" | "cleave" | "regeneration" | "reborn"
  | "poison" | "stealth" | "divineShield" | "flying"; // last row: V1

export interface Keywords {
  taunt?: true;
  shield?: number; // initial charges (1..9)
  lifesteal?: number; // heal amount (1..20)
  rush?: true;
  charge?: true;
  doubleStrike?: true;
  berserk?: { percent: number; attack: number }; // percent 1..99, attack 1..20
  thorns?: number;
  cleave?: true;
  regeneration?: number;
  reborn?: true;
  poison?: true; // V1
  stealth?: true; // V1
  divineShield?: true; // V1
  flying?: true; // V1
}

interface CardDefBase {
  id: CardId;
  version: number; // starts at 1; bump on ANY gameplay change (§11)
  type: CardType;
  set: CardSet;
  cost: number; // 0..20
  rarity: Rarity;
  collectible: boolean; // false for tokens (Esqueleto, Chispa de Maná)
  art: string; // asset key, e.g. "grave-digger" → resolved by the skin's art resolver
  abilities: AbilityDef[]; // may be empty
}

export interface MobCardDef extends CardDefBase {
  type: "mob";
  attack: number; // 0..30
  health: number; // 1..30
  tribes: Tribe[]; // 0..2 entries
  keywords: Keywords;
}

export interface SpellCardDef extends CardDefBase {
  type: "spell"; // must have exactly one ability with trigger { on: "play" }
}

export type CardDef = MobCardDef | SpellCardDef;

// ── §9.3 Abilities, triggers, conditions, selectors, effects ───────────────────────────────────────

export type Side = "friendly" | "enemy" | "any"; // relative to the ability's controller
export type Whose = "own" | "enemy" | "any"; // whose turn
export type Group =
  | "friendlyMobs" | "enemyMobs" | "allMobs"
  | "friendlyCharacters" | "enemyCharacters" | "allCharacters"; // characters = mobs + hero

export interface UnitFilter {
  tribe?: Tribe;
  minAttack?: number;
  maxAttack?: number;
  maxCost?: number; // cost of the unit's card def
  damaged?: boolean; // true: currentHealth < maxHealth
  hasKeyword?: KeywordId;
  hasStatus?: StatusId; // V1
  defId?: CardId;
}
// A filter never matches heroes except: `damaged` (hero health < max). Other fields exclude heroes.

export interface AbilityDef {
  id: string; // unique within the card: "battlecry", "deathrattle", "aura", "onKill"...
  trigger: TriggerDef;
  target?: TargetSpec; // only allowed when trigger.on === "play"
  conditions?: ConditionDef[]; // all must pass (AND). Evaluated at resolution time.
  effects: EffectDef[]; // executed in order
  limit?: { perTurn?: number; perGame?: number };
}

export interface TargetSpec {
  group: Group;
  filter?: UnitFilter;
} // the player's chosen target

export type TriggerDef =
  | { on: "play" } // Grito de Guerra / spell cast (from hand only)
  | { on: "summoned" } // self entered the board, any cause
  | { on: "death" } // Último Aliento
  | { on: "attack" } // self declared an attack (before damage)
  | { on: "attacked" } // self was chosen as attack target (before damage)
  | { on: "damageDealt"; combatOnly?: boolean } // self dealt >0 damage ("after a successful hit")
  | { on: "damageTaken" } // self took >0 damage
  | { on: "kill" } // a unit last damaged by self died
  | { on: "healthThreshold"; percent: number } // Resistencia Final: crossed to <= percent, survived; once per life
  | { on: "turnStart"; whose: Whose }
  | { on: "turnEnd"; whose: Whose }
  | { on: "healed" } // self was healed (>0)
  | { on: "cardDrawn"; whose: Whose }
  | { on: "spellCast"; whose: Whose }
  | { on: "otherSummoned"; side: Side; filter?: UnitFilter }
  | { on: "otherDied"; side: Side; filter?: UnitFilter };

export type TriggerOn = TriggerDef["on"];

export type Subject = "self" | "chosen" | "eventSource" | "eventTarget";

export type ConditionDef =
  | { kind: "unitMatches"; subject: Subject; filter: UnitFilter }
  | { kind: "isFriendly"; subject: Subject }
  | { kind: "isEnemy"; subject: Subject }
  | { kind: "countAtLeast"; selector: Selector; min: number } // e.g. controller has >= 3 mobs
  | { kind: "healthPercent"; subject: Subject; op: "lte" | "gte"; percent: number }
  | { kind: "diedThisGame"; side: Side; min: number; filter?: { tribe?: Tribe } }
  | { kind: "playedThisTurn"; side: Side; cardType?: CardType; min: number }
  | { kind: "heroHealth"; side: Side; op: "lte" | "gte"; value: number }
  | { kind: "hasStatus"; subject: Subject; status: StatusId } // V1
  | { kind: "not"; condition: ConditionDef }
  | { kind: "anyOf"; conditions: ConditionDef[] };

export type Selector =
  | { kind: "self" }
  | { kind: "chosen" }
  | { kind: "eventSource" }
  | { kind: "eventTarget" }
  | { kind: "hero"; side: "friendly" | "enemy" }
  | { kind: "all"; group: Group; filter?: UnitFilter; excludeSelf?: boolean; excludeChosen?: boolean }
  | { kind: "random"; group: Group; count: number; filter?: UnitFilter; excludeSelf?: boolean; excludeChosen?: boolean } // distinct picks (no repeats); fewer candidates ⇒ all of them
  | { kind: "adjacent"; of: "self" | "chosen" | "eventTarget" };

export type Amount =
  | number
  | { from: "count"; selector: Selector; multiplier?: number } // e.g. 1 per friendly Undead
  | { from: "eventAmount" }; // damage/heal amount of the triggering event

export type SummonPosition = "auto" | "end"; // "auto" = rules of §6.9 (right of source / dead slot / end)

export type EffectDef =
  // ── MVP (Phases 6–7) ──
  | { type: "damage"; amount: Amount; to: Selector }
  | { type: "heal"; amount: Amount; to: Selector }
  | { type: "summon"; card: CardId; count: number; side?: "friendly" | "enemy"; position?: SummonPosition; overflow?: boolean }
  | { type: "destroy"; to: Selector }
  | { type: "draw"; count: Amount; side?: "friendly" | "enemy" }
  | { type: "addToHand"; card: CardId; count: number; side?: "friendly" | "enemy" }
  | { type: "buff"; to: Selector; attack?: number; health?: number; duration?: "permanent" | "thisTurn" } // negatives = debuff
  | { type: "grantKeyword"; to: Selector; keyword: KeywordId; value?: number }
  | { type: "gainMana"; side?: "friendly" | "enemy"; amount: number; kind: "temporary" | "current" | "max" | "emptyMax" }
  | { type: "if"; condition: ConditionDef; then: EffectDef[]; else?: EffectDef[] }
  // ── V1 (Phases 18–19) ──
  | { type: "silence"; to: Selector }
  | { type: "applyStatus"; to: Selector; status: StatusId; duration?: number; magnitude?: number }
  | { type: "removeStatus"; to: Selector; status: StatusId | "allNegative" | "all" }
  | { type: "transform"; to: Selector; card: CardId }
  | { type: "resurrect"; side?: "friendly" | "enemy"; count: number; filter?: { tribe?: Tribe } }
  | { type: "returnToHand"; to: Selector }
  | { type: "changeControl"; to: Selector }
  | { type: "copyToHand"; to: Selector; side?: "friendly" | "enemy" } // copy of a unit's card
  | { type: "stealFromHand"; count: number } // Ladrón: random card(s) from enemy hand
  | { type: "modifyMana"; side: "friendly" | "enemy"; current?: number; max?: number }; // Drenar maná (negative)

export type EffectType = EffectDef["type"];

/** Effect types implemented for the MVP (Phases 6–7). Anything else is V1 (Phases 18–19). */
export const MVP_EFFECT_TYPES: readonly EffectType[] = [
  "damage", "heal", "summon", "destroy", "draw", "addToHand", "buff", "grantKeyword", "gainMana", "if",
];
