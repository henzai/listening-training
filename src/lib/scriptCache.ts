import { getAudioUrl, getScriptUrl } from "./api";
import type { Script, Sentence } from "./types";

const OFFLINE_SCRIPTS_CACHE = "offline-scripts";
const AUDIO_CACHE = "audio-cache";
const TRACKING_KEY = "offline-scripts-map";

export interface OfflineScriptEntry {
  downloadedAt: string;
  sentenceCount: number;
}

export interface DownloadProgress {
  completed: number;
  total: number;
}

function hasCacheApi(): boolean {
  return "caches" in globalThis;
}

export function getDownloadedScripts(): Record<string, OfflineScriptEntry> {
  const raw = localStorage.getItem(TRACKING_KEY);
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, OfflineScriptEntry>;
}

export function isScriptDownloaded(scriptId: string): boolean {
  return scriptId in getDownloadedScripts();
}

export async function downloadScript(
  scriptId: string,
  onProgress: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!hasCacheApi()) {
    throw new Error("Cache API is not available");
  }

  // 1. Fetch script + sentences
  const scriptUrl = getScriptUrl(scriptId);
  const res = await fetch(scriptUrl, { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch script: ${res.status}`);
  }

  const scriptCache = await caches.open(OFFLINE_SCRIPTS_CACHE);
  await scriptCache.put(scriptUrl, res.clone());

  const data = (await res.json()) as { script: Script; sentences: Sentence[] };
  const { sentences } = data;
  const total = sentences.length;

  onProgress({ completed: 0, total });

  // 2. Fetch audio files with concurrency limit of 3
  const audioCache = await caches.open(AUDIO_CACHE);
  let completed = 0;

  const queue = sentences.map((_, i) => i);
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length > 0) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      const index = queue.shift()!;
      const audioUrl = getAudioUrl(scriptId, index);
      const audioRes = await fetch(audioUrl, { signal });
      if (!audioRes.ok) {
        throw new Error(`Failed to fetch audio ${index}: ${audioRes.status}`);
      }
      await audioCache.put(audioUrl, audioRes);
      completed++;
      onProgress({ completed, total });
    }
  });

  await Promise.all(workers);

  // 3. Record in localStorage
  const map = getDownloadedScripts();
  map[scriptId] = {
    downloadedAt: new Date().toISOString(),
    sentenceCount: total,
  };
  localStorage.setItem(TRACKING_KEY, JSON.stringify(map));
}

export async function getCachedScript(
  scriptId: string,
): Promise<{ script: Script; sentences: Sentence[] } | null> {
  if (!hasCacheApi()) return null;

  const cache = await caches.open(OFFLINE_SCRIPTS_CACHE);
  const res = await cache.match(getScriptUrl(scriptId));
  if (!res) return null;

  return res.json() as Promise<{ script: Script; sentences: Sentence[] }>;
}

export async function clearScriptCache(scriptId: string): Promise<void> {
  if (!hasCacheApi()) return;

  // Delete script JSON
  const scriptCache = await caches.open(OFFLINE_SCRIPTS_CACHE);
  await scriptCache.delete(getScriptUrl(scriptId));

  // Delete audio files
  const map = getDownloadedScripts();
  const entry = map[scriptId];
  if (entry) {
    const audioCache = await caches.open(AUDIO_CACHE);
    const deletions = Array.from({ length: entry.sentenceCount }, (_, i) =>
      audioCache.delete(getAudioUrl(scriptId, i)),
    );
    await Promise.all(deletions);
  }

  // Remove from tracking
  delete map[scriptId];
  localStorage.setItem(TRACKING_KEY, JSON.stringify(map));
}
