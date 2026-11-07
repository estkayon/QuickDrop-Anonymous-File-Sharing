export interface RoomMeta {
  passwordHash: string;
  isPublic: boolean;
  createdAt: number;
}

export interface Env {
  ROOMS: DurableObjectNamespace;
  ROOM_META: KVNamespace;
}