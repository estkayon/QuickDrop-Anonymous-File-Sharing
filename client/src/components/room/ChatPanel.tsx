import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../../stores/chatStore";
import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
  sendChat: (text: string) => void;
}

export function ChatPanel({ sendChat }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    addMessage({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      sender: "You",
      text: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    });

    sendChat(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.messages} ref={messagesRef}>
        {messages.length === 0 && (
          <div className={styles.empty}>No messages yet. Say something!</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${msg.isMe ? styles.me : ""}`}
          >
            <div className={styles.msgHeader}>
              <span className={styles.sender}>
                {msg.isMe ? "You" : msg.sender}
              </span>
              <span className={styles.time}>{msg.time}</span>
            </div>
            <p className={styles.text}>{msg.text}</p>
          </div>
        ))}
      </div>

      <div className={styles.inputArea}>
        <input
          className={styles.input}
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!message.trim()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}