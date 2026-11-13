import { redirect } from "next/navigation";
import { DeckList } from "@/components/cards/decks/DeckList";
import { getUser } from "@/lib/auth";

/** Your saved decks (§17.1, §15.4). Gates itself: the /cards layout does not re-run on client navigation. */
export default async function DecksPage() {
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent("/cards/decks")}`);
  return <DeckList />;
}
