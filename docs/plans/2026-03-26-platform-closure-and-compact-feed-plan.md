# 2026-03-26 Platform Closure And Compact Feed Plan

## 1. 需求文档路径
- [docs/requirements/2026-03-26-platform-closure-and-compact-feed-requirements.md](/E:/CodeStore/feijia/docs/requirements/2026-03-26-platform-closure-and-compact-feed-requirements.md)

## 2. 任务文档路径
- [docs/tasks/2026-03-26-platform-closure-and-compact-feed-tasks.md](/E:/CodeStore/feijia/docs/tasks/2026-03-26-platform-closure-and-compact-feed-tasks.md)

## 3. 当前轮次目标
- 先把仓库恢复到可持续开发状态：消除当前 `rankings` 类型阻塞，收敛本地基础设施闭环，落地可重复执行的 seed 输出链路，并建立存储/短信 provider 的第一层统一抽象。
- 本轮不进入页面紧凑化和互动展示细化，前端接入等共享契约稳定后再做。

## 4. 当前轮次范围
- 包含：
  - 前置阻塞修复：`apps/server/src/modules/rankings/rankings.repo.ts`、`apps/server/src/modules/rankings/rankings.service.ts` 的类型错误收口。
  - `I1` 本地基础设施闭环收敛。
  - `I2` 弱模型辅助 seed 生成与 PostgreSQL / MinIO / Redis 灌入链路。
  - `I3` 存储 provider 抽象与 COS / OSS / KODO / MinIO 配置入口。
  - `I4` 短信 provider 抽象与阿里云 / 腾讯云 / mock 配置入口。
- 不包含：
  - `I5` 评论 / 评分 / 点赞 / 收藏 / 浏览量闭环。
  - `W1` / `W2` / `W3` 前端紧凑化、首页右侧模块、榜单小卡片、隐藏展示入口。

## 5. 完成标准
- 根目录 `bun run typecheck` 恢复可通过，且不再被 `rankings` 类型错误阻塞。
- 本地闭环可以按固定顺序执行：基础服务可用 -> 迁移 -> seed -> 服务端可启动 / 测试。
- seed 除 PostgreSQL 外，还能向 MinIO 写入确定性的示例媒体、向 Redis 写入可重建的演示态数据。
- 服务端形成统一 provider 入口，环境变量支持 `MinIO` / `COS` / `OSS` / `KODO` 与 `mock` / `Aliyun` / `Tencent` 的解析与装配。
- 本轮所有触达区域具备验证记录；`tdd` 任务有 Red -> Green 证据。

## 6. 是否需要先查阅 repo_explorer
- 不需要追加查阅。
- 已有探索已覆盖：
  - 迁移 / seed 入口、对象存储与 Redis 现状、短信 `mock` 现状。
  - 首页、榜单、详情、发布页与互动骨架分布。
  - 当前真实阻塞：`rankings` 类型错误，而非 Docker 服务未启动。

## 7. 执行代理分工
- `backend_implementer`
  - 负责本轮全部实现。
  - 任务包 A：前置阻塞修复 + `I1`
  - 任务包 B：`I2`
  - 任务包 C：`I3` + `I4`
- `frontend_implementer`
  - 本轮不启动。
  - 进入条件：任务包 C 完成，且共享契约、provider 配置、seed 数据出口稳定。
- `review_qa`
  - 在任务包 C 完成后统一评审。
  - 重点核对：`rankings` 类型回归、`I3/I4` 的 Red -> Green 证据、seed 输出链路是否真的覆盖 PostgreSQL / MinIO / Redis。

## 8. 共享区域改动归属
- 唯一责任方：`backend_implementer`
- 本轮禁止并行修改的共享区域：
  - `packages/db/src/schema.ts`
  - `packages/db/src/seed.ts`
  - `packages/db/drizzle/*`
  - `packages/shared/src/index.ts`
  - `packages/schemas/src/*`
  - `packages/http-client/src/index.ts`
  - `apps/server/src/app.ts`
  - `apps/server/src/modules/rankings/*`
  - `apps/server/src/modules/auth/*`
  - `apps/server/src/modules/posts/*`
- 顺序约束：
  1. 先修复 `rankings` 类型错误，否则根类型检查一直为红，后续无法判断新增问题。
  2. 再做 `I1` / `I2`，稳定本地基础数据与输出链路。
  3. 最后由同一实现者串行完成 `I3` / `I4`，避免在 `packages/shared`、`packages/schemas`、`packages/http-client` 上发生契约冲突。
- 并行边界：
  - 本轮不建议并行实现。
  - `I3` 与 `I4` 虽是两个任务，但共用服务端配置装配与共享契约，不应分给两个代理。

## 9. 风险提醒
- 当前 `typecheck` 为红，如果不先清理 `rankings` 类型错误，任何新增共享改动都会被旧问题掩盖。
- `I2` 的风险不在 PostgreSQL，而在“看似 seed 成功，实际 MinIO / Redis 没有落数据”；验证必须覆盖三个目标。
- `I3` 如果只做 provider 枚举，不做统一装配点，后续接真实上传仍会回到分散实现。
- `I4` 如果只加环境变量名，不做发送接口和 provider 选择逻辑，短信链路仍停留在 `mock` 单实现。
- 本轮如果提前启动前端改造，会与尚未稳定的 seed、provider、互动计数口径产生重复返工。

## 10. 实现者交接信息
- 任务包 A：前置阻塞修复 + `I1`
  - 范围：
    - `apps/server/src/modules/rankings/rankings.repo.ts`
    - `apps/server/src/modules/rankings/rankings.service.ts`
    - `packages/db/*`
    - `docker/*`
    - 必要时补充运行说明文档
  - 目标：
    - 收口当前 `rankings` 类型问题。
    - 明确并固化本地运行顺序与基础设施闭环。
  - `test_strategy`: `test_after`
  - 验证命令：
    - `bun run typecheck`
    - `bun run db:migrate`
    - `bun run db:seed`
    - `bun run --cwd apps/server test`

- 任务包 B：`I2` 弱模型辅助 seed 输出链路
  - 范围：
    - `packages/db/src/seed.ts`
    - `packages/db/src/*`
    - 与 seed 输出直接相关的服务端基础设施文件
  - 目标：
    - 让 seed 可重复生成 PostgreSQL 数据、MinIO 示例媒体、Redis 演示态。
    - 弱模型仅参与 seed 文案 / 示例素材生成，不进入运行时路径。
  - `test_strategy`: `test_after`
  - 验证命令：
    - `bun run --cwd packages/db typecheck`
    - `bun run db:seed`
    - `docker exec feijia-redis redis-cli -a qwertyuiop KEYS "feijia:*"`
    - `docker exec feijia-minio sh -lc "find /data -maxdepth 3 -type f | head -20"`

- 任务包 C：`I3` + `I4` provider 抽象
  - 范围：
    - `packages/shared/src/index.ts`
    - `packages/schemas/src/*`
    - `packages/http-client/src/index.ts`
    - `apps/server/src/app.ts`
    - `apps/server/src/modules/auth/*`
    - 新增或补充的服务端 provider 装配模块
  - 目标：
    - 存储侧建立统一 provider 接口与配置解析，覆盖 `MinIO` / `COS` / `OSS` / `KODO`。
    - 短信侧建立统一 provider 接口与配置解析，覆盖 `mock` / `Aliyun` / `Tencent`。
    - 保留当前开发模式兜底，但不再把 `mock` / 单实现写死在业务模块里。
  - `test_strategy`: `tdd`
  - Red:
    - 先新增 / 修改服务端测试，断言 provider 选择、配置解析、回退逻辑和错误分支。
  - Green:
    - 以最小实现通过同一组测试。
  - Refactor:
    - 仅在测试全绿后整理装配结构。
  - 验证命令：
    - `bun x vitest run --root . --config vitest.config.ts apps/server/tests/auth.test.ts`
    - `bun x vitest run --root . --config vitest.config.ts apps/server/tests/posts.test.ts`
    - `bun run --cwd packages/schemas typecheck`
    - `bun run --cwd packages/http-client typecheck`
    - `bun run typecheck`

## 11. 推荐的下一步
- 先交给 `backend_implementer` 按任务包 A -> B -> C 串行执行。
- 任务包 C 完成并通过 `review_qa` 后，再进入下一轮计划，启动：
  - `I5` 互动闭环。
  - `W1` / `W2` / `W3` 前端紧凑化与展示收口。
