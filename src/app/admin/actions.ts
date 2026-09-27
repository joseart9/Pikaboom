"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkPassword, createSession, destroySession, isAdmin } from "./auth";

export type ActionResult = { ok: boolean; error?: string };

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("No autorizado");
}

function clean(value: FormDataEntryValue | null, max = 60) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function dbError(e: unknown): ActionResult {
  const code = (e as { code?: string }).code;
  if (code === "23505") return { ok: false, error: "Esa palabra ya existe." };
  console.error(e);
  return { ok: false, error: "Error de base de datos, intenta de nuevo." };
}

export async function login(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await new Promise((r) => setTimeout(r, 400)); // slow down guessing
  if (!checkPassword(String(form.get("password") ?? ""))) return { ok: false, error: "Contraseña incorrecta" };
  await createSession();
  revalidatePath("/admin");
  return { ok: true };
}

export async function logout() {
  await destroySession();
  revalidatePath("/admin");
}

export async function addWord(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const word = clean(form.get("word"));
  const category = clean(form.get("category"), 30);
  if (!word || !category) return { ok: false, error: "La palabra y la categoría son obligatorias." };
  const adult = form.get("adult") === "on";
  try {
    await db().query("insert into public.charades_words (word, category, adult) values ($1, $2, $3)", [word, category, adult]);
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateWord(id: number, fields: { word: string; category: string; active: boolean; adult: boolean }): Promise<ActionResult> {
  await requireAdmin();
  const word = clean(fields.word);
  const category = clean(fields.category, 30);
  if (!word || !category) return { ok: false, error: "La palabra y la categoría son obligatorias." };
  try {
    await db().query(
      "update public.charades_words set word = $1, category = $2, active = $3, adult = $4 where id = $5",
      [word, category, fields.active, fields.adult, id],
    );
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteWord(id: number): Promise<ActionResult> {
  await requireAdmin();
  try {
    await db().query("delete from public.charades_words where id = $1", [id]);
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin");
  return { ok: true };
}
