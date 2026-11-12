"use client";

import { useState, type FormEvent } from "react";
import { Field, FormMessage, inputClass } from "@/components/auth/AuthCard";
import { t } from "@/game/cards/i18n";
import { isValidUsername } from "@/lib/username";

export function AccountForm({ email, username: initial }: { email: string | null; username: string }) {
  const [saved, setSaved] = useState(initial);
  const [username, setUsername] = useState(initial);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!isValidUsername(username)) return setMessage({ kind: "error", text: t("auth.usernameInvalid") });
    setPending(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const body = (await res.json().catch(() => ({}))) as { profile?: { username: string }; error?: string };
      if (!res.ok || !body.profile) {
        setMessage({ kind: "error", text: body.error ?? t("auth.genericError") });
      } else {
        setSaved(body.profile.username);
        setUsername(body.profile.username);
        setMessage({ kind: "ok", text: t("account.saved") });
      }
    } catch {
      setMessage({ kind: "error", text: t("auth.genericError") });
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {email && (
        <Field label={t("auth.email")}>
          <span className="truncate font-extrabold text-white">{email}</span>
        </Field>
      )}
      <Field label={t("auth.username")} hint={t("auth.usernameHint")}>
        <input
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setMessage(null);
          }}
          className={inputClass}
        />
      </Field>
      {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
      <button
        disabled={pending || username === saved}
        className="pb-btn h-12 w-full text-xl"
        style={{ ["--btn" as string]: "#06d6a0" }}
      >
        {pending ? t("auth.working") : t("account.save")}
      </button>
    </form>
  );
}
