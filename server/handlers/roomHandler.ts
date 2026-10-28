import { RoomService } from "../services/roomService.ts";
import { hashPassword, jsonResponse, verifyPassword } from "../utils.ts";
import { RateLimiter } from "../services/rateLimiter.ts";

const roomService = RoomService.getInstance();
const rateLimiter = new RateLimiter();

export async function handleCreateRoom(req: Request): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  if (!rateLimiter.checkLimit(ip, "create")) {
    return jsonResponse({ error: "Rate limit exceeded. Try again later." }, 429);
  }

  const body = await req.json();
  const { password, isPublic = false } = body;

  if (!password || typeof password !== "string" || password.length < 3) {
    return jsonResponse({ error: "Password must be at least 3 characters" }, 400);
  }

  const passwordHash = await hashPassword(password);
  const roomId = roomService.createRoom(passwordHash, isPublic);

  return jsonResponse({ roomId, isPublic }, 201);
}

export async function handleJoinRoom(req: Request): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  if (!rateLimiter.checkLimit(ip, "join")) {
    return jsonResponse({ error: "Rate limit exceeded. Try again later." }, 429);
  }

  const body = await req.json();
  const { roomId, password } = body;

  if (!roomId || !password) {
    return jsonResponse({ error: "Room ID and password are required" }, 400);
  }

  const room = roomService.getRoom(roomId);
  if (!room) {
    return jsonResponse({ error: "Room not found" }, 404);
  }

  const valid = await verifyPassword(password, room.passwordHash);
  if (!valid) {
    return jsonResponse({ error: "Invalid password" }, 403);
  }

  if (roomService.isRoomFull(roomId)) {
    return jsonResponse({ error: "Room is full (max 4 users)" }, 403);
  }

  return jsonResponse({
    ok: true,
    room: {
      id: room.id,
      userCount: room.users.size,
      maxUsers: 4,
    },
  });
}

export function handleListRooms(): Response {
  const rooms = roomService.listPublicRooms();
  return jsonResponse({ rooms });
}