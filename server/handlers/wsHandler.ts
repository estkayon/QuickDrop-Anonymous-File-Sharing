import { RoomService } from "../services/roomService.ts";
import { verifyPassword } from "../utils.ts";

const roomService = RoomService.getInstance();

export function handleWebSocket(req: Request): Response {
  const url = new URL(req.url);
  const roomId = url.searchParams.get("room");
  const password = url.searchParams.get("pwd");

  if (!roomId || !password) {
    return new Response("Missing room or password", { status: 400 });
  }

  const room = roomService.getRoom(roomId);
  if (!room) {
    return new Response("Room not found", { status: 404 });
  }

  if (roomService.isRoomFull(roomId)) {
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

    userId = roomService.addUser(roomId, socket);
    if (!userId) {
      socket.send(JSON.stringify({ type: "error", payload: "Failed to join room" }));
      socket.close();
      return;
    }

    const peers = roomService.getRoomUsers(roomId).filter((id) => id !== userId);

    // tell the new user their ID and existing peers
    socket.send(
      JSON.stringify({
        type: "joined",
        payload: { userId, peers },
      })
    );

    // tell existing peers about the new user
    roomService.broadcastToRoom(roomId, {
      type: "peer-joined",
      payload: { userId },
    }, userId);
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
        // broadcast to all peers EXCEPT the sender
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
      roomService.removeUser(roomId, userId);
      roomService.broadcastToRoom(roomId, {
        type: "peer-left",
        payload: { userId },
      });
    }
  });

  socket.addEventListener("error", (_event: Event) => {
    if (userId) {
      roomService.removeUser(roomId, userId);
    }
  });

  return response;
}