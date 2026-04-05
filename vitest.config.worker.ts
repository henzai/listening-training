import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineProject } from "vitest/config";

export default defineProject({
  plugins: [
    cloudflareTest({
      main: "./worker/index.ts",
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
  test: {
    name: "worker",
    include: ["worker/**/*.test.ts"],
    // NOTE: @cloudflare/vitest-pool-workers が default export に対して作成する RPC Proxy が、
    // Linux workerd のランタイム初期化時に "inspect" プロパティアクセスを受けて unhandled
    // rejection を発生させる。onUnhandledError コールバックも vitest-pool-workers 環境では
    // 機能しない (cloudflare/workers-sdk#11532)。
    // プロジェクトレベルの dangerouslyIgnoreUnhandledErrors は効かないため、
    // CLI フラグ (package.json の test script) で --dangerouslyIgnoreUnhandledErrors を指定している。
    // upstream 修正後にフラグを削除すること。
  },
});
