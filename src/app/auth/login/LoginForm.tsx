"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, FormMessage, inputClass } from "@/components/auth/AuthCard";
import { authErrorMessage } from "@/components/auth/authErrors";
import { t } from "@/game/cards/i18n";
import { createClient } from "@/lib/client";

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label={t("auth.email")}>
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label={t("auth.password")}>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Link href="/auth/forgot" className="self-end text-sm font-extrabold text-white/70 underline-offset-4 hover:underline">
        {t("auth.forgotPassword")}
      </Link>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <button disabled={pending} className="pb-btn h-14 w-full text-2xl">
        {pending ? t("auth.working") : t("auth.login")}
      </button>
    </form>
  );
}
