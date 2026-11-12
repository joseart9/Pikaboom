import { redirect } from "next/navigation";
import { LobbyScreen } from "@/components/cards/lobby/LobbyScreen";
import { CODE_LENGTH, normalizeCode } from "@/game/cards/server/lobbyCode";
import { getUser } from "@/lib/auth";

/**
 * Create/join a lobby (§17.1, §13.7). `?sala=CODE` joins automatically. This page gates itself so a signed-out
 * guest opening an invite comes back to the invite after logging in (Phase 11 H) — the layout's gate does not
 * re-run on client navigation and only knows the path, not the query.
 */
export default async function PlayPage({ searchParams }: PageProps<"/cards/play">) {
  const raw = (await searchParams).sala;
  const code = normalizeCode(typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "").slice(0, CODE_LENGTH);
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(code ? `/cards/play?sala=${code}` : "/cards/play")}`);
  return <LobbyScreen initialCode={code.length === CODE_LENGTH ? code : null} />;
}
