import { handleCreateRoom, handleJoinRoom, handleListRooms } from "./handlers/roomHandler.ts";
import { handleWebSocket } from "./handlers/wsHandler.ts";

const PORT = 8080;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) {
    headers.set(k, v);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";
}

Deno.serve({ port: PORT, hostname: "0.0.0.0" }, async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // WebSocket upgrade — no CORS needed for WebSocket
  if (path === "/ws") {
    if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
      return handleWebSocket(req);
    }
    return new Response("Expected WebSocket", { status: 400 });
  }

  const ip = getClientIp(req);

  // REST API — wrap all responses with CORS headers
  if (path === "/api/rooms" && method === "POST") {
    const res = await handleCreateRoom(req, ip);
    return withCors(res);
  }

  if (path === "/api/rooms/join" && method === "POST") {
    const res = await handleJoinRoom(req, ip);
    return withCors(res);
  }

  if (path === "/api/rooms" && method === "GET") {
    const res = await handleListRooms();
    return withCors(res);
  }

  // Health check
  if (path === "/health") {
    return withCors(new Response("ok"));
  }

  return withCors(new Response("Not Found", { status: 404 }));
});

console.log(`Signaling server running on :${PORT}`);