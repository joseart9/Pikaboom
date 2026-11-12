import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "@/components/cards/cards.css";
import { LandscapeShell } from "@/components/cards/LandscapeShell";
import { t } from "@/game/cards/i18n";
import { ensureProfile, getUser } from "@/lib/auth";
import { REQUEST_PATH_HEADER, safeNext } from "@/lib/safeNext";

export const metadata: Metadata = { title: `${t("game.title")} · Pikaboom`, robots: { index: false } };

/**
 * Account gate for the card game (§14.1). The proxy only refreshes sessions; this layout redirects signed-out
 * visitors and creates the profile on the first authenticated visit. Layouts don't re-run on client navigation
 * between child pages, so pages/APIs that load user data must still call `requireUser()` themselves.
 * Every /cards page renders inside the landscape shell and the `cg-*` design tokens (§17.1–§17.2).
 */
export default async function CardsLayout({ children }: LayoutProps<"/cards">) {
  const user = await getUser();
  if (!user) {
    // Back to the exact page after login (e.g. an invite `/cards/play?sala=CODE`), never outside /cards.
    const path = safeNext((await headers()).get(REQUEST_PATH_HEADER), "/cards");
    const next = path === "/cards" || path.startsWith("/cards/") || path.startsWith("/cards?") ? path : "/cards";
    redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  }
  try {
    await ensureProfile(user);
  } catch (e) {
    console.error("cards: ensureProfile failed", e);
  }
  return <LandscapeShell>{children}</LandscapeShell>;
}
