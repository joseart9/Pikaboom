"use client";

// Dev-only UI kit sheet (UI-02, docs/cards/UI_VISUAL_SYSTEM.md): every shared skin primitive, control state, icon
// and skin file on one scrollable page, to check them at 568×320 and desktop sizes and with the keyboard. Opened
// from the sandbox toolbar; never rendered outside /cards/dev/sandbox.
import type { CSSProperties, ReactNode } from "react";
import { CATALOG } from "@/game/cards/catalog";
import type { CardId, KeywordId, Rarity } from "@/game/cards/catalog/types";
import { t } from "@/game/cards/i18n";
import { CardFace } from "../card/CardFace";
import {
  AttackBadge,
  BoardBackdrop,
  CardBack,
  CostBadge,
  CurrencyBadge,
  EndTurnButton,
  GameIcon,
  HealthBadge,
  HeroPortrait,
  KeywordIcon,
  ManaCrystals,
  RarityGem,
  StatusIcon,
  type EndTurnState,
  type GameIconName,
} from "../skin";
import { GAME_ICONS } from "../skin/icons/gameIcons";
import { KEYWORD_GLYPHS } from "../skin/icons/keywordGlyphs";
import { STATUS_GLYPHS, type StatusGlyphId } from "../skin/icons/statusGlyphs";

const RARITIES: Rarity[] = ["basic", "common", "rare", "magic", "legendary", "unique"];
const END_TURN: [EndTurnState, string][] = [
  ["ready", "match.endTurn"],
  ["readyIdle", "match.endTurn"],
  ["foe", "match.foeTurnButton"],
  ["pending", "match.pendingButton"],
];
const SAMPLE_CARDS: CardId[] = ["squire", "arcane-spark", "crypt-banshee", "morvath", "ignis", "frozen-gale"] as CardId[];
const noop = () => {};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="cg-kit-section">
      <h3 className="cg-kit-heading">{title}</h3>
      <div className="cg-kit-row">{children}</div>
    </section>
  );
}

const cardBox: CSSProperties = { position: "relative", height: "clamp(120px, 42dvh, 220px)", aspectRatio: "0.72", flex: "0 0 auto" };

export function UiKit({ onClose }: { onClose: () => void }) {
  return (
    <div className="cg-proof-overlay cg-kit" role="dialog" aria-modal="true" aria-label={t("sandbox.uiKit")} data-cg-tap>
      <div className="cg-kit-sheet cg-surface cg-surface--trim">
        <Section title={t("sandbox.kitControls")}>
          <button type="button" className="cg-button cg-button--primary">
            <GameIcon name="play" outlined /> {t("menu.play")}
          </button>
          <button type="button" className="cg-button">
            <GameIcon name="collection" /> {t("sandbox.kitSecondary")}
          </button>
          <button type="button" className="cg-button cg-button--danger">
            <GameIcon name="close" /> {t("sandbox.kitDanger")}
          </button>
          <button type="button" className="cg-button cg-button--quiet">
            {t("sandbox.kitQuiet")}
          </button>
          <button type="button" className="cg-button cg-button--selected" aria-pressed>
            <GameIcon name="check" /> {t("sandbox.kitSelected")}
          </button>
          <button type="button" className="cg-button cg-button--loading" disabled>
            <GameIcon name="hourglass" /> {t("sandbox.kitLoading")}
          </button>
          <button type="button" className="cg-button" disabled>
            {t("sandbox.kitDisabled")}
          </button>
        </Section>
        <Section title={t("sandbox.kitEndTurn")}>
          {END_TURN.map(([state, key]) => (
            <EndTurnButton key={state} state={state} label={t(key as "match.endTurn")} onPress={noop} />
          ))}
        </Section>
        <Section title={t("sandbox.kitResources")}>
          <ManaCrystals current={7} max={10} temporary={0} size="clamp(14px, 5dvh, 24px)" label={t("sandbox.styleMana")} />
          <ManaCrystals current={3} max={4} temporary={2} size="clamp(14px, 5dvh, 24px)" />
          <ManaCrystals current={3} max={6} temporary={0} size="clamp(14px, 5dvh, 24px)" compact />
          <CostBadge value={4} modified={0} size="40px" />
          <CostBadge value={2} modified={-1} size="40px" />
          <AttackBadge value={5} buffed debuffed={false} size="40px" />
          <HealthBadge value={3} max={6} damaged size="40px" />
          <HealthBadge value={7} damaged={false} size="24px" />
          <CurrencyBadge amount={300} unit={t("economy.gold")} />
        </Section>
        <Section title={t("sandbox.kitRarity")}>
          {RARITIES.map((r) => (
            <span key={r} className="cg-kit-chip">
              <RarityGem rarity={r} size="18px" />
              {t(`rarity.${r}`)}
            </span>
          ))}
        </Section>
        <Section title={t("sandbox.kitIcons")}>
          {(Object.keys(GAME_ICONS) as GameIconName[]).map((name) => (
            <GameIcon key={name} name={name} size="24px" title={name} />
          ))}
        </Section>
        <Section title={t("sandbox.kitGlyphs")}>
          {(Object.keys(KEYWORD_GLYPHS) as KeywordId[]).map((k) => (
            <KeywordIcon key={k} keyword={k} size="22px" title={t(`keyword.${k}.name`)} />
          ))}
          {(Object.keys(STATUS_GLYPHS) as StatusGlyphId[]).map((s) => (
            <StatusIcon key={s} status={s} size="22px" title={s} />
          ))}
          {(Object.keys(KEYWORD_GLYPHS) as KeywordId[]).map((k) => (
            <KeywordIcon key={`s-${k}`} keyword={k} size="12px" />
          ))}
          {(Object.keys(STATUS_GLYPHS) as StatusGlyphId[]).map((s) => (
            <StatusIcon key={`s-${s}`} status={s} size="12px" magnitude={s === "burn" ? 2 : undefined} />
          ))}
        </Section>
        <Section title={t("sandbox.kitSkin")}>
          <HeroPortrait name={t("sandbox.player1")} seat={0} mine highlighted={false} targetable={false} size="72px" />
          <HeroPortrait name={t("sandbox.player2")} seat={1} mine={false} highlighted={false} targetable size="72px" />
          <CardBack height="96px" />
          <CardBack height="40px" />
          <div className="cg-kit-board">
            <BoardBackdrop />
          </div>
        </Section>
        <Section title={t("sandbox.kitCards")}>
          {SAMPLE_CARDS.filter((id) => CATALOG[id]).map((id, i) => (
            <div key={id} style={cardBox}>
              <CardFace def={CATALOG[id]} state={i === 1 ? "playable" : i === 2 ? "selected" : "normal"} />
            </div>
          ))}
          <div style={cardBox}>
            <CardFace def={CATALOG["squire" as CardId]} locked />
          </div>
        </Section>
        <div className="cg-dialog" role="group" aria-label={t("sandbox.styleModalTitle")}>
          <h3 className="cg-dialog-title">{t("sandbox.styleModalTitle")}</h3>
          <p className="cg-dialog-help">{t("sandbox.styleModalBody")}</p>
          <div className="cg-dialog-actions">
            <button type="button" className="cg-button cg-button--quiet">
              {t("inspect.close")}
            </button>
            <button type="button" className="cg-button cg-button--primary">
              {t("menu.play")}
            </button>
          </div>
        </div>
      </div>
      <button type="button" className="cg-button cg-proof-close" onClick={onClose}>
        <GameIcon name="close" /> {t("inspect.close")}
      </button>
    </div>
  );
}
