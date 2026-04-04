import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../lib/api";
import type { Script } from "../lib/types";
import styles from "./Library.module.css";

export function Library() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "practiced" | "new">("all");

  useEffect(() => {
    api
      .getScripts()
      .then((data) => setScripts(data.scripts))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await api.deleteScript(id);
    setScripts((prev) => prev.filter((s) => s.id !== id));
  }

  const filtered = scripts.filter((s) => {
    if (filter === "practiced") return s.last_practiced_at != null;
    if (filter === "new") return s.last_practiced_at == null;
    return true;
  });

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
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
          {filtered.map((script) => (
            <div key={script.id} className={styles.card}>
              <Link to={`/practice/${script.id}`} className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <span className={styles.topic}>{script.topic}</span>
                  <span className={styles.difficulty}>{script.difficulty}</span>
                </div>
                <div className={styles.cardMeta}>
                  <span>{script.sentence_count} sentences</span>
                  <span>{new Date(script.created_at).toLocaleDateString("ja-JP")}</span>
                </div>
                {script.status !== "ready" && (
                  <span className={styles.status}>{script.status}</span>
                )}
              </Link>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => handleDelete(script.id)}
                aria-label="削除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
