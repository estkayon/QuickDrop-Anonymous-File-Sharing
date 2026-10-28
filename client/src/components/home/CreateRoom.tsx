import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { createRoom } from "../../lib/api";
import { useRoomStore } from "../../stores/roomStore";
import styles from "./CreateRoom.module.css";

interface CreateRoomProps {
  open: boolean;
  onClose: () => void;
}

export function CreateRoom({ open, onClose }: CreateRoomProps) {
  const [password, setPassword] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const setRoom = useRoomStore((s) => s.setRoom);

  const handleCreate = async () => {
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await createRoom(password, isPublic);
      setRoom(res.roomId, password);
      onClose();
      navigate(`/room/${res.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
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

        {error && <div className={styles.error}>{error}</div>}

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

          <Button
            variant="accent"
            onClick={handleCreate}
            disabled={!password.trim() || loading}
          >
            {loading ? "Creating..." : "Create Room"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}