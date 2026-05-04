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
    packageName,
    subpath: packageName.startsWith("@") ? segments.slice(2).join("/") : segments.slice(1).join("/")
  };
}

function matchesSubpath(subpath: string, prefixes: string[]) {
  return prefixes.some((prefix) => subpath.startsWith(prefix));
}

function resolveG2Chunk(subpath: string) {
  if (matchesSubpath(subpath, ["esm/runtime/", "esm/api/", "esm/data/", "esm/spec/", "lib/runtime/", "lib/api/", "lib/data/", "lib/spec/"])) {
    return "charts-runtime-vendor";
  }

  if (matchesSubpath(subpath, ["esm/component/axisArc", "esm/component/axisRadar", "lib/component/axisArc", "lib/component/axisRadar"])) {
    return "charts-axis-polar-vendor";
  }

  if (matchesSubpath(subpath, ["esm/component/axis", "esm/component/axisX", "esm/component/axisY", "lib/component/axis", "lib/component/axisX", "lib/component/axisY"])) {
    return "charts-axis-cartesian-vendor";
  }

  if (matchesSubpath(subpath, ["esm/component/legend", "lib/component/legend"])) {
    return "charts-legend-vendor";
  }

  if (matchesSubpath(subpath, ["esm/component/scrollbar", "esm/component/slider", "lib/component/scrollbar", "lib/component/slider"])) {
    return "charts-control-vendor";
  }

  if (matchesSubpath(subpath, ["esm/component/constant", "esm/component/utils", "esm/component/title", "lib/component/constant", "lib/component/utils", "lib/component/title"])) {
    return "charts-component-runtime-vendor";
  }

  if (matchesSubpath(subpath, ["esm/component/", "esm/label-transform/", "lib/component/", "lib/label-transform/"])) {
    return "charts-component-vendor";
  }

  if (matchesSubpath(subpath, ["esm/interaction/", "esm/animation/", "esm/composition/", "lib/interaction/", "lib/animation/", "lib/composition/"])) {
    return "charts-interaction-vendor";
  }

  if (matchesSubpath(subpath, ["esm/coordinate/", "esm/encode/", "esm/scale/", "esm/transform/", "lib/coordinate/", "lib/encode/", "lib/scale/", "lib/transform/"])) {
    return "charts-grammar-vendor";
  }

  if (matchesSubpath(subpath, ["esm/mark/", "esm/shape/", "esm/theme/", "esm/palette/", "lib/mark/", "lib/shape/", "lib/theme/", "lib/palette/"])) {
    return "charts-render-vendor";
  }

  if (matchesSubpath(subpath, ["esm/utils/", "lib/utils/"])) {
    return "charts-utils-vendor";
  }

  if (matchesSubpath(subpath, ["esm/lib/", "lib/"])) {
    return "charts-lib-vendor";
  }

  return "charts-core-vendor";
}

function resolveAntdChunk(subpath: string) {
  if (
    matchesSubpath(subpath, [
      "es/_util/",
      "es/app/",
      "es/button/",
      "es/config-provider/",
      "es/empty/",
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

  if (matchesSubpath(subpath, ["es/form/", "es/select/", "es/segmented/"])) {
    return "antd-form-vendor";
  }

  if (matchesSubpath(subpath, ["es/image/", "es/upload/"])) {
    return "antd-media-vendor";
  }

  if (matchesSubpath(subpath, ["es/modal/", "es/tag/"])) {
    return "antd-feedback-vendor";
  }

  if (matchesSubpath(subpath, ["es/table/", "es/pagination/"])) {
    return "antd-table-vendor";
  }

  return "antd-vendor";
}

function getWangeditorManualChunk(packageName: string) {
  if (packageName === "@wangeditor/editor-for-react") {
    return "wangeditor-react-vendor";
  }
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

function buildAdminManualChunk(id: string) {
  const moduleInfo = getNodeModuleInfo(id);

  if (!moduleInfo) {
    return undefined;
  }

  const { normalizedId, packageName, subpath } = moduleInfo;

  if (packageName === "lucide-react") {
    return "lucide-vendor";
  }

  const wangeditorChunk = getWangeditorManualChunk(packageName);
  if (wangeditorChunk) {
    return wangeditorChunk;
  }

  if (packageName === "@ant-design/plots") {
    return "plots-vendor";
  }

  if (packageName === "@antv/g2") {
    return resolveG2Chunk(subpath);
  }

  if (packageName === "@antv/g2-extension-plot") {
    return "charts-plot-vendor";
  }

  if (packageName === "@antv/g" || packageName.startsWith("@antv/g-")) {
    return "charts-renderer-vendor";
  }

  if (packageName.startsWith("@antv/")) {
    return "charts-runtime-vendor";
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
      "rc-field-form",
      "rc-segmented",
      "rc-select",
      "rc-textarea",
      "rc-virtual-list"
    ].includes(packageName)
  ) {
    return "antd-form-vendor";
  }

  if (["rc-image", "rc-progress", "rc-upload"].includes(packageName)) {
    return "antd-media-vendor";
  }

  if (packageName === "rc-dialog") {
    return "antd-feedback-vendor";
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
