// PATCH /api/account/profile body rules (Phase 21 hardening): signed out → 401 before anything else; only JSON
// (415 otherwise — T15); body ≤ 1 KB (413). The DB is never reached in these cases.
import { describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ user: null as string | null, dbCalls: 0 }));

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    requireUser: async () => {
      if (!session.user) throw new actual.AuthError();
      return { id: session.user, email: null, username: "Ana" };
    },
    ensureProfile: async () => {
      session.dbCalls += 1;
      throw new Error("no DB in this test");
    },
    updateUsername: async () => {
      session.dbCalls += 1;
      throw new Error("no DB in this test");
    },
  };
});

const route = await import("./route");

function patch(user: string | null, body: string, type = "application/json"): Promise<Response> {
  session.user = user;
  return route.PATCH(new Request("http://localhost/api/account/profile", { method: "PATCH", headers: { "content-type": type }, body }));
}

describe("PATCH /api/account/profile", () => {
  it("401 signed out", async () => {
    const r = await patch(null, JSON.stringify({ username: "ana_2" }));
    expect(r.status).toBe(401);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("415 for a non-JSON content type (a cross-site form post), without touching the DB", async () => {
    session.dbCalls = 0;
    expect((await patch("11111111-1111-4111-8111-111111111111", "username=ana_2", "application/x-www-form-urlencoded")).status).toBe(415);
    expect((await patch("11111111-1111-4111-8111-111111111111", JSON.stringify({ username: "ana_2" }), "text/plain")).status).toBe(415);
    expect(session.dbCalls).toBe(0);
  });

  it("413 for a body over 1 KB, without touching the DB", async () => {
    session.dbCalls = 0;
    const r = await patch("11111111-1111-4111-8111-111111111111", JSON.stringify({ username: "a".repeat(2000) }));
    expect(r.status).toBe(413);
    expect(session.dbCalls).toBe(0);
  });

  it("a JSON body reaches the profile update (charset parameter allowed)", async () => {
    session.dbCalls = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await patch("11111111-1111-4111-8111-111111111111", JSON.stringify({ username: "ana_2" }), "application/json; charset=utf-8");
    expect(r.status).toBe(503); // the mocked DB fails
    expect(session.dbCalls).toBe(1);
  });
});
