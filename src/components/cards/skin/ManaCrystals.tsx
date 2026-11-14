import { SKIN_FILES, skinUrl } from "./assets";

export interface ManaCrystalsProps {
  current: number;
  max: number;
  temporary: number;
  /** CSS length of one crystal. */
  size: string;
  label?: string;
  /** Hide the crystal row and show only the "current/max" number (cramped spaces). */
  compact?: boolean;
}

type Kind = "full" | "empty" | "temp";

// Faceted crystal (10×12 box), light from the upper left: ink silhouette, base, lit left facet, highlight sliver.
const OUTLINE = "M5 0.4 9.6 6 5 11.6 0.4 6Z";
const BODY = "M5 1.6 8.5 6 5 10.4 1.5 6Z";
const LIT = "M5 1.6 5 10.4 1.5 6Z";
const SHINE = "M4.6 2.9 4.6 5.4 3 5.9Z";

/** One crystal. Spent = empty dark socket; temporary = pale crystal with a spark cut (shape cue, not colour only). */
function Crystal({ kind, size }: { kind: Kind; size: string }) {
  return (
    <svg viewBox="0 0 10 12" aria-hidden style={{ width: `calc(${size} * 0.8)`, height: size, flex: "0 0 auto", overflow: "visible" }}>
      <path d={OUTLINE} fill="#1d0842" stroke="#1d0842" strokeWidth={0.6} strokeLinejoin="round" />
      {kind === "empty" ? (
        <path d={BODY} fill="#ffffff14" stroke="#ffffff30" strokeWidth={0.5} />
      ) : (
        <>
          <path d={BODY} fill={kind === "temp" ? "#4fc3e8" : "#1f6fd1"} />
          <path d={LIT} fill={kind === "temp" ? "var(--cg-mana-temp)" : "var(--cg-mana)"} />
          <path d={SHINE} fill="#e6f6ff" opacity={0.9} />
          {kind === "temp" && <path d="M5 4.2 5.7 6 5 7.8 4.3 6Z" fill="#ffffff" />}
        </>
      )}
    </svg>
  );
}

/** "4/5" plus a row of faceted crystals: filled = available, hollow socket = spent, pale with a spark = temporary mana. */
export function ManaCrystals({ current, max, temporary, size, label, compact = false }: ManaCrystalsProps) {
  // `current` and `temporary` are separate pools (engine §6.4): what can be spent is their sum.
  const base = Math.max(0, current);
  const crystals: Kind[] = Array.from({ length: Math.max(max, base) }, (_, i) => (i < base ? "full" : "empty"));
  for (let i = 0; i < temporary; i++) crystals.push("temp");
  return (
    <span aria-label={label} title={label} style={{ display: "inline-flex", alignItems: "center", gap: `calc(${size} * 0.3)` }}>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: `calc(${size} * 1.2)`,
          color: "var(--cg-mana-shine)",
          WebkitTextStroke: `calc(${size} * 0.1) #1d0842`,
          paintOrder: "stroke fill",
          textShadow: "0 0 8px #3fa9ff99",
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        {current + temporary}
        <span style={{ fontSize: "0.72em", color: "var(--cg-mana-hi)" }}>/{max}</span>
      </span>
      {!compact && (
        <span aria-hidden style={{ display: "inline-flex", gap: `calc(${size} * 0.08)` }}>
          {crystals.map((kind, i) => (
            <Crystal key={i} kind={kind} size={size} />
          ))}
        </span>
      )}
    </span>
  );
}

const GEM_PATH = "M50 3 L93 27 L93 73 L50 97 L7 73 L7 27 Z";

/**
 * The mana bar's crystal: the same blue gem as a card's cost badge (`badge-gem` skin, vector fallback). Spent = a dim,
 * desaturated gem; temporary = a paler gem with a white spark (shape cue, not colour only). Look: `.cg-manabar-gem--*`.
 */
function ManaGem({ kind }: { kind: Kind }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`cg-manabar-gem cg-manabar-gem--${kind}`}>
      {SKIN_FILES.has("badge-gem") ? (
        <image href={skinUrl("badge-gem")} width={100} height={100} />
      ) : (
        <>
          <path d={GEM_PATH} fill="var(--cg-mana)" stroke="#1d0842" strokeWidth={7} strokeLinejoin="round" />
          <path d={GEM_PATH} fill="none" stroke="#ffffff55" strokeWidth={3} transform="translate(50 50) scale(0.82) translate(-50 -50)" />
        </>
      )}
      {kind === "temp" && <path d="M50 26 58 50 50 74 42 50Z M26 50 50 43 74 50 50 57Z" fill="#ffffff" stroke="#1d0842" strokeWidth={3} strokeLinejoin="round" />}
    </svg>
  );
}

/** Crystal slots the bar always shows (the max mana a player can reach). */
export const MANA_BAR_SLOTS = 10;

export interface ManaBarProps {
  current: number;
  max: number;
  temporary: number;
  label: string;
}

/**
 * My mana as a full-height vertical bar of cost gems on the right edge, filling bottom-up: filled = available, hollow = spent,
 * pale with a spark = temporary, faint socket = not unlocked yet. "current/max" sits at the foot. Styles: `.cg-manabar*`.
 */
export function ManaBar({ current, max, temporary, label }: ManaBarProps) {
  // `current` and `temporary` are separate pools (engine §6.4): temporary crystals sit on top of the unlocked ones.
  const base = Math.max(0, current);
  const available = base + temporary;
  const unlocked = Math.max(max, base);
  const slots = Math.max(MANA_BAR_SLOTS, unlocked + temporary);
  const kinds: (Kind | "locked")[] = Array.from({ length: slots }, (_, i) =>
    i < base ? "full" : i < unlocked ? "empty" : i < unlocked + temporary ? "temp" : "locked",
  );
  return (
    <span className={`cg-manabar${available === 0 ? " cg-manabar--spent" : ""}`} role="img" aria-label={label} title={label} data-cg-anchor="my-mana">
      <span className="cg-manabar-crystals" aria-hidden>
        {kinds.map((kind, i) =>
          kind === "locked" ? (
            <span key={i} className="cg-manabar-slot cg-manabar-slot--locked" />
          ) : (
            <span key={i} className={`cg-manabar-slot cg-manabar-slot--${kind}`}>
              <ManaGem kind={kind} />
            </span>
          ),
        )}
      </span>
      <span className="cg-manabar-num" aria-hidden>
        {/* Re-keyed on every change so the one-shot "tick" replays. */}
        <span key={available} className="cg-mana-gauge-num--tick">
          {available}
        </span>
        <span className="cg-manabar-max">/{max}</span>
      </span>
    </span>
  );
}

export interface ManaGaugeProps {
  current: number;
  max: number;
  temporary: number;
  label: string;
  /** Show the row of crystal pips next to the gem (off for the foe's compact strip). */
  pips?: boolean;
}

// A large cut gem (24×28 box), light from the upper left: ink silhouette, deep base, lit facets, highlight.
const GEM_OUTLINE = "M12 0.6 23 7.4V20.6L12 27.4 1 20.6V7.4Z";
const GEM_BODY = "M12 2.4 21.4 8.2V19.8L12 25.6 2.6 19.8V8.2Z";
const GEM_LIT = "M12 2.4V25.6L2.6 19.8V8.2Z";
const GEM_TABLE = "M12 7 17 10V18L12 21 7 18V10Z";
const GEM_SHINE = "M5 9.4 9.6 6.6 9.6 8.4 5 11.2Z";

/**
 * UI-08 HUD mana: the available amount on a big faceted gem, "/max" beside it, crystal pips for spent vs available,
 * and temporary mana as a separate pale "+N" spark chip (shape + label, not colour only). Styles: `.cg-mana-gauge*`.
 */
export function ManaGauge({ current, max, temporary, label, pips = true }: ManaGaugeProps) {
  const base = Math.max(0, current);
  const available = base + temporary;
  const kinds: Kind[] = Array.from({ length: Math.max(max, base) }, (_, i) => (i < base ? "full" : "empty"));
  return (
    <span className={`cg-mana-gauge${available === 0 ? " cg-mana-gauge--spent" : ""}`} role="img" aria-label={label} title={label}>
      <span className="cg-mana-gauge-gem">
        <svg viewBox="0 0 24 28" aria-hidden>
          <path d={GEM_OUTLINE} fill="#1d0842" />
          <path d={GEM_BODY} fill={available === 0 ? "#2a2550" : "#1f6fd1"} />
          <path d={GEM_LIT} fill={available === 0 ? "#3a3566" : "var(--cg-mana)"} />
          <path d={GEM_TABLE} fill={available === 0 ? "#ffffff10" : "#7cc8ff"} opacity={0.55} />
          <path d={GEM_SHINE} fill="#e6f6ff" opacity={available === 0 ? 0.3 : 0.95} />
        </svg>
        {/* Re-keyed on every change so the one-shot "tick" (UI-09 gem spend/gain feedback, CSS only) replays. */}
        <span key={available} className="cg-mana-gauge-num cg-mana-gauge-num--tick">
          {available}
        </span>
      </span>
      <span className="cg-mana-gauge-side">
        <span className="cg-mana-gauge-max">
          /{max}
          {temporary > 0 && <span className="cg-mana-gauge-temp">+{temporary}</span>}
        </span>
        {pips && kinds.length > 0 && (
          <span className="cg-mana-gauge-pips" aria-hidden>
            {kinds.map((kind, i) => (
              <Crystal key={i} kind={kind} size="var(--cg-pip)" />
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
