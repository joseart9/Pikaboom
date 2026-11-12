import { t } from "@/game/cards/i18n";

/** Portrait + touch screen → "rotate your device" (pure CSS: `.cg-rotate` only shows under that media query, §17.2). */
export function RotateOverlay() {
  return (
    <div className="cg-rotate" role="alert">
      <div className="cg-rotate-phone" aria-hidden />
      <div className="cg-rotate-title">{t("rotate.title")}</div>
      <div className="cg-rotate-text">{t("rotate.text")}</div>
    </div>
  );
}
