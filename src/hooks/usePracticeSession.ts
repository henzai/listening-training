import { useEffect, useState } from "react";
import * as api from "../lib/api";
import { getCachedScript } from "../lib/scriptCache";
import type { Script, Sentence } from "../lib/types";

export function usePracticeSession(scriptId: string) {
  const [script, setScript] = useState<Script | null>(null);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnglish, setShowEnglish] = useState(true);
  const [showJapanese, setShowJapanese] = useState(true);

  useEffect(() => {
    getCachedScript(scriptId)
      .then((cached) => {
        if (cached) {
          setScript(cached.script);
          setSentences(cached.sentences);
          setLoading(false);
          return;
        }
        return api.getScript(scriptId).then((data) => {
          setScript(data.script);
          setSentences(data.sentences);
        });
      })
      .catch(() => setError("スクリプトの読み込みに失敗しました"))
      .finally(() => setLoading(false));
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
