/// <reference types="@cloudflare/vitest-pool-workers/types" />

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    AUDIO_BUCKET: R2Bucket;
    OPENAI_API_KEY: string;
  }
}
