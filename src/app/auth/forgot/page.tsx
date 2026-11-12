import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { t } from "@/game/cards/i18n";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: `${t("auth.forgotTitle")} · Pikaboom`, robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthCard
      title={t("auth.forgotTitle")}
      footer={
        <Link href="/auth/login" className="text-[#ffe066] underline underline-offset-4">
          {t("auth.backToLogin")}
        </Link>
      }
    >
      <ForgotForm />
    </AuthCard>
  );
}
