export interface RoomData {
  id: string;
  passwordHash: string;
  isPublic: boolean;
  createdAt: number;
  users: Map<string, WebSocket>;
}

export interface RoomInfo {
  id: string;
  isPublic: boolean;
  userCount: number;
  maxUsers: number;
  createdAt: number;
}

export interface SignalMessage {
  type: string;
  from?: string;
  to?: string;
  payload?: unknown;
}