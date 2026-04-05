/// <reference types="@cloudflare/vitest-pool-workers/types" />

declare module "*.sql?raw" {
  const content: string;
  export default content;
}

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    AUDIO_BUCKET: R2Bucket;
    OPENAI_API_KEY: string;
  }
}
