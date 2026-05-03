# 七牛云 Kodo 对象存储接入计划（Blocked）

## 1. 需求文档路径

- [requirements](/E:/CodeStore/feijia/docs/requirements/2026-04-21-kodo-object-storage-requirements.md)

## 2. 任务文档路径

- [tasks](/E:/CodeStore/feijia/docs/tasks/2026-04-21-kodo-object-storage-tasks.md)

## 3. Gate B 检查结果

当前任务文档未通过 Gate B，暂不能进入可执行计划与 `spawn` 阶段，必须先回退 `task_design` 修订任务文档。

阻塞项：

1. 任务 ID 未使用 Gate B 要求的 `TASK-XXX` 格式，当前为 `AUD-1`、`CTR-1`、`BE-1`、`CFG-1`、`DOC-1`、`QA-1`。
2. 任务类型未按 Gate B 要求收敛为 `前端 / 后端 / 共享 / 测试`，当前使用了 `审查 / DDD / 配置 / 文档 / 验证`。
3. `test_strategy` 未按任务逐条明确为 `tdd / test_after / manual_only`，当前仍是说明性分组，`QA-1` 也未落到 Gate B 的枚举值。
4. 已新增且已确认的关键约束“`Kodo` 必须使用七牛官方 SDK，不得继续以 S3 兼容方案实现 Kodo”未写入任务完成标准、依赖关系、共享路径归属和风险说明，当前任务文档仍允许错误实现方向。

## 4. 当前轮次目标

本轮目标调整为：冻结阻塞点，给出 `task_design` 修订要求，确保下一版任务文档通过 Gate B 后再生成 Execution Packet。

## 5. 当前轮次范围

仅包含：

- 校验需求文档、任务文档与仓库现状是否对齐
- 审查现有上传链路与对象存储实现
- 提炼任务文档必须补齐的字段
- 明确共享契约、最小改动路径、单一责任方和测试顺序，供 `task_design` 回填

不包含：

- 生成可执行 Execution Packet
- 分派实现代理
- 编写业务代码

## 6. 完成标准

满足以下条件后，才允许重新进入 `planner`：

- 任务 ID 全部改为 `TASK-XXX`
- 任务类型全部改为 `前端 / 后端 / 共享 / 测试`
- 每个任务显式写出 `test_strategy: tdd / test_after / manual_only`
- 新增约束“`Kodo` 必须走七牛官方 SDK”写入任务目标、完成标准、风险和共享路径归属
- 任务文档中的共享路径归属与仓库现状一致

## 7. 是否需要先查阅 repo_explorer / docs_researcher

- `repo_explorer`：本轮已完成等价仓库审查，不再需要额外前置探索。
- `docs_researcher`：实现前建议由实现代理按需查阅；本轮仅已核对七牛官方 Node.js SDK 文档，确认官方能力以 `uploadToken` / `privateDownloadUrl` 为主，而不是 S3 `presigned-put`。

参考来源：

- 七牛官方 Node.js SDK 文档：https://developer.qiniu.com/kodo/sdk/1289/nodejs
- 七牛官方 GitHub 组织页（含 `nodejs-sdk` 仓库）：https://github.com/qiniu

## 8. 执行代理分工

当前不分派实现代理；先回退 `task_design`。

待任务文档修订后，建议最小分工如下：

- `TASK-001` 共享契约冻结：`frontend_state_worker` 不参与，统一由共享契约责任方收口，后续在计划阶段映射到单一实现代理。
- `TASK-002` 服务端 Kodo 官方 SDK 适配：后端实现责任方。
- `TASK-003` 配置 / env / seed / 文档对齐：配置与文档责任方。
- `TASK-004` 测试与验证闭环：测试责任方。

说明：这里仅给出任务包形态，不替代 `task_design` 对任务重新编号和分类。

## 9. 共享区域改动归属

下列共享区域必须在修订后的任务文档中指定唯一责任方：

- 共享契约唯一责任方：
  - `packages/schemas/src/files.ts`
  - `packages/schemas/src/index.ts`
  - `packages/schemas/tests/posts.test.ts`
- 共享客户端唯一责任方：
  - `packages/http-client/src/index.ts`
  - `packages/http-client/tests/posts.test.ts`
- 路由常量唯一责任方：
  - `packages/shared/src/index.ts`
  - 只有在上传路由新增或变更时才允许修改；否则必须冻结不动
- 服务端对象存储唯一责任方：
  - `apps/server/src/modules/posts/storage-provider.ts`
  - `apps/server/src/lib/storage-provider.ts`
  - `apps/server/src/modules/uploads/upload.service.ts`
  - `apps/server/src/modules/uploads/uploads.helpers.ts`
  - `apps/server/src/modules/uploads/upload.route.ts`
  - `apps/server/tests/provider-config.test.ts`
  - `apps/server/tests/upload-policy.test.ts`
  - 任何新增上传链路测试
- 配置与运行时数据唯一责任方：
  - `.env.example`
  - `README.md`
  - `apps/server/package.json`
  - `packages/db/package.json`
  - `packages/db/src/runtime-seed.ts`
  - `packages/db/src/seed.test-data.ts`

## 10. 并行 / 串行策略

修订后的执行必须遵守：

1. 先串行冻结共享契约，再进入服务端实现。
2. `packages/schemas` 与 `packages/http-client` 不允许在契约未冻结前并行修改。
3. 服务端对象存储适配与 `README` / `.env.example` / `runtime-seed` 的修改不能无序并发，必须以服务端最终实现为准回填配置与文档。
4. 只有在共享契约不变的前提下，前端页面才能完全排除在本轮范围外。

## 11. 风险提醒

- 当前仓库的 `kodo/qiniu` 分支实际仍走 `@aws-sdk/client-s3` 和 `@aws-sdk/s3-request-presigner`，与新增约束直接冲突。
- 当前 `packages/schemas/src/files.ts` 只支持 `upload.mode = "presigned-put"`；若七牛官方 SDK 接入采用上传凭证或表单上传模式，共享契约必须变更。
- 当前 `packages/http-client/src/index.ts` 的高层上传 API 写死了 `PUT presigned URL` 三段式；契约一旦变化，这里是前端最小改动入口。
- 当前 `packages/db/src/runtime-seed.ts` 与 `packages/db/src/seed.test-data.ts` 仍基于 `S3Client`；若保留为 Kodo 路径将继续违反新增约束。
- 当前 `README.md` 与 `.env.example` 明确写着 Kodo 走 S3 兼容接口，这部分必须由单一责任方清理。

## 12. 实现者交接信息

供 `task_design` 修订时直接写入下一版任务文档：

### 12.1 需要修改哪些共享契约

最小需要重新评估的共享契约只有两类：

1. 上传描述契约：
   - `packages/schemas/src/files.ts`
   - 当前 `uploadDescriptorSchema` 仅支持 `presigned-put`
   - 若七牛官方 SDK 落地为上传凭证 / 表单直传，则必须扩展或替换该 schema
2. 共享客户端消费契约：
   - `packages/http-client/src/index.ts`
   - 当前 `performDirectUpload()` 假定初始化响应必定返回 `PUT URL + headers`

默认不应修改的共享契约：

- `packages/shared/src/index.ts`
  - 若仍沿用 `/uploads/init`、`/uploads/complete`、`/files/:id/url`，则路由常量应冻结不动
- `packages/db/src/schema.ts`
  - 现阶段没有证据表明 `files` 表必须变更；只有在官方 SDK 接入后发现元数据不足时，才允许回退并发起新的 contract change request

### 12.2 服务端 / 前端 / http-client 的最小改动路径

服务端最小路径：

- 保持上传业务入口不变，优先替换 `apps/server/src/modules/posts/storage-provider.ts` 内的 Kodo 实现分支
- 由该文件收口七牛官方 SDK 的上传令牌生成、对象校验、私有下载 URL 生成
- `apps/server/src/lib/storage-provider.ts` 继续作为引用桥接层，仅在类型或导出变化时同步
- `apps/server/src/modules/uploads/upload.service.ts` / `uploads.helpers.ts` 只做必要的适配，不顺手改业务流程
- 仅当初始化响应结构变化时才修改 `upload.route.ts`

前端最小路径：

- 优先保持 `apps/web` / `apps/admin` 零改动
- 所有前端变化先收敛在 `packages/http-client`
- 只有在 `http-client` 无法兼容新上传模式时，才回退到页面层

`http-client` 最小路径：

- 若上传响应仍能抽象为现有三段式，保持 `packages/http-client/src/index.ts` 现有 API 名称不变，只改上传执行细节
- 若响应改为 `token + form fields + upload host`，只修改 `performDirectUpload()` 及相关 schema 消费，不扩散到页面调用方

### 12.3 哪些文件必须由单一责任方处理

- 共享契约唯一责任方：
  - `packages/schemas/src/files.ts`
  - `packages/schemas/src/index.ts`
  - `packages/schemas/tests/posts.test.ts`
- 共享客户端唯一责任方：
  - `packages/http-client/src/index.ts`
  - `packages/http-client/tests/posts.test.ts`
- 服务端对象存储唯一责任方：
  - `apps/server/src/modules/posts/storage-provider.ts`
  - `apps/server/src/lib/storage-provider.ts`
  - `apps/server/src/modules/uploads/upload.service.ts`
  - `apps/server/src/modules/uploads/uploads.helpers.ts`
  - `apps/server/src/modules/uploads/upload.route.ts`
  - `apps/server/tests/provider-config.test.ts`
  - 新增上传链路测试
- 配置 / seed / 文档唯一责任方：
  - `.env.example`
  - `README.md`
  - `apps/server/package.json`
  - `packages/db/package.json`
  - `packages/db/src/runtime-seed.ts`
  - `packages/db/src/seed.test-data.ts`

### 12.4 建议测试顺序

1. 先跑共享 schema 与共享 client 的定向测试，确认上传契约是否变化。
2. 再跑服务端 `provider-config` 和上传链路测试，确认七牛官方 SDK 行为与 MinIO 回归都成立。
3. 如触及 `runtime-seed` 或测试数据，再跑 `packages/db` 相关定向验证。
4. 最后跑根质量门禁：
   - `bun run lint`
   - `bun run typecheck`
   - `bun run test`
   - `bun run build`
5. 如接入真实 Kodo 环境，再补一次带真实 `STORAGE_*` 环境变量的手工 smoke 验证。

## 13. Execution Packet

未生成。

原因：

- Gate B 未通过，当前任务文档还不能合法进入 `planner`
- 若现在生成 Execution Packet，会把未冻结的任务类型、ID、`test_strategy` 和错误的 Kodo 实现约束固化到下游执行阶段

## 14. plan patch / contract change request 触发条件

修订后的任务文档进入规划阶段后，以下情况必须先发起 `plan patch` 或 `contract change request`：

- 七牛官方 SDK 接入后，确认现有 `uploadDescriptorSchema` 无法维持 `presigned-put`
- 为支持 Kodo 官方 SDK，不得不新增上传初始化字段、上传模式或回调步骤
- `files` 表现有字段不足以表达 Kodo 所需元数据
- `runtime-seed` 无法在不改变契约的前提下兼容 Kodo 与 MinIO 双路径
- 需要新增或调整上传路由，而不仅是替换服务端 provider 实现

## 15. 推荐的下一步

1. 回退 `task_design`，修订 [tasks](/E:/CodeStore/feijia/docs/tasks/2026-04-21-kodo-object-storage-tasks.md)。
2. 把新增约束“`Kodo` 必须使用七牛官方 SDK，不得继续沿用 S3 兼容实现”写入每个相关任务的完成标准、风险和共享路径归属。
3. 完成 Gate B 修订后，再重新进入 `planner` 生成正式 Execution Packet。
