import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useRoomStore } from "../../stores/roomStore";
import { ThemeToggle } from "../ui/ThemeToggle";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const roomId = useRoomStore((s) => s.roomId);
  const isInRoom = location.pathname.startsWith("/room/") && roomId;

  return (
    <div className={styles.wrapper}>
      <div className={styles.bgGlow} />
      <header className={styles.header}>
        {isInRoom ? (
          <div className={styles.logo}>
            <img src="/logo.svg" alt="QuickDrop" className={styles.logoImg} />
            <div className={styles.logoText}>
              Quick<span>Drop</span>
            </div>
          </div>
        ) : (
          <Link to="/" className={styles.logo}>
            <img src="/logo.svg" alt="QuickDrop" className={styles.logoImg} />
            <div className={styles.logoText}>
              Quick<span>Drop</span>
            </div>
          </Link>
        )}
        <ThemeToggle />
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}