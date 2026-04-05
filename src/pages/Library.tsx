import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../lib/api";
import type { DownloadProgress } from "../lib/cache";
import { clearCache, downloadScript, getCachedScriptIds } from "../lib/cache";
import type { Script } from "../lib/types";
import styles from "./Library.module.css";

export function Library() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "practiced" | "new">("all");
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<Record<string, DownloadProgress>>({});

  useEffect(() => {
    Promise.all([api.getScripts(), getCachedScriptIds()]).then(([data, ids]) => {
      setScripts(data.scripts);
      setCachedIds(ids);
      setLoading(false);
    });
  }, []);

  async function handleDelete(id: string) {
    await api.deleteScript(id);
    // Also clear cache if exists
    if (cachedIds.has(id)) {
      await clearCache(id);
      setCachedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    setScripts((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleDownload(script: Script) {
    if (downloading[script.id]) return;

    setDownloading((prev) => ({ ...prev, [script.id]: { total: 0, completed: 0 } }));

    try {
      const data = await api.getScript(script.id);
      setDownloading((prev) => ({
        ...prev,
        [script.id]: { total: data.sentences.length, completed: 0 },
      }));

      await downloadScript(script.id, data.script, data.sentences, (progress) => {
        setDownloading((prev) => ({ ...prev, [script.id]: progress }));
      });

      setCachedIds((prev) => new Set(prev).add(script.id));
    } finally {
      setDownloading((prev) => {
        const next = { ...prev };
        delete next[script.id];
        return next;
      });
    }
  }

  async function handleClearCache(scriptId: string) {
    await clearCache(scriptId);
    setCachedIds((prev) => {
      const next = new Set(prev);
      next.delete(scriptId);
      return next;
    });
  }

  const filtered = scripts.filter((s) => {
    if (filter === "practiced") return s.last_practiced_at != null;
    if (filter === "new") return s.last_practiced_at == null;
    return true;
  });

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ライブラリ</h1>

      <div className={styles.filters}>
        {(["all", "new", "practiced"] as const).map((f) => (
          <button
            type="button"
            key={f}
            className={`${styles.filterButton} ${filter === f ? styles.active : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "すべて" : f === "new" ? "未練習" : "練習済み"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>スクリプトがありません</p>
          <Link to="/generate" className={styles.generateLink}>
            新しいスクリプトを生成
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((script) => {
            const isCached = cachedIds.has(script.id);
            const progress = downloading[script.id];
            const isDownloading = progress != null;

            return (
              <div key={script.id} className={styles.card}>
                <Link to={`/practice/${script.id}`} className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <span className={styles.topic}>{script.topic}</span>
                    <span className={styles.difficulty}>{script.difficulty}</span>
                    {isCached && <span className={styles.cachedBadge}>DL済</span>}
                  </div>
                  {script.title && <span className={styles.scriptTitle}>{script.title}</span>}
                  <div className={styles.cardMeta}>
                    <span>{script.sentence_count} sentences</span>
                    <span>{new Date(script.created_at).toLocaleDateString("ja-JP")}</span>
                  </div>
                  {script.status !== "ready" && (
                    <span className={styles.status}>{script.status}</span>
                  )}
                  {isDownloading && (
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width:
                            progress.total > 0
                              ? `${(progress.completed / progress.total) * 100}%`
                              : "0%",
                        }}
                      />
                    </div>
                  )}
                </Link>
                <div className={styles.cardActions}>
                  {script.status === "ready" &&
                    (isCached ? (
                      <button
                        type="button"
                        className={styles.cacheButton}
                        onClick={() => handleClearCache(script.id)}
                        aria-label="キャッシュ削除"
                        title="キャッシュ削除"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.downloadButton}
                        onClick={() => handleDownload(script)}
                        disabled={isDownloading}
                        aria-label="ダウンロード"
                        title="ダウンロード"
                      >
                        {isDownloading ? (
                          <span className={styles.downloadingText}>
                            {progress.completed}/{progress.total}
                          </span>
                        ) : (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                          </svg>
                        )}
                      </button>
                    ))}
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(script.id)}
                    aria-label="削除"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
