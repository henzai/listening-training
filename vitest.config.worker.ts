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
    setupFiles: ["./worker/vitest-setup.ts"],
  },
});
