import { create } from "zustand";

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  unread: number;
  addMessage: (msg: ChatMessage) => void;
  resetUnread: () => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  unread: 0,
  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
      unread: msg.isMe ? state.unread : state.unread + 1,
    })),
  resetUnread: () => set({ unread: 0 }),
  clear: () => set({ messages: [], unread: 0 }),
}));