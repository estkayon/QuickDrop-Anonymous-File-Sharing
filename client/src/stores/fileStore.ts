import { create } from "zustand";

export interface FileEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "sending" | "receiving" | "done" | "error";
  sender: string;
  file?: File;
}

interface FileState {
  files: FileEntry[];
  unread: number;
  addFile: (entry: FileEntry) => void;
  updateProgress: (id: string, progress: number) => void;
  setStatus: (id: string, status: FileEntry["status"]) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
  clear: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  files: [],
  unread: 0,

  addFile: (entry) =>
    set((state) => ({
      files: [entry, ...state.files],
    })),

  updateProgress: (id, progress) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, progress } : f
      ),
    })),

  setStatus: (id, status) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, status } : f
      ),
    })),

  incrementUnread: () =>
    set((state) => ({ unread: state.unread + 1 })),

  resetUnread: () => set({ unread: 0 }),

  clear: () => set({ files: [], unread: 0 }),
}));