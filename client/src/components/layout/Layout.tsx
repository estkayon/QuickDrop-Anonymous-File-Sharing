import type { ReactNode } from "react";
import { ThemeToggle } from "../ui/ThemeToggle";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.bgGlow} />
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>⚡</div>
          <div className={styles.logoText}>
            Quick<span>Drop</span>
          </div>
        </div>
        <ThemeToggle />
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}