import { useRef, useCallback } from "react";
import { useFileStore } from "../../stores/fileStore";
import type { FileEntry } from "../../stores/fileStore";
import styles from "./FilePanel.module.css";

interface FilePanelProps {
  sendFile: ((file: File) => Promise<string | null>) | null;
}

export function FilePanel({ sendFile }: FilePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const files = useFileStore((s) => s.files);
  const addFile = useFileStore((s) => s.addFile);
  const updateProgress = useFileStore((s) => s.updateProgress);
  const setStatus = useFileStore((s) => s.setStatus);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      if (!sendFile) return;

      for (const file of Array.from(fileList)) {
        if (file.size > 1024 * 1024 * 1024) {
          alert("File too large. Max 1GB.");
          continue;
        }

        const tempId = crypto.randomUUID();
        addFile({
          id: tempId,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: "sending",
          sender: "You",
          file,
        });

        const transferId = await sendFile(file);
        if (transferId) {
          // update the temp entry with real transfer ID
          updateProgress(tempId, 1);
          setStatus(tempId, "done");
        } else {
          setStatus(tempId, "error");
        }
      }
    },
    [sendFile, addFile, updateProgress, setStatus]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const downloadFile = (entry: FileEntry) => {
    if (!entry.file) return;
    const url = URL.createObjectURL(entry.file);
    const a = document.createElement("a");
    a.href = url;
    a.download = entry.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.panel}>
      <div
        className={styles.dropzone}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
      >
        <div className={styles.dropIcon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </div>
        <p className={styles.dropText}>
          Drop files here or <span className={styles.browse}>browse</span>
        </p>
        <p className={styles.dropHint}>Max 1GB per file · P2P encrypted</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className={styles.fileInput}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className={styles.fileList}>
          {files.map((entry) => (
            <div key={entry.id} className={styles.fileItem}>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{entry.name}</span>
                <span className={styles.fileMeta}>
                  {formatSize(entry.size)} · {entry.sender}
                  {entry.status === "done" && " · ✓"}
                  {entry.status === "sending" && " · Sending..."}
                  {entry.status === "receiving" && " · Receiving..."}
                  {entry.status === "error" && " · Failed"}
                </span>
              </div>

              {entry.status === "done" && entry.sender !== "You" && entry.file && (
                <button
                  className={styles.downloadBtn}
                  onClick={() => downloadFile(entry)}
                >
                  Save
                </button>
              )}

              {(entry.status === "sending" || entry.status === "receiving") && (
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${entry.progress * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}