import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RoomHeader } from "../components/room/RoomHeader";
import { ChatPanel } from "../components/room/ChatPanel";
import { FilePanel } from "../components/room/FilePanel";
import { useRoomStore } from "../stores/roomStore";
import { useWebSocket } from "../hooks/useWebSocket";
import styles from "./Room.module.css";

type Tab = "chat" | "files";

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const storeRoomId = useRoomStore((s) => s.roomId);
  const error = useRoomStore((s) => s.error);

  const { sendChat } = useWebSocket();

  useEffect(() => {
    if (!storeRoomId) {
      navigate("/");
    }
  }, [storeRoomId, navigate]);

  if (!storeRoomId) return null;

  return (
    <div className={styles.page}>
      <RoomHeader roomId={roomId || storeRoomId} />

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.container}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "chat" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            className={`${styles.tab} ${activeTab === "files" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("files")}
          >
            Files
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === "chat" ? <ChatPanel sendChat={sendChat} /> : <FilePanel />}
        </div>
      </div>
    </div>
  );
}