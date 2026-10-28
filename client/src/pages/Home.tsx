import { useState } from "react";
import { CreateRoom } from "../components/home/CreateRoom";
import { JoinRoom } from "../components/home/JoinRoom";
import { ActiveRooms } from "../components/home/ActiveRooms";
import styles from "./Home.module.css";

export function Home() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [prefillRoomId, setPrefillRoomId] = useState("");

  const handlePublicRoomJoin = (roomId: string) => {
    setPrefillRoomId(roomId);
    setJoinOpen(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heading}>
          Drop files. <span className={styles.accent}>Instantly.</span>
        </h1>
        <p className={styles.subtitle}>
          Anonymous, encrypted, peer-to-peer file sharing.
          <br />
          No accounts. No storage. No trace.
        </p>
        <div className={styles.features}>
          <span className={styles.tag}>P2P Encrypted</span>
          <span className={styles.tag}>Max 1GB</span>
          <span className={styles.tag}>Auto-Destruct</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.actionCard} onClick={() => setCreateOpen(true)}>
          <span className={styles.actionIcon}>✦</span>
          <span className={styles.actionLabel}>Create Room</span>
          <span className={styles.actionHint}>Start a new private room</span>
        </button>

        <button className={styles.actionCard} onClick={() => { setPrefillRoomId(""); setJoinOpen(true); }}>
          <span className={styles.actionIcon}>→</span>
          <span className={styles.actionLabel}>Join Room</span>
          <span className={styles.actionHint}>Enter with a room ID</span>
        </button>
      </div>

      <ActiveRooms onJoinClick={handlePublicRoomJoin} />

      <CreateRoom open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinRoom open={joinOpen} onClose={() => setJoinOpen(false)} prefillRoomId={prefillRoomId} />
    </div>
  );
}