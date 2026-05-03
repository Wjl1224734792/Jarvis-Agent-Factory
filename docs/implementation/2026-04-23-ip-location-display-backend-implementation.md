# 2026-04-23 IP 属地展示后端实现（TASK-007）

## 1. 当前实现目标

- 补齐评分对象公开响应契约：`ratingTargetDetailResponseSchema` 对外公开 `createdAt`。
- 确保评分对象详情响应在服务端输出后，经过 schema 解析仍稳定包含 `createdAt`。
- 保持最小改动：不公开 `updatedAt`，不公开 raw `clientIp`，不改 DB / env / 基础设施。

## 2. 输入依据

- `docs/requirements/2026-04-23-ip-location-display-requirements.md`
- `docs/tasks/2026-04-23-ip-location-display-tasks.md`
- `docs/plans/2026-04-23-ip-location-display-plan.md`
- `docs/contracts/2026-04-23-rating-target-detail-time-contract-change.md`
- `docs/implementation/2026-04-23-ip-location-display-frontend-implementation.md`
- 约束：根 `AGENTS.md` L0-L3、`packages/AGENTS.md`、`apps/AGENTS.md`、`apps/server/AGENTS.md`

## 3. 工作区模式

- 仓库：`E:\CodeStore\feijia`
- 角色：`backend_implementer`
- 执行策略：按共享协议顺序评估，先 TDD（Red -> Green），再最小实现。
- 写入范围仅使用 orchestrator 允许路径；未触碰 forbidden 路径。

## 4. 变更文件 / 变更范围

- `packages/schemas/src/rankings.ts`
  - 在 `ratingTargetSchema` 中新增公开字段：`createdAt: z.string().datetime()`
- `packages/schemas/tests/rankings.test.ts`
  - 新增契约测试：`exposes createdAt on rating target detail response`
  - 更新受影响 fixture，补齐 `createdAt`
- `apps/server/src/modules/rankings/rankings.service.ts`
  - `serializeRatingTarget` 输出新增 `createdAt`
  - `submitRatingTargetRating` 返回对象补齐 `createdAt`
- `apps/server/tests/rankings.test.ts`
  - 新增集成测试：`exposes createdAt on rating target detail responses`
- `docs/implementation/2026-04-23-ip-location-display-backend-implementation.md`

## 5. 实现说明

### 5.1 根因判断

- 不是单一 schema 过滤问题。
- `ratingTargetSchema` 原本未声明 `createdAt`，导致公开契约不包含该字段。
- `apps/server` 的 `serializeRatingTarget` 也未输出 `createdAt`，即使放开 schema 仍无法从服务端拿到值。

### 5.2 最小修复

1. 在共享契约 `ratingTargetSchema` 增加 `createdAt`（ISO datetime）。
2. 在服务序列化 `serializeRatingTarget` 中输出 `item.createdAt.toISOString()`。
3. 在 `submitRatingTargetRating` 的手工返回对象中同步透传 `createdAt`，避免该响应被新 schema 拒绝。
4. 不新增 `updatedAt`，不新增/透出 `clientIp`。

### 5.3 共享链路评估结论

- `packages/schemas`：需要改（已改）。
- `packages/http-client`：评估后无需源码改动。其 `getRatingTargetDetail` 直接使用 `ratingTargetDetailResponseSchema` 解析并推导类型，schema 更新后自动生效。
- `packages/shared`：评估后无需改动。路由常量与本次字段补齐无关。
- `apps/server`：需要改（已改），否则详情响应仍缺 `createdAt`。

## 6. 测试和验证结果（TDD）

### 6.1 Red（先失败）

1. schema 红灯  
   命令：
   ```bash
   bunx vitest run packages/schemas/tests/rankings.test.ts -t "exposes createdAt on rating target detail response"
   ```
   结果：失败（`createdAt` 被 schema 过滤，断言不存在）。

2. server 红灯  
   命令：
   ```bash
   bun run --cwd apps/server test -- apps/server/tests/rankings.test.ts -t "exposes createdAt on rating target detail responses"
   ```
   结果：失败（详情响应 `createdAt` 为 `undefined`）。

### 6.2 Green（最小实现后通过）

1. 目标用例复跑  
   ```bash
   bunx vitest run packages/schemas/tests/rankings.test.ts -t "exposes createdAt on rating target detail response"
   bun run --cwd apps/server test -- apps/server/tests/rankings.test.ts -t "exposes createdAt on rating target detail responses"
   ```
   结果：通过。

2. 相关回归  
   ```bash
   bunx vitest run packages/schemas/tests/rankings.test.ts
   bunx vitest run --root . --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/rankings.test.ts
   bunx vitest run --root . --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/ip-location.test.ts -t "exposes ip location on model comments and rating target comments"
   bun run --cwd packages/schemas typecheck
   bun run --cwd apps/server typecheck
   ```
   结果：通过。

说明：`bun run --cwd apps/server test -- apps/server/tests/rankings.test.ts` 会触发 `apps/server/tests` 全量联跑，出现与本任务无关的跨文件场景失败；已使用单文件隔离命令完成本任务相关验证。

## 7. 数据与接口边界

- 新增公开字段：`ratingTarget.createdAt`（字符串，`datetime`）。
- 未新增字段：`updatedAt`、`clientIp`（保持不公开）。
- 未改动 DB schema / migration / seed。
- 未改动 env / CORS / OpenAPI / README / 基础设施。

## 8. 风险 / 未解决项

- `ratingTargetSchema` 被多个响应复用，后续若有手工拼装 `ratingTarget` 的新增路径，必须同步带上 `createdAt`，否则会在 schema 解析时暴露问题。
- `apps/server` 全量集成套件在当前环境有跨文件联跑不稳定现象（本任务已用单文件隔离验证通过）。

## 9. 需要前端配合的点

- `TASK-008` 可以开始：`apps/web` 评分对象详情页可直接消费 `item.createdAt`，在时间信息行展示时间并追加 `<location>`。
- 仍保持约束：前端不要回退到 `updatedAt`，不要引入 raw `clientIp`。

## 10. 推荐的下一步

1. 由 `frontend_implementer` 执行 `TASK-008`，消费 `createdAt` 完成评分对象详情页时间行展示。
2. 由 `frontend_test_worker` 执行 `TASK-006`，补齐页面回归并把本次契约变更纳入验收链路。
3. 进入 `review_qa` 做最终联调与回归确认。

