import {
  addUser,
  removeUser,
  getRoomUsers,
  getUserSocket,
  broadcastToRoom,
  getRoom,
  verifyRoomPassword,
  isRoomFull,
} from "../services/roomService.ts";
import { generateUserId } from "../utils.ts";
import type { SignalMessage } from "../types.ts";

export function handleWebSocket(req: Request): Response {
  const url = new URL(req.url);
  const roomId = url.searchParams.get("room");
  const password = url.searchParams.get("pwd");

  if (!roomId || !password) {
    return new Response("Missing room or password", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  const userId = generateUserId();

  socket.addEventListener("open", async () => {
    const room = getRoom(roomId);
    if (!room) {
      socket.send(JSON.stringify({ type: "error", payload: "Room not found" }));
      socket.close();
      return;
    }

    if (isRoomFull(roomId)) {
      socket.send(JSON.stringify({ type: "error", payload: "Room is full" }));
      socket.close();
      return;
    }

    const valid = await verifyRoomPassword(roomId, password);
    if (!valid) {
      socket.send(JSON.stringify({ type: "error", payload: "Wrong password" }));
      socket.close();
      return;
    }

    const added = addUser(roomId, userId, socket);
    if (!added) {
      socket.send(JSON.stringify({ type: "error", payload: "Could not join room" }));
      socket.close();
      return;
    }

    const existingUsers = getRoomUsers(roomId).filter((id) => id !== userId);
    socket.send(
      JSON.stringify({
        type: "joined",
        payload: { userId, peers: existingUsers },
      }),
    );

    broadcastToRoom(
      roomId,
      JSON.stringify({ type: "peer-joined", payload: { userId } }),
      userId,
    );

    console.log(`${userId} joined ${roomId} (${getRoomUsers(roomId).length} users)`);
  });

  socket.addEventListener("message", (event: MessageEvent) => {
    let msg: SignalMessage;
    try {
      msg = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (msg.type === "offer" || msg.type === "answer" || msg.type === "ice-candidate") {
      if (!msg.to) return;

      const targetWs = getUserSocket(roomId, msg.to);
      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(
          JSON.stringify({
            type: msg.type,
            from: userId,
            payload: msg.payload,
          }),
        );
      }
    }

    if (msg.type === "chat") {
      broadcastToRoom(
        roomId,
        JSON.stringify({
          type: "chat",
          from: userId,
          payload: msg.payload,
        }),
        userId,
      );
    }
  });

  socket.addEventListener("close", () => {
    removeUser(roomId, userId);
    broadcastToRoom(
      roomId,
      JSON.stringify({ type: "peer-left", payload: { userId } }),
    );
    console.log(`${userId} left ${roomId}`);
  });

  socket.addEventListener("error", (e: Event) => {
    console.error(`WebSocket error for ${userId}:`, e);
  });

  return response;
}