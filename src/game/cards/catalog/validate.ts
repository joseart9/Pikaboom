// Catalog validator (§9.6). Returns human-readable English errors; an empty array means the catalog is valid.
// Rule 10: effect types must have an engine handler (`IMPLEMENTED_EFFECT_TYPES` from engine/effects/execute, which
// grows phase by phase: `if` from Phase 7, V1 effects from Phases 18-19). Rule 11 (no tokens in starter decks) is
// checked by the starter-deck test. Everything else here is structural: no engine execution.
import { IMPLEMENTED_CONDITION_KINDS } from "../engine/effects/conditions";
import { IMPLEMENTED_EFFECT_TYPES } from "../engine/effects/execute";
import type { CardDictionary } from "../i18n";
import { KEYWORDS } from "./keywords";
import { STATUS_DEFS } from "./statuses";
import type {
  AbilityDef,
  Amount,
  CardDef,
  CardId,
  ConditionDef,
  EffectDef,
  EffectType,
  Group,
  KeywordId,
  Keywords,
  Selector,
  TriggerOn,
  UnitFilter,
} from "./types";

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RARITIES = ["basic", "common", "rare", "magic", "legendary", "unique"];
const TRIBES = ["dragon", "undead", "beast", "human", "demon", "elemental", "construct"];
const GROUPS: Group[] = ["friendlyMobs", "enemyMobs", "allMobs", "friendlyCharacters", "enemyCharacters", "allCharacters"];
const SIDES = ["friendly", "enemy", "any"];
const WHOSE = ["own", "enemy", "any"];
const PLAYER_SIDES = ["friendly", "enemy"];
const TRIGGERS: TriggerOn[] = [
  "play", "summoned", "death", "attack", "attacked", "damageDealt", "damageTaken", "kill", "healthThreshold",
  "turnStart", "turnEnd", "healed", "cardDrawn", "spellCast", "otherSummoned", "otherDied",
];
/** Triggers whose event gives `eventSource` / `eventTarget` / `eventAmount` a meaning (§9.6 rule 7). */
const EVENT_TRIGGERS: TriggerOn[] = [
  "otherSummoned", "otherDied", "damageDealt", "damageTaken", "attack", "attacked", "healed", "kill",
];
const MAX_IF_DEPTH = 3;
const MAX_COUNT = 7;
const MAX_AMOUNT = 30;

/** Keyword value ranges for numeric keywords (§9.2). */
const KEYWORD_RANGES: Partial<Record<KeywordId, [number, number]>> = {
  shield: [1, 9],
  lifesteal: [1, 20],
  thorns: [1, 20],
  regeneration: [1, 20],
};

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

interface AbilityScope {
  hasTarget: boolean;
  trigger: TriggerOn;
}

export interface ValidateOptions {
  /** Effect types the engine implements (rule 10). Defaults to the engine's handler list. */
  implementedEffects?: readonly EffectType[];
  /** Condition kinds the engine evaluates (same idea as rule 10; `hasStatus` arrives in Phase 18). */
  implementedConditions?: readonly ConditionDef["kind"][];
}

export function validateCatalog(defs: Readonly<Record<CardId, CardDef>>, dict: CardDictionary, options: ValidateOptions = {}): string[] {
  const implemented: readonly string[] = options.implementedEffects ?? IMPLEMENTED_EFFECT_TYPES;
  const implementedConditions: readonly string[] = options.implementedConditions ?? IMPLEMENTED_CONDITION_KINDS;
  const errors: string[] = [];
  const seenIds = new Set<string>();

  const cardExists = (id: unknown): id is CardId => typeof id === "string" && has(defs, id);

  for (const [key, def] of Object.entries(defs)) {
    const where = `card "${key}"`;
    const err = (msg: string) => errors.push(`${where}: ${msg}`);

    // Rule 1 — id format, uniqueness, key match.
    if (typeof def.id !== "string" || !ID_RE.test(def.id)) err(`id ${JSON.stringify(def.id)} is not kebab-case`);
    if (def.id !== key) err(`id "${def.id}" does not match its record key`);
    if (seenIds.has(def.id)) err(`duplicate id "${def.id}"`);
    seenIds.add(def.id);

    // Rule 2 — base numbers.
    if (!isInt(def.version, 1, Number.MAX_SAFE_INTEGER)) err(`version must be an integer >= 1`);
    if (!isInt(def.cost, 0, 20)) err(`cost must be an integer 0..20`);
    if (!RARITIES.includes(def.rarity)) err(`unknown rarity "${def.rarity}"`);
    if (def.set !== "core") err(`unknown set "${def.set}"`);
    if (typeof def.collectible !== "boolean") err(`collectible must be a boolean`);
    if (typeof def.art !== "string" || def.art.length === 0) err(`art key is missing`);
    if (!Array.isArray(def.abilities)) {
      err(`abilities must be an array`);
      continue;
    }

    if (def.type === "mob") {
      if (!isInt(def.attack, 0, 30)) err(`attack must be an integer 0..30`);
      if (!isInt(def.health, 1, 30)) err(`health must be an integer 1..30`);
      if (!Array.isArray(def.tribes) || def.tribes.length > 2) err(`tribes must have at most 2 entries`);
      else {
        for (const t of def.tribes) if (!TRIBES.includes(t)) err(`unknown tribe "${t}"`);
        if (new Set(def.tribes).size !== def.tribes.length) err(`duplicate tribe`);
      }
      // Rule 3 — keyword values.
      checkKeywords(def.keywords, err);
    } else if (def.type === "spell") {
      // Rule 4 — spells: exactly one ability, cast on play.
      if (def.abilities.length !== 1) err(`spell must have exactly one ability (has ${def.abilities.length})`);
      else if (def.abilities[0]?.trigger?.on !== "play") err(`spell ability must trigger on "play"`);
    } else {
      err(`unknown card type "${(def as { type: unknown }).type}"`);
      continue;
    }

    // Rule 13 — ability ids unique; rule 5 — at most one targeted ability.
    const abilityIds = new Set<string>();
    let targeted = 0;
    def.abilities.forEach((ability, i) => {
      const aWhere = `ability ${typeof ability?.id === "string" && ability.id ? `"${ability.id}"` : `#${i}`}`;
      if (typeof ability?.id !== "string" || ability.id.length === 0) err(`${aWhere}: missing id`);
      else if (abilityIds.has(ability.id)) err(`${aWhere}: duplicate ability id`);
      else abilityIds.add(ability.id);
      if (ability?.target) targeted++;
      checkAbility(ability, (msg) => err(`${aWhere}: ${msg}`));
    });
    if (targeted > 1) err(`at most one ability may have a target (has ${targeted})`);

    // Rule 12 — dictionary entry.
    const entry = has(dict, key) ? dict[key] : undefined;
    if (!entry || typeof entry.name !== "string" || entry.name.length === 0) err(`missing dictionary name`);
    if (!entry || typeof entry.text !== "string") err(`missing dictionary text`);
  }
  return errors;

  // ── helpers (closures over `defs`) ──

  function checkKeywords(keywords: Keywords, err: (msg: string) => void) {
    if (!keywords || typeof keywords !== "object") return err(`keywords must be an object`);
    for (const [k, v] of Object.entries(keywords) as [KeywordId, unknown][]) {
      if (!has(KEYWORDS, k)) {
        err(`unknown keyword "${k}"`);
        continue;
      }
      if (k === "berserk") {
        const b = v as { percent?: unknown; attack?: unknown } | null;
        if (!b || typeof b !== "object") err(`berserk must be { percent, attack }`);
        else {
          if (!isInt(b.percent, 1, 99)) err(`berserk.percent must be an integer 1..99`);
          if (!isInt(b.attack, 1, 20)) err(`berserk.attack must be an integer 1..20`);
        }
      } else if (KEYWORDS[k].hasValue) {
        const [min, max] = KEYWORD_RANGES[k] ?? [1, 20];
        if (!isInt(v, min, max)) err(`keyword ${k} must be an integer ${min}..${max}`);
      } else if (v !== true) {
        err(`keyword ${k} must be true`);
      }
    }
  }

  function checkAbility(ability: AbilityDef, err: (msg: string) => void) {
    if (!ability || typeof ability !== "object") return err(`not an object`);
    const on = ability.trigger?.on;
    if (!TRIGGERS.includes(on)) return err(`unknown trigger "${String(on)}"`);
    const trigger = ability.trigger;
    if (trigger.on === "healthThreshold" && !isInt(trigger.percent, 1, 99)) err(`healthThreshold percent must be 1..99`);
    if ((trigger.on === "turnStart" || trigger.on === "turnEnd" || trigger.on === "cardDrawn" || trigger.on === "spellCast") &&
      !WHOSE.includes(trigger.whose)) {
      err(`trigger ${trigger.on} needs whose own|enemy|any`);
    }
    if (trigger.on === "otherSummoned" || trigger.on === "otherDied") {
      if (!SIDES.includes(trigger.side)) err(`trigger ${trigger.on} needs side friendly|enemy|any`);
      if (trigger.filter) checkFilter(trigger.filter, (m) => err(`trigger filter: ${m}`));
    }

    const scope: AbilityScope = { hasTarget: !!ability.target, trigger: on };

    // Rule 5 — target only on play abilities.
    if (ability.target) {
      if (on !== "play") err(`target is only allowed on "play" abilities (trigger is "${on}")`);
      if (!GROUPS.includes(ability.target.group)) err(`target has unknown group "${ability.target.group}"`);
      if (ability.target.filter) checkFilter(ability.target.filter, (m) => err(`target filter: ${m}`));
    }

    // Rule 9 — limits.
    if (ability.limit !== undefined) {
      const { perTurn, perGame } = ability.limit;
      if (perTurn === undefined && perGame === undefined) err(`limit must set perTurn and/or perGame`);
      if (perTurn !== undefined && !isInt(perTurn, 1, 99)) err(`limit.perTurn must be an integer >= 1`);
      if (perGame !== undefined && !isInt(perGame, 1, 99)) err(`limit.perGame must be an integer >= 1`);
    }

    for (const [i, c] of (ability.conditions ?? []).entries()) checkCondition(c, scope, (m) => err(`condition #${i}: ${m}`));

    if (!Array.isArray(ability.effects) || ability.effects.length === 0) return err(`must have at least one effect`);
    ability.effects.forEach((e, i) => checkEffect(e, scope, 1, (m) => err(`effect #${i} (${String(e?.type)}): ${m}`)));
  }

  function checkSubject(subject: unknown, scope: AbilityScope, err: (msg: string) => void) {
    if (subject === "self") return;
    if (subject === "chosen") {
      if (!scope.hasTarget) err(`"chosen" used in an ability without target`); // rule 6
      return;
    }
    if (subject === "eventSource" || subject === "eventTarget") {
      if (!EVENT_TRIGGERS.includes(scope.trigger)) err(`"${subject}" used with trigger "${scope.trigger}"`); // rule 7
      return;
    }
    err(`unknown subject ${JSON.stringify(subject)}`);
  }

  function checkFilter(filter: UnitFilter, err: (msg: string) => void) {
    if (!filter || typeof filter !== "object") return err(`filter must be an object`);
    const known = ["tribe", "minAttack", "maxAttack", "maxCost", "damaged", "hasKeyword", "hasStatus", "defId"];
    for (const k of Object.keys(filter)) if (!known.includes(k)) err(`unknown filter field "${k}"`);
    if (filter.tribe !== undefined && !TRIBES.includes(filter.tribe)) err(`unknown tribe "${filter.tribe}"`);
    for (const k of ["minAttack", "maxAttack", "maxCost"] as const) {
      if (filter[k] !== undefined && !isInt(filter[k], 0, MAX_AMOUNT)) err(`${k} must be an integer 0..${MAX_AMOUNT}`);
    }
    if (filter.damaged !== undefined && typeof filter.damaged !== "boolean") err(`damaged must be a boolean`);
    if (filter.hasKeyword !== undefined && !has(KEYWORDS, filter.hasKeyword)) err(`unknown keyword "${filter.hasKeyword}"`);
    if (filter.hasStatus !== undefined && !has(STATUS_DEFS, filter.hasStatus)) err(`unknown status "${filter.hasStatus}"`);
    if (filter.defId !== undefined && !cardExists(filter.defId)) err(`unknown card "${filter.defId}"`); // rule 8
  }

  function checkSelector(sel: Selector, scope: AbilityScope, err: (msg: string) => void) {
    if (!sel || typeof sel !== "object") return err(`selector must be an object`);
    switch (sel.kind) {
      case "self":
        return;
      case "chosen":
      case "eventSource":
      case "eventTarget":
        return checkSubject(sel.kind, scope, err);
      case "hero":
        if (!PLAYER_SIDES.includes(sel.side)) err(`hero selector needs side friendly|enemy`);
        return;
      case "all":
      case "random":
        if (!GROUPS.includes(sel.group)) err(`unknown group "${sel.group}"`);
        if (sel.filter) checkFilter(sel.filter, (m) => err(`selector filter: ${m}`));
        if (sel.excludeChosen && !scope.hasTarget) err(`excludeChosen used in an ability without target`); // rule 6
        if (sel.kind === "random" && !isInt(sel.count, 1, MAX_COUNT)) err(`random.count must be 1..${MAX_COUNT}`); // rule 9
        return;
      case "adjacent":
        if (sel.of === "self") return;
        if (sel.of === "chosen" || sel.of === "eventTarget") return checkSubject(sel.of, scope, err);
        return err(`adjacent.of must be self|chosen|eventTarget`);
      default:
        return err(`unknown selector kind "${String((sel as { kind: unknown }).kind)}"`);
    }
  }

  function checkAmount(amount: Amount, scope: AbilityScope, err: (msg: string) => void, min = 0, max = MAX_AMOUNT) {
    if (typeof amount === "number") {
      if (!isInt(amount, min, max)) err(`amount must be an integer ${min}..${max}`);
      return;
    }
    if (!amount || typeof amount !== "object") return err(`amount must be a number or an object`);
    if (amount.from === "count") {
      checkSelector(amount.selector, scope, err);
      if (amount.multiplier !== undefined && !isInt(amount.multiplier, 1, 10)) err(`multiplier must be 1..10`);
    } else if (amount.from === "eventAmount") {
      if (!EVENT_TRIGGERS.includes(scope.trigger)) err(`eventAmount used with trigger "${scope.trigger}"`); // rule 7
    } else {
      err(`unknown amount source`);
    }
  }

  function checkCondition(c: ConditionDef, scope: AbilityScope, err: (msg: string) => void) {
    if (!c || typeof c !== "object") return err(`condition must be an object`);
    if (typeof c.kind === "string" && !implementedConditions.includes(c.kind)) err(`condition kind "${c.kind}" is not implemented by the engine yet`);
    switch (c.kind) {
      case "unitMatches":
        checkSubject(c.subject, scope, err);
        return checkFilter(c.filter, err);
      case "isFriendly":
      case "isEnemy":
        return checkSubject(c.subject, scope, err);
      case "countAtLeast":
        checkSelector(c.selector, scope, err);
        if (!isInt(c.min, 0, MAX_AMOUNT)) err(`min must be an integer >= 0`);
        return;
      case "healthPercent":
        checkSubject(c.subject, scope, err);
        if (c.op !== "lte" && c.op !== "gte") err(`op must be lte|gte`);
        if (!isInt(c.percent, 1, 100)) err(`percent must be 1..100`);
        return;
      case "diedThisGame":
        if (!SIDES.includes(c.side)) err(`unknown side "${c.side}"`);
        if (!isInt(c.min, 1, MAX_AMOUNT)) err(`min must be an integer >= 1`);
        if (c.filter?.tribe !== undefined && !TRIBES.includes(c.filter.tribe)) err(`unknown tribe "${c.filter.tribe}"`);
        return;
      case "playedThisTurn":
        if (!SIDES.includes(c.side)) err(`unknown side "${c.side}"`);
        if (c.cardType !== undefined && c.cardType !== "mob" && c.cardType !== "spell") err(`unknown cardType`);
        if (!isInt(c.min, 1, MAX_AMOUNT)) err(`min must be an integer >= 1`);
        return;
      case "heroHealth":
        if (!SIDES.includes(c.side)) err(`unknown side "${c.side}"`);
        if (c.op !== "lte" && c.op !== "gte") err(`op must be lte|gte`);
        if (!isInt(c.value, 0, 99)) err(`value must be an integer 0..99`);
        return;
      case "hasStatus":
        checkSubject(c.subject, scope, err);
        if (!has(STATUS_DEFS, c.status)) err(`unknown status "${c.status}"`);
        return;
      case "not":
        return checkCondition(c.condition, scope, (m) => err(`not: ${m}`));
      case "anyOf":
        if (!Array.isArray(c.conditions) || c.conditions.length === 0) return err(`anyOf needs conditions`);
        c.conditions.forEach((sub, i) => checkCondition(sub, scope, (m) => err(`anyOf #${i}: ${m}`)));
        return;
      default:
        return err(`unknown condition kind "${String((c as { kind: unknown }).kind)}"`);
    }
  }

  function checkSide(side: unknown, err: (msg: string) => void) {
    if (side !== undefined && !PLAYER_SIDES.includes(side as string)) err(`side must be friendly|enemy`);
  }

  function checkEffect(e: EffectDef, scope: AbilityScope, depth: number, err: (msg: string) => void) {
    if (!e || typeof e !== "object") return err(`effect must be an object`);
    if (typeof e.type === "string" && !implemented.includes(e.type)) err(`effect type "${e.type}" is not implemented by the engine yet`); // rule 10
    switch (e.type) {
      case "damage":
      case "heal":
        checkAmount(e.amount, scope, err);
        return checkSelector(e.to, scope, err);
      case "summon":
        if (!cardExists(e.card)) err(`unknown card "${e.card}"`); // rule 8
        else if (defs[e.card].type !== "mob") err(`summoned card "${e.card}" is not a mob`);
        if (!isInt(e.count, 1, MAX_COUNT)) err(`count must be 1..${MAX_COUNT}`); // rule 9
        checkSide(e.side, err);
        if (e.position !== undefined && e.position !== "auto" && e.position !== "end") err(`position must be auto|end`);
        if (e.overflow !== undefined && typeof e.overflow !== "boolean") err(`overflow must be a boolean`);
        return;
      case "destroy":
      case "silence":
      case "returnToHand":
      case "changeControl":
        return checkSelector(e.to, scope, err);
      case "draw":
        checkAmount(e.count, scope, err, 1, MAX_COUNT);
        return checkSide(e.side, err);
      case "addToHand":
        if (!cardExists(e.card)) err(`unknown card "${e.card}"`);
        if (!isInt(e.count, 1, MAX_COUNT)) err(`count must be 1..${MAX_COUNT}`);
        return checkSide(e.side, err);
      case "buff":
        checkSelector(e.to, scope, err);
        if (e.attack === undefined && e.health === undefined) err(`buff needs attack and/or health`);
        if (e.attack !== undefined && !isInt(e.attack, -MAX_AMOUNT, MAX_AMOUNT)) err(`attack must be an integer`);
        if (e.health !== undefined && !isInt(e.health, -MAX_AMOUNT, MAX_AMOUNT)) err(`health must be an integer`);
        if (e.duration !== undefined && e.duration !== "permanent" && e.duration !== "thisTurn") err(`unknown duration`);
        return;
      case "grantKeyword": {
        checkSelector(e.to, scope, err);
        if (!has(KEYWORDS, e.keyword)) return err(`unknown keyword "${e.keyword}"`);
        if (e.keyword === "berserk") return err(`berserk cannot be granted (needs percent and attack)`);
        if (KEYWORDS[e.keyword].hasValue) {
          const [min, max] = KEYWORD_RANGES[e.keyword] ?? [1, 20];
          if (!isInt(e.value, min, max)) err(`keyword ${e.keyword} needs value ${min}..${max}`);
        } else if (e.value !== undefined) {
          err(`keyword ${e.keyword} takes no value`);
        }
        return;
      }
      case "gainMana":
        checkSide(e.side, err);
        if (!isInt(e.amount, 1, 10)) err(`amount must be 1..10`);
        if (!["temporary", "current", "max", "emptyMax"].includes(e.kind)) err(`unknown mana kind "${e.kind}"`);
        return;
      case "if":
        if (depth > MAX_IF_DEPTH) return err(`"if" nested deeper than ${MAX_IF_DEPTH}`); // rule 9
        checkCondition(e.condition, scope, (m) => err(`if condition: ${m}`));
        if (!Array.isArray(e.then)) return err(`if.then must be an array`);
        e.then.forEach((sub, i) => checkEffect(sub, scope, depth + 1, (m) => err(`then #${i} (${String(sub?.type)}): ${m}`)));
        (e.else ?? []).forEach((sub, i) =>
          checkEffect(sub, scope, depth + 1, (m) => err(`else #${i} (${String(sub?.type)}): ${m}`)),
        );
        return;
      case "applyStatus":
        checkSelector(e.to, scope, err);
        if (!has(STATUS_DEFS, e.status)) err(`unknown status "${e.status}"`);
        if (e.duration !== undefined && !isInt(e.duration, 1, 10)) err(`duration must be 1..10`);
        if (e.magnitude !== undefined && !isInt(e.magnitude, 1, MAX_AMOUNT)) err(`magnitude must be 1..${MAX_AMOUNT}`);
        return;
      case "removeStatus":
        checkSelector(e.to, scope, err);
        if (e.status !== "all" && e.status !== "allNegative" && !has(STATUS_DEFS, e.status)) err(`unknown status "${e.status}"`);
        return;
      case "transform":
        checkSelector(e.to, scope, err);
        if (!cardExists(e.card)) err(`unknown card "${e.card}"`); // rule 8
        else if (defs[e.card].type !== "mob") err(`transform card "${e.card}" is not a mob`);
        return;
      case "resurrect":
        checkSide(e.side, err);
        if (!isInt(e.count, 1, MAX_COUNT)) err(`count must be 1..${MAX_COUNT}`);
        if (e.filter?.tribe !== undefined && !TRIBES.includes(e.filter.tribe)) err(`unknown tribe "${e.filter.tribe}"`);
        return;
      case "copyToHand":
        checkSelector(e.to, scope, err);
        return checkSide(e.side, err);
      case "stealFromHand":
        if (!isInt(e.count, 1, MAX_COUNT)) err(`count must be 1..${MAX_COUNT}`);
        return;
      case "modifyMana":
        if (!PLAYER_SIDES.includes(e.side)) err(`side must be friendly|enemy`);
        if (e.current === undefined && e.max === undefined) err(`modifyMana needs current and/or max`);
        if (e.current !== undefined && !isInt(e.current, -10, 10)) err(`current must be -10..10`);
        if (e.max !== undefined && !isInt(e.max, -10, 10)) err(`max must be -10..10`);
        return;
      default:
        return err(`unknown effect type "${String((e as { type: unknown }).type)}"`);
    }
  }
}
