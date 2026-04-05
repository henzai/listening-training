import type { Difficulty, Script, Sentence, Topic } from "./types";

const BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function generateScript(topic: Topic, difficulty: Difficulty) {
  return request<{ scriptId: string }>("/generate", {
    method: "POST",
    body: JSON.stringify({ topic, difficulty }),
  });
}

export function getGenerateStatus(scriptId: string) {
  return request<{
    status: string;
    totalSentences: number;
    completedAudio: number;
  }>(`/generate/status/${scriptId}`);
}

export function getScripts() {
  return request<{ scripts: Script[] }>("/scripts");
}

export function getScript(scriptId: string) {
  return request<{ script: Script; sentences: Sentence[] }>(`/scripts/${scriptId}`);
}

export function deleteScript(scriptId: string) {
  return request<{ ok: boolean }>(`/scripts/${scriptId}`, {
    method: "DELETE",
  });
}

export function updateProgress(scriptId: string) {
  return request<{ ok: boolean }>(`/scripts/${scriptId}/progress`, {
    method: "PATCH",
  });
}

export function getScriptUrl(scriptId: string) {
  return `${BASE}/scripts/${scriptId}`;
}

export function getAudioUrl(scriptId: string, index: number) {
  return `${BASE}/audio/${scriptId}/${index}`;
}
