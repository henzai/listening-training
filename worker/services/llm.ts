import type { LLMSentence } from "../types";

const TOPIC_PROMPTS: Record<string, string> = {
  business:
    "a professional business scenario such as meetings, presentations, negotiations, or workplace communication",
  daily: "everyday situations like shopping, dining, traveling, or casual conversations",
  news: "a recent news topic covering current events, politics, science, or world affairs",
  tech: "technology topics such as software development, AI, startups, or digital trends",
};

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  intermediate:
    "Use clear, straightforward sentences. Vocabulary should be common (TOEIC 600-700 level). Keep sentences 8-15 words each.",
  "upper-intermediate":
    "Use moderately complex sentences with some idiomatic expressions. Vocabulary at TOEIC 700-800 level. Sentences can be 10-20 words.",
  advanced:
    "Use complex, natural English with idioms, phrasal verbs, and nuanced vocabulary. TOEIC 800-900 level. Sentences can be 12-25 words.",
};

export async function generateScript(
  apiKey: string,
  topic: string,
  difficulty: string,
): Promise<LLMSentence[]> {
  const topicDesc = TOPIC_PROMPTS[topic] ?? topic;
  const difficultyDesc =
    DIFFICULTY_INSTRUCTIONS[difficulty] ?? DIFFICULTY_INSTRUCTIONS.intermediate;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4-nano",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an English learning content creator. Generate a coherent English passage about the given topic, broken into individual sentences. Each sentence should be natural spoken English suitable for shadowing practice.

${difficultyDesc}

Respond with a JSON object: { "sentences": [{ "text_en": "English sentence", "text_ja": "Japanese translation" }] }
Generate 8-15 sentences that form a coherent passage.`,
        },
        {
          role: "user",
          content: `Generate a shadowing practice script about: ${topicDesc}`,
        },
      ],
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const parsed = JSON.parse(data.choices[0].message.content) as {
    sentences: LLMSentence[];
  };
  return parsed.sentences;
}
