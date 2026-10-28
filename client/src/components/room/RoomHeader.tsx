import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useRoomStore } from "../../stores/roomStore";
import { useChatStore } from "../../stores/chatStore";
import styles from "./RoomHeader.module.css";

interface RoomHeaderProps {
  roomId: string;
}

export function RoomHeader({ roomId }: RoomHeaderProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const peers = useRoomStore((s) => s.peers);
  const connected = useRoomStore((s) => s.connected);
  const reset = useRoomStore((s) => s.reset);
  const clearChat = useChatStore((s) => s.clear);

  const userCount = peers.length + (connected ? 1 : 0);
  const maxUsers = 4;

  const handleCopy = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    reset();
    clearChat();
    navigate("/");
  };

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <div className={`${styles.status} ${connected ? styles.online : ""}`} />
        <span className={styles.roomId}>{roomId}</span>
        <button className={styles.copyBtn} onClick={handleCopy}>
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      <div className={styles.right}>
        <div className={styles.users}>
          <div className={styles.dots}>
            {Array.from({ length: maxUsers }).map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i < userCount ? styles.dotActive : ""}`}
              />
            ))}
          </div>
          <span className={styles.userCount}>
            {userCount}/{maxUsers}
          </span>
        </div>

        <Button variant="secondary" size="sm" onClick={handleLeave}>
          Leave
        </Button>
      </div>
    </div>
  );
}