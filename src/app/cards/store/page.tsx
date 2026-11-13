import { redirect } from "next/navigation";
import { StoreScreen } from "@/components/cards/store/StoreScreen";
import { getUser } from "@/lib/auth";

/** The card store + pack opening (§17.1, §16). Gates itself: the /cards layout does not re-run on client navigation. */
export default async function StorePage() {
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent("/cards/store")}`);
  return <StoreScreen />;
}
