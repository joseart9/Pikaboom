import type { StatusId } from "@/game/cards/catalog/types";

export interface StatusIconProps {
  status: StatusId;
  magnitude?: number;
  size: string;
  title?: string;
}

/** Placeholder status marker (statuses arrive in Phase 18): a ringed disc with the status initial. */
export function StatusIcon({ status, magnitude, size, title }: StatusIconProps) {
  return (
    <span
      title={title}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#3a0d2e",
        boxShadow: "0 0 0 2px #ff9f1c",
        fontFamily: "var(--font-display)",
        fontSize: `calc(${size} * 0.55)`,
        color: "var(--cg-text)",
        lineHeight: 1,
      }}
    >
      {status.slice(0, 1).toUpperCase()}
      {magnitude !== undefined && magnitude > 1 ? magnitude : null}
    </span>
  );
}
