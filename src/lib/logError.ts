// Server error logging (Phase 21, Duelo Arcano plan §21 "error logging"): one `console.error` line per failure with
// where it happened and, when there is one, the match id — never personal data. Vercel keeps these in the function
// logs.
//
// What is printed: the error's name, its `code` (Postgres SQLSTATE / Node error codes) and its stack (which starts
// with the message). What is deliberately NOT printed: the error object itself — a `pg` error carries `detail`
// ("Key (username)=(ana) already exists"), `where`, `parameters`… —, request bodies, user ids, emails or names.

export interface LogContext {
  /** The card match concerned (a random UUID, not personal data). */
  matchId?: string;
}

/** A one-line, PII-free description of `e`: `Name [code]: message` plus the stack frames. */
export function describeError(e: unknown): string {
  if (!(e instanceof Error)) return `non-error thrown: ${typeof e}`;
  const code = (e as { code?: unknown }).code;
  const head = `${e.name}${typeof code === "string" || typeof code === "number" ? ` [${code}]` : ""}: ${e.message}`;
  const frames = (e.stack ?? "")
    .split("\n")
    .filter((l) => /^\s+at /.test(l))
    .slice(0, 8)
    .join("\n");
  return frames ? `${head}\n${frames}` : head;
}

export function logServerError(where: string, e: unknown, ctx: LogContext = {}): void {
  const match = ctx.matchId ? ` match=${ctx.matchId}` : "";
  console.error(`[pikaboom] ${where}${match} — ${describeError(e)}`);
}
