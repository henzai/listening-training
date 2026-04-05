import { Hono } from "hono";
import { generateScript } from "../services/llm";
import { generateAudioForSentences } from "../services/tts";
import type { Env, GenerateRequest, LLMSentence } from "../types";

export const generateRoutes = new Hono<{ Bindings: Env }>();

generateRoutes.post("/generate", async (c) => {
  const { topic, difficulty } = await c.req.json<GenerateRequest>();

  if (!topic || !difficulty) {
    return c.json({ error: "topic and difficulty are required" }, 400);
  }

  const scriptId = crypto.randomUUID();

  // Generate script via LLM
  let title: string;
  let sentences: LLMSentence[];
  try {
    const result = await generateScript(c.env.OPENAI_API_KEY, topic, difficulty);
    title = result.title;
    sentences = result.sentences;
  } catch {
    return c.json({ error: "Failed to generate script" }, 500);
  }

  // Insert script record
  await c.env.DB.prepare(
    "INSERT INTO scripts (id, topic, title, difficulty, sentence_count, status) VALUES (?, ?, ?, ?, ?, 'generating')",
  )
    .bind(scriptId, topic, title || null, difficulty, sentences.length)
    .run();

  // Insert sentence records
  const sentenceIds: string[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const sentenceId = crypto.randomUUID();
    sentenceIds.push(sentenceId);
    await c.env.DB.prepare(
      "INSERT INTO sentences (id, script_id, index_in_script, speaker, text_en, text_ja) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(
        sentenceId,
        scriptId,
        i,
        sentences[i].speaker ?? null,
        sentences[i].text_en,
        sentences[i].text_ja,
      )
      .run();
  }

  // Generate audio in background (non-blocking)
  c.executionCtx.waitUntil(
    generateAudioForSentences(c.env, scriptId, sentences, sentenceIds, topic),
  );

  return c.json({ scriptId }, 201);
});

generateRoutes.get("/generate/status/:scriptId", async (c) => {
  const scriptId = c.req.param("scriptId");
  const script = await c.env.DB.prepare("SELECT status, sentence_count FROM scripts WHERE id = ?")
    .bind(scriptId)
    .first<{ status: string; sentence_count: number }>();

  if (!script) {
    return c.json({ error: "Script not found" }, 404);
  }

  // Count sentences with audio
  const result = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM sentences WHERE script_id = ? AND audio_r2_key IS NOT NULL",
  )
    .bind(scriptId)
    .first<{ count: number }>();

  return c.json({
    status: script.status,
    totalSentences: script.sentence_count,
    completedAudio: result?.count ?? 0,
  });
});
