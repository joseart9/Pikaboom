"use client";

// Pack opening (Phase 17 G.5): the pack's cards face down; tap each one (or "Revelar todas") to flip it. Revealed
// cards glow in their rarity color, the first copy of a card you did not own shows "¡Nueva!", and tapping a revealed
// card opens CardInspect. When everything is revealed: a one-line summary, "Ver colección", "Abrir otro" (only when
// affordable) and "Cerrar". Purely presentational: the cards were rolled and paid for before this mounts.
// Phase 20 polish: face-down cards of Rara or better glow faintly in their rarity color (anticipation); revealing a
// Legendaria/Única flashes the screen and spins light rays behind the card; rarity-specific synthesized sounds.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATALOG, hasDef } from "@/game/cards/catalog";
import type { CardDef, CardId, Rarity } from "@/game/cards/catalog/types";
import { restoreSoundSetting } from "@/game/cards/client/settings";
import { playCardSound } from "@/game/cards/client/sounds";
import { cardName, t } from "@/game/cards/i18n";
import { CardFace } from "../card/CardFace";
import { CardInspect } from "../card/CardInspect";
import { CardBack, CurrencyBadge } from "../skin";
import { PackArt } from "../skin/PackArt";

const RARITY_RANK: Record<Rarity, number> = { basic: 0, common: 1, rare: 2, magic: 3, legendary: 4, unique: 5 };

export interface PackOpeningProps {
  packName: string;
  /** Pack type key, for the drawn pack next to the title (UI-07). */
  packType?: string;
  cards: readonly CardId[];
  /** Parallel to `cards`: show "¡Nueva!" (see `markNewCards`). */
  isNew: readonly boolean[];
  /** The server answered an earlier purchase with the same key (a retry after a lost response). */
  replayed?: boolean;
  /** Price shown on "Abrir otro", or null when the player cannot afford another pack (the button is hidden). */
  anotherPrice: number | null;
  onOpenAnother: () => void;
  onClose: () => void;
}

const isTop = (def: CardDef | null) => !!def && RARITY_RANK[def.rarity] >= RARITY_RANK.legendary;

function revealSound(def: CardDef | null): void {
  const rank = def ? RARITY_RANK[def.rarity] : 0;
  playCardSound(rank >= RARITY_RANK.legendary ? "packLegendary" : rank >= RARITY_RANK.rare ? "packRare" : "draw");
}

/** Anticipation glow on a face-down card: Rara or better (the deal already knows the rarity). */
function hintClass(def: CardDef | null): string {
  return def && RARITY_RANK[def.rarity] >= RARITY_RANK.rare ? ` cg-pack-slot--hint cg-pack-slot--${def.rarity}` : "";
}

export function PackOpening({ packName, packType = "arcane", cards, isNew, replayed = false, anotherPrice, onOpenAnother, onClose }: PackOpeningProps) {
  const defs = useMemo(() => cards.map((id) => (hasDef(id) ? CATALOG[id] : null)), [cards]);
  const [revealed, setRevealed] = useState<boolean[]>(() => cards.map(() => false));
  const [inspect, setInspect] = useState<CardDef | null>(null);
  const [flash, setFlash] = useState<{ key: number; rarity: Rarity } | null>(null);
  const flashKey = useRef(0);
  const allRevealed = revealed.every(Boolean);

  useEffect(() => restoreSoundSetting(), []);

  const celebrate = useCallback((def: CardDef | null) => {
    revealSound(def);
    if (def && isTop(def)) setFlash({ key: ++flashKey.current, rarity: def.rarity });
  }, []);

  const reveal = useCallback(
    (i: number) => {
      setRevealed((prev) => (prev[i] ? prev : prev.map((r, j) => r || j === i)));
      celebrate(defs[i]);
    },
    [celebrate, defs],
  );

  const revealAll = useCallback(() => {
    const best = defs.reduce<CardDef | null>((b, d, i) => (!revealed[i] && d && (!b || RARITY_RANK[d.rarity] > RARITY_RANK[b.rarity]) ? d : b), null);
    setRevealed((prev) => prev.map(() => true));
    celebrate(best);
  }, [celebrate, defs, revealed]);

  useEffect(() => {
    if (!inspect) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspect(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspect]);

  const summary = useMemo(() => {
    const byRarity = new Map<Rarity, number>();
    for (const d of defs) if (d) byRarity.set(d.rarity, (byRarity.get(d.rarity) ?? 0) + 1);
    const parts = [...byRarity]
      .sort((a, b) => RARITY_RANK[b[0]] - RARITY_RANK[a[0]])
      .map(([r, n]) => `${t(`rarity.${r}`)} ×${n}`);
    return { parts, newCount: isNew.filter(Boolean).length };
  }, [defs, isNew]);

  return (
    <div className="cg-pack-overlay" role="dialog" aria-modal aria-labelledby="cg-pack-title">
      <p id="cg-pack-title" className="cg-pack-title">
        <PackArt variant={packType} height="1.6em" className="cg-pack-title-art" />
        {packName}
      </p>
      {replayed && <p className="cg-pack-note">{t("store.replayed")}</p>}
      {flash && <div key={flash.key} className={`cg-pack-flash cg-pack-flash--${flash.rarity}`} aria-hidden onAnimationEnd={() => setFlash(null)} />}
      <ol className="cg-pack-cards">
        {cards.map((id, i) => {
          const def = defs[i];
          const open = revealed[i];
          return (
            <li key={i} className={`cg-pack-slot${open ? ` cg-pack-slot--open cg-pack-slot--${def?.rarity ?? "common"}` : hintClass(def)}`}>
              {open && isTop(def) && <span className="cg-pack-rays" aria-hidden />}
              <button
                type="button"
                className="cg-pack-card"
                aria-label={open ? `${cardName(id)}${isNew[i] ? ` · ${t("store.newCard")}` : ""}` : t("store.reveal", { n: i + 1 })}
                onClick={() => (open ? def && setInspect(def) : reveal(i))}
                data-haptic="light"
              >
                <span className="cg-pack-flip">
                  <span className="cg-pack-face cg-pack-face--back" aria-hidden>
                    <CardBack height="var(--cg-pack-h)" />
                  </span>
                  {open && def && (
                    <span className="cg-pack-face cg-pack-face--front" aria-hidden>
                      <CardFace def={def} />
                    </span>
                  )}
                </span>
                {open && isNew[i] && <span className="cg-pack-new">{t("store.newCard")}</span>}
              </button>
            </li>
          );
        })}
      </ol>
      {!allRevealed ? (
        <div className="cg-pack-actions">
          <span className="cg-pack-hint">{t("store.tapToReveal")}</span>
          <button type="button" className="cg-button cg-button--primary" onClick={revealAll} data-haptic="medium">
            {t("store.revealAll")}
          </button>
        </div>
      ) : (
        <div className="cg-pack-actions">
          <span className="cg-pack-summary">
            {summary.newCount > 0 && <strong>{t("store.summaryNew", { n: summary.newCount })}</strong>}
            {summary.parts.join(" · ")}
          </span>
          <Link href="/cards/collection" className="cg-button" data-haptic="light">
            {t("store.viewCollection")}
          </Link>
          {anotherPrice !== null && (
            <button type="button" className="cg-button cg-button--primary" onClick={onOpenAnother} data-haptic="medium">
              {t("store.openAnother")}
              <span className="cg-pack-price">
                <CurrencyBadge amount={anotherPrice} />
              </span>
            </button>
          )}
          <button type="button" className="cg-button" onClick={onClose} autoFocus>
            {t("store.close")}
          </button>
        </div>
      )}
      {inspect && <CardInspect def={inspect} onClose={() => setInspect(null)} />}
    </div>
  );
}
