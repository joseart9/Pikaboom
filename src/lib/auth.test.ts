import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
const query = vi.fn();

vi.mock("@/lib/server", () => ({
  createClient: async () => ({ auth: { getClaims } }),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({ query }),
}));

const { AuthError, UsernameError, ensureProfile, getUser, isUsernameAvailable, requireUser, updateUsername } =
  await import("./auth");

const ID = "11111111-2222-3333-4444-555555555555";
const created = new Date("2026-11-13T10:00:00.000Z");

function uniqueViolation() {
  return Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" });
}

beforeEach(() => {
  getClaims.mockReset();
  query.mockReset();
});

describe("getUser / requireUser", () => {
  it("requireUser throws AuthError (401) when there are no claims", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireUser()).rejects.toBeInstanceOf(AuthError);
    await expect(requireUser()).rejects.toMatchObject({ status: 401 });
    expect(await getUser()).toBeNull();
  });

  it("requireUser throws when claims lack a subject", async () => {
    getClaims.mockResolvedValue({ data: { claims: { email: "a@b.c" } }, error: null });
    await expect(requireUser()).rejects.toBeInstanceOf(AuthError);
  });

  it("returns id, email and metadata username when claims are present", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: ID, email: "jugador@example.com", user_metadata: { username: "prueba_1" } } },
      error: null,
    });
    expect(await requireUser()).toEqual({ id: ID, email: "jugador@example.com", username: "prueba_1" });
  });

  it("normalizes missing email and non-string username", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: ID, user_metadata: { username: 7 } } }, error: null });
    expect(await getUser()).toEqual({ id: ID, email: null, username: undefined });
  });
});

describe("ensureProfile", () => {
  it("creates/returns the profile with the metadata username", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: ID, username: "prueba_1", created_at: created }] });
    const profile = await ensureProfile({ id: ID, email: null, username: "prueba_1" });
    expect(profile).toEqual({ id: ID, username: "prueba_1", createdAt: created.toISOString() });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual([ID, "prueba_1"]);
  });

  it("uses a generated name when the metadata username is invalid", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: ID, username: "x", created_at: created }] });
    await ensureProfile({ id: ID, email: null, username: "no vale" });
    expect(query.mock.calls[0][1][1]).toMatch(/^jugador_\d{6}$/);
  });

  it("falls back to jugador_<digits> when the username is taken", async () => {
    query
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValueOnce({ rows: [{ id: ID, username: "jugador_123456", created_at: created }] });
    await ensureProfile({ id: ID, email: null, username: "Prueba_1" });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][1][1]).toMatch(/^jugador_\d{6}$/);
  });

  it("gives up after 5 attempts and rethrows other errors immediately", async () => {
    query.mockRejectedValue(uniqueViolation());
    await expect(ensureProfile({ id: ID, email: null, username: "prueba_1" })).rejects.toMatchObject({ code: "23505" });
    expect(query).toHaveBeenCalledTimes(5);

    query.mockReset();
    query.mockRejectedValue(new Error("connection refused"));
    await expect(ensureProfile({ id: ID, email: null, username: "prueba_1" })).rejects.toThrow("connection refused");
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe("updateUsername / isUsernameAvailable", () => {
  it("rejects invalid names without touching the DB", async () => {
    await expect(updateUsername(ID, "a b")).rejects.toMatchObject({ code: "invalid" });
    await expect(updateUsername(ID, undefined)).rejects.toBeInstanceOf(UsernameError);
    expect(await isUsernameAvailable("x")).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it("maps a unique violation to UsernameError('taken')", async () => {
    query.mockRejectedValueOnce(uniqueViolation());
    await expect(updateUsername(ID, "Prueba_1")).rejects.toMatchObject({ code: "taken" });
  });

  it("returns the renamed profile", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: ID, username: "nuevo", created_at: created }] });
    expect(await updateUsername(ID, "nuevo")).toEqual({ id: ID, username: "nuevo", createdAt: created.toISOString() });
  });

  it("reports availability from the case-insensitive lookup", async () => {
    query.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }).mockResolvedValueOnce({ rows: [] });
    expect(await isUsernameAvailable("Prueba_1")).toBe(false);
    expect(await isUsernameAvailable("libre_1")).toBe(true);
  });
});
