var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-ctGMNS/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/utils.ts
function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
__name(generateRoomId, "generateRoomId");
function generateUserId() {
  return "user-" + crypto.randomUUID().slice(0, 8);
}
__name(generateUserId, "generateUserId");
async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, hash) {
  return await hashPassword(password) === hash;
}
__name(verifyPassword, "verifyPassword");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json, "json");

// src/room.ts
var RoomDO = class {
  state;
  sockets = /* @__PURE__ */ new Map();
  cleanupTimer = null;
  constructor(state) {
    this.state = state;
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/init") {
      const body = await request.json();
      await this.state.storage.put({
        passwordHash: body.passwordHash,
        isPublic: body.isPublic,
        createdAt: Date.now()
      });
      return new Response("ok");
    }
    if (url.pathname === "/info") {
      const hash = await this.state.storage.get("passwordHash");
      if (!hash)
        return new Response("not found", { status: 404 });
      return Response.json({
        userCount: this.sockets.size,
        isPublic: await this.state.storage.get("isPublic"),
        createdAt: await this.state.storage.get("createdAt")
      });
    }
    if (url.pathname === "/ws") {
      return this.upgrade(url);
    }
    return new Response("not found", { status: 404 });
  }
  async upgrade(url) {
    const password = url.searchParams.get("pwd") || "";
    const reconnectId = url.searchParams.get("userId");
    const storedHash = await this.state.storage.get("passwordHash");
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
    let userId;
    if (isReconnect && reconnectId) {
      userId = reconnectId;
      const old = this.sockets.get(userId);
      if (old)
        try {
          old.close();
        } catch {
        }
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
                payload: msg.payload
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
            userId
          );
          break;
        }
      }
    });
    const onClose = /* @__PURE__ */ __name(() => {
      if (!this.sockets.has(userId))
        return;
      this.sockets.delete(userId);
      this.broadcast({ type: "peer-left", payload: { userId } });
      if (this.sockets.size === 0) {
        this.cleanupTimer = setTimeout(() => {
          if (this.sockets.size === 0) {
            this.state.storage.deleteAll();
          }
        }, 2e4);
      }
    }, "onClose");
    server.addEventListener("close", onClose);
    server.addEventListener("error", onClose);
    return new Response(null, { status: 101, webSocket: client });
  }
  broadcast(message, exclude) {
    const data = JSON.stringify(message);
    for (const [uid, socket] of this.sockets) {
      if (uid === exclude)
        continue;
      try {
        socket.send(data);
      } catch {
        this.sockets.delete(uid);
      }
    }
  }
};
__name(RoomDO, "RoomDO");

// src/index.ts
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function cors(res) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS))
    h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}
__name(cors, "cors");
var src_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    try {
      if (path === "/ws")
        return handleWs(req, url, env);
      if (path === "/api/rooms" && req.method === "POST")
        return cors(await createRoom(req, env));
      if (path === "/api/rooms/join" && req.method === "POST")
        return cors(await joinRoom(req, env));
      if (path === "/api/rooms" && req.method === "GET")
        return cors(await listRooms(env));
      if (path === "/api/rooms/public")
        return cors(await listRooms(env));
      if (path === "/" || path === "/health")
        return cors(new Response("QuickDrop signaling server running"));
      return cors(new Response("Not Found", { status: 404 }));
    } catch (err) {
      console.error(err);
      return cors(json({ error: "Internal server error" }, 500));
    }
  }
};
function handleWs(req, url, env) {
  const roomId = url.searchParams.get("room");
  if (!roomId)
    return new Response("Missing room", { status: 400 });
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
__name(handleWs, "handleWs");
async function createRoom(req, env) {
  const body = await req.json();
  const { password, isPublic = false } = body;
  if (!password || typeof password !== "string" || password.length < 3) {
    return json({ error: "Password must be at least 3 characters" }, 400);
  }
  const roomId = generateRoomId();
  const passwordHash = await hashPassword(password);
  const meta = { passwordHash, isPublic, createdAt: Date.now() };
  await env.ROOM_META.put(roomId, JSON.stringify(meta), { expirationTtl: 3600 });
  const id = env.ROOMS.idFromName(roomId);
  const stub = env.ROOMS.get(id);
  await stub.fetch(new Request("https://internal/init", {
    method: "POST",
    body: JSON.stringify({ passwordHash, isPublic })
  }));
  return json({ roomId, isPublic }, 201);
}
__name(createRoom, "createRoom");
async function joinRoom(req, env) {
  const body = await req.json();
  const { roomId, password } = body;
  if (!roomId || !password) {
    return json({ error: "Room ID and password are required" }, 400);
  }
  const raw = await env.ROOM_META.get(roomId);
  if (!raw)
    return json({ error: "Room not found" }, 404);
  const meta = JSON.parse(raw);
  if (!await verifyPassword(password, meta.passwordHash)) {
    return json({ error: "Invalid password" }, 403);
  }
  const id = env.ROOMS.idFromName(roomId);
  const stub = env.ROOMS.get(id);
  const infoRes = await stub.fetch(new Request("https://internal/info"));
  const info = await infoRes.json();
  if (info.userCount >= 4) {
    return json({ error: "Room is full (max 4 users)" }, 403);
  }
  return json({ ok: true, room: { id: roomId, userCount: info.userCount, maxUsers: 4 } });
}
__name(joinRoom, "joinRoom");
async function listRooms(env) {
  const list = await env.ROOM_META.list();
  const rooms = [];
  for (const key of list.keys) {
    const raw = await env.ROOM_META.get(key.name);
    if (!raw)
      continue;
    const meta = JSON.parse(raw);
    if (!meta.isPublic)
      continue;
    try {
      const id = env.ROOMS.idFromName(key.name);
      const stub = env.ROOMS.get(id);
      const infoRes = await stub.fetch(new Request("https://internal/info"));
      const info = await infoRes.json();
      rooms.push({
        id: key.name,
        isPublic: true,
        userCount: info.userCount,
        maxUsers: 4,
        createdAt: meta.createdAt
      });
    } catch {
    }
  }
  return json({ rooms });
}
__name(listRooms, "listRooms");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ctGMNS/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ctGMNS/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  RoomDO,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
