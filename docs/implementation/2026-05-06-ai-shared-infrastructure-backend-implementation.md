# AI 共享基础设施 — 后端实现文档

## 1. 当前实现目标

建立 AI 模块的全部共享基础设施，包括数据库字段、路由常量、Zod schema，为后续所有 AI 任务（TASK-002 起）提供基座。

## 2. 对应需求 ID / 任务 ID

- **需求 ID**: REQ-003, REQ-004, REQ-005, REQ-007
- **任务 ID**: TASK-001

## 3. 输入依据

- `docs/requirements/2026-05-06-ai-features-requirements.md`
- `docs/tasks/2026-05-06-ai-features-tasks.md`
- `docs/plans/2026-05-06-ai-features-plan.md`

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `packages/db/src/schema.ts` | 修改 | postsTable 新增 aiSummary、aiSummaryGeneratedAt、aiFormattedAt 三个字段 |
| `packages/db/drizzle/0001_cooing_puppet_master.sql` | 新建 | Drizzle 自动生成的迁移文件（3 条 ALTER TABLE） |
| `packages/shared/src/index.ts` | 修改 | APP_ROUTES 新增 adminAiSettings；API_ROUTES 新增 ai 命名空间 |
| `packages/schemas/src/ai.ts` | 新建 | AI 相关 Zod schema 定义 |
| `packages/schemas/src/index.ts` | 修改 | 新增 `export * from "./ai"` |
| `apps/server/src/app.ts` | 修改 | 预留 aiRoute 的 import 和注册注释 |

## 5. 实现说明

### 5.1 数据库字段

在 `postsTable` 末尾（`publishedAt` 之后、`createdAt` 之前）新增 3 个可空字段：

- `aiSummary: text("ai_summary")` — AI 生成的摘要文本，可空
- `aiSummaryGeneratedAt: timestamp("ai_summary_generated_at", { withTimezone: true })` — 摘要生成时间，可空
- `aiFormattedAt: timestamp("ai_formatted_at", { withTimezone: true })` — 最近排版时间，可空

所有字段均为可空（nullable），不影响现有数据写入。无物理外键、无新增索引。

### 5.2 路由常量

**APP_ROUTES** 新增：
- `adminAiSettings: "/admin/settings/ai"` — 管理后台 AI 设置页面路径

**API_ROUTES** 新增 `ai` 命名空间：
- `summary`: `withApiV1Prefix("/ai/summary")` → `/api/v1/ai/summary`
- `format`: `withApiV1Prefix("/ai/format")` → `/api/v1/ai/format`
- `adminSettings`: `withApiV1Prefix("/admin/ai/settings")` → `/api/v1/admin/ai/settings`

### 5.3 Zod Schema

新建 `packages/schemas/src/ai.ts`，定义 6 个 schema：

| Schema | 用途 | 关键约束 |
|--------|------|---------|
| `aiSummaryRequestSchema` | AI 摘要请求 | postId 必填，content 可选 |
| `aiSummaryResponseSchema` | AI 摘要响应 | summary + cached |
| `aiFormatRequestSchema` | AI 排版请求 | content 最大 8000 字，mode 二选一 |
| `aiFormatResponseSchema` | AI 排版响应 | html + changes 数组 |
| `aiSettingsSchema` | AI 设置写入 | 含 provider/apiKey/baseUrl/model/features |
| `aiSettingsResponseSchema` | AI 设置响应 | 同上结构，apiKey 脱敏由业务层处理 |

所有 schema 通过 `z.infer` 导出对应类型。

### 5.4 路由预留

`apps/server/src/app.ts` 中以注释形式预留了 aiRoute 的 import 和注册位置，标记 `TODO(TASK-002)`。

## 6. 测试和验证结果

| 检查项 | 结果 |
|--------|------|
| `bun run --cwd packages/db typecheck` | 通过 |
| `bun run --cwd packages/shared typecheck` | 通过 |
| `bun run --cwd packages/schemas typecheck` | 通过 |
| `bun run --cwd apps/server typecheck` | 通过 |
| Drizzle 迁移生成 | 成功，生成 `0001_cooing_puppet_master.sql` |
| 迁移内容验证 | 3 条 ALTER TABLE，无物理外键 |

## 7. 数据与接口边界

- 新增数据库字段均为 nullable，不破坏现有写入逻辑
- API_ROUTES.ai 下的 3 个端点仅为常量定义，实际路由模块未创建（由 TASK-002 实现）
- Zod schema 的 `apiKey` 字段在响应侧保持 string 类型，具体脱敏逻辑由业务层控制

## 8. 风险 / 未解决项

| 风险项 | 说明 | 缓解措施 |
|--------|------|---------|
| 迁移文件需在部署前执行 | 新增 3 个 nullable 字段，PostgreSQL 执行速度快 | 部署流程包含 migrate 步骤 |
| aiSettingsResponseSchema 的 apiKey 脱敏 | schema 层不处理脱敏，需业务层实现 | TASK-002 中实现脱敏逻辑 |

## 9. 需要前端配合的点

- 前端可开始基于 `API_ROUTES.ai` 常量和 Zod schema 定义前端类型
- 管理后台可基于 `APP_ROUTES.adminAiSettings` 规划 AI 设置页面路由
- `packages/schemas/src/ai.ts` 的类型可直接在前端使用（通过 `@feijia/schemas` 包）

## 10. 推荐的下一步

1. **TASK-002**: 实现 AI 业务模块（`apps/server/src/modules/ai/`），包括路由、控制器、服务层
2. 执行数据库迁移（`bun run --cwd packages/db migrate`）
3. 前端开始对接 AI 摘要和排版功能
