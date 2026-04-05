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
    onUnhandledError(error) {
      // @cloudflare/vitest-pool-workers tries RPC with the default export (Hono app),
      // which is not a WorkerEntrypoint subclass. Suppress this known rejection.
      if (error instanceof TypeError && error.message.includes("WorkerEntrypoint")) {
        return false;
      }
    },
  },
});
