import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { t } from "@/game/cards/i18n";
import { getUser } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: `${t("auth.signup")} · Pikaboom`, robots: { index: false } };

export default async function SignupPage({ searchParams }: PageProps<"/auth/signup">) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);
  if (await getUser()) redirect(next);

  return (
    <AuthCard
      title={t("auth.signup")}
      footer={
        <p>
          {t("auth.haveAccount")}{" "}
          <Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="text-[#ffe066] underline underline-offset-4">
            {t("auth.login")}
          </Link>
        </p>
      }
    >
      <SignupForm next={next} />
    </AuthCard>
  );
}
