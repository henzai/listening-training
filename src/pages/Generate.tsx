import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TOPICS, DIFFICULTIES } from "../lib/types";
import type { Topic, Difficulty } from "../lib/types";
import * as api from "../lib/api";
import styles from "./Generate.module.css";

export function Generate() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic>("business");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [generating, setGenerating] = useState(false);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const pollStatus = useCallback(
    async (id: string) => {
      try {
        const status = await api.getGenerateStatus(id);
        setProgress({
          completed: status.completedAudio,
          total: status.totalSentences,
        });

        if (status.status === "ready") {
          navigate(`/practice/${id}`);
        } else if (status.status === "error") {
          setError("生成中にエラーが発生しました。再試行してください。");
          setGenerating(false);
          setScriptId(null);
        }
      } catch {
        setError("ステータスの確認に失敗しました。");
        setGenerating(false);
        setScriptId(null);
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (!scriptId) return;
    const interval = setInterval(() => pollStatus(scriptId), 2000);
    return () => clearInterval(interval);
  }, [scriptId, pollStatus]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await api.generateScript(topic, difficulty);
      setScriptId(result.scriptId);
      setProgress({ completed: 0, total: 0 });
    } catch {
      setError("スクリプト生成の開始に失敗しました。");
      setGenerating(false);
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>スクリプト生成</h1>

      <div className={styles.field}>
        <label className={styles.label}>トピック</label>
        <div className={styles.options}>
          {TOPICS.map((t) => (
            <button
              key={t.value}
              className={`${styles.option} ${topic === t.value ? styles.selected : ""}`}
              onClick={() => setTopic(t.value)}
              disabled={generating}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>難易度</label>
        <div className={styles.options}>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              className={`${styles.option} ${difficulty === d.value ? styles.selected : ""}`}
              onClick={() => setDifficulty(d.value)}
              disabled={generating}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {generating ? (
        <div className={styles.progress}>
          <div className={styles.spinner} />
          <p>
            音声生成中... {progress.completed}/{progress.total || "?"}
          </p>
        </div>
      ) : (
        <button className={styles.generateButton} onClick={handleGenerate}>
          生成する
        </button>
      )}
    </div>
  );
}
