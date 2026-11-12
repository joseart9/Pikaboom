// Status metadata registry (§7.2, §9.7). Behavior lives in the engine (Phase 18); names/texts in `es.status`.

export type StatusId =
  | "burn" | "freeze" | "stun" | "weakness" | "vulnerability"
  | "curse" | "blessing" | "disarm" | "bleed" | "immune";

export interface StatusDef {
  id: StatusId;
  polarity: "positive" | "negative";
  stacking: "refresh" | "max" | "add" | "ignore";
  defaultDuration: number | null; // null = permanent
  hasMagnitude: boolean;
  icon: string; // icon key for the skin
}

export const STATUS_DEFS: Record<StatusId, StatusDef> = {
  burn: { id: "burn", polarity: "negative", stacking: "max", defaultDuration: 2, hasMagnitude: true, icon: "burn" },
  freeze: { id: "freeze", polarity: "negative", stacking: "refresh", defaultDuration: 1, hasMagnitude: false, icon: "freeze" },
  stun: { id: "stun", polarity: "negative", stacking: "refresh", defaultDuration: 1, hasMagnitude: false, icon: "stun" },
  weakness: { id: "weakness", polarity: "negative", stacking: "add", defaultDuration: 2, hasMagnitude: true, icon: "weakness" },
  vulnerability: {
    id: "vulnerability",
    polarity: "negative",
    stacking: "add",
    defaultDuration: 2,
    hasMagnitude: true,
    icon: "vulnerability",
  },
  curse: { id: "curse", polarity: "negative", stacking: "ignore", defaultDuration: null, hasMagnitude: false, icon: "curse" },
  blessing: { id: "blessing", polarity: "positive", stacking: "add", defaultDuration: 2, hasMagnitude: true, icon: "blessing" },
  disarm: { id: "disarm", polarity: "negative", stacking: "refresh", defaultDuration: 1, hasMagnitude: false, icon: "disarm" },
  bleed: { id: "bleed", polarity: "negative", stacking: "add", defaultDuration: 2, hasMagnitude: true, icon: "bleed" },
  immune: { id: "immune", polarity: "positive", stacking: "refresh", defaultDuration: 1, hasMagnitude: false, icon: "immune" },
};
