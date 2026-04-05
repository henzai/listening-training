import { describe, expect, it } from "vitest";
import type { LLMSentence } from "../types";
import { stripSpeakerPrefixes } from "./llm";

describe("stripSpeakerPrefixes", () => {
  it("removes speaker prefix from text_en", () => {
    const sentences: LLMSentence[] = [
      {
        speaker: "Emma",
        speaker_gender: "female",
        text_en: "Emma: Thanks for joining us.",
        text_ja: "ご参加ありがとうございます。",
      },
    ];
    const result = stripSpeakerPrefixes(sentences);
    expect(result[0].text_en).toBe("Thanks for joining us.");
  });

  it("does not modify sentences without a speaker", () => {
    const sentences: LLMSentence[] = [
      { text_en: "Welcome to the show.", text_ja: "ショーへようこそ。" },
    ];
    const result = stripSpeakerPrefixes(sentences);
    expect(result[0].text_en).toBe("Welcome to the show.");
  });

  it("does not modify text_en that does not start with speaker name", () => {
    const sentences: LLMSentence[] = [
      {
        speaker: "Emma",
        speaker_gender: "female",
        text_en: "Thanks for joining us.",
        text_ja: "ご参加ありがとうございます。",
      },
    ];
    const result = stripSpeakerPrefixes(sentences);
    expect(result[0].text_en).toBe("Thanks for joining us.");
  });
});
