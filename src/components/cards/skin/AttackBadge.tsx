import { Badge, MODIFIED_STAT } from "./Badge";

export interface AttackBadgeProps {
  value: number;
  buffed: boolean;
  debuffed: boolean;
  /** On the board: attack differs from the printed card. */
  modified?: boolean;
  size: string;
  title?: string;
}

/** Attack number on a yellow diamond; green when buffed above the printed value, pale when below. */
export function AttackBadge({ value, buffed, debuffed, modified, size, title }: AttackBadgeProps) {
  if (modified) return <Badge shape="diamond" fill="var(--cg-attack)" value={value} size={size} {...MODIFIED_STAT} title={title} />;
  const color = buffed ? "#b9ffe6" : debuffed ? "#ffd6de" : "var(--cg-text)";
  return <Badge shape="diamond" fill="var(--cg-attack)" value={value} size={size} valueColor={color} title={title} />;
}
