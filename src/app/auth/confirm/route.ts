import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { ensureProfile } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { createClient } from "@/lib/server";

export const dynamic = "force-dynamic";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Landing for email links (sign-up confirmation, password recovery).
 * `token_hash` + `type` → verifyOtp (dashboard email templates), or `code` → PKCE exchange (default links).
 * On success the session cookies are set and the user goes to a safe `next`; otherwise to the login with an error.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const next = safeNext(params.get("next"));

  const supabase = await createClient();
  let user: { id: string; email?: string; user_metadata?: { username?: unknown } } | null = null;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) user = data.user;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) user = data.user;
  }

  if (!user) return NextResponse.redirect(new URL("/auth/login?error=link", request.url), 303);

  // Reserve the chosen username as early as possible; failures are retried lazily on the next visit.
  try {
    const username = user.user_metadata?.username;
    await ensureProfile({
      id: user.id,
      email: user.email ?? null,
      username: typeof username === "string" ? username : undefined,
    });
  } catch (e) {
    console.error("auth/confirm: ensureProfile failed", e);
  }

  return NextResponse.redirect(new URL(next, request.url), 303);
}
