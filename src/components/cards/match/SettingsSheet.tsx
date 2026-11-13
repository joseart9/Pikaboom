"use client";

// In-match settings (Phase 20; replaces the Phase 11/13 menu): concede (with confirmation), sound on/off (the global
// mute), reduced motion (disabled while the OS forces it), animation speed 1× / 1.5× / 2×, back to the menu.
// Opened from the top bar's menu button; a tap outside closes it (MatchScreen).
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { isReducedMotion, osReducedMotion, reducedMotionToggle, setReducedMotionToggle, subscribeReducedMotion } from "@/game/cards/client/animation/motion";
import { animationSpeed, ANIMATION_SPEEDS, setAnimationSpeed, setSoundMuted, soundMuted, subscribeSettings } from "@/game/cards/client/settings";
import { t } from "@/game/cards/i18n";

export interface SettingsSheetProps {
  /** The match is over: concede is disabled. */
  finished: boolean;
  onConcede: () => void;
  onClose: () => void;
}

const formatSpeed = (n: number) => t("settings.speedValue", { n: String(n).replace(".", ",") });

export function SettingsSheet({ finished, onConcede, onClose }: SettingsSheetProps) {
  const [confirmConcede, setConfirmConcede] = useState(false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, isReducedMotion, () => false);
  const forcedByOs = useSyncExternalStore(subscribeReducedMotion, osReducedMotion, () => false);
  const muted = useSyncExternalStore(subscribeSettings, soundMuted, () => false);
  const speed = useSyncExternalStore(subscribeSettings, animationSpeed, () => 1);

  return (
    <div className="cg-menu cg-settings" data-cg-tap role="dialog" aria-labelledby="cg-settings-title">
      <span id="cg-settings-title" className="cg-menu-title">
        {t("settings.title")}
      </span>

      <div className="cg-settings-row">
        <span className="cg-settings-label">{t("settings.sound")}</span>
        <button type="button" className={`cg-button cg-settings-toggle${muted ? "" : " cg-button--active"}`} aria-pressed={!muted} onClick={() => setSoundMuted(!muted)}>
          {muted ? t("settings.off") : t("settings.on")}
        </button>
      </div>

      <div className="cg-settings-row">
        <span className="cg-settings-label">{t("settings.reducedMotion")}</span>
        <button
          type="button"
          className={`cg-button cg-settings-toggle${reduced ? " cg-button--active" : ""}`}
          aria-pressed={reduced}
          disabled={forcedByOs}
          title={forcedByOs ? t("settings.reducedMotionSystem") : undefined}
          onClick={() => setReducedMotionToggle(!reducedMotionToggle())}
        >
          {forcedByOs ? t("settings.system") : reduced ? t("settings.on") : t("settings.off")}
        </button>
      </div>

      <div className="cg-settings-row">
        <span className="cg-settings-label" id="cg-settings-speed">
          {t("settings.speed")}
        </span>
        <div className="cg-settings-segmented" role="radiogroup" aria-labelledby="cg-settings-speed">
          {ANIMATION_SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={speed === s}
              className={`cg-button cg-settings-segment${speed === s ? " cg-button--active" : ""}`}
              onClick={() => setAnimationSpeed(s)}
            >
              {formatSpeed(s)}
            </button>
          ))}
        </div>
      </div>

      {!confirmConcede ? (
        <div className="cg-settings-actions">
          <button type="button" className="cg-button cg-button--danger" disabled={finished} onClick={() => setConfirmConcede(true)}>
            {t("match.concede")}
          </button>
          <Link href="/cards" className="cg-button">
            {t("match.backToMenu")}
          </Link>
        </div>
      ) : (
        <div className="cg-settings-confirm">
          <span className="cg-menu-title">{t("match.confirmConcede")}</span>
          <button
            type="button"
            className="cg-button cg-button--danger"
            onClick={() => {
              setConfirmConcede(false);
              onClose();
              onConcede();
            }}
          >
            {t("match.confirmYes")}
          </button>
          <button type="button" className="cg-button" onClick={() => setConfirmConcede(false)}>
            {t("match.confirmNo")}
          </button>
        </div>
      )}
    </div>
  );
}
