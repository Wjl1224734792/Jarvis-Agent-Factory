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

function normalizeModuleId(id: string) {
  return id.replaceAll("\\", "/");
}

const WANGEDITOR_CORE_PACKAGES = new Set([
  "@wangeditor/core",
  "dom7",
  "event-emitter",
  "html-void-elements",
  "i18next",
  "is-hotkey",
  "lodash.camelcase",
  "lodash.clonedeep",
  "lodash.debounce",
  "lodash.foreach",
  "lodash.isequal",
  "lodash.throttle",
  "lodash.toarray",
  "nanoid",
  "scroll-into-view-if-needed",
  "slate",
  "slate-history",
  "snabbdom"
]);

const WANGEDITOR_MODULE_PACKAGES = new Set([
  "@wangeditor/basic-modules",
  "@wangeditor/code-highlight",
  "@wangeditor/list-module",
  "@wangeditor/table-module",
  "prismjs"
]);

const WANGEDITOR_UPLOAD_PACKAGES = new Set([
  "@uppy/core",
  "@uppy/xhr-upload",
  "@wangeditor/upload-image-module",
  "@wangeditor/video-module"
]);

function getNodeModuleInfo(id: string) {
  const normalizedId = normalizeModuleId(id);
  const marker = "/node_modules/";
  const start = normalizedId.lastIndexOf(marker);

  if (start < 0) {
    return null;
  }

  const modulePath = normalizedId.slice(start + marker.length);
  const segments = modulePath.split("/");
  const packageName =
    segments[0]?.startsWith("@") && segments[1]
      ? `${segments[0]}/${segments[1]}`
      : segments[0];

  if (!packageName) {
    return null;
  }

  return {
    normalizedId,
    packageName
  };
}

function getWangeditorManualChunk(packageName: string) {
  if (packageName === "@wangeditor/editor-for-react") {
    return "wangeditor-react-vendor";
  }
  // The published editor entry is already a monolithic ESM bundle, so keep it isolated.
  if (packageName === "@wangeditor/editor") {
    return "wangeditor-core-vendor";
  }
  if (WANGEDITOR_UPLOAD_PACKAGES.has(packageName)) {
    return "wangeditor-upload-vendor";
  }
  if (WANGEDITOR_MODULE_PACKAGES.has(packageName)) {
    return "wangeditor-modules-vendor";
  }
  if (WANGEDITOR_CORE_PACKAGES.has(packageName)) {
    return "wangeditor-core-vendor";
  }

  return undefined;
}

function buildWebManualChunk(id: string) {
  const moduleInfo = getNodeModuleInfo(id);

  if (!moduleInfo) {
    return undefined;
  }

  const { normalizedId, packageName } = moduleInfo;
  const wangeditorChunk = getWangeditorManualChunk(packageName);

  if (wangeditorChunk) {
    return wangeditorChunk;
  }

  if (packageName === "react-virtuoso") {
    return "feed-vendor";
  }
  if (packageName === "qrcode") {
    return "share-vendor";
  }
  if (
    packageName === "react-router-dom" ||
    packageName === "@tanstack/react-query" ||
    packageName === "@remix-run/router" ||
    packageName === "zustand"
  ) {
    return "app-shell-vendor";
  }
  if (
    normalizedId.includes("/react/") ||
    normalizedId.includes("react-dom") ||
    normalizedId.includes("scheduler")
  ) {
    return "react-vendor";
  }
  if (
    packageName === "lucide-react" ||
    packageName === "dompurify" ||
    packageName === "radix-ui" ||
    packageName === "class-variance-authority" ||
    packageName === "clsx" ||
    packageName === "tailwind-merge" ||
    packageName === "tw-animate-css"
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
    plugins: [
      react(),
      {
        name: "vite:react-refresh-preamble",
        apply: "serve",
        transformIndexHtml: {
          order: "pre",
          handler() {
            return [
              {
                tag: "script",
                attrs: { type: "module" },
                children: `import RefreshRuntime from "/@react-refresh"
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true`,
              },
            ];
          },
        },
      },
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    server: {
      port: devPort,
      host: devHost,
      proxy: {
        "/api": {
          target: "http://localhost:17382",
          changeOrigin: true
        }
      }
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
