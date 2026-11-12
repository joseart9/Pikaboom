import { t } from "@/game/cards/i18n";

/** Maps a Supabase Auth error (by `code`) to a Spanish message (§21 Phase 2 G.6). */
export function authErrorMessage(error: { code?: string; status?: number } | null | undefined): string {
  switch (error?.code) {
    case "invalid_credentials":
      return t("auth.invalidCredentials");
    case "email_not_confirmed":
      return t("auth.emailNotConfirmed");
    case "user_already_exists":
    case "email_exists":
      return t("auth.userExists");
    case "weak_password":
      return t("auth.weakPassword");
    case "same_password":
      return t("auth.samePassword");
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return t("auth.rateLimited");
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
      return t("auth.linkExpired");
    default:
      return error?.status === 429 ? t("auth.rateLimited") : t("auth.genericError");
  }
}
