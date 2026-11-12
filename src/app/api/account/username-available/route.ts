import type { NextRequest } from "next/server";
import { isUsernameAvailable } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * `?u=<name>` → `{ available }`. The only account endpoint that needs no session (sign-up calls it before an
 * account exists, §13.2). Reveals only whether a public player name is in use.
 */
export async function GET(request: NextRequest) {
  const u = request.nextUrl.searchParams.get("u") ?? "";
  try {
    return Response.json({ available: await isUsernameAvailable(u) }, { headers: NO_STORE });
  } catch (e) {
    console.error("api/account/username-available:", e);
    return Response.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
