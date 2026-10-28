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

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  userId: null,
  password: null,
  peers: [],
  connected: false,
  error: null,

  setRoom: (roomId, password) => set({ roomId, password, error: null }),
  setUserId: (userId) => set({ userId }),
  setPeers: (peers) => set({ peers }),
  addPeer: (peerId) =>
    set((state) => ({
      peers: state.peers.includes(peerId)
        ? state.peers
        : [...state.peers, peerId],
    })),
  removePeer: (peerId) =>
    set((state) => ({
      peers: state.peers.filter((id) => id !== peerId),
    })),
  setConnected: (connected) => set({ connected }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      roomId: null,
      userId: null,
      password: null,
      peers: [],
      connected: false,
      error: null,
    }),
}));