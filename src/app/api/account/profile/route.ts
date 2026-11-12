import { t } from "@/game/cards/i18n";
import { AuthError, UsernameError, ensureProfile, requireUser, updateUsername } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE });
}

function errorResponse(e: unknown) {
  if (e instanceof AuthError) return json({ error: t("auth.loginToPlay") }, 401);
  if (e instanceof UsernameError) {
    return e.code === "taken" ? json({ error: t("auth.usernameTaken") }, 409) : json({ error: t("auth.usernameInvalid") }, 400);
  }
  console.error("api/account/profile:", e);
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
    const body = (await request.json().catch(() => null)) as { username?: unknown } | null;
    await ensureProfile(user);
    return json({ profile: await updateUsername(user.id, body?.username) });
  } catch (e) {
    return errorResponse(e);
  }
}
