import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 30000,
    alias: {
      "@": path.resolve(import.meta.dirname, "apps/web/src"),
      "@/": `${path.resolve(import.meta.dirname, "apps/web/src")}/`
    },
    include: [
      "packages/**/tests/**/*.test.ts",
      "apps/**/tests/**/*.test.ts"
    ],
  }
});
