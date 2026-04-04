import type { Env, LLMSentence } from "../types";

const FEMALE_VOICES = ["coral", "nova", "sage", "shimmer", "fable"] as const;
const MALE_VOICES = ["ash", "echo", "onyx", "ballad", "alloy"] as const;
type Voice = (typeof FEMALE_VOICES)[number] | (typeof MALE_VOICES)[number];

interface TopicVoiceConfig {
  female: readonly Voice[];
  male: readonly Voice[];
  default: Voice;
}

const TOPIC_VOICES: Record<string, TopicVoiceConfig> = {
  business: { female: ["sage", "shimmer"], male: ["echo", "onyx"], default: "sage" },
  daily: { female: ["coral", "nova"], male: ["ash", "ballad"], default: "coral" },
  news: { female: ["nova", "fable"], male: ["echo", "ballad"], default: "nova" },
  tech: { female: ["shimmer", "sage"], male: ["onyx", "ash"], default: "onyx" },
  travel: { female: ["coral", "sage"], male: ["ash", "echo"], default: "coral" },
  academic: { female: ["nova", "shimmer"], male: ["onyx", "ballad"], default: "onyx" },
  entertainment: { female: ["shimmer", "coral"], male: ["ballad", "ash"], default: "shimmer" },
  health: { female: ["sage", "nova"], male: ["echo", "alloy"], default: "sage" },
  sports: { female: ["fable", "coral"], male: ["ash", "onyx"], default: "ash" },
};

const DEFAULT_VOICE_CONFIG: TopicVoiceConfig = {
  female: FEMALE_VOICES,
  male: MALE_VOICES,
  default: "coral",
};

function buildVoiceMap(sentences: LLMSentence[], topic: string): Map<string, Voice> {
  const config = TOPIC_VOICES[topic] ?? DEFAULT_VOICE_CONFIG;
  const seen = new Map<string, Voice>();
  let femaleIdx = 0;
  let maleIdx = 0;

  for (const s of sentences) {
    if (!s.speaker || seen.has(s.speaker)) continue;
    if (s.speaker_gender === "male") {
      seen.set(s.speaker, config.male[maleIdx % config.male.length]);
      maleIdx++;
    } else {
      seen.set(s.speaker, config.female[femaleIdx % config.female.length]);
      femaleIdx++;
    }
  }
  return seen;
}

const MAX_RETRIES = 2;

async function generateSingleAudio(
  apiKey: string,
  text: string,
  voice: Voice = "coral",
): Promise<ArrayBuffer> {
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
        voice,
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
  topic: string,
): Promise<void> {
  try {
    const config = TOPIC_VOICES[topic] ?? DEFAULT_VOICE_CONFIG;
    const voiceMap = buildVoiceMap(sentences, topic);

    // Generate audio in parallel (batches of 5 to avoid rate limits)
    const batchSize = 5;
    let totalDurationMs = 0;

    for (let i = 0; i < sentences.length; i += batchSize) {
      const batch = sentences.slice(i, i + batchSize);
      const batchIds = sentenceIds.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (sentence, batchIndex) => {
          const index = i + batchIndex;
          const voice = sentence.speaker ? voiceMap.get(sentence.speaker) : config.default;
          const audioBuffer = await generateSingleAudio(
            env.OPENAI_API_KEY,
            sentence.text_en,
            voice,
          );

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
