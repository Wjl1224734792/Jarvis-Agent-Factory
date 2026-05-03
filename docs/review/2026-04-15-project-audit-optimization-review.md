# 2026-04-15 项目审查后续优化评审报告

## 审查结论

- 结论：有条件通过
- 说明：本轮已完成编排配置、测试入口、E2E 默认端口、通用举报详情契约校验、Admin 评论审核页请求扇出和根 lint 阻塞点的最小优化；相关单测、lint、typecheck、build 已通过。全量 server test 仍被既有迁移目录缺失问题阻塞，需要后续补齐。

## 需求覆盖情况

- 已覆盖：编排配置模型不可用问题。
- 已覆盖：server 测试入口漏跑现有测试文件问题。
- 已覆盖：E2E wrapper 等待旧端口问题。
- 已覆盖：通用 `/admin/reports/{kind}/{id}` 路由缺少共享 schema 校验问题。
- 已覆盖：Admin 评论审核页挂载即拉取 5 个评论域的问题。
- 已记录但未处理：评分对象审核客户端 N+1，原因是可靠修复需要新增服务端聚合/分页接口并同步共享契约，不适合本轮半套改动。

## 计划一致性

- 实际改动与 `docs/plans/2026-04-15-project-audit-optimization-plan.md` 中 4 个 Execution Packet 一致。
- 未触碰数据库结构、环境变量、`apps/web`、评分对象审核接口和 `packages/http-client`。
- 因 `task_design` 专用角色启动失败，任务和计划由主会话按 Gate B / Gate C 模板手工补齐；该偏差已在计划与实现文档中记录。

## 前后端边界一致性

- 前端改动只影响 Admin 评论审核页的数据请求启用策略，不改变 API 契约。
- 后端改动只收紧通用举报详情返回契约，不改变路由路径、权限要求或数据库访问方式。
- `.codex` 配置改动只替换不可用模型，不改变代理职责边界。

## 测试覆盖状态

- 已通过：
  - `apps/admin/tests/post-comments-page-helpers.test.ts`
  - `apps/server/tests/admin-reports-helpers.test.ts`
  - `apps/admin` typecheck / build
  - `apps/server` typecheck / build
  - 根 `bun run lint`
  - 根 `bun run typecheck`
  - 根 `bun run build`
  - 本轮相关文件局部 eslint
  - `git diff --check`
  - 编排模型与 E2E 旧端口静态搜索
- 未完全通过：
  - `bun run --cwd apps/server test`，失败原因为现有 `packages/db/drizzle/meta/_journal.json` 缺失，导致多组集成测试在 `runMigrations()` 阶段失败。

## 问题列表

### [中] Server 集成测试依赖缺失迁移目录

- 证据：`bun run --cwd apps/server test` 失败于 `runMigrations()`，错误为 `Can't find meta/_journal.json file`。
- 影响：server 全量测试无法作为本轮最终 Green 证据。
- 建议：补齐 Drizzle 迁移目录或调整测试初始化策略，再重新跑 server 全量测试。

### [中] 评分对象审核客户端 N+1 仍未处理

- 证据：`apps/admin/src/lib/api-client.ts` 的 `listRatingTargetsForModeration` 仍通过榜单列表 + 多详情请求展开条目。
- 影响：评分对象审核页和举报页在大数据量下仍可能请求过多。
- 建议：单开共享契约任务，新增 admin rating-target 摘要/分页接口，并同步 `packages/schemas`、`packages/http-client`、OpenAPI 和 Admin 页面。

### [低] Admin 评论审核卡片待处理数语义改为当前域

- 说明：为避免恢复 5 路请求，本轮 `pendingCount` 使用当前已加载域的数据。
- 影响：如果产品需要全域精确待处理数，需要后续补轻量统计接口，而不是重新无条件拉取全部列表。

## 必须修复项

- 若要声明 server 全量测试通过，必须先修复 `packages/db/drizzle/meta/_journal.json` 缺失问题。
- 若要关闭性能债，必须单开评分对象审核聚合接口任务。

## 优化建议

- 将 Admin 默认 overview 图表区二级懒加载，继续降低后台认证后的首屏依赖压力。
- 继续回收 Admin/Web 应用层重复定义的共享响应类型，逐步转向 `packages/http-client` 与 `packages/schemas`。
- 对移动端相关文档标注“仓库外实施”，避免与根 `AGENTS.md` 的维护边界混淆。

## 回归建议

- `bun run --cwd apps/server test`
- `bun run test`
- `bun run typecheck`
- `bun run build`
- 在迁移目录恢复后，重点回归：
  - `/admin/reports/post/{id}`
  - `/admin/post-comments?status=...`
  - Admin 评论审核页域切换与状态切换

## 追踪矩阵

| requirement_id | task_id | executor | changed_files | tests | review_result |
|---|---|---|---|---|---|
| REQ-AUDOPT-001 编排配置可用 | TASK-AUDOPT-001 | 主会话 | `.codex/agents/repo_explorer.toml`, `.codex/agents/task_design.toml`, `.codex/agents/docs_researcher.toml`, `.codex/skills/agent-orchestration/README.md` | `rg` 静态搜索 | 通过 |
| REQ-AUDOPT-002 测试入口与 E2E 端口 | TASK-AUDOPT-002 | 主会话 | `scripts/run-e2e.mjs`, `apps/server/package.json` | `rg` 静态搜索；`bun run --cwd apps/server test` 暴露迁移目录缺失 | 有条件通过 |
| REQ-AUDOPT-003 举报详情契约校验 | TASK-AUDOPT-003 | 主会话 | `apps/server/src/modules/admin-reports/admin-reports.route.ts`, `apps/server/src/modules/admin-reports/admin-reports.service.ts`, `apps/server/src/modules/admin-reports/admin-reports.helpers.ts`, `apps/server/tests/admin-reports-helpers.test.ts`, `apps/server/tests/posts.test.ts` | `bunx vitest run --config ./vitest.config.ts apps/server/tests/admin-reports-helpers.test.ts`; `apps/server` typecheck / build / lint | 通过 |
| REQ-AUDOPT-004 Admin 评论审核请求扇出 | TASK-AUDOPT-004 | 主会话 | `apps/admin/src/features/posts/post-comments-page.tsx`, `apps/admin/src/features/posts/post-comments-page-helpers.ts`, `apps/admin/tests/post-comments-page-helpers.test.ts` | `bunx vitest run --config ./vitest.config.ts apps/admin/tests/post-comments-page-helpers.test.ts`; `apps/admin` typecheck / build / lint | 通过 |
