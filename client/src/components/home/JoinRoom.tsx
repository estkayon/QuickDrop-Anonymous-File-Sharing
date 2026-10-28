import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import styles from "./JoinRoom.module.css";

interface JoinRoomProps {
  open: boolean;
  onClose: () => void;
}

export function JoinRoom({ open, onClose }: JoinRoomProps) {
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");

  const handleJoin = () => {
    if (!roomId.trim() || !password.trim()) return;
    console.log("Join room:", { roomId, password });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.content}>
        <div className={styles.badge}>→ Join</div>
        <h2 className={styles.title}>Join a Room</h2>
        <p className={styles.desc}>
          Have a room ID? Enter it with the password to join and start sharing.
        </p>

        <div className={styles.form}>
          <Input
            id="join-room-id"
            label="Room ID"
            placeholder="e.g. drop-a1b2c3"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            autoFocus
          />

          <Input
            id="join-password"
            label="Password"
            type="password"
            placeholder="Enter room password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            variant="primary"
            onClick={handleJoin}
            disabled={!roomId.trim() || !password.trim()}
          >
            Join Room
          </Button>
        </div>
      </div>
    </Modal>
  );
}