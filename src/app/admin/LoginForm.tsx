"use client";

import { useActionState } from "react";
import { Bomb } from "@/components/game/Bomb";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <main className="pb-bg pb-safe grid pb-screen place-items-center">
      <form action={action} className="pb-card flex w-full max-w-sm flex-col items-center gap-4 p-6">
        <Bomb size={90} className="pb-wobble" lit={false} />
        <h1 className="font-display text-4xl">Admin</h1>
        <input
          name="password"
          type="password"
          autoFocus
          required
          placeholder="Contraseña"
          autoComplete="current-password"
          className="h-12 w-full rounded-xl border-2 border-white/15 bg-white/10 px-4 font-extrabold text-white outline-none placeholder:text-white/40 focus:border-white/50"
        />
        {state?.error && <p className="font-extrabold text-[#ff4d6d]">{state.error}</p>}
        <button disabled={pending} className="pb-btn h-14 w-full text-2xl">
          {pending ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
