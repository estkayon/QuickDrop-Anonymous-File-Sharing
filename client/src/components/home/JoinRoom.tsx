import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { joinRoom } from "../../lib/api";
import { useRoomStore } from "../../stores/roomStore";
import styles from "./JoinRoom.module.css";

interface JoinRoomProps {
  open: boolean;
  onClose: () => void;
  prefillRoomId?: string;
}

export function JoinRoom({ open, onClose, prefillRoomId = "" }: JoinRoomProps) {
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const setRoom = useRoomStore((s) => s.setRoom);

  useEffect(() => {
    if (open) {
      setRoomId(prefillRoomId);
      setPassword("");
      setError("");
    }
  }, [open, prefillRoomId]);

  const handleJoin = async () => {
    if (!roomId.trim() || !password.trim()) return;

    setLoading(true);
    setError("");

    try {
      await joinRoom(roomId.trim(), password);
      setRoom(roomId.trim(), password);
      onClose();
      navigate(`/room/${roomId.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.content}>
        <div className={styles.badge}>→ Join</div>
        <h2 className={styles.title}>Join a Room</h2>
        <p className={styles.desc}>
          Have a room ID? Enter it with the password to join and start sharing.
        </p>

        {error && <div className={styles.error}>{error}</div>}

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
            disabled={!roomId.trim() || !password.trim() || loading}
          >
            {loading ? "Joining..." : "Join Room"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}