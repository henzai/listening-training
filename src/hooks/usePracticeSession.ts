import { useState, useEffect } from "react";
import type { Script, Sentence, PracticeMode } from "../lib/types";
import * as api from "../lib/api";

export function usePracticeSession(scriptId: string) {
  const [script, setScript] = useState<Script | null>(null);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<PracticeMode>("listen-read");
  const [showEnglish, setShowEnglish] = useState(true);
  const [showJapanese, setShowJapanese] = useState(true);

  useEffect(() => {
    api
      .getScript(scriptId)
      .then((data) => {
        setScript(data.script);
        setSentences(data.sentences);
      })
      .catch(() => setError("スクリプトの読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, [scriptId]);

  // Update text visibility based on mode
  useEffect(() => {
    switch (mode) {
      case "listen-read":
        setShowEnglish(true);
        setShowJapanese(true);
        break;
      case "guided-shadow":
        setShowEnglish(true);
        setShowJapanese(false);
        break;
      case "blind-shadow":
        setShowEnglish(false);
        setShowJapanese(false);
        break;
    }
  }, [mode]);

  function markPracticed() {
    api.updateProgress(scriptId);
  }

  return {
    script,
    sentences,
    loading,
    error,
    mode,
    setMode,
    showEnglish,
    setShowEnglish,
    showJapanese,
    setShowJapanese,
    markPracticed,
  };
}
