import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { t } from "@/game/cards/i18n";
import { getUser } from "@/lib/auth";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

export const metadata: Metadata = { title: `${t("auth.updatePasswordTitle")} · Pikaboom`, robots: { index: false } };

/** Reached from the recovery link (via /auth/confirm, which signs the user in) or from /account. */
export default async function UpdatePasswordPage() {
  if (!(await getUser())) redirect("/auth/login?error=link");
  return (
    <AuthCard title={t("auth.updatePasswordTitle")}>
      <UpdatePasswordForm />
    </AuthCard>
  );
}
