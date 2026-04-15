import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

const DEFAULT_DEV_HOST = "0.0.0.0";
const DEFAULT_DEV_PORT = 17_380;

/**
 * 将环境变量中的端口字符串解析为合法端口号。
 *
 * @param value - `WEB_DEV_PORT` 等原始字符串，可为空
 * @param fallback - 解析失败时的默认值
 * @returns 1–65535 之间的端口，或 `fallback`
 */
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

function isNodeModule(id: string) {
  return id.includes("/node_modules/") || id.includes("\\node_modules\\");
}

function buildWebManualChunk(id: string) {
  if (!isNodeModule(id)) {
    return undefined;
  }

  if (id.includes("@wangeditor/")) {
    return "editor-vendor";
  }
  if (id.includes("@tiptap/")) {
    return "editor-vendor";
  }
  if (id.includes("react-virtuoso")) {
    return "feed-vendor";
  }
  if (id.includes("qrcode")) {
    return "share-vendor";
  }
  if (
    id.includes("react-router-dom") ||
    id.includes("@tanstack/react-query") ||
    id.includes("zustand")
  ) {
    return "app-shell-vendor";
  }
  if (
    id.includes("/react/") ||
    id.includes("\\react\\") ||
    id.includes("react-dom") ||
    id.includes("scheduler")
  ) {
    return "react-vendor";
  }
  if (
    id.includes("lucide-react") ||
    id.includes("dompurify")
  ) {
    return "utility-vendor";
  }

  return "vendor";
}

export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, "../..");
  const mergedEnv = {
    ...loadEnv(mode, repoRoot, ""),
    ...loadEnv(mode, __dirname, "")
  };
  const devHost = mergedEnv.WEB_DEV_HOST?.trim() || DEFAULT_DEV_HOST;
  const devPort = parseDevPort(mergedEnv.WEB_DEV_PORT, DEFAULT_DEV_PORT);
  /** 合并根目录与 apps/web，供 dev/build 共用；空字符串则交给运行时代码走兜底 */
  const webApiBaseUrl = mergedEnv.VITE_WEB_API_BASE_URL?.trim() ?? "";

  return {
    /** 与 monorepo 根目录 `.env*` 对齐；`vite build` 会读根目录 `.env.production` */
    envDir: repoRoot,
    /**
     * 显式注入 API 根地址，避免仅存在于 `apps/web/.env` 时 `import.meta.env` 读不到。
     *
     * @see https://vite.dev/guide/env-and-mode.html
     */
    define: {
      "import.meta.env.VITE_WEB_API_BASE_URL": JSON.stringify(webApiBaseUrl)
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    server: {
      port: devPort,
      host: devHost
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: buildWebManualChunk
        }
      }
    }
  };
});
