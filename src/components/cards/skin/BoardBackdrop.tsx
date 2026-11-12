/** The table surface behind both boards (decorative). */
export function BoardBackdrop() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse 70% 55% at 50% 50%, var(--cg-board) 0%, var(--cg-board-2) 60%, transparent 100%)," +
          "repeating-linear-gradient(90deg, transparent 0 79px, #ffffff08 79px 80px)",
      }}
    />
  );
}
