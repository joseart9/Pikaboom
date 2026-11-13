"use client";

// Card-game menu (/cards, §17.1, Phase 11 G.1): Jugar, "Volver a la partida" when you have an open lobby/match
// (GET /api/cards/matches/current), Colección (Phase 14), Mazos (Phase 15), Tienda (Phase 17), Cuenta, and the
// Oro balance (GET /api/cards/wallet, which also performs the one-time starter grant). Phase 16: the balance refreshes
// whenever the menu becomes visible again (match rewards), and tapping it lists the latest Oro movements.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { currentMatch, getWallet } from "@/game/cards/client/api";
import type { CurrencyTransaction } from "@/game/cards/collection/wallet";
import { t } from "@/game/cards/i18n";
import { CurrencyBadge } from "../skin";
import { WalletHistory } from "./WalletHistory";

export function CardsMenu() {
  const [current, setCurrent] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CurrencyTransaction[] | null | "error">(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const loadWallet = () =>
      void getWallet().then((r) => {
        if (!alive) return;
        if (r.ok) {
          setBalance(r.balance);
          setTransactions(r.transactions);
        } else setTransactions((prev) => (Array.isArray(prev) ? prev : "error"));
      });
    void currentMatch().then((r) => {
      if (alive && r.ok) setCurrent(r.matchId);
    });
    loadWallet();
    // Back from a match (bfcache, app switch, another tab): rewards may have changed the balance.
    const onVisible = () => {
      if (document.visibilityState === "visible") loadWallet();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) loadWallet();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  return (
    <main className="cg-home">
      {balance !== null && (
        <button type="button" className="cg-home-wallet" onClick={() => setHistoryOpen(true)} aria-label={t("economy.historyOpen", { amount: balance })} data-haptic="light">
          <CurrencyBadge amount={balance} unit={t("economy.gold")} label={t("economy.balance", { amount: balance })} />
        </button>
      )}
      {historyOpen && <WalletHistory transactions={transactions} onClose={closeHistory} />}
      <header className="cg-home-header">
        <h1 className="cg-home-title">{t("game.title")}</h1>
        <p className="cg-home-subtitle">{t("menu.subtitle")}</p>
      </header>
      <nav className="cg-home-actions" aria-label={t("game.title")}>
        {current && (
          <div className="cg-home-resume">
            <span>{t("menu.matchInProgress")}</span>
            <Link href={`/cards/match/${current}`} className="cg-button cg-button--primary cg-button--big cg-button--pulse" data-haptic="medium">
              {t("menu.resume")}
            </Link>
          </div>
        )}
        <Link href="/cards/play" className={`cg-button cg-button--big${current ? "" : " cg-button--primary"}`} data-haptic="medium">
          {t("menu.play")}
        </Link>
        <div className="cg-home-grid">
          <Link href="/cards/collection" className="cg-button" data-haptic="light">
            {t("menu.collection")}
          </Link>
          <Link href="/cards/decks" className="cg-button" data-haptic="light">
            {t("menu.decks")}
          </Link>
          <Link href="/cards/store" className="cg-button" data-haptic="light">
            {t("menu.store")}
          </Link>
          <Link href="/account" className="cg-button">
            {t("menu.account")}
          </Link>
        </div>
      </nav>
      <Link href="/" className="cg-home-back">
        {t("menu.home")}
      </Link>
    </main>
  );
}
