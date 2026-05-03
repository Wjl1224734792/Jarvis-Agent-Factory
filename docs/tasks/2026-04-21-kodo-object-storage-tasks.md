# 七牛云 Kodo 对象存储接入任务拆解

## 1. 需求文档路径

- [docs/requirements/2026-04-21-kodo-object-storage-requirements.md](/E:/CodeStore/feijia/docs/requirements/2026-04-21-kodo-object-storage-requirements.md)

## 2. 任务概览

- 仓库已存在统一上传模块、`files` 表、共享上传契约，以及 `kodo / qiniu` 的 provider 配置入口；这次工作不是从零设计上传系统，而是审查现有架构是否真正满足 Kodo 落地。
- 当前高风险区不在前端页面，而在共享契约、服务端 provider 实现、`STORAGE_*` 环境变量语义、运行时 seed 与读取 URL 策略。
- 推荐按“先审查定边界，再冻结契约，再做服务端适配，再落配置与文档，最后统一验证”的顺序推进，不要一开始并发改共享路径。

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | 推荐责任方 | 依赖 | 完成标准 |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-1 | 仓库审查与 Kodo 差距基线 | 审查 | P0 | 单一审查方 | 无 | 产出一份现状清单，覆盖 `apps/server/src/modules/uploads/*`、`apps/server/src/modules/posts/storage-provider.ts`、`packages/schemas/src/files.ts`、`packages/http-client/src/index.ts`、`packages/db/src/runtime-seed.ts`、`.env.example`、`README.md`、现有测试；明确哪些能力已存在，哪些只停留在枚举或示例层，哪些点对 Kodo 仍未验证。 |
| CTR-1 | 上传接口与共享契约评估 | DDD | P0 | 共享契约责任方 | AUD-1 | 确认 `packages/schemas`、`packages/shared`、`packages/http-client` 与 `apps/server` 的上传契约是否保持不变；若需变更，先形成明确的契约变更清单与影响面；若不需变更，也要产出“契约冻结”结论，明确前端页面无需单独改造的边界。 |
| BE-1 | 服务端 Kodo provider 与上传链路适配 | DDD | P0 | 服务端上传责任方 | CTR-1 | `apps/server` 侧完成 Kodo 接入所需实现与修正，覆盖 provider 配置解析、签名上传、对象存在性校验、读取 URL 生成、公共/私有访问策略、错误分支与回退行为；不破坏现有 MinIO 默认开发链路。 |
| CFG-1 | 配置、env 与运行时数据对齐 | 配置 | P0 | 配置责任方 | CTR-1, BE-1 | `.env.example`、`README.md`、`packages/db/src/runtime-seed.ts` 及相关 seed 说明与 Kodo 接入后的真实行为一致；明确 `STORAGE_PROVIDER`、`STORAGE_ENDPOINT`、`STORAGE_REGION`、`STORAGE_FORCE_PATH_STYLE`、`STORAGE_PUBLIC_BASE_URL`、`STORAGE_AUTO_CREATE_BUCKET` 的适用场景与默认策略。 |
| DOC-1 | 接入、运维与排障文档补齐 | 文档 | P1 | 文档责任方 | BE-1, CFG-1 | 文档覆盖本地 MinIO 与云上 Kodo 的区别、Kodo 必填配置、公开域名或 CDN 配置、私有文件读取策略、常见错误排查与回滚边界；文档内容与最终实现一致，不保留过时说明。 |
| QA-1 | 测试补齐与验证闭环 | 验证 | P0 | 测试与验证责任方 | CTR-1, BE-1, CFG-1, DOC-1 | 新增或补齐与 Kodo 相关的 schema、provider、上传链路、env 行为测试；形成真实环境或准真实环境验证清单；执行根质量门禁与针对性测试后，能证明 Kodo 接入不会回归现有上传功能。 |

## 4. 依赖关系

- `AUD-1 -> CTR-1`：先明确现状，再冻结边界。
- `CTR-1 -> BE-1`：服务端实现必须以共享契约结论为前提。
- `BE-1 -> CFG-1`：配置与文档必须对齐最终实现，而不是对齐假设。
- `BE-1 + CFG-1 -> DOC-1`：文档只能在实现和配置定稿后写。
- `CTR-1 + BE-1 + CFG-1 + DOC-1 -> QA-1`：验证任务要对最终契约、实现与文档做闭环检查。

并行建议：

- 只允许 `AUD-1` 独立先行。
- `CTR-1` 完成前，不要并发修改 `packages/schemas`、`packages/shared`、`packages/http-client`。
- `BE-1` 与 `CFG-1` 只能在共享契约冻结后串行或弱并行推进，且不得同时改同一组共享文件。

## 5. DDD 分类

### 需要 DDD

- `CTR-1` 上传接口与共享契约评估
- `BE-1` 服务端 Kodo provider 与上传链路适配

原因：

- 上传链路跨越共享 schema、路由常量、HTTP client、服务端 provider 和多个业务对象的文件引用。
- 上传状态存在 `pending -> uploaded / failed / deleted` 的状态转换与一致性要求。
- 读取 URL、公私可见性、对象校验与错误语义都属于高风险边界，不适合直接散改。

### 不需要 DDD

- `AUD-1`
- `CFG-1`
- `DOC-1`
- `QA-1`

说明：

- 这些任务偏向审查、对齐、文档和验证，不承载新的核心领域建模。

## 6. TDD 与直接开发分类

### 必须 TDD

- `CTR-1`
- `BE-1`

原因：

- 共享契约与服务端上传链路属于高风险接口契约。
- 涉及 provider 兼容性、公私访问策略、状态机转换与错误回退。
- 一旦出错，会同时影响头像、帖子、投稿、榜单、举报图片等多个业务入口。

### 先实现再验证即可

- `AUD-1`
- `CFG-1`
- `DOC-1`

说明：

- 这些任务仍需有验收证据，但不要求严格 Red -> Green -> Refactor。

### 以验证为主

- `QA-1`

说明：

- 该任务本身就是测试补齐与执行，不单独归类为直接开发。

## 7. 风险任务

- `CTR-1`：如果误判“现有契约无需调整”，后续可能在实现阶段才暴露前后端或文档不一致。
- `BE-1`：这是本轮最高风险任务，直接决定 Kodo 是否能完成 init -> 直传 -> complete -> read 的闭环。
- `CFG-1`：若 `STORAGE_*` 语义与实现不一致，最容易出现“本地可用、线上不可用”或“CDN 域名与签名读取冲突”。
- `QA-1`：如果只跑现有 MinIO 用例而不验证 Kodo 场景，会产生伪通过。

## 8. 文件所有权和共享路径提醒

以下文件组必须指定单一责任方，禁止多代理同时修改：

- `packages/schemas/src/files.ts`
- `packages/schemas/src/index.ts`
- `packages/shared/src/index.ts`
- `packages/http-client/src/index.ts`

建议统一由 `CTR-1` 负责。原因：这是共享契约与 API 常量的唯一收口。

- `apps/server/src/modules/posts/storage-provider.ts`
- `apps/server/src/lib/storage-provider.ts`
- `apps/server/src/modules/uploads/upload.route.ts`
- `apps/server/src/modules/uploads/upload.service.ts`
- `apps/server/src/modules/uploads/uploads.helpers.ts`
- `apps/server/tests/provider-config.test.ts`
- `apps/server/tests/upload-policy.test.ts`
- 任何新增的 `apps/server/tests/uploads*.test.ts`

建议统一由 `BE-1` 负责。原因：这是服务端上传实现与 provider 适配的核心共享路径。

- `.env.example`
- `README.md`
- `packages/db/src/runtime-seed.ts`
- `packages/db/src/seed.ts`
- `packages/db/src/seed.test-data.ts`

建议统一由 `CFG-1` 负责。原因：这是环境变量语义、运行时数据与接入说明的唯一收口。

- `docs/requirements/*`
- `docs/tasks/*`
- `docs/implementation/*`
- 任何新增接入文档

建议统一由 `DOC-1` 或主编排会话收口。原因：文档类文件容易在多代理并行时互相覆盖结论。

额外提醒：

- 当前审查结果显示前端页面主要通过 `packages/http-client` 的统一上传 API 调用服务端；在 `CTR-1` 没有确认契约变化前，不应把 `apps/web` 页面并入服务端任务一起改。
- 如果 `CTR-1` 认定当前 `files` 表字段已经足够，则不要创建新的数据库迁移任务；若认定不足，应先提交契约或 schema 变更请求，再由 `planner` 追加任务。

## 9. 建议 test strategy

分层建议：

- Schema / 契约层：补 `packages/schemas/tests`，验证上传相关 schema、错误响应、`kodo / qiniu` 输入边界是否与共享契约一致。
- Provider / 配置层：扩展 `apps/server/tests/provider-config.test.ts`，覆盖 Kodo endpoint、`STORAGE_PUBLIC_BASE_URL`、`STORAGE_FORCE_PATH_STYLE`、别名归一化、签名上传与下载 URL 行为。
- 服务端链路层：为 `uploadsService` 或上传路由补测试，覆盖 `init -> complete` 成功路径，以及对象缺失、大小不一致、类型不一致、私有读取 URL 等异常分支。
- HTTP client 层：仅当 `CTR-1` 变更共享契约时，补 `packages/http-client/tests`，验证高层上传 API 不回归。
- 运行时配置层：如触及 `packages/db/src/runtime-seed.ts` 或 seed，补最小验证，确认 Kodo 不会把仅适用于 MinIO 的自动建桶、匿名读策略误带到云环境。
- 人工或准真实环境验证：准备一组真实 Kodo 配置，验证上传、读取、CDN 域名、公私文件访问、错误排障信息。

执行顺序建议：

1. 先跑针对性测试，再跑根脚本。
2. 根脚本至少包括 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`。
3. 若实现阶段触及真实 Kodo 环境，再补一次带真实 env 的手工 smoke 验证。

## 10. 哪些改动应由单一责任方处理

- 共享契约改动：只能由 `CTR-1` 处理。
- 服务端 provider 与上传链路改动：只能由 `BE-1` 处理。
- 环境变量、README 与 seed 运行时说明：只能由 `CFG-1` 处理。
- 最终验证脚本与测试收口：只能由 `QA-1` 处理。

不建议拆给多个责任方的原因：

- 这些改动都位于共享路径，一旦并发编辑，最容易出现“实现已改、文档没改”或“schema 已改、client 没跟”的不一致。

## 11. 推荐交付顺序

1. `AUD-1`
2. `CTR-1`
3. `BE-1`
4. `CFG-1`
5. `DOC-1`
6. `QA-1`

## 12. 推荐的下一步

- 将本任务文档交给 `planner`，按上述依赖关系生成执行计划与 Execution Packet。
- 要求 `planner` 在计划中明确共享路径所有权，尤其是 `packages/schemas`、`packages/shared`、`packages/http-client`、`apps/server/src/modules/uploads/*`、`.env.example`、`README.md`。
- 如果 `planner` 希望并行执行，只允许并行非共享路径审查类任务；涉及共享契约和服务端上传核心路径的改动必须串行。
