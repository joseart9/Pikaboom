// Lobby codes (§13.7). Pure (no `server-only`): the lobby UI normalizes typed and linked codes with the same rules.

/** Lobby code alphabet (no I/O/0/1) and length. */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

/** Upper-cases and keeps only alphabet characters (`" ab-c d2 "` → `"ABCD2"`). */
export function normalizeCode(input: string): string {
  return [...input.toUpperCase()].filter((ch) => CODE_ALPHABET.includes(ch)).join("");
}
