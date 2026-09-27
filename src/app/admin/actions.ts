"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkPassword, createSession, destroySession, isAdmin } from "./auth";

export type ActionResult = { ok: boolean; error?: string };

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorized");
}

function clean(value: FormDataEntryValue | null, max = 60) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function dbError(e: unknown): ActionResult {
  const code = (e as { code?: string }).code;
  if (code === "23505") return { ok: false, error: "That word already exists." };
  console.error(e);
  return { ok: false, error: "Database error, please try again." };
}

export async function login(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await new Promise((r) => setTimeout(r, 400)); // slow down guessing
  if (!checkPassword(String(form.get("password") ?? ""))) return { ok: false, error: "Wrong password" };
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
  if (!word || !category) return { ok: false, error: "Word and category are required." };
  try {
    await db().query("insert into public.charades_words (word, category) values ($1, $2)", [word, category]);
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateWord(id: number, fields: { word: string; category: string; active: boolean }): Promise<ActionResult> {
  await requireAdmin();
  const word = clean(fields.word);
  const category = clean(fields.category, 30);
  if (!word || !category) return { ok: false, error: "Word and category are required." };
  try {
    await db().query("update public.charades_words set word = $1, category = $2, active = $3 where id = $4", [word, category, fields.active, id]);
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
