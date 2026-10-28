import { handleCreateRoom, handleJoinRoom, handleListRooms } from "./handlers/roomHandler.ts";
import { handleWebSocket } from "./handlers/wsHandler.ts";
import { corsHeaders } from "./utils.ts";

const PORT = 8080;

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";
}

Deno.serve({ port: PORT }, (req: Request): Response | Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === "OPTIONS") {
    return corsHeaders();
  }

  // WebSocket upgrade
  if (path === "/ws") {
    if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
      return handleWebSocket(req);
    }
    return new Response("Expected WebSocket", { status: 400 });
  }

  const ip = getClientIp(req);

  // REST API
  if (path === "/api/rooms" && method === "POST") {
    return handleCreateRoom(req, ip);
  }

  if (path === "/api/rooms/join" && method === "POST") {
    return handleJoinRoom(req, ip);
  }

  if (path === "/api/rooms" && method === "GET") {
    return handleListRooms();
  }

  // Health check
  if (path === "/health") {
    return new Response("ok");
  }

  return new Response("Not Found", { status: 404 });
});

console.log(`Signaling server running on :${PORT}`);