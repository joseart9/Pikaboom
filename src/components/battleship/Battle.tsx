"use client";

import { useEffect, useMemo, useState } from "react";
import { playClick, playError, playPick } from "@/game/audio";
import { type Action, ABILITY_INFO, abilityBlock, area, isFinal, rc, shipCells, type View } from "@/game/battleship/logic";
import { AbilityBar, AbilityDetail, type Tool } from "./Abilities";
import { Board, type CellFx } from "./Board";
import { AbilityIcon } from "./icons";
import { NO_ZOOM, type Zoom, zoomAt, ZoomPan } from "./ZoomPan";

export type Tab = "enemy" | "own";

/** Which board a tool is aimed at. */
function sideOf(tool: Tool): "enemy" | "own" | "none" {
  if (tool === "shot") return "enemy";
  const t = ABILITY_INFO[tool].target;
  return t === "enemy" ? "enemy" : t === "none" ? "none" : "own";
}

function actionText(tool: Tool) {
  switch (tool) {
    case "sonar":
      return "ESCANEAR";
    case "repair":
      return "REPARAR";
    case "sam":
      return "DESPLEGAR SAM";
    case "mine":
      return "PONER MINA";
    case "decoy":
      return "SEÑUELO";
    case "double":
      return "ACTIVAR DOBLE";
    case "ciws":
      return "ARMAR CIWIS";
    default:
      return "¡FUEGO!";
  }
}

function hint(tool: Tool) {
  switch (tool) {
    case "repair":
      return "Toca en tu flota el barco dañado o hundido";
    case "sam":
      return "Toca en tu mapa el centro de la zona 5×5 a proteger";
    case "mine":
    case "decoy":
      return "Toca agua libre de tu mapa";
    case "double":
      return "Tendrás dos disparos este turno";
    case "ciws":
      return "Derriba la próxima arma especial del rival · termina tu turno";
    case "sonar":
      return "Elige el centro del área a escanear";
    case "torpedo":
      return "Elige la casilla de salida: el torpedo avanza 5 casillas a la izquierda";
    case "air":
    case "cross":
      return "Elige el centro del ataque";
    default:
      return "Elige una casilla del mapa enemigo";
  }
}

export function Battle({
  view,
  act,
  busy,
  tab,
  setTab,
  enemyFx,
  ownFx,
  hiddenEnemy,
  hiddenOwn,
  shakeEnemy,
  shakeOwn,
  foeOnline,
  onError,
}: {
  view: View;
  act: (a: Action) => Promise<string | null>;
  busy: boolean;
  tab: Tab;
  setTab: (t: Tab) => void;
  enemyFx: CellFx[];
  ownFx: CellFx[];
  hiddenEnemy: number[];
  hiddenOwn: number[];
  shakeEnemy: number;
  shakeOwn: number;
  foeOnline: boolean;
  onError: (msg: string) => void;
}) {
  const [tool, setTool] = useState<Tool>("shot");
  const [target, setTarget] = useState<number | null>(null);
  const [info, setInfo] = useState<Tool | null>(null);
  const [zoom, setZoom] = useState<Zoom>(NO_ZOOM);
  const n = view.size;
  const myTurn = view.turn === view.seat;
  const arcade = view.mode === "arcade";
  const me = view.me;
  const foe = view.foe!;
  const side = sideOf(tool);

  // Fresh aim every turn; fall back to the plain shot when the picked ability stops being usable.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset aim when the turn changes
    setTarget(null);
  }, [view.turn]);
  useEffect(() => {
    if (tool !== "shot" && abilityBlock(me, tool)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ability used up / ship sunk
      setTool("shot");
    }
  }, [me, tool]);
  // Each board opens showing the whole sea.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset zoom when switching boards
    setZoom(NO_ZOOM);
  }, [tab]);

  const repairShip = useMemo(() => {
    if (tool !== "repair" || target === null) return null;
    return me.ships.find((s) => shipCells(s, n).includes(target)) ?? null;
  }, [tool, target, me.ships, n]);

  const { preview, previewOk } = useMemo(() => {
    if (target === null) return { preview: [] as number[], previewOk: true };
    switch (tool) {
      case "cross":
      case "air":
      case "torpedo":
      case "sonar":
        return { preview: area(tool, target, n), previewOk: true };
      case "sam":
        return { preview: area("sam", target, n), previewOk: true };
      case "repair":
        return repairShip ? { preview: shipCells(repairShip, n), previewOk: repairShip.hits.length > 0 } : { preview: [target], previewOk: false };
      case "mine":
      case "decoy": {
        const free = !me.ships.some((s) => shipCells(s, n).includes(target)) && !me.received[target] && !me.mines.includes(target) && !me.decoys.includes(target);
        return { preview: free ? [] : [target], previewOk: free };
      }
      default:
        return { preview: [] as number[], previewOk: true };
    }
  }, [target, tool, n, me, repairShip]);

  const pickTool = (t: Tool) => {
    if (t !== "shot") {
      const block = abilityBlock(me, t);
      if (block) {
        playError();
        return onError(block.text);
      }
    }
    playPick();
    setTool(t);
    setTarget(null);
    const s = sideOf(t);
    if (s !== "none") setTab(s);
  };

  const fire = async (cell: number | null) => {
    if (!myTurn || busy) return;
    let action: Action;
    if (side === "none") action = { t: "ability", ability: tool as Exclude<Tool, "shot"> };
    else if (cell === null) return;
    else if (tool === "shot") action = { t: "fire", weapon: "shot", cell };
    else action = { t: "ability", ability: tool, cell };
    const err = await act(action);
    if (err) {
      playError();
      onError(err);
    } else {
      setTarget(null);
      setTool("shot");
    }
  };

  const onEnemyCell = (cell: number) => {
    if (!myTurn) {
      playError();
      return onError(`Es el turno de ${foe.name}.`);
    }
    if (side !== "enemy") {
      playError();
      return onError(`${ABILITY_INFO[tool as Exclude<Tool, "shot">].name} se usa en tu mapa.`);
    }
    if (tool === "shot" && isFinal(foe.received[cell])) {
      playError();
      return onError("Ya disparaste ahí.");
    }
    if (cell === target) return void fire(cell); // second tap on the same cell = fire
    playPick();
    setTarget(cell);
  };

  const onOwnCell = (cell: number) => {
    if (!myTurn || side !== "own") return;
    if (cell === target && previewOk) return void fire(cell);
    playPick();
    setTarget(cell);
  };

  const toggleZoom = () => {
    playClick();
    if (zoom.s > 1.05) return setZoom(NO_ZOOM);
    const w = document.querySelector<HTMLElement>("[data-zoom-frame]")?.clientWidth ?? 340;
    const [r, c] = target !== null ? rc(target, n) : [(n - 1) / 2, (n - 1) / 2];
    setZoom(zoomAt(2, (c + 0.5) / n, (r + 0.5) / n, w));
  };

  const shipsLeft = me.ships.filter((s) => !s.sunk).length;
  const needsTarget = side !== "none";
  const ready = myTurn && !busy && (!needsTarget || (target !== null && previewOk));
  const subline = !myTurn
    ? `${foe.name} está apuntando…`
    : view.shotsLeft > 1
      ? `Te quedan ${view.shotsLeft} disparos · ${needsTarget && target === null ? hint(tool) : "Toca otra vez o aquí para confirmar"}`
      : needsTarget && target !== null
        ? previewOk
          ? "Toca otra vez la casilla o aquí para confirmar"
          : "Ahí no se puede, elige otra casilla"
        : hint(tool);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* scoreline: the glowing card is whoever's turn it is */}
      <div className="grid shrink-0 grid-cols-2 gap-2">
        {[
          { name: `${me.name} (tú)`, left: shipsLeft, active: myTurn, color: "#00bbf9", online: true, ciws: me.ciws, shots: myTurn ? view.shotsLeft : 1 },
          { name: foe.name, left: foe.shipsLeft, active: !myTurn, color: "#ff4d6d", online: foeOnline, ciws: false, shots: !myTurn ? view.shotsLeft : 1 },
        ].map((p, i) => (
          <div
            key={i}
            className={`relative flex min-w-0 items-center gap-2 rounded-2xl border-2 px-2 py-1.5 transition ${p.active ? "bg-white/15" : "bg-white/5 opacity-70"}`}
            style={{ borderColor: p.active ? p.color : "transparent", boxShadow: p.active ? `0 0 14px ${p.color}66` : undefined }}
          >
            <span className="relative text-2xl">
              {i === 0 ? "⚓" : "🏴‍☠️"}
              {i === 1 && <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#2b0a57] ${p.online ? "bg-[#06d6a0]" : "bg-[#ff4d6d]"}`} />}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-black">{p.name}</div>
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-white/70">
                <span>🚢 {p.left}/5</span>
                {p.active && <span style={{ color: p.color }}>{p.shots > 1 ? `🎯×${p.shots}` : "● Turno"}</span>}
                {arcade && p.ciws && <span title="CIWIS armado">🚨</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!foeOnline && (
        <div className="pb-pop-in shrink-0 rounded-xl bg-[#ffbe0b]/20 px-3 py-1 text-center text-xs font-extrabold text-[#ffe066]">
          📵 {foe.name} se desconectó… la partida sigue guardada, esperando a que vuelva.
        </div>
      )}

      {/* board tabs + zoom */}
      <div className="flex shrink-0 gap-1.5">
        <div className="grid flex-1 grid-cols-2 gap-1 rounded-2xl bg-white/10 p-1">
          {(
            [
              ["enemy", `🏴‍☠️ Mar enemigo`],
              ["own", `⚓ Mi flota`],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                playClick();
                setTab(t);
              }}
              className={`rounded-xl py-1.5 text-sm font-black transition ${tab === t ? (t === "enemy" ? "bg-[#ff4d6d] text-[#1d0842]" : "bg-[#00bbf9] text-[#1d0842]") : "text-white/70"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {arcade && (
          <button
            onClick={toggleZoom}
            aria-label={zoom.s > 1.05 ? "Ver todo el mapa" : "Acercar el mapa"}
            className={`grid w-12 shrink-0 place-items-center rounded-2xl text-lg font-black transition active:scale-90 ${zoom.s > 1.05 ? "bg-[#ffe066] text-[#1d0842]" : "bg-white/10"}`}
          >
            {zoom.s > 1.05 ? "🔍−" : "🔍+"}
          </button>
        )}
      </div>

      {/* the board */}
      <div className="flex min-h-0 flex-1 items-center" style={{ containerType: "size" }}>
        <div className="mx-auto" data-zoom-frame style={{ width: "min(100cqw, 100cqh)" }}>
          <ZoomPan zoom={zoom} setZoom={setZoom}>
            {tab === "enemy" ? (
              <Board
                key="enemy"
                n={n}
                enemy
                ships={foe.ships}
                marks={foe.received}
                sonar={me.sonar}
                preview={side === "enemy" ? preview : []}
                selected={side === "enemy" ? target : null}
                fx={enemyFx}
                hidden={hiddenEnemy}
                shake={shakeEnemy > 0}
                onCell={onEnemyCell}
                disabled={busy}
              />
            ) : (
              <Board
                key="own"
                n={n}
                ships={me.ships}
                marks={me.received}
                sonar={foe.scan}
                mines={me.mines}
                decoys={me.decoys}
                decoyHits={me.decoyHits}
                sam={me.sam}
                preview={side === "own" ? preview : []}
                previewOk={previewOk}
                selected={side === "own" ? target : null}
                fx={ownFx}
                hidden={hiddenOwn}
                shake={shakeOwn > 0}
                onCell={onOwnCell}
                disabled={busy}
              />
            )}
          </ZoomPan>
        </div>
      </div>

      {arcade && <AbilityBar me={me} tool={tool} onPick={pickTool} onInfo={setInfo} />}

      <button
        onClick={() => void fire(target)}
        disabled={!ready}
        data-haptic="heavy"
        data-launcher
        className="pb-btn h-16 w-full shrink-0 flex-col gap-0 leading-none"
        style={{ ["--btn" as string]: myTurn ? "#ff4d6d" : "#b9a6ff" }}
      >
        <span className="flex items-center gap-2 text-3xl leading-none">
          {busy ? (
            "⏳ Enviando…"
          ) : myTurn ? (
            <>
              <AbilityIcon id={tool} className="h-8 w-8 drop-shadow" />
              {actionText(tool)}
            </>
          ) : (
            "Esperando…"
          )}
        </span>
        <span className="mt-0.5 max-w-full truncate px-2 font-sans text-[11px] font-black opacity-75">{subline}</span>
      </button>

      {info && <AbilityDetail tool={info} me={me} onClose={() => setInfo(null)} onPick={pickTool} />}
    </div>
  );
}
