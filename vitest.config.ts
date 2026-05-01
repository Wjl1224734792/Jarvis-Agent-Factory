import path from "node:path";
import { defineConfig } from "vitest/config";

const wsRoot = import.meta.dirname;

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(wsRoot, "apps/web/src"),
    },
    conditions: ["bun", "import", "node"]
  }
});
