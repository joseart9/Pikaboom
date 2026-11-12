import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { t } from "@/game/cards/i18n";
import { getUser } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: `${t("auth.login")} · Pikaboom`, robots: { index: false } };

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function LoginPage({ searchParams }: PageProps<"/auth/login">) {
  const sp = await searchParams;
  const next = safeNext(first(sp.next));
  if (await getUser()) redirect(next);

  const error = first(sp.error) === "link" ? t("auth.linkExpired") : null;
  const withNext = (path: string) => `${path}?next=${encodeURIComponent(next)}`;

  return (
    <AuthCard
      title={t("auth.login")}
      footer={
        <>
          <p className="max-w-xs text-white/70">{t("auth.accountRequired")}</p>
          <p>
            {t("auth.noAccount")}{" "}
            <Link href={withNext("/auth/signup")} className="text-[#ffe066] underline underline-offset-4">
              {t("auth.signup")}
            </Link>
          </p>
        </>
      }
    >
      <LoginForm next={next} initialError={error} />
    </AuthCard>
  );
}
