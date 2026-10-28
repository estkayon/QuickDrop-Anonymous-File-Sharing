import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import styles from "./CreateRoom.module.css";

interface CreateRoomProps {
  open: boolean;
  onClose: () => void;
}

export function CreateRoom({ open, onClose }: CreateRoomProps) {
  const [password, setPassword] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const handleCreate = () => {
    if (!password.trim()) return;
    console.log("Create room:", { password, isPublic });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.content}>
        <div className={styles.badge}>✦ New Room</div>
        <h2 className={styles.title}>Create a Room</h2>
        <p className={styles.desc}>
          Start a private room for file sharing and real-time chat. Share the
          room link to invite others.
        </p>

        <div className={styles.form}>
          <Input
            id="room-password"
            label="Room Password"
            type="password"
            placeholder="Set a password for your room"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <span>List as public room (visible in browse)</span>
          </label>

          <Button variant="accent" onClick={handleCreate} disabled={!password.trim()}>
            Create Room
          </Button>
        </div>
      </div>
    </Modal>
  );
}