import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

const DEFAULT_DEV_HOST = "0.0.0.0";
const DEFAULT_DEV_PORT = 17_381;

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
    packageName,
    subpath: packageName.startsWith("@") ? segments.slice(2).join("/") : segments.slice(1).join("/")
  };
}

function matchesSubpath(subpath: string, prefixes: string[]) {
  return prefixes.some((prefix) => subpath.startsWith(prefix));
}

function resolveAntdChunk(subpath: string) {
  if (
    matchesSubpath(subpath, [
      "es/_util/",
      "es/app/",
      "es/button/",
      "es/config-provider/",
      "es/flex/",
      "es/grid/",
      "es/input/",
      "es/layout/",
      "es/locale/",
      "es/space/",
      "es/spin/",
      "es/style/",
      "es/theme/",
      "es/typography/"
    ])
  ) {
    return "antd-shell-vendor";
  }

  if (
    matchesSubpath(subpath, [
      "es/form/",
      "es/image/",
      "es/modal/",
      "es/segmented/",
      "es/select/",
      "es/tag/",
      "es/upload/"
    ])
  ) {
    return "antd-editor-vendor";
  }

  if (matchesSubpath(subpath, ["es/table/", "es/pagination/"])) {
    return "antd-table-vendor";
  }

  return "antd-vendor";
}

function buildAdminManualChunk(id: string) {
  const moduleInfo = getNodeModuleInfo(id);

  if (!moduleInfo) {
    return undefined;
  }

  const { normalizedId, packageName, subpath } = moduleInfo;

  if (packageName === "lucide-react") {
    return "lucide-vendor";
  }

  if (packageName.startsWith("@tiptap/") || packageName.startsWith("prosemirror-")) {
    return "editor-vendor";
  }

  if (packageName === "@ant-design/plots" || packageName.startsWith("@antv/")) {
    return "charts-vendor";
  }

  if (packageName === "@ant-design/icons") {
    return "icons-vendor";
  }

  if (packageName === "antd") {
    return resolveAntdChunk(subpath);
  }

  if (
    [
      "@ant-design/cssinjs",
      "@rc-component/context",
      "rc-collapse",
      "rc-dropdown",
      "rc-input",
      "rc-menu",
      "rc-motion",
      "rc-notification",
      "rc-overflow",
      "rc-portal",
      "rc-resize-observer",
      "rc-tooltip",
      "rc-trigger",
      "rc-util"
    ].includes(packageName)
  ) {
    return "antd-shell-vendor";
  }

  if (
    [
      "@rc-component/async-validator",
      "rc-dialog",
      "rc-field-form",
      "rc-image",
      "rc-picker",
      "rc-progress",
      "rc-segmented",
      "rc-select",
      "rc-textarea",
      "rc-upload",
      "rc-virtual-list"
    ].includes(packageName)
  ) {
    return "antd-editor-vendor";
  }

  if (["rc-pagination", "rc-table"].includes(packageName)) {
    return "antd-table-vendor";
  }

  if (
    packageName === "react-router-dom" ||
    packageName === "@tanstack/react-query" ||
    packageName === "@remix-run/router" ||
    packageName === "zustand"
  ) {
    return "admin-shell-vendor";
  }
  if (
    normalizedId.includes("/react/") ||
    normalizedId.includes("react-dom") ||
    normalizedId.includes("scheduler")
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
