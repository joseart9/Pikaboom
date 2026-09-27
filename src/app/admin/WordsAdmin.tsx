"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addWord, deleteWord, logout, updateWord, type ActionResult } from "./actions";

export type AdminWord = { id: number; word: string; category: string; active: boolean };

const input =
  "h-10 min-w-0 rounded-xl border-2 border-white/15 bg-white/10 px-3 font-bold text-white outline-none placeholder:text-white/40 focus:border-white/50";

export function WordsAdmin({ words, loadError }: { words: AdminWord[]; loadError: string | null }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [message, setMessage] = useState<ActionResult | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of words) counts.set(w.category, (counts.get(w.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [words]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((w) => (!category || w.category === category) && (!q || w.word.toLowerCase().includes(q)));
  }, [words, query, category]);

  const activeCount = words.filter((w) => w.active).length;

  return (
    <main className="pb-bg min-h-dvh w-full">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl">Word Admin</h1>
            <p className="text-sm font-bold text-white/60">
              {words.length} words · {activeCount} active · {categories.length} categories
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/charades" className="rounded-xl bg-white/10 px-3 py-2 font-extrabold">
              🎭 Game
            </Link>
            <form action={logout}>
              <button className="rounded-xl bg-white/10 px-3 py-2 font-extrabold">Log out</button>
            </form>
          </div>
        </header>

        {loadError && <p className="pb-card p-4 font-extrabold text-[#ff4d6d]">{loadError}</p>}

        <AddWordForm defaultCategory={categories[0]?.[0] ?? ""} />

        {message?.error && (
          <p className="rounded-xl bg-[#ff4d6d]/20 px-4 py-2 font-extrabold text-[#ff8fa3]" role="alert">
            {message.error}
          </p>
        )}

        <div className="pb-card flex flex-col gap-3 p-4">
          <input className={`${input} w-full`} placeholder="🔍 Search words…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Chip active={category === null} onClick={() => setCategory(null)}>
              All ({words.length})
            </Chip>
            {categories.map(([c, n]) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
                {c} ({n})
              </Chip>
            ))}
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {filtered.map((w) => (
            <WordRow key={w.id} word={w} onResult={setMessage} />
          ))}
          {filtered.length === 0 && <li className="py-8 text-center font-bold text-white/50">No words match.</li>}
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

function AddWordForm({ defaultCategory }: { defaultCategory: string }) {
  const [state, action, pending] = useActionState(addWord, null);
  const wordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok && wordRef.current) {
      wordRef.current.value = "";
      wordRef.current.focus();
    }
  }, [state]);

  return (
    <form action={action} className="pb-card flex flex-col gap-3 p-4">
      <h2 className="font-display text-2xl">Add a word</h2>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input ref={wordRef} name="word" required maxLength={60} placeholder="Word or phrase" className={`${input} flex-1`} />
        <input
          name="category"
          required
          maxLength={30}
          list="categories"
          defaultValue={defaultCategory}
          placeholder="Category"
          className={`${input} sm:w-44`}
        />
        <button disabled={pending} className="pb-btn h-10 px-5 text-lg" style={{ ["--btn" as string]: "#06d6a0" }}>
          {pending ? "Adding…" : "+ Add"}
        </button>
      </div>
      {state?.error && <p className="font-extrabold text-[#ff8fa3]">{state.error}</p>}
      {state?.ok && <p className="font-extrabold text-[#06d6a0]">Added ✓</p>}
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
        <div className="flex gap-2">
          <button disabled={pending} onClick={save} className="pb-btn h-10 flex-1 px-4" style={{ ["--btn" as string]: "#06d6a0" }}>
            Save
          </button>
          <button disabled={pending} onClick={() => setEditing(false)} className="pb-btn h-10 flex-1 px-4" style={{ ["--btn" as string]: "#b9a6ff" }}>
            Cancel
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
        aria-label={`${word.word} active`}
        title={word.active ? "Active: shown in the game" : "Hidden from the game"}
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
        aria-label={`Edit ${word.word}`}
      >
        ✏️ Edit
      </button>
      {confirmDelete ? (
        <button
          disabled={pending}
          onClick={remove}
          onBlur={() => setConfirmDelete(false)}
          autoFocus
          className="rounded-xl bg-[#ff4d6d] px-3 py-2 text-sm font-extrabold"
        >
          Sure?
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => setConfirmDelete(true)}
          className="rounded-xl bg-white/10 px-3 py-2 text-sm font-extrabold"
          aria-label={`Delete ${word.word}`}
        >
          🗑
        </button>
      )}
    </li>
  );
}
