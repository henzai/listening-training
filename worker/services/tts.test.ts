import { describe, expect, it } from "vitest";
import type { LLMSentence } from "../types";
import { buildVoiceMap } from "./tts";

describe("buildVoiceMap", () => {
  it("assigns correct voices for dialogue with male and female speakers", () => {
    const sentences: LLMSentence[] = [
      { speaker: "Emma", speaker_gender: "female", text_en: "Hi", text_ja: "こんにちは" },
      { speaker: "James", speaker_gender: "male", text_en: "Hello", text_ja: "こんにちは" },
    ];
    const map = buildVoiceMap(sentences, "business");
    expect(map.get("Emma")).toBe("sage");
    expect(map.get("James")).toBe("echo");
    expect(map.size).toBe(2);
  });

  it("returns empty map for monologue without speakers", () => {
    const sentences: LLMSentence[] = [
      { text_en: "Welcome to the show.", text_ja: "ショーへようこそ。" },
      { text_en: "Today we discuss AI.", text_ja: "今日はAIについて話します。" },
    ];
    const map = buildVoiceMap(sentences, "tech");
    expect(map.size).toBe(0);
  });

  it("falls back to DEFAULT_VOICE_CONFIG for unknown topic", () => {
    const sentences: LLMSentence[] = [
      { speaker: "Alice", speaker_gender: "female", text_en: "Hi", text_ja: "こんにちは" },
      { speaker: "Bob", speaker_gender: "male", text_en: "Hey", text_ja: "やあ" },
    ];
    const map = buildVoiceMap(sentences, "unknown-topic");
    // DEFAULT_VOICE_CONFIG: female=FEMALE_VOICES (coral first), male=MALE_VOICES (ash first)
    expect(map.get("Alice")).toBe("coral");
    expect(map.get("Bob")).toBe("ash");
  });

  it("registers each speaker only once even if they appear multiple times", () => {
    const sentences: LLMSentence[] = [
      { speaker: "Emma", speaker_gender: "female", text_en: "First line", text_ja: "最初" },
      { speaker: "James", speaker_gender: "male", text_en: "Reply", text_ja: "返事" },
      { speaker: "Emma", speaker_gender: "female", text_en: "Second line", text_ja: "二番目" },
      { speaker: "James", speaker_gender: "male", text_en: "Another reply", text_ja: "もう一つ" },
    ];
    const map = buildVoiceMap(sentences, "daily");
    expect(map.size).toBe(2);
    expect(map.get("Emma")).toBe("coral");
    expect(map.get("James")).toBe("ash");
  });
});
