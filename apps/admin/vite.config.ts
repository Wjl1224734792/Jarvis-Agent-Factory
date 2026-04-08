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

function isNodeModule(id: string) {
  return id.includes("/node_modules/") || id.includes("\\node_modules\\");
}

function buildAdminManualChunk(id: string) {
  if (!isNodeModule(id)) {
    return undefined;
  }

  if (id.includes("@tiptap/")) {
    return "editor-vendor";
  }
  if (id.includes("@antv/")) {
    return "antv-vendor";
  }
  if (id.includes("@ant-design/plots")) {
    return "charts-vendor";
  }
  if (id.includes("@ant-design/icons")) {
    return "icons-vendor";
  }
  if (id.includes("/rc-") || id.includes("\\rc-")) {
    return "antd-rc-vendor";
  }
  if (
    id.includes("/antd/") ||
    id.includes("\\antd\\") ||
    id.includes("@ant-design")
  ) {
    return "antd-vendor";
  }
  if (
    id.includes("react-router-dom") ||
    id.includes("@tanstack/react-query")
  ) {
    return "admin-shell-vendor";
  }
  if (
    id.includes("/react/") ||
    id.includes("\\react\\") ||
    id.includes("react-dom") ||
    id.includes("scheduler")
  ) {
    return "react-vendor";
  }

  return "vendor";
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
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: buildAdminManualChunk
        }
      }
    }
  };
});
