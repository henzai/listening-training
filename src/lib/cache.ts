import { getAudioUrl } from "./api";
import type { Script, Sentence } from "./types";

const DB_NAME = "listening-training-cache";
const DB_VERSION = 1;
const STORE_SCRIPTS = "scripts";
const STORE_AUDIO = "audio";

interface CachedScript {
  scriptId: string;
  script: Script;
  sentences: Sentence[];
  cachedAt: number;
}

interface CachedAudio {
  key: string; // `${scriptId}/${index}`
  scriptId: string;
  blob: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SCRIPTS)) {
        db.createObjectStore(STORE_SCRIPTS, { keyPath: "scriptId" });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        const store = db.createObjectStore(STORE_AUDIO, { keyPath: "key" });
        store.createIndex("byScript", "scriptId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Check if a script is fully cached */
export async function isCached(scriptId: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SCRIPTS, "readonly");
    const req = tx.objectStore(STORE_SCRIPTS).get(scriptId);
    req.onsuccess = () => resolve(req.result != null);
    req.onerror = () => resolve(false);
  });
}

/** Get cached script + sentences */
export async function getCachedScript(
  scriptId: string,
): Promise<{ script: Script; sentences: Sentence[] } | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SCRIPTS, "readonly");
    const req = tx.objectStore(STORE_SCRIPTS).get(scriptId);
    req.onsuccess = () => {
      const result = req.result as CachedScript | undefined;
      if (result) {
        resolve({ script: result.script, sentences: result.sentences });
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

/** Get cached audio blob */
export async function getCachedAudio(scriptId: string, index: number): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_AUDIO, "readonly");
    const req = tx.objectStore(STORE_AUDIO).get(`${scriptId}/${index}`);
    req.onsuccess = () => {
      const result = req.result as CachedAudio | undefined;
      resolve(result?.blob ?? null);
    };
    req.onerror = () => resolve(null);
  });
}

export interface DownloadProgress {
  total: number;
  completed: number;
}

/** Download and cache a full script (metadata + all audio) */
export async function downloadScript(
  scriptId: string,
  script: Script,
  sentences: Sentence[],
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const db = await openDB();
  const total = sentences.length;
  let completed = 0;

  // Save script + sentences metadata
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SCRIPTS, "readwrite");
    const entry: CachedScript = { scriptId, script, sentences, cachedAt: Date.now() };
    tx.objectStore(STORE_SCRIPTS).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Download audio files in parallel (batches of 4)
  const batchSize = 4;
  for (let i = 0; i < total; i += batchSize) {
    const batch = sentences.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (s) => {
        const url = getAudioUrl(scriptId, s.index_in_script);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch audio ${s.index_in_script}`);
        const blob = await res.blob();

        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_AUDIO, "readwrite");
          const entry: CachedAudio = {
            key: `${scriptId}/${s.index_in_script}`,
            scriptId,
            blob,
          };
          tx.objectStore(STORE_AUDIO).put(entry);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });

        completed++;
        onProgress?.({ total, completed });
      }),
    );
  }
}

/** Remove all cached data for a script */
export async function clearCache(scriptId: string): Promise<void> {
  const db = await openDB();

  // Remove script metadata
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SCRIPTS, "readwrite");
    tx.objectStore(STORE_SCRIPTS).delete(scriptId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Remove all audio entries for this script
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIO, "readwrite");
    const store = tx.objectStore(STORE_AUDIO);
    const index = store.index("byScript");
    const req = index.openCursor(IDBKeyRange.only(scriptId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get set of all cached script IDs */
export async function getCachedScriptIds(): Promise<Set<string>> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SCRIPTS, "readonly");
    const req = tx.objectStore(STORE_SCRIPTS).getAllKeys();
    req.onsuccess = () => resolve(new Set(req.result as string[]));
    req.onerror = () => resolve(new Set());
  });
}
