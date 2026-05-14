import { API_V1_PREFIX, API_VERSION, APP_NAME } from "@feijia/shared";

export const openApiInfo = {
  title: `${APP_NAME} API`,
  version: API_VERSION,
  description: `Feijia server API used by the web app, admin console and mobile clients.

## General Conventions

### Date Format
All date fields use ISO 8601 strings such as \`2026-04-07T12:00:00.000Z\`.

### Pagination
List endpoints use \`page\` and \`pageSize\` query parameters. Responses return pagination data through a \`meta\` object when applicable.

### Error Shape
Error responses expose a business \`code\` and a human-readable \`message\`.

### Upload Constraints
- Image formats: JPEG, PNG, WebP, GIF
- Video formats: MP4, WebM
- File-size limits are controlled by the \`UPLOAD_MAX_*_SIZE_MB\` environment variables.

### Versioning
The current stable route namespace is \`${API_V1_PREFIX}\`.
Health checks and API docs stay on root-level stable endpoints, while business APIs are served under the versioned prefix for future iteration.`
} as const;

export const openApiServers = [
  {
    url: "/",
    description: "Current running server instance"
  }
] as const;

export const openApiTags = [
  { name: "system", description: "Health and service availability endpoints" },
  { name: "auth", description: "Captcha, login, registration and session endpoints" },
  { name: "uploads", description: "Two-step upload and file-url lookup endpoints" },
  { name: "models", description: "Aircraft model, detail and review endpoints" },
  { name: "posts", description: "Post creation, detail and moderation endpoints" },
  { name: "rankings", description: "Ranking list, item and moderation endpoints" },
  { name: "social", description: "Profile, follow and notification endpoints" },
  { name: "brand-applications", description: "Brand application and review endpoints" },
  { name: "submissions", description: "Aircraft submission and review endpoints" },
  { name: "catalog", description: "Categories, brands and other catalog endpoints" },
  { name: "settings", description: "Admin site-setting endpoints" },
  { name: "admin-analytics", description: "Admin dashboard analytics endpoints" },
  { name: "admin-reports", description: "Admin report detail and evidence endpoints" },
  { name: "reviews", description: "Review comment, interaction and moderation endpoints" },
  { name: "power-types", description: "飞行器动力类型分类管理" },
  { name: "search", description: "Site-wide and admin search endpoints" },
  { name: "admin-logs", description: "Admin log file browsing and entry viewing endpoints" },
  { name: "audits", description: "Admin audit record listing and Qiniu audit callback endpoints" }
] as const;
