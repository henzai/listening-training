import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "worker",
    include: ["worker/**/*.test.ts"],
  },
});
