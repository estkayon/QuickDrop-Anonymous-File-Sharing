import type { RoomData, RoomInfo } from "../types.ts";
import { generateRoomId, hashPassword, verifyPassword } from "../utils.ts";

const MAX_USERS = 4;
const EMPTY_ROOM_TTL = 20_000; // 20 seconds

const rooms = new Map<string, RoomData>();
const cleanupTimers = new Map<string, number>();

export function getRoomInfo(room: RoomData): RoomInfo {
  return {
    id: room.id,
    isPublic: room.isPublic,
    userCount: room.users.size,
    maxUsers: MAX_USERS,
    createdAt: room.createdAt,
  };
}

export async function createRoom(
  password: string,
  isPublic: boolean,
): Promise<RoomData> {
  const id = generateRoomId();
  const passwordHash = await hashPassword(password);

  const room: RoomData = {
    id,
    passwordHash,
    isPublic,
    createdAt: Date.now(),
    users: new Map(),
  };

  rooms.set(id, room);
  scheduleCleanup(id);

  return room;
}

export function getRoom(roomId: string): RoomData | undefined {
  return rooms.get(roomId);
}

export async function verifyRoomPassword(
  roomId: string,
  password: string,
): Promise<boolean> {
  const room = rooms.get(roomId);
  if (!room) return false;
  return verifyPassword(password, room.passwordHash);
}

export function isRoomFull(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return true;
  return room.users.size >= MAX_USERS;
}

export function addUser(roomId: string, userId: string, ws: WebSocket): boolean {
  const room = rooms.get(roomId);
  if (!room || room.users.size >= MAX_USERS) return false;

  room.users.set(userId, ws);
  cancelCleanup(roomId);

  return true;
}

export function removeUser(roomId: string, userId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  room.users.delete(userId);

  if (room.users.size === 0) {
    scheduleCleanup(roomId);
  }
}

export function getRoomUsers(roomId: string): string[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.users.keys());
}

export function getUserSocket(
  roomId: string,
  userId: string,
): WebSocket | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  return room.users.get(userId);
}

export function broadcastToRoom(
  roomId: string,
  message: string,
  excludeUserId?: string,
): void {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const [userId, ws] of room.users) {
    if (userId === excludeUserId) continue;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export function listPublicRooms(): RoomInfo[] {
  const publicRooms: RoomInfo[] = [];

  for (const room of rooms.values()) {
    if (room.isPublic && room.users.size > 0) {
      publicRooms.push(getRoomInfo(room));
    }
  }

  return publicRooms.sort((a, b) => b.createdAt - a.createdAt);
}

function scheduleCleanup(roomId: string): void {
  cancelCleanup(roomId);

  const timer = setTimeout(() => {
    const room = rooms.get(roomId);
    if (room && room.users.size === 0) {
      rooms.delete(roomId);
      cleanupTimers.delete(roomId);
      console.log(`Room ${roomId} destroyed (empty)`);
    }
  }, EMPTY_ROOM_TTL);

  cleanupTimers.set(roomId, timer);
}

function cancelCleanup(roomId: string): void {
  const timer = cleanupTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    cleanupTimers.delete(roomId);
  }
}