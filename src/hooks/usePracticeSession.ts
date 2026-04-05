import { useEffect, useState } from "react";
import * as api from "../lib/api";
import { getCachedScript } from "../lib/cache";
import type { Script, Sentence } from "../lib/types";

export function usePracticeSession(scriptId: string) {
  const [script, setScript] = useState<Script | null>(null);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnglish, setShowEnglish] = useState(true);
  const [showJapanese, setShowJapanese] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Try cache first
        const cached = await getCachedScript(scriptId);
        if (cached) {
          setScript(cached.script);
          setSentences(cached.sentences);
          return;
        }
        // Fallback to API
        const data = await api.getScript(scriptId);
        setScript(data.script);
        setSentences(data.sentences);
      } catch {
        setError("スクリプトの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [scriptId]);

  function markPracticed() {
    api.updateProgress(scriptId);
  }

  return {
    script,
    sentences,
    loading,
    error,
    showEnglish,
    setShowEnglish,
    showJapanese,
    setShowJapanese,
    markPracticed,
  };
}
