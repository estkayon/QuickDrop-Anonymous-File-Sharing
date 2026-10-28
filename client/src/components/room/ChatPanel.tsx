import { useState } from "react";
import styles from "./ChatPanel.module.css";

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

const mockMessages: Message[] = [
  { id: "1", sender: "User-a3f", text: "Hey, uploading the files now", time: "10:23 PM", isMe: false },
  { id: "2", sender: "You", text: "Got it, standing by", time: "10:23 PM", isMe: true },
  { id: "3", sender: "User-a3f", text: "Sent! Check the files tab", time: "10:24 PM", isMe: false },
];

export function ChatPanel() {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    console.log("Send:", message);
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
      <div className={styles.messages}>
        {mockMessages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${msg.isMe ? styles.me : ""}`}
          >
            <div className={styles.msgHeader}>
              <span className={styles.sender}>{msg.sender}</span>
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