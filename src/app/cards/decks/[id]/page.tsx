import { notFound, redirect } from "next/navigation";
import { DeckEditor } from "@/components/cards/decks/DeckEditor";
import { getUser } from "@/lib/auth";

/** Path segment for a new deck. */
const NEW_DECK = "nuevo";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Deck editor (§17.1, §15.4): `/cards/decks/nuevo` creates a deck, `/cards/decks/<uuid>` edits one of yours. */
export default async function DeckEditorPage({ params }: PageProps<"/cards/decks/[id]">) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/cards/decks/${id === NEW_DECK || UUID_RE.test(id) ? id : ""}`)}`);
  if (id !== NEW_DECK && !UUID_RE.test(id)) notFound();
  // key: a client navigation from one deck to another remounts the editor with fresh state.
  return <DeckEditor key={id} deckId={id === NEW_DECK ? null : id.toLowerCase()} />;
}
