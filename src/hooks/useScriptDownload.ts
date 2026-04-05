import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearScriptCache,
  type DownloadProgress,
  downloadScript,
  getDownloadedScripts,
  type OfflineScriptEntry,
} from "../lib/scriptCache";

export function useScriptDownload() {
  const [downloadedMap, setDownloadedMap] =
    useState<Record<string, OfflineScriptEntry>>(getDownloadedScripts);
  const [activeDownloads, setActiveDownloads] = useState<Map<string, DownloadProgress>>(
    () => new Map(),
  );
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    return () => {
      for (const controller of abortControllers.current.values()) {
        controller.abort();
      }
    };
  }, []);

  const isDownloaded = useCallback(
    (scriptId: string): boolean => scriptId in downloadedMap,
    [downloadedMap],
  );

  const downloadProgress = useCallback(
    (scriptId: string): DownloadProgress | null => activeDownloads.get(scriptId) ?? null,
    [activeDownloads],
  );

  const startDownload = useCallback((scriptId: string) => {
    const controller = new AbortController();
    abortControllers.current.set(scriptId, controller);

    setActiveDownloads((prev) => new Map(prev).set(scriptId, { completed: 0, total: 0 }));

    downloadScript(
      scriptId,
      (progress) => {
        setActiveDownloads((prev) => new Map(prev).set(scriptId, progress));
      },
      controller.signal,
    )
      .then(() => {
        setDownloadedMap(getDownloadedScripts());
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Download failed:", err);
      })
      .finally(() => {
        abortControllers.current.delete(scriptId);
        setActiveDownloads((prev) => {
          const next = new Map(prev);
          next.delete(scriptId);
          return next;
        });
      });
  }, []);

  const clearCache = useCallback(async (scriptId: string) => {
    await clearScriptCache(scriptId);
    setDownloadedMap(getDownloadedScripts());
  }, []);

  return { isDownloaded, downloadProgress, startDownload, clearCache };
}
