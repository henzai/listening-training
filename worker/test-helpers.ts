import { env } from "cloudflare:workers";

export async function applySchema(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS scripts (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        title TEXT,
        difficulty TEXT NOT NULL,
        sentence_count INTEGER NOT NULL,
        total_duration_ms INTEGER,
        status TEXT DEFAULT 'generating',
        last_practiced_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS sentences (
        id TEXT PRIMARY KEY,
        script_id TEXT NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
        index_in_script INTEGER NOT NULL,
        speaker TEXT,
        text_en TEXT NOT NULL,
        text_ja TEXT,
        audio_r2_key TEXT,
        audio_duration_ms INTEGER,
        audio_format TEXT DEFAULT 'mp3',
        UNIQUE(script_id, index_in_script)
      )`,
    ),
  ]);
}
