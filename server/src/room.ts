import { generateUserId, hashPassword } from "./utils";

export class RoomDO implements DurableObject {
  private state: DurableObjectState;
  private sockets = new Map<string, WebSocket>();
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/init") {
      const body = await request.json() as { passwordHash: string; isPublic: boolean };
      await this.state.storage.put({
        passwordHash: body.passwordHash,
        isPublic: body.isPublic,
        createdAt: Date.now(),
      });
      return new Response("ok");
    }

    if (url.pathname === "/info") {
      const hash = await this.state.storage.get("passwordHash");
      if (!hash) return new Response("not found", { status: 404 });
      return Response.json({
        userCount: this.sockets.size,
        isPublic: await this.state.storage.get("isPublic"),
        createdAt: await this.state.storage.get("createdAt"),
      });
    }

    if (url.pathname === "/ws") {
      return this.upgrade(url);
    }

    return new Response("not found", { status: 404 });
  }

  private async upgrade(url: URL): Promise<Response> {
    const password = url.searchParams.get("pwd") || "";
    const reconnectId = url.searchParams.get("userId");

    const storedHash = await this.state.storage.get<string>("passwordHash");
    if (!storedHash) {
      return new Response("Room not initialized", { status: 404 });
    }

    const inputHash = await hashPassword(password);
    if (inputHash !== storedHash) {
      return new Response("Invalid password", { status: 403 });
    }

    const isReconnect = reconnectId ? this.sockets.has(reconnectId) : false;
    if (!isReconnect && this.sockets.size >= 4) {
      return new Response("Room is full", { status: 403 });
    }

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const existingPeers = [...this.sockets.keys()];
    let userId: string;

    if (isReconnect && reconnectId) {
      userId = reconnectId;
      const old = this.sockets.get(userId);
      if (old) try { old.close(); } catch { /* noop */ }
      this.sockets.set(userId, server);
    } else {
      userId = generateUserId();
      this.sockets.set(userId, server);
    }

    server.accept();

    const peers = existingPeers.filter((id) => id !== userId);
    server.send(JSON.stringify({ type: "joined", payload: { userId, peers } }));

    if (!isReconnect) {
      this.broadcast({ type: "peer-joined", payload: { userId } }, userId);
    }

    server.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));

      switch (msg.type) {
        case "offer":
        case "answer":
        case "ice-candidate": {
          const target = this.sockets.get(msg.to);
          if (target) {
            try {
              target.send(JSON.stringify({
                type: msg.type,
                from: userId,
                payload: msg.payload,
              }));
            } catch {
              this.sockets.delete(msg.to);
            }
          }
          break;
        }
        case "chat": {
          this.broadcast(
            { type: "chat", from: userId, payload: msg.payload },
            userId,
          );
          break;
        }
      }
    });

    const onClose = () => {
      if (!this.sockets.has(userId)) return;
      this.sockets.delete(userId);
      this.broadcast({ type: "peer-left", payload: { userId } });

      if (this.sockets.size === 0) {
        this.cleanupTimer = setTimeout(() => {
          if (this.sockets.size === 0) {
            this.state.storage.deleteAll();
          }
        }, 20_000);
      }
    };

    server.addEventListener("close", onClose);
    server.addEventListener("error", onClose);

    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast(message: Record<string, unknown>, exclude?: string): void {
    const data = JSON.stringify(message);
    for (const [uid, socket] of this.sockets) {
      if (uid === exclude) continue;
      try {
        socket.send(data);
      } catch {
        this.sockets.delete(uid);
      }
    }
  }
}