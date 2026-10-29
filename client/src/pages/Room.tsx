import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RoomHeader } from "../components/room/RoomHeader";
import { ChatPanel } from "../components/room/ChatPanel";
import { FilePanel } from "../components/room/FilePanel";
import { FilePreview } from "../components/room/FilePreview";
import { useRoomStore } from "../stores/roomStore";
import { useFileStore } from "../stores/fileStore";
import { useChatStore } from "../stores/chatStore";
import { useWebSocket } from "../hooks/useWebSocket";
import { useWebRTC } from "../hooks/useWebRTC";
import type { FileEntry } from "../stores/fileStore";
import styles from "./Room.module.css";

type Tab = "chat" | "files";

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const storeRoomId = useRoomStore((s) => s.roomId);
  const error = useRoomStore((s) => s.error);
  const addFile = useFileStore((s) => s.addFile);
  const updateProgress = useFileStore((s) => s.updateProgress);
  const setFileStatus = useFileStore((s) => s.setStatus);
  const fileUnread = useFileStore((s) => s.unread);
  const resetFileUnread = useFileStore((s) => s.resetUnread);
  const incrementFileUnread = useFileStore((s) => s.incrementUnread);
  const chatUnread = useChatStore((s) => s.unread);
  const resetChatUnread = useChatStore((s) => s.resetUnread);

  const { sendChat, sendSignal, ws } = useWebSocket();

  const handleFileReceived = useCallback(
    (file: File, senderId: string) => {
      const id = crypto.randomUUID();
      addFile({
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 1,
        status: "done",
        sender: senderId,
        file,
      });
      incrementFileUnread();
    },
    [addFile, incrementFileUnread]
  );

  const handleProgress = useCallback(
    (transferId: string, progress: number) => {
      updateProgress(transferId, progress);
    },
    [updateProgress]
  );

  const { sendFile } = useWebRTC(sendSignal, ws, handleFileReceived, handleProgress);

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "chat") {
      resetChatUnread();
    } else {
      resetFileUnread();
    }
  };

  const handlePreview = (entry: FileEntry | null) => {
    setPreviewFile(entry);
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
  };

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

      <div className={`${styles.workspace} ${previewFile ? styles.splitOpen : ""}`}>
        <div className={styles.mainPanel}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === "chat" ? styles.tabActive : ""}`}
              onClick={() => handleTabSwitch("chat")}
            >
              Chat
              {activeTab !== "chat" && chatUnread > 0 && (
                <span className={styles.badge}>{chatUnread}</span>
              )}
            </button>
            <button
              className={`${styles.tab} ${activeTab === "files" ? styles.tabActive : ""}`}
              onClick={() => handleTabSwitch("files")}
            >
              Files
              {activeTab !== "files" && fileUnread > 0 && (
                <span className={styles.badge}>{fileUnread}</span>
              )}
            </button>
          </div>

          <div className={styles.content}>
            {activeTab === "chat" ? (
              <ChatPanel sendChat={sendChat} />
            ) : (
              <FilePanel
                sendFile={sendFile}
                onPreview={handlePreview}
                activePreviewId={previewFile?.id || null}
              />
            )}
          </div>
        </div>

        <div className={styles.previewPanel}>
          {previewFile && previewFile.file && (
            <div className={styles.previewWrapper}>
              <div className={styles.previewHeader}>
                <div className={styles.previewTitle}>
                  <span className={styles.previewName}>{previewFile.name}</span>
                  <span className={styles.previewSize}>
                    {formatSize(previewFile.size)}
                  </span>
                </div>
                <button className={styles.closeBtn} onClick={handleClosePreview}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className={styles.previewBody}>
                <FilePreview file={previewFile.file} type={previewFile.type} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}