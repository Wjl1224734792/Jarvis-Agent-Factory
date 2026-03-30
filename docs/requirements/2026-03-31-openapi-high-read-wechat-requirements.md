# OpenAPI 高频读扩面与微信预留需求说明
## 1. 需求摘要
- 当前 OpenAPI 已覆盖 health/auth 核心接口，以及 social、brand-applications、aircraft-submissions、content-categories、brands、categories、site-settings。
- 下一批优先扩面对象是 `admin-analytics`、`admin-reports`、`aircraft-models` 的高频读接口，以及 `auth/posts/rankings/reviews` 中仍未覆盖的重要细分路径。
- 数据库用户主表是 `packages/db/src/schema.ts` 里的 `usersTable`，已有 `phone`、`account`、`passwordHash`，`sessionsTable` 已存在。
- 需要为后期微信登录预留数据库字段，先做最小结构性扩展，不接入微信登录行为。
- 变更目标是最小改动，优先沿用现有文件和模式，只允许同文件内的小优化或注释，不做大重构。

## 2. 目标与成功标准
- OpenAPI / shared schema / http-client 与当前服务端路由保持一致，新增路径可被稳定消费。
- 高频读接口的返回结构能覆盖当前服务端真实输出，不额外扩张业务范围。
- `usersTable` 增加微信预留字段后，数据库迁移和类型定义保持一致。
- 不引入新的业务流程，不改动现有认证/会话行为。

## 3. 范围内
- `packages/schemas/src/*` 中与上述领域相关的契约文件。
- `packages/http-client/src/index.ts` 的导出与封装对齐。
- `packages/db/src/schema.ts` 以及对应迁移。
- `apps/server/src/modules/admin-analytics/*`
- `apps/server/src/modules/admin-reports/*`
- `apps/server/src/modules/aircraft-models/*`
- `apps/server/src/modules/auth/*`
- `apps/server/src/modules/posts/*`
- `apps/server/src/modules/rankings/*`
- `apps/server/src/modules/reviews/*`

## 4. 范围外
- 不做全站 API 重构。
- 不新增独立业务模块。
- 不引入新的存储引擎或认证体系。
- 不展开微信登录完整流程。

## 5. 模块映射
- 共享契约：`packages/schemas/src/index.ts`、`packages/http-client/src/index.ts`
- 数据层：`packages/db/src/schema.ts`
- 后端：`apps/server/src/modules/admin-analytics/*`、`apps/server/src/modules/admin-reports/*`、`apps/server/src/modules/aircraft-models/*`、`apps/server/src/modules/auth/*`、`apps/server/src/modules/posts/*`、`apps/server/src/modules/rankings/*`、`apps/server/src/modules/reviews/*`

## 6. 风险与开放问题
- 微信字段的具体列名、唯一约束、是否需要 nullable 还未最终确认，先按“预留字段”处理。
- `admin-analytics` 和 `admin-reports` 会跨多张表做聚合或列表化输出，容易和现有统计口径产生偏差。
- `auth/posts/rankings/reviews` 涉及权限、状态、viewer 视角和举报数据，改动面较大。
- `packages/schemas/src/index.ts` 与 `packages/http-client/src/index.ts` 属于高共享路径，后续任务必须单线程改。
