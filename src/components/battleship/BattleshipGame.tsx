"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { playClick, playError, unlockAudio } from "@/game/audio";
import type { Mode, View } from "@/game/battleship/logic";
import { createRoom, joinRoom, saveName, savedName, savedRoom, saveRoom } from "@/game/battleship/useRoom";
import { ModePicker, Room, TopBar } from "./Room";

const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);

/** Keeps `?sala=` in the address bar so a reload drops you straight back into the game. */
function setUrlRoom(code: string | null) {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set("sala", code);
  else url.searchParams.delete("sala");
  window.history.replaceState(window.history.state, "", url);
}

export function BattleshipGame() {
  const router = useRouter();
  const [room, setRoom] = useState<View | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [resume, setResume] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("classic");
  const [extraTurn, setExtraTurn] = useState(false);
  const [busy, setBusy] = useState<"create" | "join" | "resume" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const booted = useRef(false);

  const enter = useCallback(async (roomCode: string, how: "join" | "resume", playerName: string) => {
    setBusy(how);
    setError(null);
    try {
      const view = await joinRoom(roomCode, playerName);
      saveRoom(view.code);
      setUrlRoom(view.code);
      setRoom(view);
    } catch (e) {
      playError();
      setError(e instanceof Error ? e.message : "No se pudo entrar a la sala.");
      if (how === "resume") {
        saveRoom(null);
        setResume(null);
        setUrlRoom(null);
      }
    } finally {
      setBusy(null);
    }
  }, []);

  // Restore name / room from this device; follow invite links (?sala=ABCD).
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const n = savedName();
    const fromUrl = cleanCode(new URLSearchParams(window.location.search).get("sala") ?? "");
    const saved = savedRoom();
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate from localStorage / URL after mount */
    setName(n);
    if (fromUrl) setCode(fromUrl);
    if (saved && fromUrl === saved) void enter(saved, "resume", n); // reload mid-game → straight back in
    else if (saved) setResume(saved);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [enter]);

  const create = async () => {
    unlockAudio();
    playClick();
    saveName(name);
    setBusy("create");
    setError(null);
    try {
      const view = await createRoom(name, mode, extraTurn);
      saveRoom(view.code);
      setUrlRoom(view.code);
      setRoom(view);
    } catch (e) {
      playError();
      setError(e instanceof Error ? e.message : "No se pudo crear la sala.");
    } finally {
      setBusy(null);
    }
  };

  const join = () => {
    unlockAudio();
    playClick();
    if (code.length !== 4) {
      playError();
      setError("El código tiene 4 letras.");
      return;
    }
    saveName(name);
    void enter(code, "join", name);
  };

  const roomCode = room?.code ?? null;
  const leave = useCallback(
    (fatal?: string) => {
      setRoom(null);
      setUrlRoom(null);
      if (fatal) {
        saveRoom(null);
        setResume(null);
        setError(fatal);
      } else {
        setResume(roomCode);
      }
    },
    [roomCode],
  );

  if (room) return <Room key={room.code} initial={room} onLeave={leave} />;

  return (
    <main className="pb-bg flex pb-screen w-full flex-col overflow-hidden">
      <div className="pb-safe mx-auto flex h-full w-full max-w-md flex-col gap-3">
        <TopBar back="←" onBack={() => router.push("/")} />

        <div className="flex shrink-0 items-center gap-3">
          <span className="bs-bob shrink-0 text-6xl drop-shadow-lg">🚢</span>
          <p className="text-[13px] font-bold leading-snug text-white/85">
            ¡Hunde la flota rival antes de que hunda la tuya! Cada quien juega en <b className="text-[#ffe066]">su propio teléfono</b> 📱↔📱 — solo necesitan internet.
          </p>
        </div>

        <div className="pb-scroll -mx-2 flex min-h-0 flex-1 flex-col gap-3 px-2 pb-2">
          {resume && (
            <div className="pb-pop-in flex shrink-0 items-center gap-3 rounded-3xl border-2 border-[#06d6a0] bg-[#06d6a0]/15 p-3">
              <span className="text-3xl">⚓</span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl leading-none">Partida en curso</div>
                <div className="text-xs font-bold text-white/60">Sala {resume}</div>
              </div>
              <button
                onClick={() => {
                  unlockAudio();
                  void enter(resume, "resume", name);
                }}
                disabled={busy !== null}
                className="pb-btn h-12 px-4 text-lg"
                style={{ ["--btn" as string]: "#06d6a0" }}
              >
                {busy === "resume" ? "…" : "VOLVER"}
              </button>
            </div>
          )}

          <label className="pb-card flex shrink-0 items-center gap-2 p-3">
            <span className="text-2xl">🧑‍✈️</span>
            <input
              value={name}
              maxLength={16}
              enterKeyHint="done"
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre de capitán"
              className="h-10 min-w-0 flex-1 rounded-xl bg-white/10 px-3 font-extrabold text-white outline-none placeholder:text-white/40 focus:bg-white/15"
            />
          </label>

          <div className="pb-card flex shrink-0 flex-col gap-2 p-3">
            <h2 className="font-display text-2xl leading-none">Crear sala</h2>
            <ModePicker
              mode={mode}
              extraTurn={extraTurn}
              onChange={(m, x) => {
                playClick();
                setMode(m);
                setExtraTurn(x);
              }}
            />
            <button onClick={create} disabled={busy !== null} data-haptic="medium" className="pb-btn h-14 w-full text-2xl" style={{ ["--btn" as string]: "#06d6a0" }}>
              {busy === "create" ? "Creando…" : "⚓ CREAR SALA"}
            </button>
          </div>

          <div className="pb-card flex shrink-0 flex-col gap-2 p-3">
            <h2 className="font-display text-2xl leading-none">Unirme a una sala</h2>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(cleanCode(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && join()}
                placeholder="ABCD"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-label="Código de sala"
                className="h-14 w-0 min-w-0 flex-1 rounded-2xl border-2 border-white/20 bg-white/10 text-center font-display text-3xl tracking-[0.4em] text-[#ffe066] outline-none placeholder:text-white/25 focus:border-[#ffe066]"
              />
              <button onClick={join} disabled={busy !== null} data-haptic="medium" className="pb-btn h-14 shrink-0 px-5 text-2xl" style={{ ["--btn" as string]: "#00bbf9" }}>
                {busy === "join" ? "…" : "UNIRME"}
              </button>
            </div>
          </div>

          {error && (
            <p key={error} className="bs-nope shrink-0 rounded-xl bg-[#ff4d6d]/20 px-3 py-2 text-center text-sm font-extrabold text-[#ffb3c0]">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
