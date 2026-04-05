import type { Difficulty, Topic } from "../../shared/types";

export type { Difficulty, Script, Sentence, Topic } from "../../shared/types";
export { VALID_DIFFICULTIES, VALID_TOPICS } from "../../shared/types";

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
