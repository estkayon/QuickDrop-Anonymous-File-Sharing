import type { Env, RoomMeta } from "./types";
import { generateRoomId, hashPassword, verifyPassword, json } from "./utils";

export { RoomDO } from "./room";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function cors(res: Response): Response {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    try {
      if (path === "/ws") return handleWs(req, url, env);
      if (path === "/api/rooms" && req.method === "POST") return cors(await createRoom(req, env));
      if (path === "/api/rooms/join" && req.method === "POST") return cors(await joinRoom(req, env));
      if (path === "/api/rooms" && req.method === "GET") return cors(await listRooms(env));
      if (path === "/api/rooms/public") return cors(await listRooms(env));
      if (path === "/" || path === "/health") return cors(new Response("QuickDrop signaling server running"));
      return cors(new Response("Not Found", { status: 404 }));
    } catch (err) {
      console.error(err);
      return cors(json({ error: "Internal server error" }, 500));
    }
  },
};

function handleWs(req: Request, url: URL, env: Env): Response {
  const roomId = url.searchParams.get("room");
  if (!roomId) return new Response("Missing room", { status: 400 });

  const upgradeHeader = req.headers.get("Upgrade");
  if (upgradeHeader !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const id = env.ROOMS.idFromName(roomId);
  const stub = env.ROOMS.get(id);

  const doUrl = new URL(req.url);
  doUrl.pathname = "/ws";
  return stub.fetch(new Request(doUrl.toString(), req));
}

async function createRoom(req: Request, env: Env): Promise<Response> {
  const body = await req.json() as { password?: string; isPublic?: boolean };
  const { password, isPublic = false } = body;

  if (!password || typeof password !== "string" || password.length < 3) {
    return json({ error: "Password must be at least 3 characters" }, 400);
  }

  const roomId = generateRoomId();
  const passwordHash = await hashPassword(password);
  const meta: RoomMeta = { passwordHash, isPublic, createdAt: Date.now() };

  await env.ROOM_META.put(roomId, JSON.stringify(meta), { expirationTtl: 3600 });

  const id = env.ROOMS.idFromName(roomId);
  const stub = env.ROOMS.get(id);
  await stub.fetch(new Request("https://internal/init", {
    method: "POST",
    body: JSON.stringify({ passwordHash, isPublic }),
  }));

  return json({ roomId, isPublic }, 201);
}

async function joinRoom(req: Request, env: Env): Promise<Response> {
  const body = await req.json() as { roomId?: string; password?: string };
  const { roomId, password } = body;

  if (!roomId || !password) {
    return json({ error: "Room ID and password are required" }, 400);
  }

  const raw = await env.ROOM_META.get(roomId);
  if (!raw) return json({ error: "Room not found" }, 404);

  const meta: RoomMeta = JSON.parse(raw);
  if (!(await verifyPassword(password, meta.passwordHash))) {
    return json({ error: "Invalid password" }, 403);
  }

  const id = env.ROOMS.idFromName(roomId);
  const stub = env.ROOMS.get(id);
  const infoRes = await stub.fetch(new Request("https://internal/info"));
  const info = await infoRes.json() as { userCount: number };

  if (info.userCount >= 4) {
    return json({ error: "Room is full (max 4 users)" }, 403);
  }

  return json({ ok: true, room: { id: roomId, userCount: info.userCount, maxUsers: 4 } });
}

async function listRooms(env: Env): Promise<Response> {
  const list = await env.ROOM_META.list();
  const rooms = [];

  for (const key of list.keys) {
    const raw = await env.ROOM_META.get(key.name);
    if (!raw) continue;
    const meta: RoomMeta = JSON.parse(raw);
    if (!meta.isPublic) continue;

    try {
      const id = env.ROOMS.idFromName(key.name);
      const stub = env.ROOMS.get(id);
      const infoRes = await stub.fetch(new Request("https://internal/info"));
      const info = await infoRes.json() as { userCount: number };
      rooms.push({
        id: key.name,
        isPublic: true,
        userCount: info.userCount,
        maxUsers: 4,
        createdAt: meta.createdAt,
      });
    } catch {
      // DO unavailable, skip
    }
  }

  return json({ rooms });
}