export interface Env {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  OPENAI_API_KEY: string;
}

export interface Script {
  id: string;
  topic: string;
  title: string | null;
  difficulty: string;
  sentence_count: number;
  total_duration_ms: number | null;
  status: string;
  last_practiced_at: string | null;
  created_at: string;
}

export interface Sentence {
  id: string;
  script_id: string;
  index_in_script: number;
  speaker: string | null;
  text_en: string;
  text_ja: string | null;
  audio_r2_key: string | null;
  audio_duration_ms: number | null;
  audio_format: string;
}

export interface GenerateRequest {
  topic: string;
  difficulty: string;
}

export interface LLMSentence {
  speaker?: string;
  speaker_gender?: "male" | "female";
  text_en: string;
  text_ja: string;
}
