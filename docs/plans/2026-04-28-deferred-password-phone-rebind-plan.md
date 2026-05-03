# 注册密码后置与手机号换绑前置密码执行计划

## 执行批次

### Batch 1：共享契约与服务端

任务：`TASK-001`、`TASK-002`、`TASK-003`

修改范围：
- `packages/schemas/src/auth.ts`
- `packages/schemas/src/social.ts`
- `packages/http-client/src/index.ts`
- `apps/server/src/modules/auth/*`
- `apps/server/src/modules/social/*`
- `apps/server/src/openapi/*`
- 对应测试文件

共享区域责任方：主会话统一修改，避免 schema、service、测试之间的契约漂移。

### Batch 2：Web 设置页与注册页

任务：`TASK-004`

修改范围：
- `apps/web/src/features/auth/login-page.tsx`
- `apps/web/src/features/auth/profile-settings-state.ts`
- `apps/web/src/routes/settings-page.tsx`
- `apps/web/tests/profile-settings-state.test.ts`

### Batch 3：验证与审查

任务：`TASK-005`

验证命令：
- `bun run typecheck`
- `bun test packages/schemas/tests/auth.test.ts packages/http-client/tests/admin-auth.test.ts apps/web/tests/profile-settings-state.test.ts`
- `bunx vitest run --root . --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/auth.test.ts apps/server/tests/openapi.test.ts --reporter verbose`
- `bun run lint`
- `bun run test`
- `bun run build`
## Follow-up Plan

1. Contract: require `smsRequestId` and `smsCode` on user password-change requests.
2. Backend: validate SMS against the current bound phone before checking the current password or writing the new password.
3. Web: add a captcha-gated SMS request flow in settings and submit the returned request id with the password form.
4. Verification: rerun schema/http-client/server auth tests, then full lint/typecheck/test/build.
