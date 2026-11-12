import { notFound } from "next/navigation";
import { MatchScreen } from "@/components/cards/match/MatchScreen";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The battlefield of a real match (§17.1). Data comes from the match API, which checks the session itself. */
export default async function MatchPage({ params }: PageProps<"/cards/match/[id]">) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  return <MatchScreen matchId={id.toLowerCase()} />;
}
