# Admin 用户管理执行计划

## Gate B / C

- 任务具备 ID、类型、优先级、完成标准、DDD 与测试策略。
- 共享区域唯一 owner：主会话负责 `packages/*`、DB、server auth；admin UI 可在共享契约落地后独立实现。
- 实现前必须先写红灯测试；若发现需要修改 env、CORS、OpenAPI 默认策略或管理员角色模型，先写 plan patch。

## Execution Packet 1：共享契约与 DB

- owner：主会话
- 目标：新增 admin users schema、API 路由、http-client 方法，补 DB 用户状态字段和迁移。
- 允许路径：`packages/schemas/**`、`packages/shared/**`、`packages/http-client/**`、`packages/db/**`
- 禁止路径：`apps/**` 业务实现
- 验收：schema/shared/http-client 测试红转绿，DB schema 与迁移一致。

## Execution Packet 2：Server API 与封禁链路

- owner：主会话
- 目标：实现 admin users list/detail/ban/unban，封禁用户登录、刷新、当前用户和受保护接口失效。
- 允许路径：`apps/server/src/modules/users/**`、`apps/server/src/modules/auth/**`、`apps/server/src/app.ts`、`apps/server/tests/**`
- 禁止路径：CORS/OpenAPI 默认策略、上传策略、env 文档
- 验收：admin-users 与 auth 相关测试通过，封禁后 session 被撤销。

## Execution Packet 3：Admin 页面

- owner：主会话
- 目标：新增 `/admin/management/users` 页面，完成筛选、搜索、详情、封禁/解封。
- 允许路径：`apps/admin/src/features/users/**`、`apps/admin/src/app.tsx`、`apps/admin/src/lib/admin-routes.ts`、`apps/admin/src/features/auth/admin-navigation.ts`、`apps/admin/tests/**`
- 禁止路径：页面内直接 fetch 或重复定义接口结构
- 验收：admin helper/navigation 测试通过，页面只通过 `apiClient` 调用共享 client。

## Execution Packet 4：验证与后续优化切入

- owner：主会话 + review_qa
- 目标：运行针对性测试与根级质量门，随后进入 server 审查优化批次。
- 命令：`bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`
- 若质量门仍有既有红灯，只记录并进入对应修复批次，不宣称全绿。
