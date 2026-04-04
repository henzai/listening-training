import type { LLMSentence } from "../types";

interface Scenario {
  description: string;
  dialogue: boolean;
}

const TOPIC_SCENARIOS: Record<string, Scenario[]> = {
  business: [
    { description: "a business meeting discussion between colleagues", dialogue: true },
    { description: "a job interview between a hiring manager and a candidate", dialogue: true },
    { description: "a negotiation between a client and a sales representative", dialogue: true },
    { description: "a business presentation or pitch to an audience", dialogue: false },
    { description: "a morning briefing or status report at a company", dialogue: false },
    { description: "a phone call between business partners", dialogue: true },
  ],
  daily: [
    { description: "ordering food at a restaurant", dialogue: true },
    { description: "shopping at a store and asking for help", dialogue: true },
    { description: "asking for and giving directions on the street", dialogue: true },
    { description: "a casual chat between friends catching up", dialogue: true },
    { description: "leaving a voicemail message for someone", dialogue: false },
    { description: "telling a personal story or anecdote to a friend", dialogue: false },
  ],
  news: [
    { description: "a news anchor reading a broadcast about current events", dialogue: false },
    { description: "a panel discussion about a political or social issue", dialogue: true },
    { description: "a journalist interviewing a public figure", dialogue: true },
    { description: "an editorial or opinion column about world affairs", dialogue: false },
  ],
  tech: [
    { description: "a tech podcast discussing recent industry trends", dialogue: true },
    { description: "a conference talk about a new technology or framework", dialogue: false },
    { description: "a code review discussion between developers", dialogue: true },
    { description: "a tech news summary covering AI, startups, or software", dialogue: false },
  ],
  travel: [
    { description: "checking in at a hotel front desk", dialogue: true },
    { description: "going through airport security and boarding", dialogue: true },
    { description: "asking a local for recommendations on what to visit", dialogue: true },
    { description: "a travel vlogger narrating their trip experience", dialogue: false },
    { description: "a tour guide explaining a famous landmark", dialogue: false },
  ],
  academic: [
    { description: "a university lecture excerpt on a general topic", dialogue: false },
    { description: "students discussing a group project", dialogue: true },
    { description: "a student asking a professor questions after class", dialogue: true },
    { description: "a TED-style short talk on an interesting subject", dialogue: false },
  ],
  entertainment: [
    { description: "friends discussing a movie they just watched", dialogue: true },
    { description: "a podcast host reviewing a new TV show or album", dialogue: false },
    { description: "recommending books or music to a friend", dialogue: true },
    { description: "a behind-the-scenes narration about filmmaking", dialogue: false },
  ],
  health: [
    { description: "a patient describing symptoms to a doctor", dialogue: true },
    { description: "a pharmacist explaining how to take medication", dialogue: true },
    { description: "a health podcast sharing wellness and fitness tips", dialogue: false },
    { description: "a nurse giving post-procedure care instructions", dialogue: false },
  ],
  sports: [
    { description: "friends discussing a recent game or match", dialogue: true },
    { description: "a sports commentator narrating game highlights", dialogue: false },
    { description: "a coach giving a pep talk or strategy briefing", dialogue: false },
    { description: "gym buddies talking about their workout routines", dialogue: true },
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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
  const scenarios = TOPIC_SCENARIOS[topic];
  const scenario = scenarios ? pickRandom(scenarios) : { description: topic, dialogue: false };
  const difficultyDesc =
    DIFFICULTY_INSTRUCTIONS[difficulty] ?? DIFFICULTY_INSTRUCTIONS.intermediate;
  const isDialogue = scenario.dialogue;

  const jsonSchema = isDialogue
    ? '{ "sentences": [{ "speaker": "Emma", "speaker_gender": "female", "text_en": "Thanks for joining us today.", "text_ja": "今日はご参加いただきありがとうございます。" }] }'
    : '{ "sentences": [{ "text_en": "English sentence", "text_ja": "Japanese translation" }] }';

  const formatInstruction = isDialogue
    ? `Generate a natural dialogue for this scenario: ${scenario.description}. Follow these rules:
- Choose either 2 or 3 speakers with short English first names (vary this across generations).
- A speaker may say multiple sentences in a row before the other person responds.
- Vary the turn lengths: some turns are 1 sentence, others are 2-3 sentences.
- Use the 'speaker' and 'speaker_gender' fields to identify who is speaking. The 'text_en' field must contain ONLY the spoken words — do NOT prefix it with the speaker's name or a colon.`
    : `Generate a coherent passage for this scenario: ${scenario.description}.`;

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
          content: `Generate a shadowing practice script about: ${scenario.description}`,
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
