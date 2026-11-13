// UI-08: which keyword/status cues a board unit shows persistently, in priority order, so a token never becomes
// "icon soup". The token shows the first few; the inspect sheet lists all of them (glossary).
import type { CardDef, KeywordId, StatusId } from "@/game/cards/catalog/types";
import { KEYWORDS } from "@/game/cards/catalog/keywords";
import { STATUS_DEFS } from "@/game/cards/catalog/statuses";
import type { UnitSnapshot } from "@/game/cards/engine/events";
import { t } from "@/game/cards/i18n";

export type UnitMarker =
  | { kind: "keyword"; id: KeywordId; value?: number }
  | { kind: "status"; id: StatusId | "silenced"; magnitude?: number; harmful: boolean };

/**
 * Lower = more important. Things that change what the unit can do this turn (cannot attack, lost its text, cannot
 * be hit) come first, then damage blockers and Provocar, then harmful statuses, then the remaining keywords.
 */
const PRIORITY: Record<string, number> = {
  "status:freeze": 0,
  "status:stun": 1,
  "status:silenced": 2,
  "keyword:divineShield": 3,
  "keyword:shield": 4,
  "keyword:taunt": 5,
  "keyword:stealth": 6,
  "status:immune": 7,
  "status:disarm": 8,
  "status:burn": 9,
  "status:bleed": 10,
  "keyword:poison": 11,
  "status:vulnerability": 12,
  "status:weakness": 13,
  "status:curse": 14,
  "status:blessing": 15,
};
const KEYWORD_BASE = 20;

function priority(m: UnitMarker): number {
  const p = PRIORITY[`${m.kind}:${m.id}`];
  if (p !== undefined) return p;
  return m.kind === "keyword" ? KEYWORD_BASE + KEYWORDS[m.id].order : KEYWORD_BASE + 50;
}

/** Every keyword/status cue on the unit, most important first. */
export function unitMarkers(unit: UnitSnapshot): UnitMarker[] {
  const out: UnitMarker[] = [];
  if (unit.silenced) out.push({ kind: "status", id: "silenced", harmful: true });
  else {
    for (const meta of Object.values(KEYWORDS)) {
      const v = unit.keywords[meta.id];
      if (v === undefined) continue;
      if (meta.id === "shield") {
        if (unit.shieldCharges > 0) out.push({ kind: "keyword", id: "shield", value: unit.shieldCharges });
        continue;
      }
      out.push({ kind: "keyword", id: meta.id, value: typeof v === "number" ? v : undefined });
    }
  }
  for (const st of unit.statuses) {
    const def = STATUS_DEFS[st.id];
    out.push({ kind: "status", id: st.id, magnitude: def.hasMagnitude ? st.magnitude : undefined, harmful: def.polarity === "negative" });
  }
  return out.sort((a, b) => priority(a) - priority(b));
}

/** The markers shown on the token: at most `max` slots; when some don't fit, the last slot becomes "+N". */
export function visibleMarkers(all: readonly UnitMarker[], max: number): { shown: UnitMarker[]; hidden: number } {
  if (all.length <= max) return { shown: [...all], hidden: 0 };
  const shown = all.slice(0, Math.max(0, max - 1));
  return { shown, hidden: all.length - shown.length };
}

/** Attack / max-health difference from the printed card (buff > 0, debuff < 0). */
export function statDeltas(unit: UnitSnapshot, def: CardDef | undefined): { attack: number; health: number } {
  if (!def || def.type !== "mob") return { attack: 0, health: 0 };
  return { attack: unit.attack - def.attack, health: unit.maxHealth - def.health };
}

/** The Spanish name shown for a marker (tooltip, aria label, inspect chips). */
export function markerName(m: UnitMarker): string {
  if (m.kind === "keyword") return t(`keyword.${m.id}.name`);
  return m.id === "silenced" ? t("abilityWords.silence.name") : t(`status.${m.id}.name`);
}
