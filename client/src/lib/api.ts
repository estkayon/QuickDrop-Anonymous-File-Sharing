const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface CreateRoomResponse {
  roomId: string;
  isPublic: boolean;
}

interface JoinRoomResponse {
  ok: boolean;
  room: {
    id: string;
    userCount: number;
    maxUsers: number;
  };
}

interface RoomInfo {
  id: string;
  isPublic: boolean;
  userCount: number;
  maxUsers: number;
  createdAt: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data as T;
}

export async function createRoom(password: string, isPublic: boolean) {
  return request<CreateRoomResponse>("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ password, isPublic }),
  });
}

export async function joinRoom(roomId: string, password: string) {
  return request<JoinRoomResponse>("/api/rooms/join", {
    method: "POST",
    body: JSON.stringify({ roomId, password }),
  });
}

export async function listPublicRooms() {
  return request<{ rooms: RoomInfo[] }>("/api/rooms");
}

export function getWsUrl(roomId: string, password: string): string {
  const wsBase = API_URL.replace(/^http/, "ws");
  return `${wsBase}/ws?room=${encodeURIComponent(roomId)}&pwd=${encodeURIComponent(password)}`;
}