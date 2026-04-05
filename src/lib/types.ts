export interface Script {
  id: string;
  topic: string;
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

export type Topic =
  | "business"
  | "daily"
  | "news"
  | "tech"
  | "travel"
  | "academic"
  | "entertainment"
  | "health"
  | "sports";
export type Difficulty = "intermediate" | "upper-intermediate" | "advanced";

export const TOPICS: { value: Topic; label: string }[] = [
  { value: "business", label: "Business" },
  { value: "daily", label: "Daily Life" },
  { value: "news", label: "News" },
  { value: "tech", label: "Tech" },
  { value: "travel", label: "Travel" },
  { value: "academic", label: "Academic" },
  { value: "entertainment", label: "Entertainment" },
  { value: "health", label: "Health" },
  { value: "sports", label: "Sports" },
];

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "intermediate", label: "Intermediate" },
  { value: "upper-intermediate", label: "Upper-Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export const SPEED_PRESETS = [0.7, 1.0, 1.2] as const;
