// Rule violations the engine reports to players (§10.2). Each code has Spanish text in `es.errors[code]`.

export const ENGINE_ERROR_CODES = [
  "not_your_turn",
  "wrong_phase",
  "card_not_in_hand",
  "not_enough_mana",
  "board_full",
  "invalid_position",
  "target_required",
  "invalid_target",
  "no_valid_targets",
  "unexpected_target",
  "unit_not_found",
  "cannot_attack",
  "summoning_sick",
  "rush_no_hero",
  "must_attack_taunt",
  "already_mulliganed",
  "invalid_mulligan",
  "game_over",
  "not_supported",
] as const;

export type EngineErrorCode = (typeof ENGINE_ERROR_CODES)[number];

/** Thrown for illegal commands. The input state is never modified (applyCommand works on a clone). */
export class EngineError extends Error {
  constructor(
    public readonly code: EngineErrorCode,
    public readonly params: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = "EngineError";
  }
}

export function isEngineError(e: unknown): e is EngineError {
  return e instanceof EngineError;
}
