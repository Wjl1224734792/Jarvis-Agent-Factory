# 2026-03-28 后端实现说明（机型互动 + 用户设置 + 可见性）

## 1. 当前实现目标
- 新增 `user_settings` 与 `aircraft_model_interactions` 两张表并落库。
- 扩展用户资料接口，返回和更新“资料 + 设置”组合字段。
- 对 `getUserProfile` / `listUserContent` 增加可见性控制与 viewer 能力字段。
- 用户收藏统计与内容聚合纳入模型收藏（`favorite-model`）。
- 新增机型互动接口 `POST /models/:slug/interactions/:type`，支持 `interested/favorite` 切换和 `share` 幂等。
- 评论/回复通知受用户通知偏好控制。

## 2. 输入依据
- 用户在主会话确认的后端任务清单（含目标 1-7）。
- 主会话已确认的实现计划（后端任务包 A/G）。
- 仓库约束文档：`AGENTS.md` 与 `docs/workflows/workflow.md`。

## 3. 工作区模式
- 本次为后端实现模式（仅改后端与共享契约，不改前端页面）。
- 采用 TDD：先补失败测试（Red），再实现（Green），最后回归与类型检查。

## 4. 变更文件 / 变更范围
- `packages/db/src/schema.ts`
- `packages/db/drizzle/0010_silent_model_social.sql`
- `packages/db/drizzle/meta/_journal.json`
- `packages/shared/src/index.ts`
- `packages/schemas/src/models.ts`
- `packages/schemas/src/social.ts`
- `packages/http-client/src/index.ts`
- `apps/server/src/modules/social/social.repo.ts`
- `apps/server/src/modules/social/social.service.ts`
- `apps/server/src/modules/social/social.route.ts`
- `apps/server/src/modules/aircraft-models/aircraft-models.repo.ts`
- `apps/server/src/modules/aircraft-models/aircraft-models.service.ts`
- `apps/server/src/modules/aircraft-models/aircraft-models.route.ts`
- `apps/server/tests/auth.test.ts`
- `apps/server/tests/models.test.ts`
- `apps/server/tests/posts.test.ts`

## 5. 实现说明
- 数据层：
  - 增加 `user_settings`（`profile_visibility / notify_comments / notify_mentions / session_alerts / email_digest`）。
  - 增加 `aircraft_model_interactions`（`model_id / user_id / type`，唯一键为 `(model_id, user_id, type)`）。
- 路由与契约：
  - 新增 `API_ROUTES.models.interactions(slug, type)`。
  - `models` schema 扩展：`modelDetail` 新增 `interactionSummary` 与 `viewer`。
  - `social` schema 扩展：
    - `currentUserProfile` 新增 `phone` 与设置字段。
    - `updateCurrentUserProfileInput` 支持设置字段更新。
    - `userProfile.viewer` 新增 `canFollow / canViewProfile / canViewContent`。
    - `userContent` 新增 `favorite-model` 条目。
  - `http-client` 新增 `interactModel(slug, type)`。
- 业务逻辑：
  - `socialService.getCurrentUserProfile/updateCurrentUserProfile` 已支持资料+设置组合读写。
  - `socialService.getUserProfile/listUserContent` 按 `profileVisibility` 执行可见性控制。
  - `favoriteCount` 变更为“帖子收藏 + 模型收藏”汇总。
  - `listUserContent` 增加 `favorite-model` 聚合项。
  - `socialService.recordNotification` 对 `post_commented/comment_replied` 按设置门控。
  - `aircraftModelsService` 新增互动提交能力；详情返回互动统计和当前用户状态。
  - `aircraftModelsRoute` 新增互动接口并接入鉴权。

## 6. 测试和验证结果
- Red（失败证据）：
  - `apps/server/tests/auth.test.ts`：`phone/profileVisibility/notify*` 字段缺失导致断言失败。
  - `apps/server/tests/models.test.ts`：缺少 `API_ROUTES.models.interactions` 与详情互动字段。
  - `apps/server/tests/posts.test.ts`：缺少 viewer 权限字段、可见性控制和通知偏好行为。
- Green（通过结果）：
  - `bunx vitest run --root . --config vitest.config.ts apps/server/tests/auth.test.ts`
  - `bunx vitest run --root . --config vitest.config.ts apps/server/tests/models.test.ts`
  - `bunx vitest run --root . --config vitest.config.ts apps/server/tests/posts.test.ts`
  - `bunx vitest run --root . --config vitest.config.ts apps/server/tests/content-closure.test.ts`
  - `bun run --cwd packages/shared typecheck`
  - `bun run --cwd packages/schemas typecheck`
  - `bun run --cwd packages/http-client typecheck`
  - `bun run --cwd apps/server typecheck`
- 说明：并行运行多组 server 集成测试会争用同一测试数据库，已改为串行验证并通过。

## 7. 数据与接口边界
- 新增表：
  - `user_settings`
  - `aircraft_model_interactions`
- 新增 API：
  - `POST /models/:slug/interactions/:type`
- 更新 API：
  - `GET /users/me/profile`
  - `PUT /users/me/profile`
  - `GET /users/:id/profile`
  - `GET /users/:id/content`
  - `GET /models/:slug`
- 返回行为变化：
  - `GET /users/:id/content` 在无内容可见权限时返回 `403`（原先为始终可读）。

## 8. 风险 / 未解决项
- 当前通知偏好仅门控“评论/回复”两类；`mention` 独立事件类型尚未存在，后续若新增事件枚举需补齐映射。
- 可见性控制目前聚焦内容列表访问；若未来引入更多公开资料字段，需要同步按 `profileVisibility` 分级输出。
- migration 仅提供前向变更，未包含回滚 SQL。

## 9. 需要 frontend_implementer 配合的点
- 读取并消费以下新字段：
  - `currentUserProfile.item.phone/profileVisibility/notifyComments/notifyMentions/sessionAlerts/emailDigest`
  - `userProfile.item.viewer.canFollow/canViewProfile/canViewContent`
  - `userContent.items` 的 `favorite-model` 分支
  - `modelDetail.item.interactionSummary/viewer`
- 调用新接口：
  - `apiClient.interactModel(slug, "interested" | "favorite" | "share")`
- 处理 `GET /users/:id/content` 的 `403`（受限态 UI）。

## 10. 推荐的下一步
- 前端按新增契约完成个人中心、设置页与机型详情页联动改造。
- 联调阶段建议做一次端到端校验：`/models/:slug`、`/users/:id/profile`、`/users/:id/content`、`/settings`。
