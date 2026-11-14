"use client";

// The FX layer (§18.4, Phase 13): an overlay over the battlefield that holds the DOM floaters (numbers, flashes,
// flying cards, the turn banner, Phase 20's dim/rays/name ribbon), ONE particle canvas, and the centre card reveal
// (the only React-rendered effect; Phase 20 adds the heavy/cinematic slam-in with the card's rarity glow).
// It builds the `FxApi` and registers it with the match client while mounted; it must be a direct child of the
// battlefield root (the element registry and anchors are looked up there).
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CATALOG } from "@/game/cards/catalog";
import type { CardId, Rarity } from "@/game/cards/catalog/types";
import { DomFx, ParticleSystem, type RevealMode } from "@/game/cards/client/animation/fx";
import type { MatchClient } from "@/game/cards/client/matchClient";
import { CardFace } from "../card/CardFace";

interface RevealState {
  defId: CardId;
  mode: RevealMode;
  ms: number;
  key: number;
  inMs?: number;
  rarity?: Rarity;
  caption?: string;
}

export function FxLayer({ client }: { client: MatchClient }) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reveal, setReveal] = useState<RevealState | null>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const root = layer?.parentElement;
    if (!layer || !root) return;
    const particles = canvasRef.current ? new ParticleSystem(canvasRef.current) : null;
    const fx = new DomFx({ root, layer, particles, showReveal: setReveal });
    client.setFx(fx);
    return () => {
      client.setFx(null);
      fx.dispose();
      particles?.dispose();
    };
  }, [client]);

  const def = reveal ? CATALOG[reveal.defId] : undefined;
  return (
    <div ref={layerRef} className="cg-fx-layer" aria-hidden>
      <canvas ref={canvasRef} className="cg-fx-canvas" />
      {reveal && def && (
        <div
          key={reveal.key}
          className={`cg-fx-reveal cg-fx-reveal--${reveal.mode}${reveal.rarity ? ` cg-fx-reveal--${reveal.rarity}` : ""}${reveal.caption ? " cg-fx-reveal--captioned" : ""}`}
          style={{ "--cg-fx-ms": `${reveal.ms}ms`, "--cg-fx-in-ms": `${reveal.inMs ?? 0}ms` } as CSSProperties}
        >
          {reveal.caption && <div className="cg-fx-reveal-caption">{reveal.caption}</div>}
          <div className="cg-fx-reveal-card">
            <CardFace def={def} />
          </div>
        </div>
      )}
    </div>
  );
}
