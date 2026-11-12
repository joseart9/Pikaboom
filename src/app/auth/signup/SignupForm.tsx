"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, FormMessage, inputClass } from "@/components/auth/AuthCard";
import { authErrorMessage } from "@/components/auth/authErrors";
import { t } from "@/game/cards/i18n";
import { createClient } from "@/lib/client";
import { isValidUsername } from "@/lib/username";

const MIN_PASSWORD = 8;
type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

async function fetchAvailable(username: string): Promise<boolean | null> {
  try {
    const res = await fetch(`/api/account/username-available?u=${encodeURIComponent(username)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { available?: boolean }).available === true;
  } catch {
    return null; // network trouble: don't block sign-up; the server falls back to a generated name
  }
}

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef("");

  useEffect(() => () => clearTimeout(timer.current), []);

  function onUsernameChange(value: string) {
    setUsername(value);
    latest.current = value;
    clearTimeout(timer.current);
    if (!value) return setAvailability("idle");
    if (!isValidUsername(value)) return setAvailability("invalid");
    setAvailability("checking");
    timer.current = setTimeout(async () => {
      const ok = await fetchAvailable(value);
      if (latest.current !== value) return;
      setAvailability(ok === false ? "taken" : ok ? "available" : "idle");
    }, 400);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidUsername(username)) return setError(t("auth.usernameInvalid"));
    if (password.length < MIN_PASSWORD) return setError(t("auth.weakPassword"));
    setPending(true);
    if ((await fetchAvailable(username)) === false) {
      setAvailability("taken");
      setError(t("auth.usernameTaken"));
      setPending(false);
      return;
    }
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(authErrorMessage(error));
      setPending(false);
      return;
    }
    if (data.session) {
      // Email confirmation disabled in the dashboard: already signed in.
      router.replace(next);
      router.refresh();
      return;
    }
    // With confirmation on, an already-registered email returns a user without identities (no error, by design).
    if (data.user && data.user.identities?.length === 0) {
      setError(t("auth.userExists"));
      setPending(false);
      return;
    }
    setSent(true);
    setPending(false);
  }

  if (sent) return <FormMessage kind="ok">{t("auth.checkEmail")}</FormMessage>;

  const usernameHint =
    availability === "checking" ? (
      t("auth.usernameChecking")
    ) : availability === "available" ? (
      <span className="text-[#06d6a0]">{t("auth.usernameAvailable")}</span>
    ) : availability === "taken" ? (
      <span className="text-[#ff4d6d]">{t("auth.usernameTaken")}</span>
    ) : availability === "invalid" ? (
      <span className="text-[#ff4d6d]">{t("auth.usernameInvalid")}</span>
    ) : (
      t("auth.usernameHint")
    );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label={t("auth.username")} hint={usernameHint}>
        <input
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          className={inputClass}
        />
      </Field>
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
      <Field label={t("auth.password")} hint={t("auth.passwordHint")}>
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
      <button disabled={pending || availability === "taken" || availability === "invalid"} className="pb-btn h-14 w-full text-2xl">
        {pending ? t("auth.working") : t("auth.signup")}
      </button>
    </form>
  );
}
