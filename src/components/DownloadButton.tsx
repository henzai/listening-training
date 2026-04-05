import type { DownloadProgress } from "../lib/scriptCache";
import styles from "./DownloadButton.module.css";

interface Props {
  isDownloaded: boolean;
  progress: DownloadProgress | null;
  onDownload: () => void;
  onClear: () => void;
}

export function DownloadButton({ isDownloaded, progress, onDownload, onClear }: Props) {
  if (progress) {
    return (
      <span className={styles.button} role="status" aria-label="ダウンロード中">
        {progress.completed}/{progress.total}
      </span>
    );
  }

  if (isDownloaded) {
    return (
      <button type="button" className={styles.button} onClick={onClear} aria-label="キャッシュ削除">
        ✓
      </button>
    );
  }

  return (
    <button type="button" className={styles.button} onClick={onDownload} aria-label="ダウンロード">
      ↓
    </button>
  );
}
