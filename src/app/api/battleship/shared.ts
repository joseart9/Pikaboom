import { RoomError } from "@/game/battleship/rooms";

const NO_STORE = { "Cache-Control": "no-store" };

/** The device's random player token (not personal data — just a seat key). */
export function playerFrom(request: Request) {
  const id = request.headers.get("x-player") ?? "";
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new RoomError("Jugador inválido.", 400);
  return id;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE });
}

export function errorResponse(e: unknown) {
  if (e instanceof RoomError) return json({ error: e.message }, e.status);
  console.error("battleship:", e);
  return json({ error: "El servidor no responde. Reintentando…" }, 503);
}
