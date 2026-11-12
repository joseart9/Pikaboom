// Public engine API. Pure TypeScript: no React, Next, DB, clock or ambient randomness (ADR-04).

/** Bump when rule code changes behavior; replays of older versions are refused (§11). */
export const ENGINE_VERSION = 1;

export { applyCommand } from "./apply";
export { createMatch } from "./setup";
export { defsClosure } from "./defs";
export { getLegalActions } from "./legal";
export { EngineError, ENGINE_ERROR_CODES, isEngineError, type EngineErrorCode } from "./errors";
export { heroId, otherSeat, seatOfHero } from "./ids";
export { getAttack, getHealth, getMaxHealth, isSleeping } from "./stats";
export { hasKeyword, keywordValue, maxAttacks } from "./keywords";
export { attackTargets, canAttack } from "./combat";
export type { DamageInstance, DamageResult } from "./damage";
export { EFFECT_HANDLERS, IMPLEMENTED_EFFECT_TYPES, runEffects } from "./effects/execute";
export { groupMembers, matchesFilter, resolveSelector, validTargets } from "./effects/selectors";
export type { AbilityContext } from "./effects/context";
export { checkCondition, checkConditions, IMPLEMENTED_CONDITION_KINDS } from "./effects/conditions";
export { listenersInBoardOrder, triggerMatches } from "./triggers";
export { playTargets } from "./play";
export { snapshotUnit } from "./board";
export { LOG_LIMIT } from "./ctx";
export type { EngineCommand, GameCommand, SystemCommand } from "./commands";
export type { EventPayload, GameEvent, GameEventType, UnitSnapshot } from "./events";
export type * from "./types";
