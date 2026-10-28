import { Button } from "../ui/Button";
import styles from "./ActiveRooms.module.css";

interface Room {
  id: string;
  users: number;
  maxUsers: number;
  createdAt: string;
}

// Mock data for UI preview
const mockRooms: Room[] = [
  { id: "drop-x8k2m1", users: 2, maxUsers: 4, createdAt: "3 min ago" },
  { id: "drop-p4n7q9", users: 1, maxUsers: 4, createdAt: "8 min ago" },
  { id: "drop-w2j5r6", users: 3, maxUsers: 4, createdAt: "12 min ago" },
];

export function ActiveRooms() {
  const handleJoin = (roomId: string) => {
    console.log("Join public room:", roomId);
  };

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Public Rooms</h2>
        <span className={styles.count}>{mockRooms.length} active</span>
      </div>

      {mockRooms.length === 0 ? (
        <div className={styles.empty}>No public rooms right now</div>
      ) : (
        <div className={styles.list}>
          {mockRooms.map((room) => (
            <div key={room.id} className={styles.room}>
              <div className={styles.roomInfo}>
                <span className={styles.roomId}>{room.id}</span>
                <span className={styles.roomMeta}>
                  {room.users}/{room.maxUsers} users · {room.createdAt}
                </span>
              </div>
              <div className={styles.roomUsers}>
                <div className={styles.dots}>
                  {Array.from({ length: room.maxUsers }).map((_, i) => (
                    <span
                      key={i}
                      className={`${styles.dot} ${i < room.users ? styles.dotActive : ""}`}
                    />
                  ))}
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleJoin(room.id)}>
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