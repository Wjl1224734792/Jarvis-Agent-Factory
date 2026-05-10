# Web 面板推广就绪度改进

## 背景

Web 面板核心功能已齐全（MCP 状态、会话管理、归档、置顶、Hash 路由），但存在冗余文件、Lint 警告、硬编码版本号等问题，需要在开源推广前修复。

## 需求清单

### REQ-WP-001：删除冗余 archive.html

**现状**：`src/web/views/archive.html` 是独立归档页面，但 `pipeline.html` 已通过 Hash 路由 `#/archive` 内置完整归档面板。服务器路由 `/archive` 指向旧独立页面，与 hash 路由入口不一致。

**要求**：
- 删除 `src/web/views/archive.html`
- 删除 `server.ts` 中 `/archive` 路由
- sidebar 中归档链接统一为 `#/archive`（已在 pipeline.html 中完成）

### REQ-WP-002：清理 52 个 ESLint warnings

**现状**：`npm run lint` 有 52 个 warning（0 error），分布在 7 个文件。大量 unused-var/import 影响开源项目第一印象。

**要求**：
- 所有 `no-unused-vars` / `@typescript-eslint/no-unused-vars` warning 清零
- 如确实需要保留的 import（如类型重导出），使用 `_` 前缀标记
- 不能为消除 warning 而删除实际需要的代码

**涉及文件**：
- `src/cli.ts` — `scope` unused
- `src/engine/agent-registry.ts` — `extname`, `relativePath` unused
- `src/engine/gates.ts` — `getPlatformModels` unused import
- `src/engine/server.ts` — 多个未使用的 import + `AGENT_LIST`
- `src/hook.ts` — `e` 参数 unused
- `src/install.ts` — 多个未使用的 import/变量
- `src/web/routes.ts` — 多个未使用的 import/变量

### REQ-WP-003：版本号构建时注入

**现状**：`pipeline.html:37` 和 `agents.html:35` 硬编码 `v3.22.0`，`readVersion()` 已从 `package.json` 读取版本号提供给 `/health` API。前端初始渲染会短暂显示错误版本。

**要求**：
- 构建时将版本号注入 HTML 文件，替换硬编码值
- 或前端在页面加载时立即从 `/health` API 获取版本号覆盖

### REQ-WP-004：API 文档补充

**现状**：REST API 无 OpenAPI/Swagger 文档，开源用户需要读代码理解 API。

**要求**：
- 为 `/api/status`、`/api/sessions`、`/api/pipeline`、`/api/pipeline-runs` 等端点补充简要文档
- 格式：OpenAPI 3.0 YAML 或 Markdown 表格

### REQ-WP-005：前端 JS 模块化（P2）

**现状**：`pipeline.html` 中 1073 行 HTML + JS 混在一起。

**要求**：
- 将 JS 逻辑提取到独立 `.js` 文件
- 保持功能不变
- HTML 通过 `<script src="...">` 引用

### REQ-WP-006：前端测试（P3）

**现状**：Web UI 无自动化测试。

**要求**：
- 至少覆盖关键路径：会话列表渲染、Hash 路由切换、归档列表加载
