# Plan Patch: Admin Rating Target Test Fixture

## 变更类型

plan_patch

## 变更原因

`TASK-007` 将评分对象公开契约补齐为必含 `createdAt` 后，根级 `bun run typecheck` 暴露 `apps/admin/tests/rankings-admin-helpers.test.ts` 中的评分对象测试 fixture 缺少该字段。该失败来自共享 schema 的必填字段变化，不是后台生产代码逻辑变更。

## 当前阻塞点

- 被阻塞验证：根级 `bun run typecheck`。
- 阻塞文件：`apps/admin/tests/rankings-admin-helpers.test.ts`。

## 影响范围

- 影响任务：`TASK-006` 收尾验证。
- 影响路径：仅 `apps/admin/tests/rankings-admin-helpers.test.ts`。

## 建议调整

- 允许 orchestrator 在后台测试 fixture 中补齐 `createdAt` 字段。
- 不修改 `apps/admin/src/**`、后台业务逻辑、路由、请求适配、权限或 UI。

## 风险

- 风险低。该变更只让测试 fixture 与共享公开契约一致。

## 推荐决策

批准，仅限测试 fixture。
