/** Player names: 3–20 ASCII letters, digits or underscores. Same rule as the `profiles_username_format` check. */
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export function isValidUsername(value: unknown): value is string {
  return typeof value === "string" && USERNAME_RE.test(value);
}

/** `jugador_` + 6 digits; `randomInt(n)` must return an integer in [0, n). */
export function fallbackUsername(randomInt: (n: number) => number): string {
  return `jugador_${String(randomInt(1_000_000)).padStart(6, "0")}`;
}
