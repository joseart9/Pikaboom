"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, FormMessage, inputClass } from "@/components/auth/AuthCard";
import { authErrorMessage } from "@/components/auth/authErrors";
import { t } from "@/game/cards/i18n";
import { createClient } from "@/lib/client";

const MIN_PASSWORD = 8;

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) return setError(t("auth.weakPassword"));
    setPending(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }
    router.replace("/cards");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label={t("auth.newPassword")} hint={t("auth.passwordHint")}>
        <input
          type="password"
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <button disabled={pending} className="pb-btn h-14 w-full text-2xl">
        {pending ? t("auth.working") : t("auth.savePassword")}
      </button>
    </form>
  );
}
