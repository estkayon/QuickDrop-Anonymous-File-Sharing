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

interface SavedFileEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "sending" | "receiving" | "done" | "error";
  sender: string;
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

function loadFiles(): FileEntry[] {
  try {
    const raw = sessionStorage.getItem("quickdrop_files");
    if (raw) {
      const files = JSON.parse(raw) as FileEntry[];
      // File objects can't survive refresh — mark completed files
      // They keep their metadata but preview/download won't work
      return files.map((f) => ({ ...f, file: undefined }));
    }
  } catch {}
  return [];
}

function saveFiles(files: FileEntry[]) {
  try {
    // Save metadata only (File objects can't be serialized)
    const toSave: SavedFileEntry[] = files.slice(-100).map(({ id, name, size, type, progress, status, sender }) => ({
      id, name, size, type, progress, status, sender,
    }));
    sessionStorage.setItem("quickdrop_files", JSON.stringify(toSave));
  } catch {}
}

export const useFileStore = create<FileState>((set) => ({
  files: loadFiles(),
  unread: 0,

  addFile: (entry) =>
    set((state) => {
      const files = [entry, ...state.files];
      saveFiles(files);
      return { files };
    }),

  updateProgress: (id, progress) =>
    set((state) => {
      const files = state.files.map((f) => (f.id === id ? { ...f, progress } : f));
      saveFiles(files);
      return { files };
    }),

  setStatus: (id, status) =>
    set((state) => {
      const files = state.files.map((f) => (f.id === id ? { ...f, status } : f));
      saveFiles(files);
      return { files };
    }),

  incrementUnread: () =>
    set((state) => ({ unread: state.unread + 1 })),

  resetUnread: () => set({ unread: 0 }),

  clear: () => {
    try { sessionStorage.removeItem("quickdrop_files"); } catch {}
    set({ files: [], unread: 0 });
  },
}));