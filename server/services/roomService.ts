import { generateRoomId, generateUserId } from "../utils.ts";
import type { RoomData } from "../types.ts";

export class RoomService {
  private static instance: RoomService;
  private rooms = new Map<string, RoomData>();
  private cleanupTimers = new Map<string, number>();

  static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  createRoom(passwordHash: string, isPublic: boolean): string {
    const id = generateRoomId();
    this.rooms.set(id, {
      id,
      passwordHash,
      isPublic,
      createdAt: Date.now(),
      users: new Map(),
    });
    this.scheduleCleanup(id);
    return id;
  }

  getRoom(id: string): RoomData | undefined {
    return this.rooms.get(id);
  }

  isRoomFull(id: string): boolean {
    const room = this.rooms.get(id);
    return room ? room.users.size >= 4 : true;
  }

  addUser(roomId: string, socket: WebSocket): string | null {
    const room = this.rooms.get(roomId);
    if (!room || room.users.size >= 4) return null;

    const userId = generateUserId();
    room.users.set(userId, socket);
    this.cancelCleanup(roomId);
    return userId;
  }

  removeUser(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.users.delete(userId);

    if (room.users.size === 0) {
      this.scheduleCleanup(roomId);
    }
  }

  getRoomUsers(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.keys()) : [];
  }

  getUserSocket(roomId: string, userId: string): WebSocket | undefined {
    return this.rooms.get(roomId)?.users.get(userId);
  }

  broadcastToRoom(
    roomId: string,
    message: Record<string, unknown>,
    excludeUserId?: string
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const payload = JSON.stringify(message);

    for (const [uid, socket] of room.users) {
      if (uid === excludeUserId) continue;
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }

  listPublicRooms() {
    const rooms: Array<{
      id: string;
      isPublic: boolean;
      userCount: number;
      maxUsers: number;
      createdAt: number;
    }> = [];

    for (const room of this.rooms.values()) {
      if (room.isPublic) {
        rooms.push({
          id: room.id,
          isPublic: true,
          userCount: room.users.size,
          maxUsers: 4,
          createdAt: room.createdAt,
        });
      }
    }

    return rooms;
  }

  private scheduleCleanup(roomId: string): void {
    this.cancelCleanup(roomId);
    const timer = setTimeout(() => {
      this.rooms.delete(roomId);
      this.cleanupTimers.delete(roomId);
    }, 20_000);
    this.cleanupTimers.set(roomId, timer);
  }

  private cancelCleanup(roomId: string): void {
    const timer = this.cleanupTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(roomId);
    }
  }
}