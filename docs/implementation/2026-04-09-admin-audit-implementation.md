# 2026-04-09 Admin 阶段实施记录

## 本轮改动

1. 修正后台会话链路
   - 去掉 `apps/admin/src/lib/api-client.ts` 中错误的 `/auth/web/refresh` 尝试
   - 保持 admin 401 直接按后台鉴权失效处理

2. 收口后台缓存
   - `AdminShell` 在鉴权失效事件和主动退出登录时统一 `queryClient.clear()`

3. 修复 overview 待处理数映射
   - 文章、品牌申请、榜单、评分对象卡片统一改为读取 `analytics.moderation.*.pending`

4. 优化后台请求策略
   - `QueryClient` 增加 `staleTime`、关闭 `refetchOnWindowFocus`
   - 对明显非重试型错误收敛重试策略

5. 优化后台分包
   - `@tiptap/*` 拆入 `editor-vendor`
   - 公共 `vendor` 体积从约 `306.75 kB` 降到 `178.01 kB`

## 本轮变更文件

- `apps/admin/src/features/auth/admin-overview-page.tsx`
- `apps/admin/src/features/auth/admin-shell.tsx`
- `apps/admin/src/lib/api-client.ts`
- `apps/admin/src/lib/query-client.ts`
- `apps/admin/tests/query-client.test.ts`
- `apps/admin/vite.config.ts`

## 验证记录

- `bun test`(apps/admin/tests 全量)：通过
- `bun run --cwd apps/admin typecheck`：通过
- `bun run --cwd apps/admin build`：通过
- `bunx eslint apps/admin/src apps/admin/tests`：通过
- Playwright 自动化验证：
  - `/admin` 未登录重定向到后台登录页：通过
  - 登录表单渲染：通过
  - 默认演示账号登录：未确认
