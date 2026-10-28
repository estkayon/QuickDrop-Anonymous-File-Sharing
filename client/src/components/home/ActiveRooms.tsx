import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { listPublicRooms } from "../../lib/api";
import styles from "./ActiveRooms.module.css";

interface Room {
  id: string;
  userCount: number;
  maxUsers: number;
  createdAt: number;
}

interface ActiveRoomsProps {
  onJoinClick: (roomId: string) => void;
}

export function ActiveRooms({ onJoinClick }: ActiveRoomsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await listPublicRooms();
        setRooms(res.rooms);
      } catch {
        // server might not be running
      }
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Public Rooms</h2>
        {rooms.length > 0 && (
          <span className={styles.count}>{rooms.length} active</span>
        )}
      </div>

      {rooms.length === 0 ? (
        <div className={styles.empty}>No public rooms right now</div>
      ) : (
        <div className={styles.list}>
          {rooms.map((room) => (
            <div key={room.id} className={styles.room}>
              <div className={styles.roomInfo}>
                <span className={styles.roomId}>{room.id}</span>
                <span className={styles.roomMeta}>
                  {room.userCount}/{room.maxUsers} users · {timeAgo(room.createdAt)}
                </span>
              </div>
              <div className={styles.roomUsers}>
                <div className={styles.dots}>
                  {Array.from({ length: room.maxUsers }).map((_, i) => (
                    <span
                      key={i}
                      className={`${styles.dot} ${i < room.userCount ? styles.dotActive : ""}`}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onJoinClick(room.id)}
                >
                  Join
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}