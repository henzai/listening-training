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

export const VALID_TOPICS = [
  "business",
  "daily",
  "news",
  "tech",
  "travel",
  "academic",
  "entertainment",
  "health",
  "sports",
] as const;
export type Topic = (typeof VALID_TOPICS)[number];

export const VALID_DIFFICULTIES = ["intermediate", "upper-intermediate", "advanced"] as const;
export type Difficulty = (typeof VALID_DIFFICULTIES)[number];
