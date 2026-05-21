import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    fileParallelism: false,
    testTimeout: 30000,
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
      "@/": `${path.resolve(__dirname, "apps/web/src")}/`
    },
    include: [
      "packages/**/tests/**/*.test.ts",
      "apps/**/tests/**/*.test.ts",
      "apps/**/tests/**/*.test.tsx"
    ],
  }
});
