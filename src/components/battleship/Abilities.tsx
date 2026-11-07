"use client";

import { type PointerEvent, useRef, useState } from "react";
import { playClick } from "@/game/audio";
import {
  ABILITIES,
  ABILITY_INFO,
  abilityBlock,
  type AbilityId,
  type AbilityInfo,
  ARCADE_SIZE,
  FLEET,
  type MeView,
  SHIP_ABILITIES,
  SHIP_INFO,
  type ShipType,
} from "@/game/battleship/logic";
import { ShipSprite } from "./ships";

export type Tool = "shot" | AbilityId;

const ATTACK = "#ff8fa3";
const STRATEGY = "#7dd3ff";
const LONG_PRESS_MS = 420;

const kindColor = (k: AbilityInfo["kind"]) => (k === "attack" ? ATTACK : STRATEGY);
const kindLabel = (k: AbilityInfo["kind"]) => (k === "attack" ? "Ataque" : "Estrategia");
const turns = (n: number) => `${n} turno${n === 1 ? "" : "s"}`;

/** Attack first, then strategy: the top row of the bar is all weapons. */
const column = (ship: ShipType) =>
  [...SHIP_ABILITIES[ship]].sort((a, b) => (ABILITY_INFO[a].kind === ABILITY_INFO[b].kind ? 0 : ABILITY_INFO[a].kind === "attack" ? -1 : 1));

/** Press-and-hold handler that doesn't also fire the tap. */
function useLongPress(onLong: () => void, onTap: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fired = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const cancel = () => clearTimeout(timer.current);
  return {
    onPointerDown: (e: PointerEvent) => {
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      cancel();
      timer.current = setTimeout(() => {
        fired.current = true;
        navigator.vibrate?.(15);
        onLong();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: PointerEvent) => {
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => {
      if (fired.current) return;
      onTap();
    },
  };
}

function Tile({
  id,
  me,
  selected,
  onPick,
  onInfo,
}: {
  id: Tool;
  me: MeView;
  selected: boolean;
  onPick: (t: Tool) => void;
  onInfo: (t: Tool) => void;
}) {
  const press = useLongPress(
    () => onInfo(id),
    () => onPick(id),
  );
  if (id === "shot") {
    return (
      <button
        {...press}
        aria-label="Disparo normal"
        className={`relative row-span-2 flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 transition active:scale-95 ${
          selected ? "border-[#ffe066] bg-[#ffe066]/25" : "border-white/15 bg-white/10"
        }`}
        style={{ WebkitTouchCallout: "none", userSelect: "none" }}
      >
        <span className="text-2xl leading-none">💥</span>
        <span className="text-[10px] font-black leading-none">Disparo</span>
        <span className="text-[10px] font-black leading-none text-white/50">∞</span>
      </button>
    );
  }
  const info = ABILITY_INFO[id];
  const st = me.abil[id];
  const block = abilityBlock(me, id);
  const cd = st?.cd ?? 0;
  const charge = block?.reason === "cooldown" ? 1 - cd / info.cooldown : 1;
  const dead = block?.reason === "sunk" || block?.reason === "spent" || block?.reason === "missing";
  const color = kindColor(info.kind);
  return (
    <button
      {...press}
      aria-label={`${info.name}${block ? `: ${block.text}` : ""}`}
      className={`relative flex h-11 min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border-2 transition active:scale-95 ${
        selected ? "border-[#ffe066]" : ""
      }`}
      style={{
        WebkitTouchCallout: "none",
        userSelect: "none",
        borderColor: selected ? undefined : block ? "rgb(255 255 255 / .08)" : `${color}88`,
        background: dead ? "#2a2238" : block ? "#3d3652" : selected ? "rgb(255 224 102 / .25)" : `${color}26`,
      }}
    >
      {/* cooldown: grey tile that fills up with colour turn by turn */}
      {block?.reason === "cooldown" && (
        <span className="absolute inset-x-0 bottom-0 transition-[height] duration-700" style={{ height: `${charge * 100}%`, background: `${color}40` }} />
      )}
      <span className="relative grid h-[18px] place-items-center">
        <span className={`text-lg leading-none ${block ? "opacity-35 grayscale" : ""}`}>{info.emoji}</span>
        {/* turns left until it's ready, right over the icon */}
        {block?.reason === "cooldown" && (
          <span className="absolute inset-0 grid place-items-center font-display text-base leading-none text-white" style={{ textShadow: "0 1px 2px #1d0842" }}>
            {cd}
          </span>
        )}
      </span>
      <span
        className={`relative max-w-full truncate px-0.5 font-black leading-tight ${info.short.length > 8 ? "text-[8px] tracking-tight" : "text-[9px]"} ${block ? "text-white/45" : ""} ${dead ? "line-through" : ""}`}
      >
        {info.short}
      </span>
      {st?.left != null && (
        <span
          className={`absolute right-0.5 top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full px-0.5 text-[9px] font-black leading-none ${
            st.left > 0 ? "bg-[#ffe066] text-[#1d0842]" : "bg-white/20 text-white/60"
          }`}
        >
          {st.left}
        </span>
      )}
      {block?.reason === "sunk" && <span className="absolute inset-0 grid place-items-center text-base">☠️</span>}
    </button>
  );
}

/** Disparo + every ability, one column per ship (attack on top, strategy below). Hold any tile for details. */
export function AbilityBar({ me, tool, onPick, onInfo }: { me: MeView; tool: Tool; onPick: (t: Tool) => void; onInfo: (t: Tool) => void }) {
  return (
    <div className="grid shrink-0 grid-cols-[1.05fr_repeat(5,1fr)] grid-rows-[auto_auto_auto] gap-x-1.5 gap-y-1">
      <span />
      {FLEET.map((f) => {
        const ship = me.ships.find((s) => s.type === f.type);
        const sunk = !!ship?.sunk;
        return (
          <span
            key={f.type}
            className={`flex h-2.5 items-center justify-center gap-[2px] ${sunk ? "text-[9px] font-black text-[#ff4d6d]" : ""}`}
            title={f.name}
          >
            {sunk ? "☠️ hundido" : Array.from({ length: f.size }, (_, k) => <span key={k} className="h-1.5 w-1.5 rounded-[2px] bg-white/50" />)}
          </span>
        );
      })}
      <Tile id="shot" me={me} selected={tool === "shot"} onPick={onPick} onInfo={onInfo} />
      {[0, 1].flatMap((row) =>
        FLEET.map((f) => {
          const id = column(f.type)[row];
          return <Tile key={id} id={id} me={me} selected={tool === id} onPick={onPick} onInfo={onInfo} />;
        }),
      )}
    </div>
  );
}

function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-[#1a0636]/70" onClick={onClose}>
      <div
        className="bs-sheet mx-auto flex max-h-[88dvh] w-full max-w-md flex-col gap-2 rounded-t-[2rem] border-2 border-b-0 border-white/20 bg-[#2b0a57] px-4 pt-4 pb-[max(env(safe-area-inset-bottom),16px)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Facts({ info }: { info: AbilityInfo }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px] font-black">
      <span className="rounded-full px-2 py-0.5 text-[#1d0842]" style={{ background: kindColor(info.kind) }}>
        {kindLabel(info.kind)}
      </span>
      <span className="rounded-full bg-white/10 px-2 py-0.5">⏳ {info.cooldown ? `Recarga: ${turns(info.cooldown)}` : "Sin recarga"}</span>
      <span className="rounded-full bg-white/10 px-2 py-0.5">🔢 {info.uses === null ? "Usos ilimitados" : `${info.uses} uso${info.uses === 1 ? "" : "s"} por partida`}</span>
      <span className="rounded-full bg-white/10 px-2 py-0.5">{info.kind === "attack" ? "💥 Usa tu disparo" : "⏭️ Termina tu turno"}</span>
    </div>
  );
}

/** What a long press on a tile shows. */
export function AbilityDetail({ tool, me, onClose, onPick }: { tool: Tool; me: MeView; onClose: () => void; onPick: (t: Tool) => void }) {
  if (tool === "shot") {
    return (
      <Sheet onClose={onClose}>
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-4xl">💥</span>
          <div>
            <h2 className="font-display text-3xl leading-none">Disparo</h2>
            <p className="text-xs font-bold text-white/60">Siempre disponible</p>
          </div>
        </div>
        <p className="text-sm font-bold leading-snug text-white/80">Un disparo normal a una casilla del mar enemigo. Ilimitado, sin recarga.</p>
        <button onClick={onClose} className="pb-btn h-14 w-full shrink-0 text-xl" style={{ ["--btn" as string]: "#b9a6ff" }}>
          Cerrar
        </button>
      </Sheet>
    );
  }
  const info = ABILITY_INFO[tool];
  const st = me.abil[tool];
  const block = abilityBlock(me, tool);
  const status = !block
    ? "✅ ¡Lista para usar!"
    : block.reason === "sunk"
      ? `☠️ Tu ${SHIP_INFO[info.ship].name} está hundido. Repáralo con el Kit de reparación para recuperarla.`
      : block.reason === "spent"
        ? "🚫 Ya la usaste todas las veces."
        : block.reason === "cooldown"
          ? `⏳ Lista en ${turns(st?.cd ?? 0)}.`
          : block.text;
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-4xl" style={{ background: `${kindColor(info.kind)}33` }}>
          {info.emoji}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-3xl leading-none">{info.name}</h2>
          <p className="text-xs font-bold text-white/60">Habilidad del {SHIP_INFO[info.ship].name}</p>
        </div>
      </div>
      <Facts info={info} />
      <p className="text-sm font-bold leading-snug text-white/85">{info.long}</p>
      <div className="rounded-2xl bg-white/5 px-3 py-2 text-sm font-extrabold">
        {status}
        {st?.left != null && <span className="block text-xs text-white/60">Te quedan {st.left} de {info.uses} usos.</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onClose} className="pb-btn h-14 text-xl" style={{ ["--btn" as string]: "#b9a6ff" }}>
          Cerrar
        </button>
        <button
          onClick={() => {
            onClose();
            onPick(tool);
          }}
          disabled={!!block}
          className="pb-btn h-14 text-xl"
          style={{ ["--btn" as string]: block ? "#8d86a6" : "#06d6a0" }}
        >
          Elegir
        </button>
      </div>
    </Sheet>
  );
}

/** The "?" panel: arcade rules and every ability. */
export function HelpSheet({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"rules" | "abilities">("rules");
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl">🕹️ Modo Arcade</h2>
        <button onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-lg">
          ✕
        </button>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-1 rounded-2xl bg-white/10 p-1">
        {(
          [
            ["rules", "📜 Reglas"],
            ["abilities", "⚡ Habilidades"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => {
              playClick();
              setTab(t);
            }}
            className={`rounded-xl py-1.5 text-sm font-black transition ${tab === t ? "bg-[#ffe066] text-[#1d0842]" : "text-white/70"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="pb-scroll -mx-1 flex min-h-0 flex-col gap-2 px-1 pb-1">
        {tab === "rules" ? (
          <ul className="flex flex-col gap-2 text-sm font-bold leading-snug text-white/85">
            {[
              ["🗺️", `El mapa es más grande: ${ARCADE_SIZE}×${ARCADE_SIZE}. Pellizca el mapa (o usa 🔍) para acercarte y arrastra para moverte.`],
              ["🚢", "Cada barco te da 2 habilidades. Mantén presionada una habilidad para ver qué hace."],
              ["☠️", "Si te hunden un barco, sus habilidades quedan bloqueadas y dejan de recargarse."],
              ["🔧", "El Kit de reparación (Acorazado) deja como nuevo un barco, aunque esté hundido. Al repararlo recuperas sus habilidades y su recarga sigue avanzando."],
              ["💥", "Las habilidades de Ataque usan tu disparo. Con el Doble disparo tienes dos tiros en el mismo turno."],
              ["⏭️", "Las habilidades de Estrategia terminan tu turno en cuanto las usas."],
              ["⏳", "La recarga se cuenta en tus turnos: el fondo gris de la habilidad se va llenando hasta que vuelve a estar lista. Todas empiezan a media carga."],
              ["🔢", "El numerito amarillo arriba de una habilidad son los usos que te quedan en la partida."],
              ["🏆", "Gana quien hunda primero toda la flota rival."],
            ].map(([emoji, text]) => (
              <li key={text} className="flex gap-2 rounded-2xl bg-white/5 px-3 py-2">
                <span className="text-xl leading-none">{emoji}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        ) : (
          FLEET.map((f) => (
            <div key={f.type} className="pb-card flex flex-col gap-2 p-2.5">
              <div className="flex items-center gap-2">
                <span className="block h-5" style={{ width: `${f.size * 20}px` }}>
                  <ShipSprite type={f.type} size={f.size} vertical={false} />
                </span>
                <span className="font-display text-lg leading-none">{f.name}</span>
              </div>
              {ABILITIES.filter((a) => a.ship === f.type).map((a) => (
                <div key={a.id} className="flex gap-2.5 rounded-2xl bg-white/5 p-2">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `${kindColor(a.kind)}33` }}>
                    {a.emoji}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-display text-lg leading-none">{a.name}</span>
                    <p className="text-xs font-bold leading-snug text-white/75">{a.long}</p>
                    <Facts info={a} />
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </Sheet>
  );
}
