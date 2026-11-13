import { afterEach, describe, expect, it, vi } from "vitest";
import { describeError, logServerError } from "./logError";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Shaped like a `pg` DatabaseError: the values live in `detail`/`parameters`, not in the message. */
function pgError(): Error {
  const e = new Error('duplicate key value violates unique constraint "profiles_username_lower_key"') as Error & Record<string, unknown>;
  e.name = "DatabaseError";
  e.code = "23505";
  e.detail = "Key (lower(username))=(ana_secreta) already exists.";
  e.parameters = ["ana@example.com", "ana_secreta"];
  return e;
}

describe("logServerError", () => {
  it("prints where, the match id, the error name/code/message and stack frames", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerError("api/cards POST /matches/[id]/commands", pgError(), { matchId: "00000000-0000-4000-8000-000000000001" });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0][0]);
    expect(line).toContain("api/cards POST /matches/[id]/commands");
    expect(line).toContain("match=00000000-0000-4000-8000-000000000001");
    expect(line).toContain("DatabaseError [23505]: duplicate key value");
    expect(line).toMatch(/\n\s+at /);
    expect(spy.mock.calls[0]).toHaveLength(1); // the error object itself is never passed to the logger
  });

  it("never prints the values a driver error carries (detail, parameters)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerError("api/account/profile", pgError());
    const line = String(spy.mock.calls[0][0]);
    expect(line).not.toContain("ana_secreta");
    expect(line).not.toContain("ana@example.com");
    expect(line).not.toContain("match=");
  });

  it("describes non-Error throws by type only", () => {
    expect(describeError({ email: "x@y.z" })).toBe("non-error thrown: object");
    expect(describeError("boom")).toBe("non-error thrown: string");
  });
});
