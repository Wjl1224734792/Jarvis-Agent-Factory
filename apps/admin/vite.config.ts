import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

const DEFAULT_DEV_HOST = "0.0.0.0";
const DEFAULT_DEV_PORT = 3001;

function parseDevPort(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    return fallback;
  }
  return n;
}

export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, "../..");
  const mergedEnv = {
    ...loadEnv(mode, repoRoot, ""),
    ...loadEnv(mode, __dirname, "")
  };
  const devHost = mergedEnv.ADMIN_DEV_HOST?.trim() || DEFAULT_DEV_HOST;
  const devPort = parseDevPort(mergedEnv.ADMIN_DEV_PORT, DEFAULT_DEV_PORT);
  const adminApiBaseUrl = mergedEnv.VITE_ADMIN_API_BASE_URL?.trim() ?? "";

  return {
    envDir: repoRoot,
    define: {
      "import.meta.env.VITE_ADMIN_API_BASE_URL": JSON.stringify(adminApiBaseUrl)
    },
    plugins: [react(), tailwindcss()],
    server: {
      port: devPort,
      host: devHost
    }
  };
});
