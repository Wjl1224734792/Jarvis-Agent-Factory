# OpenAPI 高频读扩面与微信预留任务拆分
## 1. 需求文档路径
- `docs/requirements/2026-03-31-openapi-high-read-wechat-requirements.md`

## 2. 任务概览
- 本轮建议拆成 7 个任务：3 个共享契约任务、3 个后端对齐任务、1 个数据库预留任务。
- 共享契约任务必须先收口，原因是 `packages/schemas/src/index.ts` 和 `packages/http-client/src/index.ts` 属于高共享路径。
- 数据库预留任务和 API 扩面任务关注点不同，可以单独排期，但不要和任何触碰 `packages/db/src/schema.ts` 的任务并行抢改。

## 3. 任务分解列表
| 任务 ID | 名称 | 类型 | 优先级 | test_strategy | 文件范围 | 依赖 | 完成标准 |
|---|---|---|---|---|---|---|---|
| SH-1 | 补 `admin-analytics` / `admin-reports` 共享契约 | 共享契约 | P0 | `tdd` | `packages/schemas/src/admin-analytics.ts`（如需新建）、`packages/schemas/src/reports.ts`、`packages/schemas/src/index.ts`、`packages/http-client/src/index.ts` | 依赖当前 `apps/server/src/modules/admin-analytics/*` 与 `apps/server/src/modules/admin-reports/*` 的真实返回形状作为对齐依据 | 新增/补齐 admin 统计与报表读接口的 schema，导出链路完整，http-client 可直接消费，且不改变现有路由语义 |
| BE-1 | 对齐 `admin-analytics` / `admin-reports` 后端读模型 | 后端 | P0 | `tdd` | `apps/server/src/modules/admin-analytics/admin-analytics.route.ts`、`admin-analytics.service.ts`、`apps/server/src/modules/admin-reports/admin-reports.route.ts`、`admin-reports.service.ts` | 依赖 SH-1 的契约形状；若返回体需微调，优先小范围贴合既有 service 输出 | 路由返回值与共享 schema 一致，聚合字段、举报记录、记者信息等读模型完整，且无额外业务扩展 |
| SH-2 | 补 `aircraft-models` 高频读接口共享契约 | 共享契约 | P0 | `tdd` | `packages/schemas/src/models.ts`、`packages/schemas/src/index.ts`、`packages/http-client/src/index.ts` | 依赖当前 `apps/server/src/modules/aircraft-models/*` 的 detail/list/comment/report 输出 | 模型列表、详情、评论、举报、管理端评论列表等高频读路径的 schema 补齐并导出完整 |
| BE-2 | 对齐 `aircraft-models` 后端高频读接口 | 后端 | P0 | `tdd` | `apps/server/src/modules/aircraft-models/aircraft-models.route.ts`、`aircraft-models.service.ts`、`aircraft-models.repo.ts` | 依赖 SH-2；若现有 service 输出和 schema 有轻微差异，优先按最小变更收口 | 模型高频读接口返回体与契约一致，viewer / report / comment 相关字段稳定，不引入新状态机 |
| SH-3 | 补 `auth/posts/rankings/reviews` 剩余细分路径共享契约 | 共享契约 | P0 | `tdd` | `packages/schemas/src/auth.ts`、`posts.ts`、`rankings.ts`、`reviews.ts`、`packages/schemas/src/index.ts`、`packages/http-client/src/index.ts` | 依赖当前 `apps/server/src/modules/auth/*`、`posts/*`、`rankings/*`、`reviews/*` 的现状；同一批次内不要和其他契约任务并行改 `index.ts` | 补齐未覆盖的重要请求/响应 schema，尤其是 auth 会话、帖子/榜单/评论/举报/细分详情路径的缺口 |
| BE-3 | 对齐 `auth/posts/rankings/reviews` 剩余后端路径 | 后端 | P0 | `tdd` | `apps/server/src/modules/auth/*`、`apps/server/src/modules/posts/*`、`apps/server/src/modules/rankings/*`、`apps/server/src/modules/reviews/*` | 依赖 SH-3；涉及权限、viewer 状态、举报、评论层级时按现有规则最小修补 | 相关路由输出与契约一致，核心状态、权限与举报语义不回退 |
| DB-1 | 为 `usersTable` 预留微信字段 | 数据库 | P0 | `tdd` | `packages/db/src/schema.ts`、`packages/db/src/migrate.ts` / 对应迁移文件、必要时的数据库种子或类型同步文件 | 无直接业务依赖；若后续 auth 登录流程要消费这些列，再由后续任务对接 | `usersTable` 增加微信预留列并完成迁移/类型同步，现有 phone/account/passwordHash 与 sessions 行为保持不变 |

## 4. DDD 分类
### 需要 DDD
- SH-1
- BE-1
- SH-2
- BE-2
- SH-3
- BE-3

### 不需要 DDD
- DB-1

## 5. TDD 与直接开发分类
### 必须 TDD
- SH-1
- BE-1
- SH-2
- BE-2
- SH-3
- BE-3
- DB-1

### 可以直接开发
- 无。这个批次都碰共享契约、读模型或数据库结构，默认按 `tdd` 收口更稳。

## 6. 风险任务
- DB-1：微信字段列名、唯一约束和 nullable 规则还未最终锁定，最容易出现需求漂移。
- SH-1 / BE-1：admin analytics 和 admin reports 横跨用户、会话、内容、审核多表聚合，口径容易偏。
- SH-2 / BE-2：aircraft-models 高频读接口带 viewer / report / comment 状态，属于跨实体读模型。
- SH-3 / BE-3：auth/posts/rankings/reviews 是当前最宽的共享路径，且会反复碰 `packages/schemas/src/index.ts` 和 `packages/http-client/src/index.ts`。

## 7. 文件所有权和共享路径提醒
- 以下路径必须单线程收口，避免多个任务同时改同一共享合约：
- `packages/schemas/src/index.ts`
- `packages/http-client/src/index.ts`
- `packages/db/src/schema.ts`
- `packages/shared/src/index.ts`
- `apps/server/src/app.ts`
- `packages/schemas/src/auth.ts`
- `packages/schemas/src/posts.ts`
- `packages/schemas/src/rankings.ts`
- `packages/schemas/src/reviews.ts`
- `packages/schemas/src/models.ts`
- `packages/schemas/src/reports.ts`
- 这批任务里，优先保持现有文件内小改动，不要拆出新抽象或重排目录。

## 8. 推荐交付顺序
1. 先做 `DB-1`，把微信预留列一次收口。
2. 再做 `SH-1`，随后做 `BE-1`。
3. 再做 `SH-2`，随后做 `BE-2`。
4. 最后做 `SH-3`，随后做 `BE-3`。

## 9. 推荐的下一步
- 把这份任务文档交给 planner。
- 让 planner 为每个 `tdd` 任务额外标明 Red / Green 的测试命令。
- 如果后续要再细分，只在 `BE-3` 内部继续拆 auth、posts、rankings、reviews，不要先动共享索引文件的并行策略。
