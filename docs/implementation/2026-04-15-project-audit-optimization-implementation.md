# 2026-04-15 项目审查后续优化实施记录

## 当前实现目标

- 按 `docs/requirements/2026-04-15-project-audit-optimization-requirements.md`、`docs/tasks/2026-04-15-project-audit-optimization-tasks.md`、`docs/plans/2026-04-15-project-audit-optimization-plan.md` 落地本轮四项高置信度小步优化。

## 输入依据

- 需求文档：`docs/requirements/2026-04-15-project-audit-optimization-requirements.md`
- 任务文档：`docs/tasks/2026-04-15-project-audit-optimization-tasks.md`
- 计划文档：`docs/plans/2026-04-15-project-audit-optimization-plan.md`
- 只读审查来源：
  - 通用 explorer 审查结果（替代 `repo_explorer` 专用角色）
  - `docs/review/2026-04-09-web-audit-review.md`
  - `docs/review/2026-04-09-admin-audit-review.md`
  - `docs/review/2026-04-09-server-audit-review.md`

## 变更文件 / 范围

- `.codex/agents/repo_explorer.toml`
- `.codex/agents/task_design.toml`
- `.codex/agents/docs_researcher.toml`
- `.codex/skills/agent-orchestration/README.md`
- `scripts/run-e2e.mjs`
- `apps/server/package.json`
- `apps/server/src/modules/admin-reports/admin-reports.route.ts`
- `apps/server/src/modules/admin-reports/admin-reports.service.ts`
- `apps/server/src/modules/admin-reports/admin-reports.helpers.ts`
- `apps/server/tests/admin-reports-helpers.test.ts`
- `apps/server/tests/posts.test.ts`
- `apps/admin/src/features/posts/post-comments-page.tsx`
- `apps/admin/src/features/posts/post-comments-page-helpers.ts`
- `apps/admin/tests/post-comments-page-helpers.test.ts`
- `apps/web/src/routes/circle-page-helpers.ts`
- `docs/requirements/2026-04-15-project-audit-optimization-requirements.md`
- `docs/tasks/2026-04-15-project-audit-optimization-tasks.md`
- `docs/plans/2026-04-15-project-audit-optimization-plan.md`

## 实现说明

### TASK-AUDOPT-001 编排代理模型兼容性

- 将 `.codex/agents/repo_explorer.toml` 从 `gpt-5.3-codex-spark` 调整为 `gpt-5.3-codex`。
- 将 `.codex/agents/task_design.toml`、`.codex/agents/docs_researcher.toml` 从 `gpt-5.4-mini` 调整为 `gpt-5.4`。
- 同步 `.codex/skills/agent-orchestration/README.md` 中的模型摘要，避免 README 与 TOML 漂移。

### TASK-AUDOPT-002 测试入口与 E2E 端口漂移

- `scripts/run-e2e.mjs` 统一使用：
  - `E2E_BASE_URL=http://localhost:17380`
  - `E2E_ADMIN_BASE_URL=http://localhost:17381`
  - `E2E_SERVER_BASE_URL=http://localhost:17382`
- `ensureDevServers()` 改为等待当前端口，不再硬编码 `3000/3001/3002`。
- `apps/server/package.json` 的 `test` 改为把 `apps/server/tests` 目录整体交给 Vitest，避免手写白名单漏掉 `provider-config.test.ts`。

### TASK-AUDOPT-003 通用举报详情契约校验

- 新增 `apps/server/src/modules/admin-reports/admin-reports.helpers.ts`：
  - `buildAdminReportEvidenceImages()` 统一生成 `fileName/mimeType/byteSize`
  - `parseAdminReportRecordsResponse()` 统一走共享 schema parse
- `adminReportsService` 改为通过 helper 生成证据图片结构，和已有 posts/models/reviews 专用举报详情保持一致。
- `adminReportsRoute` 改为显式调用 `parseAdminReportRecordsResponse()`，不再直接裸回 `context.json(payload)`。
- 新增 `apps/server/tests/admin-reports-helpers.test.ts` 验证 helper 生成的 payload 可被共享 schema 接受。
- 另外补了一条 `apps/server/tests/posts.test.ts` 的行为级用例，等后续迁移目录恢复后可用于验证通用 `/admin/reports/post/{id}` 链路。

### TASK-AUDOPT-004 Admin 评论审核页按域请求

- 新增 `post-comments-page-helpers.ts`，收敛：
  - query key 构造
  - 当前域 query 启用判断
  - 当前域待审数统计
- `post-comments-page.tsx` 中 5 个评论域 query 现在都带 `enabled`，且 query key 纳入 `domain/status`。
- 页面 `refresh`、`loading`、`pendingCount` 统一围绕当前域，而不是无条件拉取全部域。
- 新增 `apps/admin/tests/post-comments-page-helpers.test.ts` 覆盖按域启用、query key 和待审数统计。

### 验证收尾补丁

- 为了让根 `bun run lint` 可作为有效收尾证据，顺手修复了 `apps/web/src/routes/circle-page-helpers.ts` 中 `scores` 的类型声明，消除两处既有 `no-unsafe-assignment`。

## 测试 / 验证结果

- `bunx vitest run --config ./vitest.config.ts apps/admin/tests/post-comments-page-helpers.test.ts`
  - 通过，`3` 条测试全部通过
- `bunx vitest run --config ./vitest.config.ts apps/server/tests/admin-reports-helpers.test.ts`
  - 通过，`1` 条测试通过
- `bun run --cwd apps/admin typecheck`
  - 通过
- `bun run --cwd apps/server typecheck`
  - 通过
- `bun run --cwd apps/admin build`
  - 通过
- `bun run --cwd apps/server build`
  - 通过
- `bun run typecheck`
  - 通过
- `bun run build`
  - 通过（保留既有 Vite 大 chunk 提示）
- `bun run lint`
  - 通过
- `bunx eslint apps/admin/src/features/posts/post-comments-page.tsx apps/admin/src/features/posts/post-comments-page-helpers.ts apps/admin/tests/post-comments-page-helpers.test.ts apps/server/src/modules/admin-reports/admin-reports.route.ts apps/server/src/modules/admin-reports/admin-reports.service.ts apps/server/src/modules/admin-reports/admin-reports.helpers.ts apps/server/tests/admin-reports-helpers.test.ts scripts/run-e2e.mjs`
  - 通过
- `git diff --check`
  - 通过（仅有 CRLF 提示，无 diff 错误）
- `rg -n "gpt-5.3-codex-spark|gpt-5.4-mini" .codex/agents .codex/skills/agent-orchestration/README.md`
  - 无命中
- `rg -n "localhost:3000|localhost:3001|localhost:3002" scripts/run-e2e.mjs`
  - 无命中
- `bun run --cwd apps/server test`
  - 失败，现有仓库缺少 `packages/db/drizzle/meta/_journal.json`，导致多组 server 集成测试在 `runMigrations()` 阶段被阻塞

## 边界与异常处理

- 本轮未修改数据库 schema、迁移、seed 语义、环境变量和评分对象审核契约。
- `task_design` / `repo_explorer` 专用角色在当前会话内的内置 runtime 仍受工具侧模型映射限制；本轮修复的是仓库 `.codex` 配置与 README 漂移，供后续本地编排使用。
- `posts.test.ts` 新增的通用举报详情行为级测试因为仓库迁移目录缺失，当前未能在全量 server test 中跑到 Green；已用纯 helper 单测替代验证本轮核心契约行为。

## 风险 / 未解决项

- `packages/db/drizzle/meta/_journal.json` 缺失导致 server 集成测试体系不完整，这是本轮发现但未处理的仓库现状问题。
- `apps/admin/src/lib/api-client.ts` 中评分对象审核 N+1 仍存在，需单开共享契约专项处理。

## 对前端 / 后端 / 共享契约的影响

- 前端：
  - Admin 评论审核页请求更聚焦，当前域切换时才加载对应数据。
- 后端：
  - 通用举报详情路由现在和专用举报详情一样受共享 schema 约束。
- 共享配置：
  - `.codex` 编排 agent 模型配置与 README 摘要已对齐到当前支持模型。

## 推荐下一步

1. 补齐 `packages/db/drizzle/meta/_journal.json` 或修正 server 测试的迁移入口，再重新跑 `bun run --cwd apps/server test`。
2. 单开“评分对象审核聚合接口”专项，解决 `listRatingTargetsForModeration` 的客户端 N+1。
3. 若继续使用仓库内编排工作流，可在修复 runtime 角色映射后重新验证 `task_design` / `repo_explorer` 是否能直接启动。
