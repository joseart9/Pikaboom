"use client";

// Card-game menu (/cards, §17.1, Phase 11 G.1): Jugar, "Volver a la partida" when you have an open lobby/match
// (GET /api/cards/matches/current), Colección/Mazos/Tienda (coming in Phases 14–17), Cuenta.
import Link from "next/link";
import { useEffect, useState } from "react";
import { currentMatch } from "@/game/cards/client/api";
import { t, type MessageKey } from "@/game/cards/i18n";

const COMING_SOON: readonly MessageKey[] = ["menu.collection", "menu.decks", "menu.store"];

export function CardsMenu() {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void currentMatch().then((r) => {
      if (alive && r.ok) setCurrent(r.matchId);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="cg-home">
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
          {COMING_SOON.map((key) => (
            <span key={key} className="cg-button cg-button--soon" aria-disabled>
              {t(key)}
              <small>{t("menu.comingSoon")}</small>
            </span>
          ))}
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
