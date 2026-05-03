# 认证密码与内容来源声明交付审查

## 结论

通过。实现覆盖 `REQ-001` 至 `REQ-005`，共享契约、DB、Server、Web、Admin 和验证证据均已落地。

## REQ 追踪矩阵

| 需求 | 任务 | 实现位置 | 验证 |
|---|---|---|---|
| REQ-001 注册设置密码 | TASK-001、TASK-004、TASK-006 | `packages/schemas/src/auth.ts`、`apps/server/src/modules/auth/*`、`apps/web/src/features/auth/login-page.tsx` | `packages/schemas/tests/auth.test.ts`、`apps/server/tests/auth.test.ts`、`bun run typecheck` |
| REQ-002 Web 短信/密码登录 | TASK-001、TASK-004、TASK-006 | `packages/schemas/src/auth.ts`、`packages/http-client/src/index.ts`、`apps/server/src/modules/auth/*`、`apps/web/src/features/auth/login-page.tsx` | `apps/server/tests/auth.test.ts`、`packages/http-client/tests/admin-auth.test.ts` |
| REQ-003 密码登录图形验证码 | TASK-001、TASK-004、TASK-008 | `apps/server/src/modules/auth/auth.service.ts`、`apps/server/src/modules/auth/auth.route.ts`、`apps/admin/src/features/auth/admin-login-page.tsx` | `apps/server/tests/auth.test.ts`、`packages/schemas/tests/auth.test.ts` |
| REQ-004 修改密码 | TASK-001、TASK-004、TASK-006、TASK-008 | `packages/shared/src/index.ts`、`packages/http-client/src/index.ts`、`apps/server/src/modules/auth/*`、`apps/web/src/routes/settings-page.tsx`、`apps/admin/src/features/auth/admin-password-page.tsx` | `apps/server/tests/auth.test.ts`、`apps/server/tests/openapi.test.ts`、`bun run typecheck` |
| REQ-005 文章和动态来源声明 | TASK-002、TASK-003、TASK-005、TASK-007、TASK-008 | `packages/db/src/schema.ts`、`packages/db/drizzle/0002_melted_maelstrom.sql`、`packages/schemas/src/posts.ts`、`apps/server/src/modules/posts/*`、`apps/web/src/routes/*`、`apps/admin/src/features/posts/*` | `packages/schemas/tests/posts.test.ts`、`apps/server/tests/posts.test.ts`、`packages/http-client/tests/posts.test.ts` |

## 审查修复

- 来源链接限制为 `http` / `https`，并在 server 序列化层对历史脏数据兜底为 `null`。
- `/auth/web/password/change` 已补入 OpenAPI path 和 `UserPasswordChangeRequest` component。
- Web 密码登录新增手机号 + 来源 IP 维度失败限流，成功登录后清理失败计数。
- DB migration 已生成：`packages/db/drizzle/0002_melted_maelstrom.sql`、`packages/db/drizzle/meta/0002_snapshot.json`。

## 验证证据

- `bun run db:generate`
- `bun run db:migrate`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bunx vitest run --root . --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/auth.test.ts apps/server/tests/openapi.test.ts --reporter verbose`
- `bunx vitest run --root . --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/posts.test.ts --reporter verbose`
- `bun run build`

## 残余风险

- `packages/db/drizzle/0002_melted_maelstrom.sql` 和 `packages/db/drizzle/meta/0002_snapshot.json` 当前为新增文件，提交时必须纳入版本控制。
- `apps/server/tests/posts.test.ts` 会输出一个预期内的 ZodError 日志，对应“举报证据图片超过 3 张应被拒绝”的负向用例。
