import { Badge, MODIFIED_STAT } from "./Badge";

export interface HealthBadgeProps {
  value: number;
  max?: number;
  damaged: boolean;
  /** Max health raised above the printed value (UI-08). */
  buffed?: boolean;
  /** On the board: health differs from the printed card (damaged, healed above it, buffed or debuffed). */
  modified?: boolean;
  size: string;
  title?: string;
}

/**
 * Health number on a red drop; pink-red when the character is damaged, mint when its max health is buffed. Board units
 * pass `modified` instead: any change from the printed value shows dark red with a black rim.
 */
export function HealthBadge({ value, damaged, buffed = false, modified, size, title }: HealthBadgeProps) {
  if (modified) return <Badge shape="drop" fill="var(--cg-health)" value={value} size={size} {...MODIFIED_STAT} title={title} />;
  const color = damaged ? "#ffd6de" : buffed ? "#b9ffe6" : "var(--cg-text)";
  return <Badge shape="drop" fill="var(--cg-health)" value={value} size={size} valueColor={color} title={title} />;
}
