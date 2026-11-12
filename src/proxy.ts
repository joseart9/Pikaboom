import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/middleware";
import { REQUEST_PATH_HEADER } from "@/lib/safeNext";

/**
 * Refreshes the Supabase Auth session cookies for account-aware routes only (ADR-08, §14.1).
 * It never redirects; Charades, Batalla Naval, the home page and /admin are not matched at all.
 */
export async function proxy(request: NextRequest) {
  // Overwrites any client-sent value; `updateSession` forwards the request headers (NextResponse.next({ request })).
  request.headers.set(REQUEST_PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  return updateSession(request);
}

export const config = {
  matcher: ["/cards/:path*", "/account/:path*", "/auth/:path*", "/api/cards/:path*", "/api/account/:path*"],
};
