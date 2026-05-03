# 2026-04-22 API v1 与交付质量审查结论

## 本轮已完成
- 业务 API 统一迁移到 `v1` 前缀，核心路由常量集中收口在 `packages/shared/src/index.ts`。
- `apps/server`、`packages/http-client`、`apps/web`、`apps/admin` 的关键调用入口已对齐共享路由常量。
- OpenAPI 描述与断言已同步到版本化路径。
- 新增共享路由版本化测试与 server 版本化行为测试。
- `admin` 总览页把“最近登录设备 / IP”查询改为折叠面板按需触发，减少默认首屏的无效请求。

## 本轮优化方案
### 1. 架构
- 以共享路由常量驱动版本化，避免在 server / client / tests 中散落字符串前缀。
- 保留 `/health`、`/docs`、`/openapi.json` 根路径稳定，避免影响探针与开发文档入口。

### 2. 性能
- 先落地低风险高确定性的请求优化：默认不拉取折叠面板数据。
- 对构建结果继续保留性能审计：`web` 的 `editor-vendor`、`admin` 的 `charts-grammar-vendor` 仍然偏大，属于下一批应继续拆分的目标。

### 3. 测试
- 共享层：新增 `packages/shared/tests/api-routes.test.ts`
- server 层：新增 `apps/server/tests/api-versioning.test.ts`
- 受影响断言：更新 `packages/http-client/tests/*`、`apps/server/tests/openapi.test.ts` 以及若干 server 路径测试
- 根 `test:unit` 已补入 `packages/shared/tests/**/*.test.ts`

## 验证结果
- 通过：
  - `bun run lint`
  - `bun run typecheck`
  - `bun run test:unit`
  - `bun x vitest run --root . --config vitest.config.ts apps/server/tests/api-versioning.test.ts apps/server/tests/openapi.test.ts apps/server/tests/admin-logs.test.ts`
  - `bun run build`
- 未通过：
  - `bun run test`

## 当前剩余风险
- 完整 server 测试仍有 13 个失败，集中在：
  - `apps/server/tests/posts.test.ts`
  - `apps/server/tests/rankings.test.ts`
  - `apps/server/tests/models.test.ts`
  - `apps/server/tests/content-closure.test.ts`
- 这些失败以 5 秒超时和链式查询失败为主，已在 `/api/v1` 路径下复现，说明版本化改造没有阻断测试入口，但仓库本身仍有待修复的后端稳定性问题。
- `apps/admin` 与 `apps/web` 构建仍存在大 chunk 告警，本轮只处理了首屏请求层面的低风险优化，没有进一步拆包。

## 下一批建议
1. 优先处理 server 集成测试超时，先把 `models / rankings / posts / content-closure` 四组链路恢复到稳定绿灯。
2. 对 `admin` 图表与 `web` 编辑器包继续做 bundle 拆分，避免构建体积持续失控。
3. 在 `apps/server` 增加统一的 API 版本迁移约束测试，确保未来新增接口不会绕过共享前缀。
