import { GameIcon } from "./GameIcon";

export type EndTurnState = "ready" | "readyIdle" | "foe" | "pending";

export interface EndTurnButtonProps {
  /** `readyIdle` = your turn and nothing else is playable (pulses). */
  state: EndTurnState;
  label: string;
  onPress: () => void;
}

/**
 * End-turn control (§17.3): a raised green gem-cut face with gold trim and an arrow on your turn (pulsing when idle),
 * a sunken violet face with an hourglass on the foe's turn, a dashed pending look while the server confirms.
 * Styles: `.cg-endturn*` in cards.css. UI-08 decides its final size/placement in the HUD.
 */
export function EndTurnButton({ state, label, onPress }: EndTurnButtonProps) {
  const enabled = state === "ready" || state === "readyIdle";
  return (
    <button
      type="button"
      className={`cg-endturn cg-endturn--${state}`}
      onClick={enabled ? onPress : undefined}
      disabled={!enabled}
    >
      <GameIcon name={enabled ? "endTurn" : "hourglass"} size="0.9em" outlined={enabled} />
      <span>{label}</span>
    </button>
  );
}
