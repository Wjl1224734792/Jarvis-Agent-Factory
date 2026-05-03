# Plan Patch / Contract Change Request

## 变更类型

contract_change

## 变更原因

最新需求要求各个详情页的属地跟随发布时间 / 时间信息行展示，不放在作者区域。前端实现 `apps/web/src/routes/rating-target-detail-header.tsx` 时发现评分对象详情页的公开契约无法提供时间字段。

`packages/schemas/src/rankings.ts` 中 `ratingTargetSchema` 当前不包含 `createdAt` / `updatedAt`，因此 `ratingTargetDetailSchema` 也不会向前端公开评分对象创建时间。服务层和数据层已有评分对象时间字段，但响应 schema 会过滤未声明字段，前端类型 `RatingTargetDetail` 也无法消费时间字段。

## 当前阻塞点

- 被阻塞功能：评分对象详情页无法在发布时间 / 时间信息行追加 `<location>`。
- 被阻塞任务：`TASK-003` 的评分对象详情页验收项。
- 当前前端只能移除作者区域属地，无法在不改共享契约的情况下完成时间行展示。

## 影响范围

- 影响任务 ID：`TASK-003`、`TASK-006`。
- 影响代理：`backend_implementer` / `frontend_implementer` / `frontend_test_worker`。
- 影响共享区域：
  - `packages/schemas/src/rankings.ts`
  - `apps/server/src/modules/rankings/rankings.service.ts`
  - `apps/web/src/routes/rating-target-detail-header.tsx`
  - 相关测试

## 建议调整

- 契约调整：在公开 `ratingTargetSchema` 中增加 `createdAt: z.string().datetime()`，如现有响应已经包含 `updatedAt` 也可同步增加 `updatedAt`，但本需求只要求前端消费 `createdAt`。
- 服务调整：确认评分对象序列化路径向 `ratingTargetDetailResponseSchema` 提供 `createdAt`。若已有字段被 schema 过滤，仅更新 schema 即可；若序列化遗漏，则补齐服务层输出。
- 前端调整：评分对象详情页在时间信息行显示 `创建于 <date> · <location>` 或等价时间行；作者区域继续不显示属地。
- 测试调整：覆盖 `ratingTargetSchema` 接收 `createdAt`，以及评分对象详情页时间行展示属地。

## 风险

- `ratingTargetSchema` 同时用于榜单详情的条目列表，新增必填字段会要求所有服务端返回评分对象的位置都提供 `createdAt`。
- 如果某些前端测试 fixture 或 schema 测试未包含 `createdAt`，需要同步更新测试数据。
- 不应公开原始 IP，本变更只补公开时间字段，不触碰 `clientIp`。

## 推荐决策

批准。

理由：这是满足已确认需求的必要契约补齐，数据层已有时间字段，不涉及数据库结构变更，也不暴露原始 IP。执行时应保持最小变更：优先只公开并消费 `createdAt`。
