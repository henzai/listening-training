export const LLM_MODEL = "gpt-5.4-mini";
export const TTS_MODEL = "gpt-4o-mini-tts";

export function audioR2Key(scriptId: string, index: number): string {
  return `audio/${scriptId}/${index}.mp3`;
}
