import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";

export const dynamic = "force-dynamic";

/** POST only (a GET link could be triggered by prefetching). Clears the session cookies, then goes home. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), 303);
}
