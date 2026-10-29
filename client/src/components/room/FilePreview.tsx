import { useState } from "react";
import styles from "./FilePreview.module.css";

interface FilePreviewProps {
  file: File;
  type: string;
}

export function FilePreview({ file, type }: FilePreviewProps) {
  const [url] = useState(() => URL.createObjectURL(file));
  const [textContent, setTextContent] = useState<string | null>(null);

  if (type.startsWith("text/") && textContent === null) {
    file.text().then((t) => setTextContent(t.slice(0, 10000)));
  }

  if (type.startsWith("image/")) {
    return <img src={url} alt={file.name} className={styles.image} />;
  }

  if (type === "application/pdf") {
    return (
      <iframe
        src={url}
        title={file.name}
        className={styles.iframe}
      />
    );
  }

  if (type.startsWith("video/")) {
    return <video src={url} controls className={styles.video} />;
  }

  if (type.startsWith("audio/")) {
    return <audio src={url} controls className={styles.audio} />;
  }

  if (type.startsWith("text/") && textContent !== null) {
    return (
      <pre className={styles.text}>
        {textContent}
        {textContent.length >= 10000 && "\n\n... (truncated)"}
      </pre>
    );
  }

  return <p className={styles.fallback}>Preview not available for this file type</p>;
}