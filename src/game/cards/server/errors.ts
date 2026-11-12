// Errors the match layer reports to HTTP clients (§13.2). Pure: no `server-only`, usable from tests and routes.
import { isEngineError } from "../engine/errors";
import { t, type MessageKey } from "../i18n";
import { es } from "../i18n/es";

export type ServiceErrorCode = keyof typeof es.matchErrors | keyof typeof es.errors;

/** An error with an HTTP status, a stable machine code and Spanish text for the player. */
export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string = errorText(code),
    /** Extra JSON fields for the response body (e.g. `{ matchId }` for `already_in_match`). */
    public readonly details: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function isServiceError(e: unknown): e is ServiceError {
  return e instanceof ServiceError;
}

/** Spanish text for a service or engine error code (service codes win); unknown codes fall back to a generic text. */
export function errorText(code: string): string {
  if (Object.prototype.hasOwnProperty.call(es.matchErrors, code)) return t(`matchErrors.${code}` as MessageKey);
  if (Object.prototype.hasOwnProperty.call(es.errors, code)) return t(`errors.${code}` as MessageKey);
  return t("auth.genericError");
}

/** Maps an engine rule violation to a 409; anything else (malformed input that slipped through) becomes a 400. */
export function fromEngineError(e: unknown, timedOut: boolean): ServiceError {
  if (isEngineError(e)) {
    // §21 Phase 8 H: a late command from the player whose turn just timed out.
    if (timedOut && e.code === "not_your_turn") return new ServiceError(409, e.code, errorText("time_up"));
    return new ServiceError(409, e.code, errorText(e.code));
  }
  return new ServiceError(400, "bad_request");
}
