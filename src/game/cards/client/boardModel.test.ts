import { describe, expect, it } from "vitest";
import type { EndReason } from "../engine/types";
import { t } from "../i18n";
import { gameOutcome } from "./boardModel";

const REASONS: EndReason[] = ["hero_destroyed", "mutual_destruction", "concede", "abandon", "turn_limit"];

describe("gameOutcome (GameOverOverlay, Phase 11 G.9)", () => {
  it("is null while the match goes on", () => {
    expect(gameOutcome("active", null, 0, null)).toBeNull();
    expect(gameOutcome("lobby", null, 1, null)).toBeNull();
    expect(gameOutcome("cancelled", null, 0, null)).toBeNull();
  });

  it("victory / defeat / draw from the viewer's seat", () => {
    expect(gameOutcome("finished", 0, 0, "concede")).toEqual({ outcome: "victory", reason: "concede" });
    expect(gameOutcome("finished", 0, 1, "concede")).toEqual({ outcome: "defeat", reason: "concede" });
    expect(gameOutcome("finished", "draw", 1, "mutual_destruction")).toEqual({ outcome: "draw", reason: "mutual_destruction" });
  });

  it("a stale-abandoned match has no winner", () => {
    expect(gameOutcome("abandoned", null, 0, null)).toEqual({ outcome: "abandoned", reason: "stale" });
  });

  it("every end reason has its Spanish text (Phase 11 G.9)", () => {
    expect(REASONS.map((r) => t(`endReason.${r}`))).toEqual([
      "¡Héroe derrotado!",
      "¡Ambos héroes cayeron!",
      "Rendición",
      "Abandono por inactividad",
      "Límite de turnos",
    ]);
    expect(t("endReason.stale")).not.toBe("endReason.stale");
  });
});
