import type { LLMSentence } from "../types";

const TOPIC_PROMPTS: Record<string, string> = {
  business:
    "a professional business conversation (e.g., a meeting, negotiation, or interview). Use 2 or 3 speakers with short English first names.",
  daily:
    "an everyday conversation (e.g., at a restaurant, while traveling, or between friends). Use 2 or 3 speakers with short English first names.",
  news: "a recent news topic covering current events, politics, science, or world affairs",
  tech: "technology topics such as software development, AI, startups, or digital trends",
};

const DIALOGUE_TOPICS = new Set(["business", "daily"]);

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
  const isDialogue = DIALOGUE_TOPICS.has(topic);

  const jsonSchema = isDialogue
    ? '{ "sentences": [{ "speaker": "Emma", "speaker_gender": "female", "text_en": "Thanks for joining us today.", "text_ja": "今日はご参加いただきありがとうございます。" }] }'
    : '{ "sentences": [{ "text_en": "English sentence", "text_ja": "Japanese translation" }] }';

  const formatInstruction = isDialogue
    ? `Generate a natural dialogue. Follow these rules:
- Choose either 2 or 3 speakers (vary this across generations).
- A speaker may say multiple sentences in a row before the other person responds.
- Vary the turn lengths: some turns are 1 sentence, others are 2-3 sentences.
- Use the 'speaker' and 'speaker_gender' fields to identify who is speaking. The 'text_en' field must contain ONLY the spoken words — do NOT prefix it with the speaker's name or a colon.`
    : "Generate a coherent passage.";

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
          content: `You are an English learning content creator specializing in shadowing practice material.

Task: Generate a ${isDialogue ? "dialogue" : "passage"} script about the given topic, broken into individual sentences.

Requirements:
- Each sentence should be natural spoken English suitable for shadowing practice.
- ${difficultyDesc}

${formatInstruction}

Output format: Respond with a JSON object matching this structure:
${jsonSchema}

Generate 8-15 sentences total.`,
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

  // Strip any "SpeakerName: " prefix from text_en (safety net for LLM inconsistency)
  for (const s of parsed.sentences) {
    if (s.speaker && s.text_en.startsWith(`${s.speaker}:`)) {
      s.text_en = s.text_en.slice(s.speaker.length + 1).trimStart();
    }
  }

  return parsed.sentences;
}
