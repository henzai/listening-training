import type { Difficulty, Topic } from "../shared/types";

export type { Difficulty, Script, Sentence, Topic } from "../shared/types";
export { VALID_DIFFICULTIES, VALID_TOPICS } from "../shared/types";

export interface Env {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  OPENAI_API_KEY: string;
  SENTRY_DSN: string;
  CF_VERSION_METADATA: WorkerVersionMetadata;
}

export interface GenerateRequest {
  topic: Topic;
  difficulty: Difficulty;
}

export interface LLMSentence {
  speaker?: string;
  speaker_gender?: "male" | "female";
  text_en: string;
  text_ja: string;
}
