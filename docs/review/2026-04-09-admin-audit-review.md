# 2026-04-09 Admin 阶段审查报告

## 审查结论

- 结论：有条件通过
- 说明：`apps/admin` 已完成本阶段高置信度修复与验证，可以进入 `server` 阶段；但后台首页图表首屏和若干异步页请求扇出仍建议后续专项处理。

## 主要发现

### [已修复] Admin API 客户端错误地尝试走 Web 会话刷新链路

- 风险：后台请求 401 / `TOKEN_EXPIRED` 时，客户端会误打 `/auth/web/refresh`，与 admin 会话边界不一致。
- 处理：移除这段错误的自动刷新逻辑，后台 401 直接按 admin 鉴权失效流程处理。

### [已修复] 后台鉴权失效或退出登录时没有清理 Query Cache

- 风险：同一浏览器会话中切换管理员或退出再登录时，旧后台列表和总览数据可能被复用。
- 处理：在 `ADMIN_AUTH_INVALID_EVENT` 和主动退出登录时统一 `queryClient.clear()`。

### [已修复] 总览页多个审查卡片的待处理数映射错误

- 风险：文章、榜单、品牌申请、评分对象卡片会显示错误的 pending 数，影响运营判断。
- 处理：统一改为读取 `analytics.moderation.<domain>.pending` 对应桶数据。

### [已修复] 官方文章编辑器依赖被混入后台公共 vendor

- 证据：
  - 改造前 `vendor` 约 `306.75 kB`
  - 改造后 `vendor` 降至 `178.01 kB`
  - `@tiptap/*` 被独立拆到 `editor-vendor 425.11 kB`
- 处理：`vite.config.ts` 为 `@tiptap/*` 增加 `editor-vendor` 手工分包，避免非文章页首屏携带编辑器依赖。

### [已修复] Admin Query 默认策略偏激进

- 风险：后台列表页在切回窗口、短时间反复切换页面时更容易产生无意义 refetch。
- 处理：为 admin QueryClient 增加更保守默认值：
  - `staleTime: 30_000`
  - `refetchOnWindowFocus: false`
  - 对明显非重试型错误只允许 0 次重试

## 本轮未处理但建议继续跟进

### [建议后续处理] `/admin` 默认 overview 首屏仍会拉入巨大图表依赖

- 现状：虽然 `antv-vendor` 未被主入口预加载，但后台默认落到 overview，认证完成后仍会继续装载约 `1.31 MB` 的图表大块。
- 建议：把 overview 图表区拆成二级懒加载，让 KPI/快捷入口先可见，再异步加载图表。

### [建议后续处理] 异步页请求扇出仍偏大

- 现状：
  - `ReportsPage` 挂载即发多组列表请求
  - `PostCommentsPage` 不区分当前域就预取多域评论
  - `listRatingTargetsForModeration` 仍存在客户端 N+1
- 建议：后续按当前 tab/domain 做 `enabled` 控制，并推动服务端提供更直接的 rating target 摘要接口。

## 验证结果

- `bun test` 全量执行 `apps/admin/tests/*.test.ts`：`19 pass / 0 fail`
- `bun run --cwd apps/admin typecheck`：通过
- `bun run --cwd apps/admin build`：通过
- `bunx eslint apps/admin/src apps/admin/tests`：通过
- Playwright 浏览器验证：
  - 未登录访问 `/admin` 会重定向到 `/admin/login?redirect=%2Fadmin`
  - 后台登录页账号框、密码框、提交按钮均已渲染
  - 使用当前默认演示值发起登录未能进入 overview，因此本阶段只将“登录拦截与表单可达”记为通过，“默认演示账号可登录”记为未确认

## 追踪矩阵

| requirement | task | changed_files | tests / verification | result |
|---|---|---|---|---|
| Admin 健壮性审查与修复 | TASK-AUDIT-003 | `apps/admin/src/lib/api-client.ts`, `apps/admin/src/features/auth/admin-shell.tsx`, `apps/admin/src/features/auth/admin-overview-page.tsx`, `apps/admin/src/lib/query-client.ts`, `apps/admin/tests/query-client.test.ts` | `bun test`(admin), `typecheck`, `build`, Playwright redirect smoke | 完成 |
| Admin 性能收敛 | TASK-AUDIT-003 | `apps/admin/vite.config.ts` | 构建产物对比 | 完成 |
