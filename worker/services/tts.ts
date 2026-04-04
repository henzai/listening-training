import type { Env, LLMSentence } from "../types";

const MAX_RETRIES = 2;

async function generateSingleAudio(apiKey: string, text: string): Promise<ArrayBuffer> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: text,
        voice: "coral",
        response_format: "mp3",
      }),
    });

    if (response.ok) {
      return response.arrayBuffer();
    }

    if (attempt === MAX_RETRIES) {
      throw new Error(`TTS failed after ${MAX_RETRIES + 1} attempts: ${response.status}`);
    }
  }
  throw new Error("Unreachable");
}

export async function generateAudioForSentences(
  env: Env,
  scriptId: string,
  sentences: LLMSentence[],
  sentenceIds: string[],
): Promise<void> {
  try {
    // Generate audio in parallel (batches of 5 to avoid rate limits)
    const batchSize = 5;
    let totalDurationMs = 0;

    for (let i = 0; i < sentences.length; i += batchSize) {
      const batch = sentences.slice(i, i + batchSize);
      const batchIds = sentenceIds.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (sentence, batchIndex) => {
          const index = i + batchIndex;
          const audioBuffer = await generateSingleAudio(env.OPENAI_API_KEY, sentence.text_en);

          const r2Key = `audio/${scriptId}/${index}.mp3`;
          await env.AUDIO_BUCKET.put(r2Key, audioBuffer, {
            httpMetadata: { contentType: "audio/mpeg" },
          });

          // Rough duration estimate from MP3 file size (128kbps)
          const durationMs = Math.round((audioBuffer.byteLength * 8) / 128);

          return { id: batchIds[batchIndex], r2Key, durationMs };
        }),
      );

      // Update sentence records with audio info
      for (const result of results) {
        totalDurationMs += result.durationMs;
        await env.DB.prepare(
          "UPDATE sentences SET audio_r2_key = ?, audio_duration_ms = ? WHERE id = ?",
        )
          .bind(result.r2Key, result.durationMs, result.id)
          .run();
      }
    }

    // Mark script as ready
    await env.DB.prepare("UPDATE scripts SET status = 'ready', total_duration_ms = ? WHERE id = ?")
      .bind(totalDurationMs, scriptId)
      .run();
  } catch {
    // Mark as error on failure
    await env.DB.prepare("UPDATE scripts SET status = 'error' WHERE id = ?").bind(scriptId).run();
  }
}
