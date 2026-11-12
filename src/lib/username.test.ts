import { describe, expect, it } from "vitest";
import { USERNAME_RE, fallbackUsername, isValidUsername } from "./username";

describe("username", () => {
  it.each(["abc", "prueba_1", "Prueba_1", "A".repeat(20), "___", "123"])("accepts %j", (name) => {
    expect(isValidUsername(name)).toBe(true);
  });

  it.each(["ab", "A".repeat(21), "con espacio", "ñandú", "a-b", "a.b", "", " abc", "abc\n"])("rejects %j", (name) => {
    expect(isValidUsername(name)).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isValidUsername(undefined)).toBe(false);
    expect(isValidUsername(123456)).toBe(false);
    expect(isValidUsername(null)).toBe(false);
  });

  it("generates valid jugador_<6 digits> fallbacks", () => {
    expect(fallbackUsername(() => 42)).toBe("jugador_000042");
    expect(fallbackUsername(() => 999_999)).toBe("jugador_999999");
    const name = fallbackUsername((n) => n - 1);
    expect(name).toMatch(/^jugador_\d{6}$/);
    expect(USERNAME_RE.test(name)).toBe(true);
  });
});
