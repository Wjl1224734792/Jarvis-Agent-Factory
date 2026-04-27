# 2026-04-27 消息中心互动链路优化实现记录

## 上游文档

- `docs/requirements/2026-04-27-message-center-link-optimization-requirements.md`
- `docs/tasks/2026-04-27-message-center-link-optimization-tasks.md`
- `docs/plans/2026-04-27-message-center-link-optimization-plan.md`
- `docs/analysis/2026-04-27-message-center-link-matrix.md`

## 实现摘要

- 修复 `WEB-TARGET` 链路中系统消息显式 `href` 指向历史 / API-like 路径导致的 Web 死链。
- 兼容历史 seed / 历史通知中的旧系统消息类型，避免 `GET /notifications` 响应时被 schema 或 server 类型守卫过滤。
- 保持本轮边界：未改数据库、未加迁移、未引入实时推送、未重建消息模型。

## 代码变更

- `packages/schemas/src/social.ts`
  - `messageTypeSchema` 补充历史系统消息类型：
    - `post_status_changed`
    - `ranking_status_changed`
    - `rating_target_status_changed`
    - `aircraft_submission_status_changed`
    - `brand_application_status_changed`
  - `adminMessageListQuerySchema` 同步允许历史状态消息与对应 admin domain 组合，避免历史 admin inbox 类型被 URL 筛选拒绝。
- `apps/admin/src/features/messages/admin-message-navigation.ts`
  - Admin 消息中心类型筛选同步补充历史状态消息选项，并按 domain 保留同域旧类型。
- `apps/server/src/modules/social/notification-types.ts`
  - 服务端通知类型与分类映射同步补齐历史系统消息类型。
- `apps/server/src/lib/type-guards.ts`
  - 通知类型守卫同步补齐历史系统消息类型。
- `apps/server/src/modules/social/social.repo.ts`
  - repo 层 admin inbox 查询类型同步补齐历史系统消息类型，避免服务端类型漂移。
- `apps/server/src/modules/social/system-notification-targets.ts`
  - 新增系统消息 Web href 归一化函数。
  - 将旧 `rating_target` href 归一到 `/rating-targets/:id`。
  - 将旧 `aircraft_submission` href 归一到 `/publish/aircraft?edit=:id`。
  - 将旧 `brand_application` href 归一到 `/publish/brand?submitted=:id`。
- `apps/server/src/modules/social/social.service.ts`
  - 新写入系统消息时统一生成可落地 href。
  - 读取历史通知时也对 stored href 做归一化，避免现有数据继续产生死链。
  - Admin 消息中心 domain/type 映射同步补齐历史状态消息，避免 admin inbox 未读数包含旧消息但列表过滤掉。

## 测试

- `packages/schemas/tests/social.test.ts`
  - 覆盖历史系统消息类型可被 `notificationsResponseSchema` 解析。
  - 覆盖历史状态消息类型可与对应 admin domain 组合通过 query schema。
- `apps/admin/tests/admin-message-navigation.test.ts`
  - 覆盖 Admin 前端筛选保留同域历史状态消息类型。
- `apps/server/tests/social-notification-targets.test.ts`
  - 覆盖系统消息 target 到真实 Web 路由的归一化。
- `apps/server/tests/social-service-notifications.test.ts`
  - 覆盖历史通知列表读取时旧类型可见、旧 href 被归一化。
  - 覆盖历史 admin inbox 状态消息在对应审核 domain 下可见、可统计、可导航。

## 已执行验证

- `bun run test:unit -- packages/schemas/tests/social.test.ts`
- `bunx vitest run --root . --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests/social-service-notifications.test.ts apps/server/tests/social-notification-targets.test.ts`
- `bun run test:unit -- packages/schemas/tests/social.test.ts packages/http-client/tests/admin-messages.test.ts apps/web/tests/message-center.test.ts apps/web/tests/message-actions.test.ts apps/admin/tests/admin-message-navigation.test.ts`
- `bun run --cwd packages/schemas typecheck`
- `bun run --cwd apps/server typecheck`
- `bun run lint`
- `bun run typecheck`
- `bun run test`（88 个测试文件，347 个测试通过）
- `bun run build`（通过；仅保留既有 Vite 大 chunk 提示）

## 剩余风险

- 评论类审核目前通过 todos 进入，不新增 admin inbox 消息类型；如果后续要让评论类审核也产出系统消息，需要回流共享契约新增消息类型与映射。
