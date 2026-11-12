import type { ReactNode } from "react";
import Link from "next/link";
import { t } from "@/game/cards/i18n";

/** Shared look for /auth/* and /account: Pikaboom backdrop, one centered card, scrollable on short landscape screens. */
export function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="pb-bg pb-safe pb-screen pb-scroll flex w-full flex-col items-center">
      <div className="my-auto flex w-full max-w-sm flex-col items-center gap-4 py-2">
        <div className="pb-card flex w-full flex-col gap-4 p-6">
          <h1 className="text-center font-display text-4xl leading-none text-[#ffe066]">{title}</h1>
          {children}
        </div>
        {footer && <div className="flex flex-col items-center gap-2 text-center text-sm font-extrabold text-white/80">{footer}</div>}
        <Link href="/" className="text-sm font-extrabold text-white/60 underline-offset-4 hover:underline">
          {t("auth.backHome")}
        </Link>
      </div>
    </main>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border-2 border-white/15 bg-white/10 px-4 font-extrabold text-white outline-none placeholder:text-white/40 focus:border-white/50";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-black text-white/80">{label}</span>
      {children}
      {hint && <span className="text-xs font-extrabold text-white/60">{hint}</span>}
    </label>
  );
}

export function FormMessage({ kind, children }: { kind: "error" | "ok"; children: ReactNode }) {
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`font-extrabold ${kind === "error" ? "text-[#ff4d6d]" : "text-[#06d6a0]"}`}>
      {children}
    </p>
  );
}
