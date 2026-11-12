import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT, safeNext } from "./safeNext";

describe("safeNext", () => {
  it("accepts same-origin relative paths, including query strings", () => {
    expect(safeNext("/cards")).toBe("/cards");
    expect(safeNext("/cards/play?sala=ABC234")).toBe("/cards/play?sala=ABC234");
    expect(safeNext("/auth/update-password")).toBe("/auth/update-password");
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
    "/\t/evil.com",
    "/\n/evil.com",
  ])("rejects %j", (bad) => {
    expect(safeNext(bad)).toBe(DEFAULT_NEXT);
  });

  it("falls back for missing values and honors a custom fallback", () => {
    expect(safeNext(null)).toBe("/cards");
    expect(safeNext(undefined)).toBe("/cards");
    expect(safeNext("//evil.com", "/")).toBe("/");
  });
});
