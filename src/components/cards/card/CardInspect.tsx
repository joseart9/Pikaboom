"use client";

// Enlarged card + glossary (§17.4, Phase 12 G.6): opened by long-press, right-click or "i". Shows the full card
// (live stats for a unit on the board), its type, tribe and rarity in Spanish, and one glossary row per keyword,
// ability word and status on it.
// UI-08: for a unit on the board it is the enemy-card explainer — owner, live attack/health against the printed
// values, every active keyword/status as an icon chip (the token only shows the top few), the rules text, then the
// glossary rows with their icons. Opened by a plain tap on a foe unit too (MatchScreen).
import { useEffect, useRef } from "react";
import { markerName, statDeltas, unitMarkers } from "@/game/cards/client/unitMarkers";
import { KEYWORDS } from "@/game/cards/catalog/keywords";
import { STATUS_DEFS } from "@/game/cards/catalog/statuses";
import type { CardDef, KeywordId, Keywords, StatusId } from "@/game/cards/catalog/types";
import type { UnitSnapshot } from "@/game/cards/engine/events";
import type { Seat } from "@/game/cards/engine/types";
import { cardName, cardText, t } from "@/game/cards/i18n";
import { es } from "@/game/cards/i18n/es";
import { AttackBadge, HealthBadge, KeywordIcon, RarityGem, StatDelta, StatusIcon } from "../skin";
import { CardFace, type CardOverrides } from "./CardFace";
import { CardText } from "./CardText";

export interface CardInspectProps {
  def: CardDef;
  overrides?: CardOverrides;
  /** The unit on the board, when inspecting one (live keywords, statuses, sleeping). */
  unit?: UnitSnapshot | null;
  /** The current turn, to say how long each status of `unit` lasts. */
  turn?: TurnRef | null;
  /** Whose unit it is (shows "Tu criatura" / "Criatura rival"); only with `unit`. */
  mine?: boolean;
  /** Extra line under the rarity (the collection's "not discovered yet" hint, Phase 14). */
  note?: string;
  onClose: () => void;
}

export interface GlossaryRow {
  key: string;
  name: string;
  text: string;
  kind: "keyword" | "ability" | "status" | "note";
  /** The bold verb the card text uses for this term ("Congela" for Congelado), when it has one. */
  verb?: string;
}

export interface TurnRef {
  number: number;
  activeSeat: Seat;
}

/**
 * How long a status lasts, in its owner's turns (§7.3: it is removed at the end of the owner's turn
 * `expiresAfterTurn`). Owner turns have the parity of `expiresAfterTurn`.
 */
export function statusTiming(expiresAfterTurn: number | null, controller: Seat, turn: TurnRef): string {
  if (expiresAfterTurn === null) return t("statusTiming.permanent");
  const ownTurn = turn.activeSeat === controller;
  const after = Math.max(0, Math.ceil((expiresAfterTurn - turn.number - (ownTurn ? 0 : 1)) / 2) + (ownTurn ? 0 : 1));
  if (after === 0) return t("statusTiming.thisTurn");
  if (after === 1) return t("statusTiming.next");
  return t("statusTiming.many", { turns: after });
}

function keywordValue(kw: Keywords, id: KeywordId): number | null {
  const v = kw[id];
  if (typeof v === "number") return v;
  if (v && typeof v === "object") return v.attack; // Furia: +attack
  return null;
}

function fill(text: string, n: number | string | null): string {
  return text.replaceAll("{n}", n === null ? "X" : String(n));
}

/** Bold chunks of the rules text ("**Renacer. Grito de Guerra:**" → ["Renacer. Grito de Guerra:"]). */
function boldChunks(text: string): string[] {
  return Array.from(text.matchAll(/\*\*([^*]+)\*\*/g), (m) => m[1]);
}

/** The glossary for a card (and its unit, if on the board), deduplicated by name, keywords first. */
export function glossaryRows(def: CardDef, unit?: UnitSnapshot | null, turn?: TurnRef | null): GlossaryRow[] {
  const rows: GlossaryRow[] = [];
  const seen = new Set<string>();
  const push = (row: GlossaryRow) => {
    if (seen.has(row.name)) return;
    seen.add(row.name);
    rows.push(row);
  };

  const keywords: Keywords = unit ? (unit.silenced ? {} : unit.keywords) : def.type === "mob" ? def.keywords : {};
  for (const meta of Object.values(KEYWORDS).sort((a, b) => a.order - b.order)) {
    if (keywords[meta.id] === undefined) continue;
    const entry = es.keyword[meta.id];
    const n = meta.id === "shield" && unit ? unit.shieldCharges : keywordValue(keywords, meta.id);
    push({ key: `kw-${meta.id}`, name: entry.name, text: fill(entry.text, n), kind: "keyword" });
  }

  const bold = boldChunks(cardText(def.id));
  for (const [id, entry] of Object.entries(es.keyword)) {
    const chunk = bold.find((c) => c.includes(entry.name));
    if (!chunk) continue;
    const n = new RegExp(`${entry.name} \\((\\d+)\\)`).exec(chunk)?.[1] ?? null;
    push({ key: `kw-${id}`, name: entry.name, text: fill(entry.text, n), kind: "keyword" });
  }
  const verbOf = (entry: object) => ("verb" in entry && typeof entry.verb === "string" ? entry.verb : undefined);
  const mentions = (chunk: string, word: string) => new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "u").test(chunk);
  for (const [id, entry] of Object.entries(es.abilityWords)) {
    const verb = verbOf(entry);
    if (bold.some((c) => mentions(c, entry.name) || (verb !== undefined && mentions(c, verb)))) {
      push({ key: `aw-${id}`, name: entry.name, text: entry.text, kind: "ability", verb });
    }
  }

  // Statuses on the unit (live magnitude + how long they last), then statuses its card text names.
  for (const st of unit?.statuses ?? []) {
    const entry = es.status[st.id];
    let text = fill(entry.text, st.magnitude);
    if (turn) text = `${text} ${statusTiming(st.expiresAfterTurn, unit?.controller ?? turn.activeSeat, turn)}`;
    push({ key: `st-${st.id}`, name: entry.name, text, kind: "status", verb: verbOf(entry) });
  }
  for (const id of Object.keys(STATUS_DEFS) as StatusId[]) {
    const entry = es.status[id];
    const verb = verbOf(entry);
    const chunk = bold.find((c) => mentions(c, entry.name) || (verb !== undefined && mentions(c, verb)));
    if (!chunk) continue;
    const n = new RegExp(`${entry.name} \\((\\d+)\\)`).exec(chunk)?.[1] ?? null;
    push({ key: `st-${id}`, name: entry.name, text: fill(entry.text, n), kind: "status", verb });
  }
  if (unit?.silenced) push({ key: "silenced", name: t("inspect.silenced"), text: "", kind: "note" });
  if (unit?.sleeping) push({ key: "sleeping", name: t("match.sleeping"), text: "", kind: "note" });
  return rows;
}

/** The icon for a glossary row, when it names a keyword or status the skin has a glyph for. */
function RowIcon({ row }: { row: GlossaryRow }) {
  if (row.key.startsWith("kw-")) return <KeywordIcon keyword={row.key.slice(3) as KeywordId} size="1.5em" />;
  if (row.key.startsWith("st-")) return <StatusIcon status={row.key.slice(3) as StatusId} size="1.5em" />;
  if (row.key === "silenced") return <StatusIcon status="silenced" size="1.5em" />;
  return null;
}

export function CardInspect({ def, overrides, unit, turn, mine, note, onClose }: CardInspectProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus({ preventScroll: true });
    return () => prev?.focus({ preventScroll: true });
  }, []);

  const rows = glossaryRows(def, unit, turn);
  const name = cardName(def.id);
  const typeLine = [def.type === "mob" ? t("inspect.mob") : t("inspect.spell"), ...(def.type === "mob" ? def.tribes.map((tr) => t(`tribe.${tr}`)) : [])];
  if (!def.collectible) typeLine.push(t("inspect.token"));
  const text = cardText(def.id);
  const markers = unit ? unitMarkers(unit) : [];
  const delta = unit ? statDeltas(unit, def) : { attack: 0, health: 0 };
  const printed = def.type === "mob" ? def : null;

  return (
    <div
      className="cg-inspect"
      data-cg-tap
      role="dialog"
      aria-modal="true"
      aria-label={t("inspect.title")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`cg-inspect-card cg-sheen cg-sheen--${def.rarity}`}>
        <CardFace def={def} overrides={overrides} />
      </div>
      <div className="cg-inspect-info">
        {unit && mine !== undefined && (
          <span className={`cg-inspect-owner cg-inspect-owner--${mine ? "mine" : "foe"}`}>{t(mine ? "inspect.yourUnit" : "inspect.foeUnit")}</span>
        )}
        <h2 className="cg-inspect-name">{name}</h2>
        <p className="cg-inspect-type">{typeLine.join(" · ")}</p>
        <p className="cg-inspect-rarity">
          <RarityGem rarity={def.rarity} size="1.1em" title={t(`rarity.${def.rarity}`)} />
          {t(`rarity.${def.rarity}`)}
        </p>
        {note && <p className="cg-inspect-note">{note}</p>}
        {unit && (
          <div className="cg-inspect-stats" aria-label={t("inspect.onBoard", { attack: unit.attack, health: unit.health, max: unit.maxHealth })}>
            <span className="cg-inspect-stat" aria-hidden>
              <AttackBadge value={unit.attack} buffed={delta.attack > 0} debuffed={delta.attack < 0} size="2.2em" />
              <StatDelta delta={delta.attack} size="1em" />
              <span>
                {t("inspect.attack")}
                {printed && delta.attack !== 0 && <small> ({t("inspect.base", { n: printed.attack })})</small>}
              </span>
            </span>
            <span className="cg-inspect-stat" aria-hidden>
              <HealthBadge value={unit.health} damaged={unit.health < unit.maxHealth} buffed={delta.health > 0} size="2.2em" />
              <StatDelta delta={delta.health} size="1em" />
              <span>
                {t("inspect.health")} {unit.health}/{unit.maxHealth}
                {printed && delta.health !== 0 && <small> ({t("inspect.base", { n: printed.health })})</small>}
              </span>
            </span>
          </div>
        )}
        {unit && (markers.length > 0 || unit.sleeping) && (
          <>
            <h3 className="cg-inspect-subtitle">{t("inspect.state")}</h3>
            <ul className="cg-inspect-chips">
              {markers.map((m) => (
                <li key={`${m.kind}-${m.id}`} className={`cg-inspect-chip${m.kind === "status" && m.harmful ? " cg-inspect-chip--harmful" : ""}`}>
                  {m.kind === "keyword" ? <KeywordIcon keyword={m.id} value={m.value} size="1.4em" /> : <StatusIcon status={m.id} magnitude={m.magnitude} size="1.4em" />}
                  {markerName(m)}
                </li>
              ))}
              {unit.sleeping && <li className="cg-inspect-chip">zZz {t("match.sleeping")}</li>}
            </ul>
          </>
        )}
        <h3 className="cg-inspect-subtitle">{t("inspect.rulesText")}</h3>
        <p className="cg-inspect-text">{text ? <CardText text={text} /> : t("inspect.noText")}</p>
        <h3 className="cg-inspect-subtitle">{t("inspect.glossary")}</h3>
        {rows.length === 0 ? (
          <p className="cg-inspect-empty">{t("inspect.empty")}</p>
        ) : (
          <dl className="cg-inspect-glossary">
            {rows.map((r) => (
              <div key={r.key} className={`cg-inspect-row cg-inspect-row--${r.kind}`}>
                <dt>
                  <RowIcon row={r} />
                  {r.name}
                </dt>
                {r.text && <dd>{r.text}</dd>}
              </div>
            ))}
          </dl>
        )}
        <button ref={closeRef} type="button" className="cg-button cg-button--primary" onClick={onClose}>
          {t("inspect.close")}
        </button>
      </div>
    </div>
  );
}
