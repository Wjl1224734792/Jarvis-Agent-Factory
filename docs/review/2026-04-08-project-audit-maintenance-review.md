# 2026-04-08 项目审查结论

## 结论

- 审查结论：有条件通过
- 当前仓库已经恢复到可验证、可构建、可测试状态，`bun run check` 通过。
- 本轮已修复 3 类高置信度问题：登录重定向逻辑错误、数据库约束与应用状态不一致、后台路由一次性静态装载过重。

## 已修复问题

1. 登录前拦截会丢失原始 `search/hash`，且缺少对不安全 redirect 的兜底。
2. `files` / `rankings` / `rating_targets` 的数据库 `CHECK CONSTRAINT` 与应用层状态枚举不一致，导致服务端接口测试失败。
3. `apps/admin` 主路由对大量页面进行静态导入，导致后台入口装载压力偏大。

## 仍建议后续优化

### [建议修改] OpenAPI 文档仍然是超大单文件，变更漂移风险高
- 文件：`apps/server/src/openapi/document.ts`
- 现状：`componentSchemas`、`paths`、文档元信息全部堆在一个近 3000 行文件里。
- 风险：后续新增接口时更容易出现 schema、描述、路由映射不同步；审查和冲突解决成本高。
- 建议：按标签或模块拆成多文件，再在单一入口汇总。

### [建议修改] HTTP Client 已成为跨领域巨型入口，维护边界模糊
- 文件：`packages/http-client/src/index.ts`
- 现状：一个文件同时承载鉴权、帖子、榜单、上传、后台管理等多个域能力。
- 风险：新增接口时容易扩大冲突面，也不利于按领域做测试与按需演进。
- 建议：按 `auth / posts / rankings / uploads / admin` 拆分，再导出统一 `createApiClient` 组合层。

### [建议修改] 后台总览页图表依赖仍然过重，仍是当前最大异步包
- 文件：`apps/admin/src/features/auth/admin-overview-page.tsx`
- 现状：`@ant-design/plots` 集中挂在总览页，构建后 `admin-overview-page` 仍是 1.47 MB chunk。
- 风险：后台首屏虽然已从主入口剥离，但总览页首次进入仍有明显加载压力。
- 建议：继续拆图表组件、延迟加载低频图表，或把图表区域按卡片级别做更细粒度懒加载。

### [建议修改] Web 主包仍偏大，后续可以继续扩大懒加载范围
- 文件：`apps/web/src/app.tsx`
- 现状：`HomePage`、`RatingTargetDetailPage`、`SettingsPage` 等多个较大页面仍在主路由静态导入，`apps/web` 构建主 chunk 仍约 598 KB。
- 风险：首页与常用页面的首屏下载压力仍偏高。
- 建议：对非首屏、低频或需登录页面继续做路由级懒加载，并按业务域细化 chunk。

## 追踪矩阵

| requirement | task | changed_files | tests / verification | result |
|---|---|---|---|---|
| 项目级审查与问题识别 | AUDIT-001 | `docs/review/2026-04-08-project-audit-maintenance-review.md` | 静态走查 + 构建输出 + 测试输出 | 完成 |
| 修复高置信度低风险问题 | AUDIT-002 | `packages/shared/src/redirects.ts`, `apps/web/src/features/auth/*`, `apps/admin/src/features/auth/*`, `apps/admin/src/app.tsx`, `packages/db/src/schema.ts` | `bun run check` | 完成 |
| 补充前端自动化测试 | AUDIT-003 | `apps/web/tests/auth-redirects.test.ts`, `apps/admin/tests/admin-auth-redirects.test.ts` | 定向 Vitest + 全量 `bun run test` | 完成 |
| 全量验证 | AUDIT-004 | 无新增代码 | `bun run check` | 完成 |
