# 2026-04-09 Server 阶段审查报告

## 审查结论

- 结论：通过
- 说明：本阶段已修复 admin 审查中暴露出的关键后端权限问题，并同步更新 OpenAPI 文档与验证链，可进入最后的根脚本与全仓收尾阶段。

## 主要发现

### [已修复] 飞行器投稿详情存在真实越权面

- 风险：原 `/aircraft-submissions/{id}` 只要求“已登录”，未校验作者归属或管理员身份，任何登录用户拿到 id 都能读到完整投稿详情。
- 处理：
  - `aircraftSubmissionsService.getSubmission` 增加“作者或管理员可见”校验
  - `/aircraft-submissions/{id}` 未授权时返回 `403`
  - 增加 `GET /admin/aircraft-submissions/{id}` 供后台详情读取
  - `apps/admin` 改为走 admin detail 接口

### [已修复] 评分对象详情接口没有把管理员视角传入 service

- 风险：后台查看 `pending/rejected/hidden` 的 rating target 详情时，路由只传了 `currentUser.id`，service 把它当普通用户处理，导致管理员审核弹窗不可靠。
- 处理：`rankings.route.ts` 改为向 `getRatingTargetDetail` 传完整 `currentUser`，管理员可正确查看非公开状态条目。

### [已修复] OpenAPI 文档未覆盖新的后台投稿详情能力，也未声明投稿详情的 403

- 风险：接口能力与文档脱节，后台客户端和联调时容易误判权限行为。
- 处理：
  - `/aircraft-submissions/{id}` `GET` 增加 `403`
  - 新增 `/admin/aircraft-submissions/{id}` `GET` 文档
  - 通过 `/docs` 与 `/openapi.json` 实际访问校验

### [已处理] 非 mock 短信 provider 在测试环境下改为 fail fast

- 目的：避免自动化测试环境误触发真实短信 SDK 请求。
- 说明：该调整用于测试环境保护，不改变 mock 模式和正常运行环境下的既有分支。

## 本轮未处理但建议继续跟进

### [建议后续处理] 后台评分对象审核仍依赖客户端 N+1 聚合

- 现状：`apps/admin/src/lib/api-client.ts` 仍通过榜单列表 + 多次详情请求聚合 rating targets。
- 建议：后续补服务端聚合/分页接口，把审核列表改成单接口消费。

### [建议后续处理] 举报页仍存在多域全量并发查询

- 现状：后台举报页通过多条查询在前端拼装结果，对大数据量场景不友好。
- 建议：后续补按域聚合或分页的管理端接口，减少前端全量拉取。

### [建议后续处理] admin/web 会话模型与文案仍不完全一致

- 现状：后台文案强调“独立管理员会话”，但 cookie 体系仍共用一套名称。
- 建议：若产品确实要求隔离，应后续拆分 cookie / refresh 语义；若不拆，需统一文案并补回归用例。

## 验证结果

- `bun run --cwd apps/server test`：通过
- `bun run --cwd apps/server typecheck`：通过
- `bun run --cwd apps/server build`：通过
- `bunx eslint apps/server/src apps/server/tests`：通过
- Playwright / HTTP 验证：
  - `/docs` 可访问，Swagger UI 渲染正常
  - `/openapi.json` 返回 `200`
  - 文档中已包含 `/admin/aircraft-submissions/{id}`
  - `/aircraft-submissions/{id}` 的 `GET` 响应文档已包含 `403`

## 追踪矩阵

| requirement | task | changed_files | tests / verification | result |
|---|---|---|---|---|
| Server 权限与文档审查修复 | TASK-AUDIT-004 | `apps/server/src/modules/aircraft-submissions/*`, `apps/server/src/modules/rankings/rankings.route.ts`, `apps/server/src/openapi/document.ts`, `apps/server/tests/*`, `apps/admin/src/lib/api-client.ts` | `bun run --cwd apps/server test`, `typecheck`, `build`, Playwright docs smoke | 完成 |
