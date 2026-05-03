# 注册密码后置与手机号换绑前置密码交付审查

## REQ 追踪矩阵

| 需求 | 实现 | 验证 |
|---|---|---|
| REQ-001 注册不设置密码 | `packages/schemas/src/auth.ts`、`apps/server/src/modules/auth/auth.service.ts`、`apps/server/src/modules/auth/auth.repo.ts`、`apps/web/src/features/auth/login-page.tsx` | `packages/schemas/tests/auth.test.ts`、`apps/server/tests/auth.test.ts` |
| REQ-002 设置页支持首次设置与修改密码 | `packages/schemas/src/auth.ts`、`apps/server/src/modules/auth/auth.service.ts`、`apps/server/src/modules/auth/auth.route.ts`、`apps/web/src/routes/settings-page.tsx` | `apps/server/tests/auth.test.ts`、`packages/http-client/tests/admin-auth.test.ts` |
| REQ-003 手机号换绑必须先设置密码 | `packages/schemas/src/social.ts`、`apps/server/src/modules/social/social.service.ts`、`apps/server/src/modules/social/social.route.ts`、`apps/web/src/routes/settings-page.tsx` | `apps/server/tests/auth.test.ts`、`apps/server/tests/openapi.test.ts` |
| REQ-004 资料更新不承载手机号换绑 | `packages/schemas/src/social.ts`、`apps/server/src/modules/social/social.service.ts`、`apps/web/src/features/auth/profile-settings-state.ts` | `apps/server/tests/auth.test.ts`、`apps/web/tests/profile-settings-state.test.ts` |

## 验证证据

- `bun run typecheck`
- `bun test packages/schemas/tests/auth.test.ts packages/http-client/tests/admin-auth.test.ts apps/web/tests/profile-settings-state.test.ts`
- `bunx vitest run --root . --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/auth.test.ts apps/server/tests/openapi.test.ts --reporter verbose`
- `bun run lint`
- `bun run test`
- `bun run build`

## 当前结论

通过。关键链路已完成，暂无已知阻塞问题。

## 残余注意事项

- `bun run build` 仍有既有 Vite 大 chunk warning，不影响本次交付结果。
- 本轮未改数据库结构，不需要新增迁移。

## Review Follow-up

- Fixed P2: `PASSWORD_REQUIRED` now maps to an actionable http-client message.
- Added coverage for phone rebind confirm blocking when no password is set.
- Added coverage that profile update payloads carrying `phone` do not rebind the account.
## Follow-up Review Matrix

| Requirement | Implementation | Verification |
|---|---|---|
| REQ-005 password setup/change requires SMS | `packages/schemas/src/auth.ts`, `apps/server/src/modules/auth/auth.service.ts`, `apps/web/src/routes/settings-page.tsx` | `packages/schemas/tests/auth.test.ts`, `apps/server/tests/auth.test.ts` |
| REQ-006 password SMS requires captcha | `apps/web/src/routes/settings-page.tsx`, existing `authService.requestSmsCode` | `apps/server/tests/auth.test.ts` |
| REQ-007 login/register behavior preserved | existing auth login/register flow | `apps/server/tests/auth.test.ts` |

## Post-review Fix

- Fixed P1: `changeWebPassword` now verifies the current bound-phone SMS request before checking `currentPassword`, preventing password probing with an invalid SMS proof.
- Added regression coverage for invalid SMS proof taking precedence over current password validation, and for rejecting SMS codes issued to another phone.
