import {
  createRoom,
  getRoom,
  verifyRoomPassword,
  isRoomFull,
  listPublicRooms,
  getRoomInfo,
} from "../services/roomService.ts";
import { checkRate } from "../services/rateLimiter.ts";
import { jsonResponse } from "../utils.ts";

export async function handleCreateRoom(
  req: Request,
  ip: string,
): Promise<Response> {
  if (!checkRate(ip, "roomCreation")) {
    return jsonResponse({ error: "Too many rooms created. Try again later." }, 429);
  }

  const body = await req.json().catch(() => null);
  if (!body?.password || typeof body.password !== "string") {
    return jsonResponse({ error: "Password is required" }, 400);
  }

  if (body.password.length < 3) {
    return jsonResponse({ error: "Password must be at least 3 characters" }, 400);
  }

  const isPublic = body.isPublic === true;
  const room = await createRoom(body.password, isPublic);

  return jsonResponse({
    roomId: room.id,
    isPublic: room.isPublic,
  });
}

export async function handleJoinRoom(
  req: Request,
  ip: string,
): Promise<Response> {
  if (!checkRate(ip, "joinAttempts")) {
    return jsonResponse({ error: "Too many join attempts. Try again later." }, 429);
  }

  const body = await req.json().catch(() => null);
  if (!body?.roomId || !body?.password) {
    return jsonResponse({ error: "Room ID and password are required" }, 400);
  }

  const room = getRoom(body.roomId);
  if (!room) {
    return jsonResponse({ error: "Room not found" }, 404);
  }

  if (isRoomFull(body.roomId)) {
    return jsonResponse({ error: "Room is full (max 4 users)" }, 403);
  }

  const valid = await verifyRoomPassword(body.roomId, body.password);
  if (!valid) {
    return jsonResponse({ error: "Incorrect password" }, 401);
  }

  return jsonResponse({ ok: true, room: getRoomInfo(room) });
}

export function handleListRooms(): Response {
  const rooms = listPublicRooms();
  return jsonResponse({ rooms });
}