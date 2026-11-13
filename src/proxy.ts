import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/middleware";
import { REQUEST_PATH_HEADER } from "@/lib/safeNext";

/**
 * Refreshes the Supabase Auth session cookies for account-aware routes only (ADR-08, §14.1).
 * It never redirects; Charades, Batalla Naval, the home page and /admin are not matched at all.
 */
export async function proxy(request: NextRequest) {
  // Static card art (public/cards/art, public/cards/skin — Phase 20): no session work per image.
  if (isStaticCardAsset(request.nextUrl.pathname)) return NextResponse.next();
  // Overwrites any client-sent value; `updateSession` forwards the request headers (NextResponse.next({ request })).
  request.headers.set(REQUEST_PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  return updateSession(request);
}

/** Files under public/cards/{art,skin}/ (ART_GUIDE.md) are plain static SVGs. */
function isStaticCardAsset(pathname: string): boolean {
  return /^\/cards\/(art|skin)\/[^/]+\.svg$/.test(pathname);
}

export const config = {
  matcher: ["/cards/:path*", "/account/:path*", "/auth/:path*", "/api/cards/:path*", "/api/account/:path*"],
};
