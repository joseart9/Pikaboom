"use client";

import { useState, type FormEvent } from "react";
import { Field, FormMessage, inputClass } from "@/components/auth/AuthCard";
import { authErrorMessage } from "@/components/auth/authErrors";
import { t } from "@/game/cards/i18n";
import { createClient } from "@/lib/client";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/update-password`,
    });
    setPending(false);
    if (error) return setError(authErrorMessage(error));
    setSent(true);
  }

  if (sent) return <FormMessage kind="ok">{t("auth.resetSent")}</FormMessage>;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <p className="text-sm font-extrabold text-white/75">{t("auth.forgotHelp")}</p>
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
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <button disabled={pending} className="pb-btn h-14 w-full text-2xl">
        {pending ? t("auth.working") : t("auth.sendLink")}
      </button>
    </form>
  );
}
