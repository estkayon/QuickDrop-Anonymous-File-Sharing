import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import styles from "./RoomHeader.module.css";

interface RoomHeaderProps {
  roomId: string;
  userCount: number;
  maxUsers: number;
}

export function RoomHeader({ roomId, userCount, maxUsers }: RoomHeaderProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    navigate("/");
  };

  return (
    <div className={styles.header}>
      <div className={styles.left}>
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