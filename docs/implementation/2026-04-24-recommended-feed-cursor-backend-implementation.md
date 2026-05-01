# 2026-04-24 recommended-feed-cursor backend implementation

## 1. 当前实现目标

- 将 `recommended` 推荐流改为 cursor 契约（请求 `cursor/limit`，响应 `nextCursor`）。
- 覆盖链路：`packages/schemas -> packages/http-client -> apps/server(route/service/repo) -> backend tests`。
- `latest/following` 维持原 `page/limit` 语义。

## 2. 输入依据

- 上游任务约束：仅改 `recommended`，不改 `latest/following` 语义。
- 设计决议：不再走 `resolveRecommendedQueryWindow()` 的 200 候选窗口分页主路径。
- 共享边界：仅涉及 `packages/schemas`、`packages/http-client`、`apps/server`。

## 3. 工作区模式

- 仓库：`E:\CodeStore\feijia`（monorepo）。
- 工作方式：直接在当前分支工作区改动，兼容已有未提交改动，不回滚他人修改。
- 执行环境：`bun + vitest + typescript`。

## 4. 变更文件 / 变更范围

- `packages/schemas/src/posts.ts`
- `packages/schemas/tests/posts.test.ts`
- `packages/http-client/src/index.ts`
- `packages/http-client/tests/posts.test.ts`
- `apps/server/src/modules/posts/posts.route.ts`
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/server/tests/posts.test.ts`
- `apps/server/tests/posts-recommended-window.test.ts`

## 5. 实现说明

- Schema
  - 为 feed 响应抽出统一 `pagination` schema。
  - `homeFeedResponseSchema` / `circleFeedResponseSchema` 新增 `nextCursor?: string | null`。
  - 增加约束：当 `tab === "recommended"` 时 `nextCursor` 必须存在（可为 `null`）。
  - `latest/following` 不强制要求 `nextCursor`，保持兼容。

- HTTP Client
  - `listHomeFeed` 支持推荐流 `cursor` 参数并拼接查询串。
  - `listCircleFeed` 支持推荐流 `cursor` 参数。
  - 推荐流优先使用 `cursor`；兼容期仍允许传 `page`（仅在无 `cursor` 时透传）。
  - `latest/following` 维持 `page/limit` 拼参。

- Server Route
  - `feed` 与 `circleFeed` 路由新增 `cursor` query 解析并传入 service。
  - `page/limit` 解析逻辑保留。

- Server Service
  - 删除 `resolveRecommendedQueryWindow()` 及其 200 窗口逻辑。
  - 推荐流改为 cursor 偏移分页：
    - 解析 `cursor`（`offset:<n>`，兼容纯数字；无效降级为首页）。
    - 分批从 repo 拉取推荐候选（内部批次默认 200，不再全局硬截断总候选）。
    - 复用现有 `rankFeedItemsByRecommendation` 排序逻辑。
    - 按 cursor 偏移切片，返回 `nextCursor`。
  - `latest/following` 仍按 `page/limit`。
  - `pagination` 继续返回；推荐流 `page` 为兼容字段（由 cursor 偏移推导）。

- Server Repo
  - `listFeed` 删除 `recommendedWindowOffset/recommendedWindowLimit` 参数。
  - 推荐/非推荐都走标准 `page/limit` 查询。
  - 排序增加 `postsTable.id` 作为 tie-breaker，提升翻页稳定性。

- Tests
  - 新增/更新 schema 与 http-client 对 `recommended.nextCursor` 和 cursor 查询串的覆盖。
  - 重写 `posts-recommended-window.test.ts` 为 cursor 深翻页场景：
    - 第一页返回 `nextCursor`
    - 使用 `nextCursor` 连续翻页
    - 深页超过 200 项仍可访问
    - 多页无重复
  - 更新 `posts.test.ts` 中与旧 200 窗口模型耦合的断言为新语义。

## 6. 测试和验证结果

- 直接相关测试（通过）：
  - `bun x vitest run --root . --config vitest.config.ts packages/schemas/tests/posts.test.ts packages/http-client/tests/posts.test.ts apps/server/tests/posts-recommended-window.test.ts apps/server/tests/posts.test.ts`
  - 结果：`4 passed`, `76 passed`

- 相关 typecheck（通过）：
  - `bun run --cwd packages/schemas typecheck`
  - `bun run --cwd packages/http-client typecheck`
  - `bun run --cwd apps/server typecheck`

- 全仓 lint（通过）：
  - `bun run lint`

- 全仓 test（通过）：
  - `bun run test`

- 全仓 typecheck（未通过，非本次改动范围）：
  - `bun run typecheck`
  - 失败点：`apps/web/src/routes/home-page.tsx` 语法错误（TS1005/TS1381）

- 全仓 build（未通过，非本次改动范围）：
  - `bun run build`
  - 失败点：`apps/web/src/routes/home-page.tsx` 同一语法错误导致 Vite 构建失败

## 7. 数据与接口边界

- 未改数据库 schema/迁移/seed。
- 未改路由常量与入口，仅扩展现有 feed query 解析。
- 推荐流契约边界：
  - 请求：`tab=recommended` + `limit?` + `cursor?`
  - 响应：`nextCursor: string | null`（推荐流必有）
  - `pagination` 保留兼容。

## 8. 风险 / 未解决项

- 推荐流目前是“cursor + 全候选排序后偏移切片”的稳定实现，优先保证正确性与不被 200 候选硬截断；在超大数据量下会有额外计算成本。
- 全仓 `typecheck/build` 受 `apps/web/src/routes/home-page.tsx` 现有语法错误影响，需前端分支修复后再做全绿确认。

## 9. 需要前端配合的点

- 推荐流请求应从 `page/limit` 迁移为 `cursor/limit`：
  - 首次请求不传 `cursor`
  - 后续请求使用上一页返回的 `nextCursor`
- 推荐流响应读取 `nextCursor` 判断是否继续加载。
- `latest/following` 保持现有 `page/limit` 逻辑，不需要改动。

## 10. 推荐的下一步

- 前端将推荐流列表加载切到 `nextCursor` 驱动，并移除对推荐流 `pagination.total` 的强依赖。
- 若后续追求更高性能，可在推荐流引入更严格的 seek token（基于稳定排序键）以减少大集合重排成本。
