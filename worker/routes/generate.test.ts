import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../index";
import { applySchema, cleanTables } from "../test-helpers";
import type { LLMSentence } from "../types";

vi.mock("../services/llm", () => ({
  generateScript: vi.fn(),
}));

vi.mock("../services/tts", () => ({
  generateAudioForSentences: vi.fn().mockResolvedValue(undefined),
  buildVoiceMap: vi.fn(),
}));

import { generateScript } from "../services/llm";
import { generateAudioForSentences } from "../services/tts";

const mockSentences: LLMSentence[] = [
  {
    speaker: "Emma",
    speaker_gender: "female",
    text_en: "Hello there.",
    text_ja: "こんにちは。",
  },
  {
    speaker: "James",
    speaker_gender: "male",
    text_en: "Hi Emma.",
    text_ja: "こんにちはエマ。",
  },
  {
    speaker: "Emma",
    speaker_gender: "female",
    text_en: "How are you?",
    text_ja: "お元気ですか？",
  },
];

describe("generate routes", () => {
  beforeAll(async () => {
    await applySchema();
  });

  beforeEach(async () => {
    vi.mocked(generateScript).mockReset();
    vi.mocked(generateAudioForSentences).mockReset();
    vi.mocked(generateAudioForSentences).mockResolvedValue(undefined);
    await cleanTables();
  });

  describe("POST /api/v1/generate", () => {
    it("returns 400 when topic or difficulty is missing", async () => {
      const ctx = createExecutionContext();
      const res = await app.request(
        "/api/v1/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: "business" }),
        },
        env,
        ctx,
      );
      await waitOnExecutionContext(ctx);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "topic and difficulty are required",
      });
    });

    it("returns 400 for invalid topic", async () => {
      const ctx = createExecutionContext();
      const res = await app.request(
        "/api/v1/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: "cooking", difficulty: "intermediate" }),
        },
        env,
        ctx,
      );
      await waitOnExecutionContext(ctx);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("Invalid topic");
    });

    it("returns 400 for invalid difficulty", async () => {
      const ctx = createExecutionContext();
      const res = await app.request(
        "/api/v1/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: "business", difficulty: "beginner" }),
        },
        env,
        ctx,
      );
      await waitOnExecutionContext(ctx);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("Invalid difficulty");
    });

    it("inserts script and sentences into D1 on success", async () => {
      vi.mocked(generateScript).mockResolvedValueOnce({
        title: "Business Meeting",
        sentences: mockSentences,
      });

      const ctx = createExecutionContext();
      const res = await app.request(
        "/api/v1/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: "business",
            difficulty: "intermediate",
          }),
        },
        env,
        ctx,
      );
      await waitOnExecutionContext(ctx);

      expect(res.status).toBe(201);
      const body = (await res.json()) as { scriptId: string };
      expect(body.scriptId).toBeDefined();

      // Verify script in D1
      const script = await env.DB.prepare("SELECT * FROM scripts WHERE id = ?")
        .bind(body.scriptId)
        .first<{
          topic: string;
          title: string;
          difficulty: string;
          sentence_count: number;
          status: string;
        }>();
      expect(script).toBeTruthy();
      expect(script!.topic).toBe("business");
      expect(script!.title).toBe("Business Meeting");
      expect(script!.difficulty).toBe("intermediate");
      expect(script!.sentence_count).toBe(3);
      expect(script!.status).toBe("generating");

      // Verify sentences in D1
      const { results: sentences } = await env.DB.prepare(
        "SELECT * FROM sentences WHERE script_id = ? ORDER BY index_in_script",
      )
        .bind(body.scriptId)
        .all<{ index_in_script: number; text_en: string; speaker: string }>();
      expect(sentences).toHaveLength(3);
      expect(sentences[0].text_en).toBe("Hello there.");
      expect(sentences[0].speaker).toBe("Emma");
      expect(sentences[2].text_en).toBe("How are you?");

      // Verify generateAudioForSentences was called with correct args
      expect(generateAudioForSentences).toHaveBeenCalledWith(
        env,
        body.scriptId,
        mockSentences,
        expect.arrayContaining([expect.any(String)]),
        "business",
      );
      const sentenceIds = vi.mocked(generateAudioForSentences).mock.calls[0][3];
      expect(sentenceIds).toHaveLength(3);
    });

    it("returns 500 when LLM fails", async () => {
      vi.mocked(generateScript).mockRejectedValueOnce(new Error("API error"));

      const ctx = createExecutionContext();
      const res = await app.request(
        "/api/v1/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: "business",
            difficulty: "intermediate",
          }),
        },
        env,
        ctx,
      );
      await waitOnExecutionContext(ctx);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "Failed to generate script",
      });
    });
  });

  describe("GET /api/v1/generate/status/:scriptId", () => {
    it("returns status with audio progress", async () => {
      // Insert script and sentences directly
      await env.DB.prepare(
        "INSERT INTO scripts (id, topic, difficulty, sentence_count, status) VALUES (?, ?, ?, ?, ?)",
      )
        .bind("status-1", "business", "intermediate", 3, "generating")
        .run();

      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO sentences (id, script_id, index_in_script, text_en, audio_r2_key) VALUES (?, ?, ?, ?, ?)",
        ).bind("ss-1", "status-1", 0, "Hello", "audio/status-1/0.mp3"),
        env.DB.prepare(
          "INSERT INTO sentences (id, script_id, index_in_script, text_en, audio_r2_key) VALUES (?, ?, ?, ?, ?)",
        ).bind("ss-2", "status-1", 1, "World", null),
        env.DB.prepare(
          "INSERT INTO sentences (id, script_id, index_in_script, text_en, audio_r2_key) VALUES (?, ?, ?, ?, ?)",
        ).bind("ss-3", "status-1", 2, "Bye", null),
      ]);

      const res = await app.request("/api/v1/generate/status/status-1", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        status: string;
        totalSentences: number;
        completedAudio: number;
      };
      expect(body.status).toBe("generating");
      expect(body.totalSentences).toBe(3);
      expect(body.completedAudio).toBe(1);
    });

    it("returns 404 for non-existent script", async () => {
      const res = await app.request("/api/v1/generate/status/nonexistent", {}, env);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Script not found" });
    });
  });
});
