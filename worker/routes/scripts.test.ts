import { env } from "cloudflare:workers";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../index";
import { applySchema, cleanTables } from "../test-helpers";

async function insertScript(id: string, overrides: Record<string, unknown> = {}) {
  const defaults = {
    topic: "business",
    title: "Test Script",
    difficulty: "intermediate",
    sentence_count: 2,
    status: "ready",
  };
  const d = { ...defaults, ...overrides };
  const cols = d.created_at
    ? "INSERT INTO scripts (id, topic, title, difficulty, sentence_count, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    : "INSERT INTO scripts (id, topic, title, difficulty, sentence_count, status) VALUES (?, ?, ?, ?, ?, ?)";
  const binds = d.created_at
    ? [id, d.topic, d.title, d.difficulty, d.sentence_count, d.status, d.created_at]
    : [id, d.topic, d.title, d.difficulty, d.sentence_count, d.status];
  await env.DB.prepare(cols)
    .bind(...binds)
    .run();
}

async function insertSentence(
  id: string,
  scriptId: string,
  index: number,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    text_en: `Sentence ${index}`,
    text_ja: `文 ${index}`,
    speaker: null,
    audio_r2_key: null,
  };
  const d = { ...defaults, ...overrides };
  await env.DB.prepare(
    "INSERT INTO sentences (id, script_id, index_in_script, speaker, text_en, text_ja, audio_r2_key) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(id, scriptId, index, d.speaker, d.text_en, d.text_ja, d.audio_r2_key)
    .run();
}

describe("script routes", () => {
  beforeAll(async () => {
    await applySchema();
  });

  beforeEach(async () => {
    await cleanTables();
  });

  describe("GET /api/v1/scripts", () => {
    it("returns empty array when no scripts exist", async () => {
      const res = await app.request("/api/v1/scripts", {}, env);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ scripts: [] });
    });

    it("returns scripts ordered by created_at desc", async () => {
      await insertScript("s1", { title: "First", created_at: "2024-01-01 00:00:00" });
      await insertScript("s2", { title: "Second", created_at: "2024-01-02 00:00:00" });

      const res = await app.request("/api/v1/scripts", {}, env);
      expect(res.status).toBe(200);
      const { scripts } = (await res.json()) as { scripts: { id: string }[] };
      expect(scripts).toHaveLength(2);
      expect(scripts[0].id).toBe("s2");
      expect(scripts[1].id).toBe("s1");
    });
  });

  describe("GET /api/v1/scripts/:scriptId", () => {
    it("returns script with sentences", async () => {
      await insertScript("detail-1");
      await insertSentence("sent-1", "detail-1", 0, {
        text_en: "Hello",
        text_ja: "こんにちは",
      });
      await insertSentence("sent-2", "detail-1", 1, {
        text_en: "World",
        text_ja: "世界",
      });

      const res = await app.request("/api/v1/scripts/detail-1", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        script: { id: string };
        sentences: { index_in_script: number; text_en: string }[];
      };
      expect(body.script.id).toBe("detail-1");
      expect(body.sentences).toHaveLength(2);
      expect(body.sentences[0].text_en).toBe("Hello");
      expect(body.sentences[1].text_en).toBe("World");
    });

    it("returns 404 for non-existent script", async () => {
      const res = await app.request("/api/v1/scripts/nonexistent", {}, env);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Script not found" });
    });
  });

  describe("DELETE /api/v1/scripts/:scriptId", () => {
    it("deletes script, sentences, and R2 audio files", async () => {
      await insertScript("del-1", { sentence_count: 1 });
      await insertSentence("del-sent-1", "del-1", 0, {
        audio_r2_key: "audio/del-1/0.mp3",
      });
      await env.AUDIO_BUCKET.put("audio/del-1/0.mp3", new Uint8Array([1, 2, 3]));

      const res = await app.request(
        "/api/v1/scripts/del-1",
        {
          method: "DELETE",
        },
        env,
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });

      // Verify D1 rows deleted
      const script = await env.DB.prepare("SELECT * FROM scripts WHERE id = ?")
        .bind("del-1")
        .first();
      expect(script).toBeNull();

      const { results: sentences } = await env.DB.prepare(
        "SELECT * FROM sentences WHERE script_id = ?",
      )
        .bind("del-1")
        .all();
      expect(sentences).toHaveLength(0);

      // Verify R2 object deleted
      const r2Obj = await env.AUDIO_BUCKET.get("audio/del-1/0.mp3");
      expect(r2Obj).toBeNull();
    });

    it("returns ok for non-existent script", async () => {
      const res = await app.request("/api/v1/scripts/no-such-id", { method: "DELETE" }, env);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });
  });

  describe("PATCH /api/v1/scripts/:scriptId/progress", () => {
    it("updates last_practiced_at", async () => {
      await insertScript("prog-1");

      // Verify initially null
      const before = await env.DB.prepare("SELECT last_practiced_at FROM scripts WHERE id = ?")
        .bind("prog-1")
        .first<{ last_practiced_at: string | null }>();
      expect(before?.last_practiced_at).toBeNull();

      const res = await app.request("/api/v1/scripts/prog-1/progress", { method: "PATCH" }, env);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });

      // Verify updated
      const after = await env.DB.prepare("SELECT last_practiced_at FROM scripts WHERE id = ?")
        .bind("prog-1")
        .first<{ last_practiced_at: string | null }>();
      expect(after?.last_practiced_at).not.toBeNull();
    });

    it("returns ok for non-existent script", async () => {
      const res = await app.request(
        "/api/v1/scripts/no-such-id/progress",
        { method: "PATCH" },
        env,
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });
  });
});
