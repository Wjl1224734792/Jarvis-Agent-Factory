import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 30000,
    include: [
      "packages/**/tests/**/*.test.ts",
      "apps/**/tests/**/*.test.ts"
    ]
  }
});
