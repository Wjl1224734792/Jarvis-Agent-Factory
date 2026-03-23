import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    include: [
      "packages/**/tests/**/*.test.ts",
      "apps/**/tests/**/*.test.ts"
    ]
  }
});
