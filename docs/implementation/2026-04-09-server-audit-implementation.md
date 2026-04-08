# 2026-04-09 Server 阶段实施记录

## 本轮改动

1. 修复飞行器投稿详情越权
   - 投稿详情查询增加作者/管理员校验
   - 新增 `GET /admin/aircraft-submissions/{id}`
   - 管理端详情改走 admin 路径

2. 修复 rating target 详情管理员视角
   - route 层传入完整 `currentUser`
   - 管理员可读取 `pending/rejected/hidden` 评分对象详情

3. 同步 OpenAPI 文档
   - 补齐 `/admin/aircraft-submissions/{id}` `GET`
   - 补齐 `/aircraft-submissions/{id}` `GET` 的 `403`

4. 补强测试与测试环境保护
   - 增加投稿详情权限校验用例
   - 增加管理员读取被拒绝 rating target 详情用例
   - 非 mock 短信 provider 在测试环境 fail fast，避免误触真实 SDK

## 本轮变更文件

- `apps/server/src/modules/aircraft-submissions/aircraft-submissions.route.ts`
- `apps/server/src/modules/aircraft-submissions/aircraft-submissions.service.ts`
- `apps/server/src/modules/rankings/rankings.route.ts`
- `apps/server/src/modules/auth/sms-provider.ts`
- `apps/server/src/openapi/document.ts`
- `apps/server/tests/content-closure.test.ts`
- `apps/server/tests/openapi.test.ts`
- `apps/server/tests/rankings.test.ts`
- `apps/admin/src/lib/api-client.ts`

## 验证记录

- `bun run --cwd apps/server test`：通过
- `bun run --cwd apps/server typecheck`：通过
- `bun run --cwd apps/server build`：通过
- `bunx eslint apps/server/src apps/server/tests`：通过
- `/docs` 与 `/openapi.json` 浏览器验证：通过
