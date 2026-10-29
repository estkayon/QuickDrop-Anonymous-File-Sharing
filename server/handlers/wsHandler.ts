import { RoomService } from "../services/roomService.ts";
import { verifyPassword } from "../utils.ts";

const roomService = RoomService.getInstance();

export function handleWebSocket(req: Request): Response {
  const url = new URL(req.url);
  const roomId = url.searchParams.get("room");
  const password = url.searchParams.get("pwd");
  const reconnectUserId = url.searchParams.get("userId");

  if (!roomId || !password) {
    return new Response("Missing room or password", { status: 400 });
  }

  const room = roomService.getRoom(roomId);
  if (!room) {
    return new Response("Room not found", { status: 404 });
  }

  // Don't check full if this is a reconnect (user already has a slot)
  const isReconnect = reconnectUserId && room.users.has(reconnectUserId);
  if (!isReconnect && roomService.isRoomFull(roomId)) {
    return new Response("Room is full", { status: 403 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  let userId: string | null = null;

  socket.addEventListener("open", async () => {
    const valid = await verifyPassword(password, room.passwordHash);
    if (!valid) {
      socket.send(JSON.stringify({ type: "error", payload: "Invalid password" }));
      socket.close();
      return;
    }

    if (isReconnect && reconnectUserId) {
      // Reconnect: replace old socket with new one
      userId = reconnectUserId;
      const oldSocket = room.users.get(userId!);
      room.users.set(userId!, socket);

      // Close old socket if still open (don't trigger remove)
      if (oldSocket && oldSocket.readyState === WebSocket.OPEN) {
        try { oldSocket.close(); } catch {}
      }

      const peers = roomService.getRoomUsers(roomId).filter((id) => id !== userId);
      socket.send(JSON.stringify({
        type: "joined",
        payload: { userId, peers },
      }));
      // No peer-joined broadcast — they already know this user
    } else {
      // New user
      userId = roomService.addUser(roomId, socket);
      if (!userId) {
        socket.send(JSON.stringify({ type: "error", payload: "Failed to join room" }));
        socket.close();
        return;
      }

      const peers = roomService.getRoomUsers(roomId).filter((id) => id !== userId);
      socket.send(JSON.stringify({
        type: "joined",
        payload: { userId, peers },
      }));

      roomService.broadcastToRoom(roomId, {
        type: "peer-joined",
        payload: { userId },
      }, userId);
    }
  });

  socket.addEventListener("message", (event: MessageEvent) => {
    if (!userId) return;

    const data = JSON.parse(String(event.data));

    switch (data.type) {
      case "offer":
      case "answer":
      case "ice-candidate": {
        const targetSocket = roomService.getUserSocket(roomId, data.to);
        if (targetSocket) {
          targetSocket.send(
            JSON.stringify({
              type: data.type,
              from: userId,
              payload: data.payload,
            })
          );
        }
        break;
      }

      case "chat": {
        roomService.broadcastToRoom(roomId, {
          type: "chat",
          from: userId,
          payload: data.payload,
        }, userId);
        break;
      }
    }
  });

  socket.addEventListener("close", () => {
    if (userId) {
      const currentSocket = roomService.getUserSocket(roomId, userId);
      // Only remove if this socket is still the active one
      if (currentSocket === socket) {
        roomService.removeUser(roomId, userId);
        roomService.broadcastToRoom(roomId, {
          type: "peer-left",
          payload: { userId },
        });
      }
      userId = null;
    }
  });

  socket.addEventListener("error", (_event: Event) => {
    if (userId) {
      const currentSocket = roomService.getUserSocket(roomId, userId);
      if (currentSocket === socket) {
        roomService.removeUser(roomId, userId);
        roomService.broadcastToRoom(roomId, {
          type: "peer-left",
          payload: { userId },
        });
      }
      userId = null;
    }
  });

  return response;
}