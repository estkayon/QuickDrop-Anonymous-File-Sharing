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
  addFile: (entry: FileEntry) => void;
  updateProgress: (id: string, progress: number) => void;
  setStatus: (id: string, status: FileEntry["status"]) => void;
  clear: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  files: [],

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

  clear: () => set({ files: [] }),
}));