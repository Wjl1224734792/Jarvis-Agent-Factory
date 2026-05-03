# 2026-04-22 API v1 与交付质量审查计划

## 执行顺序
1. 运行 `lint`、`typecheck`、`test`、`build` 获取质量基线。
2. 在 `packages/shared` 定义统一的 API 版本前缀与路由构造方式。
3. 对齐 `apps/server`、`packages/http-client`、`apps/web`、`apps/admin` 的关键调用入口。
4. 更新与新增测试，确保版本化改造有直接证据。
5. 在 `apps/admin` 落地一项低风险性能优化：折叠面板内容延迟请求。
6. 再次执行验证，并沉淀 review 文档。

## 共享改动归属
- `packages/shared/src/index.ts`
  - 统一 API 版本常量与路由前缀逻辑
- `apps/server/tests/**`
  - 版本化行为与 OpenAPI 断言
- `packages/http-client/tests/**`
  - 客户端请求 URL 断言
- `apps/web/src/lib/api-client.ts`
  - web 端 refresh 路径对齐共享常量
- `apps/admin/src/lib/api-client.ts`
  - admin 端会话查询路径对齐共享常量
- `apps/admin/src/features/auth/admin-overview-page.tsx`
  - 最近登录记录按需加载

## 风险控制
- 不对既有 server 大型集成测试链路做顺手修复，避免在版本化改造中掺入无关问题。
- 保持 health 与 OpenAPI docs 根路径稳定，避免影响开发基础设施与现有文档入口。
- 若完整 `test` 仍失败，以“与本轮改造是否直接相关”区分归因。
