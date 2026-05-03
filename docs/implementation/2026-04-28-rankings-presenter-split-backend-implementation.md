# rankings presenter 第二层拆分后端实现

## 1. 当前实现目标

在 `apps/server` 的 `rankings` 模块内新增第二层 presenter 文件，把 `rankings.service.ts` 中指定的低风险序列化 / 展示 helper 迁移到独立文件，并保持现有接口行为不变。

## 2. 对应需求 ID / 任务 ID

- 需求 ID：上游本次未显式提供。
- 任务 ID：`rankings` 模块第二层 presenter 拆分。

## 3. 输入依据

- 用户本次任务说明与文件所有权约束。
- 根目录 `AGENTS.md`（L0-L3）。
- `apps/AGENTS.md`。
- `apps/server/AGENTS.md`。
- `.codex/AGENTS.md`。
- `.codex/rules/通用编程规范与指南.md`。
- `.codex/rules/团队协作规范.md`。
- `.codex/rules/TypeScript与Interface使用规范.md`。
- `apps/server/src/modules/rankings/rankings.service.ts` 当前实现。
- `apps/server/tests/rankings.test.ts` 现有回归用例。

## 4. 工作区模式

- 工作区：`E:\CodeStore\feijia`
- 执行模式：后端子任务实现
- 工作树状态：脏工作树，并行协作中
- 本次策略：只修改自己拥有的文件集合，不回退他人改动

## 5. 变更文件 / 变更范围

- `apps/server/src/modules/rankings/rankings-presenters.ts`
  - 新增 presenter 文件
  - 承接 `rankings` 前台列表 / 详情 / 评论展示 helper
- `apps/server/src/modules/rankings/rankings.service.ts`
  - 删除本地 helper 定义
  - 改为调用 `rankings-presenters.ts`
- `docs/implementation/2026-04-28-rankings-presenter-split-backend-implementation.md`
  - 记录本次后端实现与验证结果

## 6. 实现说明

### 6.1 新增 presenter 文件

新增 `rankings-presenters.ts`，迁出以下 helper：

- `buildPublicUserSummary`
- `toTenPointScore`
- `average`
- `buildRatingBreakdown`
- `buildRatingBreakdownFromRows`
- `resolveRankingImage`
- `serializeRatingTarget`
- `serializeRankingComment`
- `serializeRatingTargetCommentBase`
- `buildRatingTargetCommentThreads`

处理方式保持最小改动：

- 复用原有 `type-guards`、上传 URL helper、权限判断和评论树构建逻辑。
- 不改入参语义，不改回退默认值，不改排序规则。
- 仅为可导出的 presenter 增补必要的中文 TSDoc 与可命名接口。

### 6.2 收缩 service 职责

`rankings.service.ts` 只做 presenter 调用接线：

- 删除上述 helper 的本地实现。
- 清理不再需要的本地 import。
- 保留查询编排、权限判定、写流程、审核流程与通知流程不变。

### 6.3 并行改动适配

`rankings.service.ts` 在本次任务开始前已经处于脏状态，包含其它线程的局部演进。本次没有回退该文件既有改动，只在 presenter 相关区域做最小替换。

## 7. 测试和验证结果

### 7.1 必跑命令

```bash
bun run --cwd apps/server lint
bun run --cwd apps/server typecheck
bun run --cwd apps/server build
```

结果：

- `lint`：通过
- `typecheck`：通过
- `build`：通过

### 7.2 定向 vitest

最终采用串行方式执行，避免并发测试进程共享重置 `demo` 数据：

```bash
bunx vitest run --root ../.. --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/rankings.test.ts -t "supports ranking item review and ratingBreakdown for community and official items"
bunx vitest run --root ../.. --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/rankings.test.ts -t "supports ranking item reply threads plus comment like/report/edit/delete flow"
```

结果：

- `supports ranking item review and ratingBreakdown for community and official items`：通过
- `supports ranking item reply threads plus comment like/report/edit/delete flow`：通过

备注：

- 曾尝试并发执行两条定向用例，其中一条因共享测试数据被另一进程重置而失败；串行重跑后两条均通过。

## 8. 数据与接口边界

- 未修改 `packages/schemas`、`packages/shared`、`packages/http-client`。
- 未修改 `rankings` 路由入参 / 出参结构。
- 未修改数据库 schema、迁移、seed 和仓储查询协议。
- 本次拆分仅调整服务层内部组织方式，不改变对前端暴露的契约。

## 9. 风险 / 未解决项

- `rankings.service.ts` 当前有并行线程改动，后续合流时仍需关注同文件冲突。
- 本次未新增 presenter 独立单测，回归主要依赖现有 `rankings.test.ts` 定向集成用例。
- `rankings` 相关集成测试依赖共享数据库重置，不适合并发执行多个独立 `vitest` 进程。

## 10. 需要前端配合的点

- 无。
- 接口契约、字段语义与返回结构保持不变，前端无需调整。

## 11. 推荐的下一步

- 若后续继续拆 `rankings.service.ts`，优先沿着 presenter / write-service / admin-comment presenter 的边界继续收缩职责。
- 若 presenter 逻辑后续继续增长，建议补一组轻量 presenter 单测，减少对长链路集成测试的依赖。
