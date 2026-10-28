import { useState, useRef } from "react";
import styles from "./FilePanel.module.css";

interface SharedFile {
  id: string;
  name: string;
  size: string;
  sender: string;
  progress: number;
}

const mockFiles: SharedFile[] = [
  { id: "1", name: "design-mockup-v3.fig", size: "24.5 MB", sender: "User-a3f", progress: 100 },
  { id: "2", name: "api-docs.pdf", size: "3.2 MB", sender: "You", progress: 100 },
  { id: "3", name: "demo-recording.mp4", size: "148 MB", sender: "User-a3f", progress: 67 },
];

export function FilePanel() {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    console.log("Dropped:", files);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log("Selected:", files);
  };

  return (
    <div className={styles.panel}>
      <div
        className={`${styles.dropzone} ${dragOver ? styles.active : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className={styles.hiddenInput}
          onChange={handleSelect}
        />
        <div className={styles.dropIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className={styles.dropText}>
          {dragOver ? "Drop files here" : "Drag files here or click to browse"}
        </p>
        <p className={styles.dropHint}>Max 1GB per file</p>
      </div>

      {mockFiles.length > 0 && (
        <div className={styles.fileList}>
          {mockFiles.map((file) => (
            <div key={file.id} className={styles.file}>
              <div className={styles.fileIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileMeta}>
                  {file.size} · {file.sender}
                </span>
                {file.progress < 100 && (
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <span className={styles.fileStatus}>
                {file.progress === 100 ? "✓" : `${file.progress}%`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}