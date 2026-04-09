import type { Difficulty, Script, Sentence, Topic } from "./types";

const BASE = "/api/v1";

async function forceReauthentication(): Promise<never> {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((k) => k.startsWith("workbox-precache")).map((k) => caches.delete(k)),
  );
  window.location.href = window.location.origin;
  return new Promise(() => {});
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    // Network error — possibly CORS block from Cloudflare Access redirect
    try {
      const probe = await fetch(`${BASE}/health`, { redirect: "manual" });
      if (probe.type === "opaqueredirect" || probe.status === 0) {
        await forceReauthentication();
      }
    } catch {
      // Probe also failed — genuinely offline
    }
    throw new Error("Network error");
  }

  // Worker API always returns JSON. Non-JSON means Access intercepted the response.
  const ct = res.headers.get("content-type");
  if (!ct?.includes("application/json")) {
    await forceReauthentication();
  }

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

export function getAudioUrl(scriptId: string, index: number) {
  return `${BASE}/audio/${scriptId}/${index}`;
}
