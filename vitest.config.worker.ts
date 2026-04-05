import { defineWorkspaceConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkspaceConfig({
  test: {
    name: "worker",
    include: ["worker/**/*.test.ts"],
  },
});
