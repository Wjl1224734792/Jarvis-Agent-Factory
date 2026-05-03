# 2026-04-08 项目审查与维护实现记录

## 本轮已处理

1. 修复前后台登录重定向链路
   - 新增共享重定向辅助函数：`packages/shared/src/redirects.ts`
   - Web 端接入：`apps/web/src/features/auth/protected-route.tsx`、`apps/web/src/features/auth/auth-required-dialog.tsx`、`apps/web/src/features/auth/login-page.tsx`
   - Admin 端接入：`apps/admin/src/features/auth/admin-protected-route.tsx`、`apps/admin/src/features/auth/admin-login-page.tsx`
   - 目标：保留 `pathname + search + hash`，同时阻止跳回登录页或外部不安全地址。

2. 补充前端自动化测试
   - `apps/web/tests/auth-redirects.test.ts`
   - `apps/admin/tests/admin-auth-redirects.test.ts`
   - 覆盖场景：正确拼接登录跳转地址、拦截无效 / 自指向 redirect。

3. 优化后台路由加载策略
   - `apps/admin/src/app.tsx`
   - 将后台大部分页面切为 `React.lazy + Suspense`，降低主入口一次性静态装载压力。

4. 修复数据库约束与应用状态枚举漂移
   - `packages/db/src/schema.ts`
   - 新增迁移：
     - `packages/db/drizzle/0005_greedy_king_cobra.sql`
     - `packages/db/drizzle/0006_flimsy_praxagora.sql`
   - 修复点：
     - `files.status` 约束改为允许 `pending`
     - `rankings.status` / `rating_targets.status` 约束改为允许 `pending`、`rejected`

## 验证结果

- `bun test apps/web/tests/auth-redirects.test.ts` 通过
- `bun test apps/admin/tests/admin-auth-redirects.test.ts` 通过
- `bun test apps/server/tests/auth.test.ts` 通过
- `bun test apps/server/tests/rankings.test.ts` 通过
- `bun run check` 通过

## 备注

- `bun run db:push` 在第二次处理 `CHECK CONSTRAINT` 变更时触发了当前 `drizzle-kit@0.31.10` 的已知脚本错误，但迁移 SQL 已生成，`bun run check` 通过，当前代码、测试与构建状态一致。
