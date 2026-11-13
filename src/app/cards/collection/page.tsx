import { redirect } from "next/navigation";
import { CollectionScreen } from "@/components/cards/collection/CollectionScreen";
import { getUser } from "@/lib/auth";

/** Your card collection (§17.1, §15.1). Gates itself: the /cards layout does not re-run on client navigation. */
export default async function CollectionPage() {
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent("/cards/collection")}`);
  return <CollectionScreen />;
}
