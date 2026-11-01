import { handleCreateRoom, handleJoinRoom, handleListRooms } from "./handlers/roomHandler.ts";
import { handleWebSocket } from "./handlers/wsHandler.ts";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (path === "/ws") {
    return handleWebSocket(req);
  }

  if (path === "/api/rooms" && req.method === "POST") {
    return withCors(await handleCreateRoom(req));
  }
  if (path === "/api/rooms" && req.method === "GET") {
    return withCors(handleListRooms());
  }
  if (path === "/api/rooms/join" && req.method === "POST") {
    return withCors(await handleJoinRoom(req));
  }
  if (path === "/api/rooms/public" && req.method === "GET") {
    return withCors(handleListRooms());
  }

  if (path === "/" || path === "/health") {
    return withCors(new Response("QuickDrop signaling server running", { status: 200 }));
  }

  return withCors(new Response("Not Found", { status: 404 }));
}

const isDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
if (isDeploy) {
  Deno.serve(handler);
} else {
  const port = parseInt(Deno.env.get("PORT") || "8080");
  Deno.serve({ port, hostname: "0.0.0.0" }, handler);
}