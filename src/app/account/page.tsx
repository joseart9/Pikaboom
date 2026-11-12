import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, FormMessage } from "@/components/auth/AuthCard";
import { t } from "@/game/cards/i18n";
import { ensureProfile, getUser, type Profile } from "@/lib/auth";
import { AccountForm } from "./AccountForm";

export const metadata: Metadata = { title: `${t("account.title")} · Pikaboom`, robots: { index: false } };

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login?next=/account");

  let profile: Profile | null = null;
  try {
    profile = await ensureProfile(user);
  } catch (e) {
    console.error("account: ensureProfile failed", e);
  }

  return (
    <AuthCard
      title={t("account.title")}
      footer={
        <>
          <Link href="/cards" className="text-[#ffe066] underline underline-offset-4">
            {t("account.goToGame")}
          </Link>
          <Link href="/auth/update-password" className="text-white/70 underline-offset-4 hover:underline">
            {t("account.changePassword")}
          </Link>
        </>
      }
    >
      {profile ? (
        <AccountForm email={user.email} username={profile.username} />
      ) : (
        <FormMessage kind="error">{t("account.loadError")}</FormMessage>
      )}
      <form action="/auth/signout" method="post">
        <button className="pb-btn h-12 w-full text-xl" style={{ ["--btn" as string]: "#ff4d6d" }}>
          {t("auth.signOut")}
        </button>
      </form>
    </AuthCard>
  );
}
