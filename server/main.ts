import { handleCreateRoom, handleJoinRoom, handleListPublicRooms } from "./handlers/roomHandler.ts";
import { handleWebSocket } from "./handlers/wsHandler.ts";

/* ── CORS ── */
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

/* ── Router ── */
async function handler(req: Request, info: Deno.ServeHandlerInfo): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const ip =
    (info?.remoteAddr as Deno.NetAddr)?.hostname ?? "unknown";

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // WebSocket upgrade
  if (path === "/ws") {
    return handleWebSocket(req);
  }

  // REST API
  if (path === "/api/rooms" && req.method === "POST") {
    return withCors(await handleCreateRoom(req, ip));
  }
  if (path.match(/^\/api\/rooms\/[\w-]+\/join$/) && req.method === "POST") {
    return withCors(await handleJoinRoom(req, path));
  }
  if (path === "/api/rooms/public" && req.method === "GET") {
    return withCors(await handleListPublicRooms());
  }

  // Health check
  if (path === "/" || path === "/health") {
    return withCors(new Response("QuickDrop signaling server is running", { status: 200 }));
  }

  return withCors(new Response("Not Found", { status: 404 }));
}

/* ── Start ── */
const isDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

if (isDeploy) {
  // Deno Deploy — platform assigns port
  Deno.serve(handler);
} else {
  // Local dev
  const port = parseInt(Deno.env.get("PORT") || "8080");
  Deno.serve({ port, hostname: "0.0.0.0" }, handler);
  console.log(`Server running on http://0.0.0.0:${port}`);
}