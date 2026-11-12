export type EndTurnState = "ready" | "readyIdle" | "foe" | "pending";

export interface EndTurnButtonProps {
  /** `readyIdle` = your turn and nothing else is playable (pulses). */
  state: EndTurnState;
  label: string;
  onPress: () => void;
}

/** Big bottom-right end-turn button (§17.3): green on your turn (pulsing when idle), grey on the foe's. */
export function EndTurnButton({ state, label, onPress }: EndTurnButtonProps) {
  const enabled = state === "ready" || state === "readyIdle";
  return (
    <button
      type="button"
      onClick={enabled ? onPress : undefined}
      disabled={!enabled}
      style={{
        minHeight: "max(56px, 13dvh)",
        minWidth: "max(96px, 15dvw)",
        padding: "0 14px",
        borderRadius: 16,
        border: 0,
        fontFamily: "var(--font-display)",
        fontSize: "clamp(15px, 4dvh, 26px)",
        lineHeight: 1,
        color: enabled ? "var(--cg-button-ink)" : "var(--cg-text)",
        background: enabled ? "var(--cg-button)" : "var(--cg-button-off)",
        boxShadow: "0 4px 0 var(--cg-shadow)",
        cursor: enabled ? "pointer" : "default",
        animation: state === "readyIdle" ? "cg-pulse 1.4s ease-in-out infinite" : undefined,
      }}
    >
      {label}
    </button>
  );
}
