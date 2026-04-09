import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearScriptCache,
  downloadScript,
  getCachedAudioUrl,
  getCachedScript,
  getDownloadedScripts,
  isScriptDownloaded,
} from "./scriptCache";

const OFFLINE_SCRIPTS_CACHE = "offline-scripts";
const AUDIO_CACHE = "audio-cache";
const TRACKING_KEY = "offline-scripts-map";

function createMockCache() {
  const store = new Map<string, Response>();
  return {
    put: vi.fn((key: string, res: Response) => {
      store.set(key, res);
      return Promise.resolve();
    }),
    match: vi.fn((key: string) => Promise.resolve(store.get(key) ?? undefined)),
    delete: vi.fn((key: string) => {
      const had = store.has(key);
      store.delete(key);
      return Promise.resolve(had);
    }),
    _store: store,
  };
}

describe("scriptCache", () => {
  let cacheMap: Map<string, ReturnType<typeof createMockCache>>;

  beforeEach(() => {
    cacheMap = new Map();
    vi.stubGlobal("caches", {
      open: vi.fn((name: string) => {
        if (!cacheMap.has(name)) cacheMap.set(name, createMockCache());
        return Promise.resolve(cacheMap.get(name)!);
      }),
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("getDownloadedScripts / isScriptDownloaded", () => {
    it("returns empty object when no data", () => {
      expect(getDownloadedScripts()).toEqual({});
      expect(isScriptDownloaded("abc")).toBe(false);
    });

    it("returns tracked scripts from localStorage", () => {
      localStorage.setItem(
        TRACKING_KEY,
        JSON.stringify({ abc: { downloadedAt: "2026-01-01", sentenceCount: 3 } }),
      );
      expect(isScriptDownloaded("abc")).toBe(true);
      expect(isScriptDownloaded("xyz")).toBe(false);
    });
  });

  describe("downloadScript", () => {
    it("caches script JSON and audio files, then records in localStorage", async () => {
      const scriptData = {
        script: { id: "s1", sentence_count: 2 },
        sentences: [
          { index_in_script: 0, text_en: "Hello" },
          { index_in_script: 1, text_en: "World" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn((_url: string) =>
          Promise.resolve(
            new Response(JSON.stringify(scriptData), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          ),
        ),
      );

      const progress: Array<{ completed: number; total: number }> = [];
      await downloadScript("s1", (p) => progress.push({ ...p }));

      // Script cached in offline-scripts
      const scriptCache = cacheMap.get(OFFLINE_SCRIPTS_CACHE)!;
      expect(scriptCache.put).toHaveBeenCalledWith("/api/v1/scripts/s1", expect.any(Response));

      // Audio cached
      const audioCache = cacheMap.get(AUDIO_CACHE)!;
      expect(audioCache.put).toHaveBeenCalledTimes(2);

      // Progress reported
      expect(progress[0]).toEqual({ completed: 0, total: 2 });
      expect(progress[progress.length - 1]).toEqual({ completed: 2, total: 2 });

      // localStorage updated
      expect(isScriptDownloaded("s1")).toBe(true);
      const entry = getDownloadedScripts().s1;
      expect(entry.sentenceCount).toBe(2);
    });

    it("throws on non-ok script fetch", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response("", { status: 500 }))),
      );

      await expect(downloadScript("s1", () => {})).rejects.toThrow("Failed to fetch script: 500");
    });
  });

  describe("getCachedScript", () => {
    it("returns null when not cached", async () => {
      expect(await getCachedScript("s1")).toBeNull();
    });

    it("returns cached data", async () => {
      const data = { script: { id: "s1" }, sentences: [{ text_en: "Hi" }] };
      const cache = createMockCache();
      cache._store.set("/api/v1/scripts/s1", new Response(JSON.stringify(data)));
      cacheMap.set(OFFLINE_SCRIPTS_CACHE, cache);

      const result = await getCachedScript("s1");
      expect(result).toEqual(data);
    });
  });

  describe("getCachedAudioUrl", () => {
    beforeEach(() => {
      vi.stubGlobal("URL", {
        ...URL,
        createObjectURL: vi.fn(() => "blob:mock-url"),
        revokeObjectURL: vi.fn(),
      });
    });

    it("returns null when audio is not cached", async () => {
      expect(await getCachedAudioUrl("s1", 0)).toBeNull();
    });

    it("returns a blob URL when audio is cached", async () => {
      const audioCache = createMockCache();
      audioCache._store.set(
        "/api/v1/audio/s1/0",
        new Response(new Blob(["audio-data"]), {
          headers: { "Content-Type": "audio/mpeg" },
        }),
      );
      cacheMap.set(AUDIO_CACHE, audioCache);

      const result = await getCachedAudioUrl("s1", 0);
      expect(result).toBe("blob:mock-url");
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it("returns null when Cache API is unavailable", async () => {
      const original = globalThis.caches;
      delete (globalThis as Record<string, unknown>).caches;
      try {
        expect(await getCachedAudioUrl("s1", 0)).toBeNull();
      } finally {
        vi.stubGlobal("caches", original);
      }
    });
  });

  describe("clearScriptCache", () => {
    it("removes script, audio entries, and localStorage tracking", async () => {
      // Setup tracking
      localStorage.setItem(
        TRACKING_KEY,
        JSON.stringify({ s1: { downloadedAt: "2026-01-01", sentenceCount: 2 } }),
      );

      const scriptCache = createMockCache();
      const audioCache = createMockCache();
      cacheMap.set(OFFLINE_SCRIPTS_CACHE, scriptCache);
      cacheMap.set(AUDIO_CACHE, audioCache);

      await clearScriptCache("s1");

      expect(scriptCache.delete).toHaveBeenCalledWith("/api/v1/scripts/s1");
      expect(audioCache.delete).toHaveBeenCalledWith("/api/v1/audio/s1/0");
      expect(audioCache.delete).toHaveBeenCalledWith("/api/v1/audio/s1/1");
      expect(isScriptDownloaded("s1")).toBe(false);
    });
  });
});
