"use client";

// Card-game menu (/cards, §17.1, Phase 11 G.1): Jugar, "Volver a la partida" when you have an open lobby/match
// (GET /api/cards/matches/current), Colección (Phase 14), Mazos (Phase 15), Tienda (Phase 17), Cuenta, and the
// Oro balance (GET /api/cards/wallet, which also performs the one-time starter grant). Phase 16: the balance refreshes
// whenever the menu becomes visible again (match rewards), and tapping it lists the latest Oro movements.
// UI-07: a game-hub composition — crest + title lockup and the primary Jugar / Volver a la partida plate on the left,
// framed icon tiles for the other areas on the right, the Oro resource plate top-right.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { currentMatch, getWallet } from "@/game/cards/client/api";
import type { CurrencyTransaction } from "@/game/cards/collection/wallet";
import { t, type MessageKey } from "@/game/cards/i18n";
import { CurrencyBadge, GameIcon, type GameIconName } from "../skin";
import { GameCrest } from "../skin/GameCrest";
import { WalletHistory } from "./WalletHistory";

/** Secondary destinations (UI-07): one shared icon family, a label and a one-line hint each. */
const NAV: readonly { href: string; icon: GameIconName; label: MessageKey; hint: MessageKey }[] = [
  { href: "/cards/collection", icon: "collection", label: "menu.collection", hint: "menu.collectionHint" },
  { href: "/cards/decks", icon: "decks", label: "menu.decks", hint: "menu.decksHint" },
  { href: "/cards/store", icon: "store", label: "menu.store", hint: "menu.storeHint" },
  { href: "/account", icon: "account", label: "menu.account", hint: "menu.accountHint" },
];

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
      <div className="cg-home-top">
        <Link href="/" className="cg-button cg-button--quiet cg-home-back">
          <GameIcon name="home" size="1.1em" />
          <span>{t("menu.home")}</span>
        </Link>
        {balance !== null && (
          <button type="button" className="cg-home-wallet" onClick={() => setHistoryOpen(true)} aria-label={t("economy.historyOpen", { amount: balance })} data-haptic="light">
            <CurrencyBadge amount={balance} unit={t("economy.gold")} label={t("economy.balance", { amount: balance })} />
            <span className="cg-home-wallet-hint" aria-hidden>
              {t("menu.walletHint")}
            </span>
          </button>
        )}
      </div>
      {historyOpen && <WalletHistory transactions={transactions} onClose={closeHistory} />}

      <div className="cg-home-body">
        <section className="cg-home-hero">
          <header className="cg-home-lockup">
            <GameCrest className="cg-home-crest" />
            <div className="cg-home-heading">
              <h1 className="cg-home-title">{t("game.title")}</h1>
              <p className="cg-home-subtitle">{t("menu.subtitle")}</p>
            </div>
          </header>
          <div className="cg-home-primary">
            {current && (
              <Link href={`/cards/match/${current}`} className="cg-button cg-button--primary cg-button--big cg-button--pulse cg-home-cta" data-haptic="medium">
                <GameIcon name="endTurn" size="1.1em" />
                <span className="cg-home-cta-text">
                  {t("menu.resume")}
                  <small>{t("menu.matchInProgress")}</small>
                </span>
              </Link>
            )}
            <Link href="/cards/play" className={`cg-button cg-home-cta${current ? "" : " cg-button--primary cg-button--big"}`} data-haptic="medium">
              <GameIcon name="play" size="1.1em" />
              <span className="cg-home-cta-text">
                {t("menu.play")}
                {!current && <small>{t("menu.playHint")}</small>}
              </span>
            </Link>
          </div>
        </section>

        <nav className="cg-home-nav" aria-label={t("menu.navLabel")}>
          <ul className="cg-home-grid">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="cg-home-tile" data-haptic="light">
                  <span className="cg-home-tile-icon" aria-hidden>
                    <GameIcon name={item.icon} outlined />
                  </span>
                  <span className="cg-home-tile-text">
                    <span className="cg-home-tile-label">{t(item.label)}</span>
                    <span className="cg-home-tile-hint">{t(item.hint)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
