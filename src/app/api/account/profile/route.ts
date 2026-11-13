import { t } from "@/game/cards/i18n";
import { AuthError, UsernameError, ensureProfile, requireUser, updateUsername } from "@/lib/auth";
import { logServerError } from "@/lib/logError";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_PROFILE_BODY_BYTES = 1024;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE });
}

function errorResponse(e: unknown) {
  if (e instanceof AuthError) return json({ error: t("auth.loginToPlay") }, 401);
  if (e instanceof UsernameError) {
    return e.code === "taken" ? json({ error: t("auth.usernameTaken") }, 409) : json({ error: t("auth.usernameInvalid") }, 400);
  }
  logServerError("api/account/profile", e);
  return json({ error: t("auth.genericError") }, 503);
}

/** The signed-in user's profile (created on first call). */
export async function GET() {
  try {
    const user = await requireUser();
    return json({ profile: await ensureProfile(user) });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Rename. Body: `{ username }`. 400 invalid, 409 taken (case-insensitive). */
export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    // Same body rules as the card routes (Phase 21, §19.2 / T15): JSON content type only (cross-site forms cannot
    // send it without a CORS preflight) and a small size cap.
    const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (type !== "application/json") return json({ error: t("auth.genericError") }, 415);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_PROFILE_BODY_BYTES) return json({ error: t("auth.genericError") }, 413);
    let body: { username?: unknown } | null = null;
    try {
      body = JSON.parse(text) as { username?: unknown } | null;
    } catch {
      body = null; // malformed → `updateUsername` rejects the missing name with 400
    }
    await ensureProfile(user);
    return json({ profile: await updateUsername(user.id, body?.username) });
  } catch (e) {
    return errorResponse(e);
  }
}
