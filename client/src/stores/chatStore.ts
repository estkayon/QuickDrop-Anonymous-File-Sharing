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

function loadMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem("quickdrop_chat");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveMessages(messages: ChatMessage[]) {
  try {
    // Keep last 200 messages to avoid storage limit
    const toSave = messages.slice(-200);
    sessionStorage.setItem("quickdrop_chat", JSON.stringify(toSave));
  } catch {}
}

export const useChatStore = create<ChatState>((set) => ({
  messages: loadMessages(),
  unread: 0,
  addMessage: (msg) =>
    set((state) => {
      const messages = [...state.messages, msg];
      saveMessages(messages);
      return {
        messages,
        unread: msg.isMe ? state.unread : state.unread + 1,
      };
    }),
  resetUnread: () => set({ unread: 0 }),
  clear: () => {
    try { sessionStorage.removeItem("quickdrop_chat"); } catch {}
    set({ messages: [], unread: 0 });
  },
}));