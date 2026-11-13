"use client";

// Dev-only style proof (UI-01, docs/cards/UI_VISUAL_SYSTEM.md): the chosen "Grimorio grabado" direction drawn on five
// samples — title, button, resource gem, card-frame corner, modal surface — as the reference UI-02 ports into the
// shared skin primitives. A contrasting "Cristal arcano" glass variant was compared at 568×320 and 1280×720 and
// removed (DEC-029). Opened from the sandbox toolbar; never rendered outside /cards/dev/sandbox.
import { t } from "@/game/cards/i18n";

/** Faceted hexagonal mana gem, ink outline, light from the upper left. */
function Gem({ value }: { value: string }) {
  return (
    <span className="cg-proof-gem">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 3 57 17.5v29L32 61 7 46.5v-29Z" fill="var(--cg-ink)" />
        <path d="M32 8 52.5 20v24L32 56 11.5 44V20Z" fill="var(--cg-mana-deep)" />
        <path d="M32 8 52.5 20 32 32 11.5 20Z" fill="var(--cg-mana-hi)" />
        <path d="M11.5 20 32 32v24L11.5 44Z" fill="var(--cg-mana)" />
        <path d="M17 21.5 32 13l6 3.4-15 8.6Z" fill="var(--cg-mana-shine)" opacity=".85" />
      </svg>
      <b>{value}</b>
    </span>
  );
}

export function StyleProof({ onClose }: { onClose: () => void }) {
  return (
    <div className="cg-proof-overlay" role="dialog" aria-modal="true" aria-label={t("sandbox.styleProof")} data-cg-tap>
      <section className="cg-proof">
        <p className="cg-proof-label">{t("sandbox.styleProof")}</p>
        <h2 className="cg-proof-title">{t("game.title")}</h2>
        <div className="cg-proof-row">
          <button type="button" className="cg-proof-button">
            {t("menu.play")}
          </button>
          <span className="cg-proof-mana" aria-label={t("sandbox.styleMana")}>
            <Gem value="7" />
            <span className="cg-proof-mana-text" aria-hidden="true">
              7<small>/10</small>
            </span>
          </span>
        </div>
        <div className="cg-proof-row">
          <div className="cg-proof-corner" aria-hidden="true">
            <span className="cg-proof-corner-cost">
              <Gem value="4" />
            </span>
          </div>
          <div className="cg-proof-modal" role="group" aria-label={t("sandbox.styleModalTitle")}>
            <h3>{t("sandbox.styleModalTitle")}</h3>
            <p>{t("sandbox.styleModalBody")}</p>
            <button type="button" className="cg-proof-button cg-proof-button--quiet">
              {t("inspect.close")}
            </button>
          </div>
        </div>
      </section>
      <button type="button" className="cg-button cg-proof-close" onClick={onClose}>
        {t("inspect.close")}
      </button>
    </div>
  );
}
