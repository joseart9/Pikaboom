"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addWord, deleteWord, logout, updateWord, type ActionResult } from "./actions";

export type AdminWord = { id: number; word: string; category: string; active: boolean; adult: boolean };

type WordSet = "normal" | "adult";

const input =
  "h-10 min-w-0 rounded-xl border-2 border-white/15 bg-white/10 px-3 font-bold text-white outline-none placeholder:text-white/40 focus:border-white/50";

export function WordsAdmin({ words, loadError }: { words: AdminWord[]; loadError: string | null }) {
  const [set, setSet] = useState<WordSet>("normal");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [message, setMessage] = useState<ActionResult | null>(null);

  const inSet = useMemo(() => words.filter((w) => w.adult === (set === "adult")), [words, set]);
  const adultCount = words.filter((w) => w.adult).length;

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of inSet) counts.set(w.category, (counts.get(w.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [inSet]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inSet.filter((w) => (!category || w.category === category) && (!q || w.word.toLowerCase().includes(q)));
  }, [inSet, query, category]);

  const activeCount = inSet.filter((w) => w.active).length;

  const switchSet = (next: WordSet) => {
    setSet(next);
    setCategory(null);
  };

  return (
    <main className="pb-bg pb-scroll pb-screen w-full">
      <div className="pb-safe mx-auto flex w-full max-w-3xl flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl">Palabras</h1>
            <p className="text-sm font-bold text-white/60">
              {inSet.length} palabras · {activeCount} activas · {categories.length} categorías
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/charades" className="rounded-xl bg-white/10 px-3 py-2 font-extrabold">
              🎭 Juego
            </Link>
            <form action={logout}>
              <button className="rounded-xl bg-white/10 px-3 py-2 font-extrabold">Salir</button>
            </form>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1.5" role="tablist">
          <SetTab active={set === "normal"} onClick={() => switchSet("normal")}>
            Normales ({words.length - adultCount})
          </SetTab>
          <SetTab active={set === "adult"} onClick={() => switchSet("adult")} adult>
            🫦 +18 ({adultCount})
          </SetTab>
        </div>

        {loadError && <p className="pb-card p-4 font-extrabold text-[#ff4d6d]">{loadError}</p>}

        <AddWordForm key={set} adult={set === "adult"} defaultCategory={categories[0]?.[0] ?? ""} words={words} />

        {message?.error && (
          <p className="rounded-xl bg-[#ff4d6d]/20 px-4 py-2 font-extrabold text-[#ff8fa3]" role="alert">
            {message.error}
          </p>
        )}

        <div className="pb-card flex flex-col gap-3 p-4">
          <input className={`${input} w-full`} placeholder="🔍 Buscar palabras…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Chip active={category === null} onClick={() => setCategory(null)}>
                Todas ({inSet.length})
              </Chip>
              {categories.map(([c, n]) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
                  {c} ({n})
                </Chip>
              ))}
            </div>
          )}
        </div>

        <ul className="flex flex-col gap-2">
          {filtered.map((w) => (
            <WordRow key={w.id} word={w} onResult={setMessage} />
          ))}
          {filtered.length === 0 && (
            <li className="py-8 text-center font-bold text-white/50">
              {inSet.length === 0 && set === "adult" ? "Aún no hay palabras +18. ¡Agrega la primera arriba! 🫦" : "Ninguna palabra coincide."}
            </li>
          )}
        </ul>
      </div>
      <datalist id="categories">
        {categories.map(([c]) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </main>
  );
}

function SetTab({ active, onClick, adult, children }: { active: boolean; onClick: () => void; adult?: boolean; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-11 rounded-xl font-display text-xl transition ${
        active ? (adult ? "bg-[#ff2e6d] text-white" : "bg-[#ffbe0b] text-[#1d0842]") : "text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-extrabold transition ${active ? "bg-[#ffbe0b] text-[#1d0842]" : "bg-white/10 text-white/80"}`}
    >
      {children}
    </button>
  );
}

/** Same rule as the database's charades_word_key(): ignore case, accents and extra spaces. */
const wordKey = (w: string) =>
  w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function AddWordForm({ adult, defaultCategory, words }: { adult: boolean; defaultCategory: string; words: AdminWord[] }) {
  const [state, action, pending] = useActionState(addWord, null);
  const [, startTransition] = useTransition();
  const [word, setWord] = useState("");
  // Controlled and never reset, so the category you're working on stays selected between adds.
  const [category, setCategory] = useState(defaultCategory || (adult ? "Picante" : ""));
  const wordRef = useRef<HTMLInputElement>(null);

  const duplicate = useMemo(() => {
    const key = wordKey(word);
    return key ? words.find((w) => wordKey(w.word) === key) : undefined;
  }, [word, words]);

  useEffect(() => {
    if (state?.ok) wordRef.current?.focus();
  }, [state]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    // Submit manually instead of <form action>, which would reset the fields afterwards.
    e.preventDefault();
    if (duplicate) return;
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      await action(data);
    });
  };

  useEffect(() => {
    if (state?.ok) setWord(""); // eslint-disable-line react-hooks/set-state-in-effect -- clear only the word after a successful add
  }, [state]);

  return (
    <form onSubmit={submit} className="pb-card flex flex-col gap-3 p-4">
      <h2 className="font-display text-2xl">{adult ? "Agregar palabra +18 🫦" : "Agregar palabra"}</h2>
      {adult && <input type="hidden" name="adult" value="on" />}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={wordRef}
          name="word"
          required
          maxLength={60}
          placeholder="Palabra o frase"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          aria-invalid={!!duplicate}
          className={`${input} flex-1 ${duplicate ? "border-[#ff4d6d]" : ""}`}
        />
        <input
          name="category"
          required
          maxLength={30}
          list="categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Categoría"
          className={`${input} sm:w-44`}
        />
        <button disabled={pending || !!duplicate} className="pb-btn h-10 px-5 text-lg" style={{ ["--btn" as string]: adult ? "#ff2e6d" : "#06d6a0" }}>
          {pending ? "Agregando…" : "+ Agregar"}
        </button>
      </div>
      {duplicate ? (
        <p className="font-extrabold text-[#ff8fa3]" role="alert">
          ⚠️ «{duplicate.word}» ya existe en {duplicate.category}
          {duplicate.adult ? " (+18)" : ""}. No se permiten palabras repetidas.
        </p>
      ) : state?.error ? (
        <p className="font-extrabold text-[#ff8fa3]">{state.error}</p>
      ) : (
        state?.ok && <p className="font-extrabold text-[#06d6a0]">Agregada ✓</p>
      )}
    </form>
  );
}

function WordRow({ word, onResult }: { word: AdminWord; onResult: (r: ActionResult) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(word);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<ActionResult>, after?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      onResult(r);
      if (r.ok) after?.();
    });

  const save = () => run(() => updateWord(word.id, draft), () => setEditing(false));
  const toggleActive = () => run(() => updateWord(word.id, { ...word, active: !word.active }));
  const remove = () => run(() => deleteWord(word.id));

  if (editing) {
    return (
      <li className="pb-card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <input
          autoFocus
          className={`${input} flex-1`}
          value={draft.word}
          maxLength={60}
          onChange={(e) => setDraft({ ...draft, word: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <input
          className={`${input} sm:w-40`}
          list="categories"
          value={draft.category}
          maxLength={30}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
        />
        <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-3 font-extrabold">
          <input type="checkbox" checked={draft.adult} onChange={(e) => setDraft({ ...draft, adult: e.target.checked })} className="size-4 accent-[#ff2e6d]" />
          🫦 +18
        </label>
        <div className="flex gap-2">
          <button disabled={pending} onClick={save} className="pb-btn h-10 flex-1 px-4" style={{ ["--btn" as string]: "#06d6a0" }}>
            Guardar
          </button>
          <button disabled={pending} onClick={() => setEditing(false)} className="pb-btn h-10 flex-1 px-4" style={{ ["--btn" as string]: "#b9a6ff" }}>
            Cancelar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className={`pb-card flex items-center gap-3 p-3 transition ${pending ? "opacity-50" : word.active ? "" : "opacity-60"}`}>
      <button
        onClick={toggleActive}
        disabled={pending}
        role="switch"
        aria-checked={word.active}
        aria-label={`${word.word} activa`}
        title={word.active ? "Activa: aparece en el juego" : "Oculta del juego"}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${word.active ? "bg-[#06d6a0]" : "bg-white/20"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${word.active ? "left-[22px]" : "left-0.5"}`} />
      </button>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-lg font-black ${word.active ? "" : "line-through"}`}>{word.word}</div>
        <div className="text-xs font-extrabold uppercase tracking-wider text-white/50">{word.category}</div>
      </div>
      <button
        disabled={pending}
        onClick={() => {
          setDraft(word);
          setEditing(true);
        }}
        className="rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold"
        aria-label={`Editar ${word.word}`}
      >
        ✏️ Editar
      </button>
      {confirmDelete ? (
        <button
          disabled={pending}
          onClick={remove}
          onBlur={() => setConfirmDelete(false)}
          autoFocus
          className="rounded-xl bg-[#ff4d6d] px-3 py-2 text-sm font-extrabold"
        >
          ¿Seguro?
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => setConfirmDelete(true)}
          className="rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold"
          aria-label={`Eliminar ${word.word}`}
        >
          🗑
        </button>
      )}
    </li>
  );
}
