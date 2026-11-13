"use client";

// Dev-only card art gallery (UI-03, docs/cards/UI_VISUAL_SYSTEM.md §6.2): every registered illustration as a raw
// 64/40 px thumbnail, in the two real crop masks (card art window = landscape, board token = portrait), on a full card,
// as a board token, in the inspect sheet and in a pack opening. Opened from the sandbox toolbar; never rendered
// outside /cards/dev/sandbox.
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { CATALOG } from "@/game/cards/catalog";
import type { CardDef, CardId } from "@/game/cards/catalog/types";
import type { UnitSnapshot } from "@/game/cards/engine/events";
import { cardName, t } from "@/game/cards/i18n";
import { CardFace } from "../card/CardFace";
import { CardInspect } from "../card/CardInspect";
import { UnitToken } from "../match/UnitToken";
import { CardArt, GameIcon } from "../skin";
import { CARD_ART_FILES, cardArtUrl } from "../skin/assets";
import { PackOpening } from "../store/PackOpening";

const noop = () => {};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="cg-kit-section">
      <h3 className="cg-kit-heading">{title}</h3>
      <div className="cg-kit-row">{children}</div>
    </section>
  );
}

const cardBox: CSSProperties = {
  position: "relative",
  height: "clamp(120px, 42dvh, 220px)",
  aspectRatio: "0.72",
  flex: "0 0 auto",
};
// The token box mirrors the board's unit size variables so UnitToken's container queries resolve as in a match.
const tokenBox = {
  "--cg-unit-h": "clamp(72px, 26dvh, 140px)",
  "--cg-unit-w": "calc(var(--cg-unit-h) * 0.78)",
  display: "flex",
} as CSSProperties;

function snapshot(def: CardDef, i: number): UnitSnapshot | null {
  if (def.type !== "mob") return null;
  return {
    iid: `gallery-${def.id}`,
    defId: def.id,
    controller: 0,
    attack: def.attack,
    health: def.health,
    maxHealth: def.health,
    keywords: def.keywords,
    shieldCharges: 0,
    statuses: [],
    silenced: false,
    sleeping: i % 2 === 1,
  };
}

export function ArtGallery({ onClose }: { onClose: () => void }) {
  const defs = useMemo(() => Object.values(CATALOG).filter((d) => CARD_ART_FILES.has(d.art)), []);
  const [inspect, setInspect] = useState<CardDef | null>(null);
  const [pack, setPack] = useState<CardId[] | null>(null);
  const half = Math.ceil(defs.length / 2);
  const packs = [defs.slice(0, half), defs.slice(half)].filter((p) => p.length > 0).map((p) => p.map((d) => d.id));

  // Inspect and pack overlays are siblings of the gallery (not children) so they cover the screen, not the scrolled sheet.
  return (
    <>
      <div className="cg-proof-overlay cg-kit" role="dialog" aria-modal="true" aria-label={t("sandbox.artGallery")} data-cg-tap>
        <div className="cg-kit-sheet cg-surface cg-surface--trim">
          <p className="cg-dialog-help">{t("sandbox.artCount", { n: defs.length })}</p>
          <Section title={t("sandbox.artThumbs")}>
            {defs.map((d) => (
              <span key={d.id} className="cg-gallery-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- the raw static file, as an <img>, is what this row checks */}
                <img src={cardArtUrl(d.art)} width={64} height={64} alt={cardName(d.id)} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cardArtUrl(d.art)} width={40} height={40} alt="" />
              </span>
            ))}
          </Section>
          <Section title={t("sandbox.artCrops")}>
            {defs.map((d) => (
              <span key={d.id} className="cg-gallery-crops" title={cardName(d.id)}>
                <span className="cg-gallery-crop cg-gallery-crop--landscape">
                  <CardArt art={d.art} />
                </span>
                <span className="cg-gallery-crop cg-gallery-crop--portrait">
                  <CardArt art={d.art} />
                </span>
              </span>
            ))}
          </Section>
          <Section title={t("sandbox.artCards")}>
            {defs.map((d) => (
              <div key={d.id} style={cardBox}>
                <CardFace def={d} />
              </div>
            ))}
          </Section>
          <Section title={t("sandbox.artTokens")}>
            {defs.map((d, i) => {
              const unit = snapshot(d, i);
              return unit ? (
                <span key={d.id} style={tokenBox}>
                  <UnitToken
                    unit={unit}
                    mine
                    canAttack={i % 2 === 0}
                    targetable={false}
                    hovered={false}
                    selected={false}
                    pending={false}
                    actionable={false}
                    onTap={noop}
                  />
                </span>
              ) : null;
            })}
          </Section>
          <Section title={t("sandbox.artInspect")}>
            {defs.map((d) => (
              <button key={d.id} type="button" className="cg-button" onClick={() => setInspect(d)}>
                {cardName(d.id)}
              </button>
            ))}
          </Section>
          <Section title={t("sandbox.artPack")}>
            {packs.map((ids, i) => (
              <button key={i} type="button" className="cg-button" onClick={() => setPack(ids)}>
                <GameIcon name="store" /> {t("sandbox.artPackOpen", { n: i + 1 })}
              </button>
            ))}
          </Section>
        </div>
        <button type="button" className="cg-button cg-proof-close" onClick={onClose}>
          <GameIcon name="close" /> {t("inspect.close")}
        </button>
      </div>
      {inspect && <CardInspect def={inspect} onClose={() => setInspect(null)} />}
      {pack && (
        <PackOpening
          packName={t("sandbox.artGallery")}
          cards={pack}
          isNew={pack.map((_, i) => i === 0)}
          anotherPrice={null}
          onOpenAnother={noop}
          onClose={() => setPack(null)}
        />
      )}
    </>
  );
}
