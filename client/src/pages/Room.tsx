import { useState } from "react";
import { useParams } from "react-router-dom";
import { RoomHeader } from "../components/room/RoomHeader";
import { ChatPanel } from "../components/room/ChatPanel";
import { FilePanel } from "../components/room/FilePanel";
import styles from "./Room.module.css";

type Tab = "chat" | "files";

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  return (
    <div className={styles.page}>
      <RoomHeader
        roomId={roomId || "drop-unknown"}
        userCount={2}
        maxUsers={4}
      />

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
          {activeTab === "chat" ? <ChatPanel /> : <FilePanel />}
        </div>
      </div>
    </div>
  );
}