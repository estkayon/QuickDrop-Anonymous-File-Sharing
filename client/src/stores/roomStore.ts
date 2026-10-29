import { create } from "zustand";

interface RoomState {
  roomId: string | null;
  userId: string | null;
  password: string | null;
  peers: string[];
  connected: boolean;
  error: string | null;

  setRoom: (roomId: string, password: string) => void;
  setUserId: (userId: string) => void;
  setPeers: (peers: string[]) => void;
  addPeer: (peerId: string) => void;
  removePeer: (peerId: string) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

function saveSession(roomId: string, password: string, userId?: string) {
  try {
    const existing = sessionStorage.getItem("quickdrop_session");
    const prev = existing ? JSON.parse(existing) : {};
    sessionStorage.setItem("quickdrop_session", JSON.stringify({
      roomId,
      password,
      userId: userId || prev.userId || null,
    }));
  } catch {}
}

function clearSession() {
  try { sessionStorage.removeItem("quickdrop_session"); } catch {}
}

function loadSession(): { roomId: string; password: string; userId?: string } | null {
  try {
    const raw = sessionStorage.getItem("quickdrop_session");
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

const saved = loadSession();

export const useRoomStore = create<RoomState>((set, get) => ({
  roomId: saved?.roomId ?? null,
  userId: saved?.userId ?? null,
  password: saved?.password ?? null,
  peers: [],
  connected: false,
  error: null,

  setRoom: (roomId, password) => {
    saveSession(roomId, password);
    set({ roomId, password, error: null });
  },
  setUserId: (userId) => {
    const { roomId, password } = get();
    if (roomId && password) saveSession(roomId, password, userId);
    set({ userId });
  },
  setPeers: (peers) => set({ peers }),
  addPeer: (peerId) =>
    set((state) => ({
      peers: state.peers.includes(peerId) ? state.peers : [...state.peers, peerId],
    })),
  removePeer: (peerId) =>
    set((state) => ({
      peers: state.peers.filter((id) => id !== peerId),
    })),
  setConnected: (connected) => set({ connected }),
  setError: (error) => set({ error }),
  reset: () => {
    clearSession();
    set({ roomId: null, userId: null, password: null, peers: [], connected: false, error: null });
  },
}));