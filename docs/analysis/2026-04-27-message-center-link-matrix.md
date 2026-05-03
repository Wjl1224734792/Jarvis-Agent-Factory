# 2026-04-27 消息中心链路矩阵

## Phase A 边界

- 任务：`TASK-MCLO-005 Phase A`
- 方式：只读盘点现有 Web / Admin / Server / Shared 消息链路，创建链路矩阵。
- 本阶段不修改生产代码、测试代码、`packages/*`、`apps/*` 或根配置。
- 本矩阵用于后续 `TASK-MCLO-001` 到 `TASK-MCLO-004` 的最小修复输入。

## 输入文档

- `docs/requirements/2026-04-27-message-center-link-optimization-requirements.md`
- `docs/tasks/2026-04-27-message-center-link-optimization-tasks.md`
- `docs/plans/2026-04-27-message-center-link-optimization-plan.md`
- `docs/plans/2026-04-18-message-center-rebuild-plan.md`
- `docs/plans/2026-04-19-admin-message-audit-center-plan.md`

## 共享契约基线

- Schema：`packages/schemas/src/social.ts`
  - Web 消息：`messageCategorySchema`、`messageTypeSchema`、`messageTargetTypeSchema`、`messageCardSchema`、`notificationsResponseSchema`
  - Admin 消息：`adminMessageDomainSchema`、`adminMessageReadStatusSchema`、`adminMessageNavigationSchema`、`adminMessageListResponseSchema`、`adminModerationTodosResponseSchema`
- Typed client：`packages/http-client/src/index.ts`
  - Web：`listNotifications`、`markNotificationRead`、`markAllNotificationsRead`
  - Admin：`listAdminMessages`、`listAdminModerationTodos`、`markAdminMessageRead`、`markAllAdminMessagesRead`
- Shared routes：`packages/shared/src/index.ts`
  - Web：`APP_ROUTES.notifications`、`APP_ROUTES.postDetail`、`APP_ROUTES.rankingDetail`、`APP_ROUTES.ratingTargetDetail`、`APP_ROUTES.webProfile`
  - Admin：`APP_ROUTES.adminMessages`、Admin 审核域 route 常量
  - API：`API_ROUTES.social.notifications`、`notificationsReadAll`、`notificationRead`、`API_ROUTES.admin.messages`、`messagesReadAll`、`messageRead`、`messageTodos`

## 链路矩阵

| link_id | side | entry | client_method | server_endpoint | server_logic | shared_contract | state_refresh | target_destination | current_status | owner_task | test_anchor |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `WEB-ENTRY` | web | `web-top-nav.tsx` 顶栏铃铛、`profile-page.tsx` 个人页消息入口、`/notifications` 页面 | `apiClient.listNotifications` via `useNotifications` | `GET API_ROUTES.social.notifications` | `socialService.listNotifications` -> `socialRepo.listNotifications`，按 `isRead` 汇总 unread 与分类计数 | `notificationsResponseSchema`、`messageCardSchema`、`APP_ROUTES.notifications` | `getNotificationsQueryKey(userId)`；登录态恢复后由 `shouldFetchNotifications` 控制拉取 | `/notifications` | `pass` | `TASK-MCLO-003` | `apps/web/tests/notification-state.test.ts`、`apps/web/tests/web-top-nav.test.ts` |
| `WEB-ACTION` | web | 消息中心单条点击、批量“全部已读” | `apiClient.markNotificationRead(id)`、`apiClient.markAllNotificationsRead()` | `POST API_ROUTES.social.notificationRead(id)`、`POST API_ROUTES.social.notificationsReadAll` | `socialService.markNotificationRead` / `markAllNotificationsRead` -> repo 仅更新 `notificationsTable.isRead` | `actionSuccessResponseSchema`、`API_ROUTES.social.*` | 操作后 `invalidateQueries({ queryKey: getNotificationsQueryKey(authUserId) })`，刷新列表与入口 unread | 保持当前页面或先打开目标页后标记已读 | `pass` | `TASK-MCLO-003` | `apps/web/tests/message-actions.test.ts`、`apps/web/tests/message-center.test.ts` |
| `WEB-TARGET` | web / server | 消息卡片 target -> `message-center.ts` 适配 -> `message-actions.ts` 打开 | 无额外 client；消费 `listNotifications` 返回的 `target.href` / `target.type` | `GET API_ROUTES.social.notifications` | `socialService.listNotifications` 消费通知 target 字段；各业务模块调用 `socialService.recordNotification` / `recordSystemNotification` 生成系统消息 href | `messageTargetTypeSchema`、`APP_ROUTES.postDetail`、`APP_ROUTES.rankingDetail`、`APP_ROUTES.ratingTargetDetail`、`APP_ROUTES.webProfile` | 点击后如未读则调用单条已读并刷新 `getNotificationsQueryKey(authUserId)` | 帖子/评论 -> `/posts/:id`；用户 -> `/users/:id`；榜单 -> `/rankings/:id`；评分对象 -> `/rating-targets/:id`；机型投稿 -> `/publish/aircraft?edit=:id`；品牌申请 -> `/publish/brand?submitted=:id` | `pass` | `TASK-MCLO-001` / `TASK-MCLO-002` | `packages/schemas/tests/social.test.ts`、`apps/server/tests/social-notification-targets.test.ts`、`apps/server/tests/social-service-notifications.test.ts`、`apps/web/tests/message-actions.test.ts`、`apps/web/tests/message-center.test.ts` |
| `ADMIN-ENTRY` | admin | `admin-shell.tsx` 壳层角标、`admin-overview-page.tsx` 最近消息 / 待办入口、`/admin/messages` | `apiClient.listAdminMessages`、`apiClient.listAdminModerationTodos` | `GET API_ROUTES.admin.messages`、`GET API_ROUTES.admin.messageTodos` | `socialService.listAdminMessages` 聚合 admin inbox；`listAdminModerationTodos` 聚合业务待办 | `adminMessageListResponseSchema`、`adminModerationTodosResponseSchema`、`APP_ROUTES.adminMessages` | shell / overview 均使用 admin messages / todos query key；待后续操作统一 invalidation | `/admin/messages`、`/admin/messages/todos` 或审核域入口 | `pass` | `TASK-MCLO-004` | `apps/admin/tests/admin-message-navigation.test.ts`、`apps/admin/tests/admin-navigation.test.ts` |
| `ADMIN-FILTER` | admin / server | Admin 消息中心 URL query：`domain`、`type`、`readStatus`；待办页 status 过滤 | `apiClient.listAdminMessages(query)`、`apiClient.listAdminModerationTodos()` | `GET API_ROUTES.admin.messages?...`、`GET API_ROUTES.admin.messageTodos` | route 用 `adminMessageListQuerySchema` 解析；service 以 `ADMIN_MESSAGE_TYPES_BY_DOMAIN` 约束 domain/type；todos 从业务待审核状态聚合 | `adminMessageListQuerySchema`、`adminMessageDomainSchema`、`adminMessageReadStatusSchema`、`adminModerationTodosResponseSchema` | query 变化触发对应列表 refetch；不依赖已读状态改变待办 | 消息列表过滤；待办列表按 domain 进入审核页 | `pass` | `TASK-MCLO-001` / `TASK-MCLO-004` | `packages/schemas/tests/social.test.ts`、`packages/http-client/tests/admin-messages.test.ts`、`apps/admin/tests/admin-message-navigation.test.ts`、`apps/server/tests/social-service-notifications.test.ts` |
| `ADMIN-ACTION` | admin / server | Admin 消息中心单条已读、批量已读 | `apiClient.markAdminMessageRead(id)`、`apiClient.markAllAdminMessagesRead()` | `POST API_ROUTES.admin.messageRead(id)`、`POST API_ROUTES.admin.messagesReadAll` | `socialService.markAdminMessageRead` / `markAllAdminMessagesRead` -> repo 仅更新 `metadata.adminInbox = true` 的通知 `isRead`；todos 仍由业务待审核状态计算 | `actionSuccessResponseSchema`、`API_ROUTES.admin.messageRead`、`API_ROUTES.admin.messagesReadAll` | `invalidateAdminMessageQueries` 覆盖 `["admin-messages"]` 前缀，实际覆盖 shell、overview、messages、todos 查询；额外 overview key 为兼容性冗余 | 保持当前消息页 / 首页摘要 / 壳层角标同步 | `pass` | `TASK-MCLO-004` | `apps/admin/tests/admin-message-navigation.test.ts` |
| `ADMIN-TARGET` | admin / server | Admin 消息 `navigation` / 待办 `navigation` -> `resolveAdminMessageDestination` -> 审核页 | 消费 `listAdminMessages` / `listAdminModerationTodos` 返回的 `navigation` | `GET API_ROUTES.admin.messages`、`GET API_ROUTES.admin.messageTodos` | `toNavigationFilters` 输出 `status`、`targetId`、可选 `rankingId`；rating target 附加 `entity=rating_target`；todos 默认 status | `adminMessageNavigationSchema`、`adminModerationTodoDefaultNavigation`、Admin route constants | 跳转不改缓存；回到列表后由原 query key 保持状态 | canonical / alias 可落到真实审核页：文章、评论、评测、榜单、评分对象、机型投稿、品牌申请；审核页消费 `status` / `targetId` / `rankingId` 等 query | `pass` | `TASK-MCLO-004` | `apps/admin/tests/admin-message-navigation.test.ts`、`apps/admin/tests/admin-navigation.test.ts`、`apps/admin/tests/post-comments-page-helpers.test.ts` |

## 已发现 gap / degraded

### `WEB-TARGET` gap（已修复）

当前 Web 消息 target 适配会优先信任服务端返回的 `target.href`。这意味着只在 `href` 缺失时才会走前端 fallback。

已确认的高优先死链风险已在 `TASK-MCLO-001` / `TASK-MCLO-002` 中修复：

- 旧 `rating_target` href 统一归一到 `/rating-targets/:id`。
- 旧 `aircraft_submission` href 统一归一到 `/publish/aircraft?edit=:id`。
- 旧 `brand_application` href 统一归一到 `/publish/brand?submitted=:id`。
- 历史 seed 中的 `post_status_changed`、`aircraft_submission_status_changed`、`brand_application_status_changed` 以及同类旧系统消息类型已纳入 schema 与 server 类型守卫，避免被响应解析或服务端列表过滤丢弃。

验证锚点：

- `packages/schemas/tests/social.test.ts`
- `apps/server/tests/social-notification-targets.test.ts`
- `apps/server/tests/social-service-notifications.test.ts`

### `ADMIN-FILTER` 兼容项（已收口）

Admin 筛选主链路可用，本轮已补齐历史 admin inbox 状态消息的 domain/type 映射：

- `post_status_changed` -> `posts`
- `ranking_status_changed` -> `rankings`
- `rating_target_status_changed` -> `rating_targets`
- `aircraft_submission_status_changed` -> `aircraft_submissions`
- `brand_application_status_changed` -> `brand_applications`

评论类 domain 当前主要进入 todos；在没有对应 admin inbox message type 时，前端继续清理无效 domain/type 组合，避免 URL query 形成空结果误判为链路失败。若后续要让评论类审核也产出系统消息，需要回流 `TASK-MCLO-001` 新增消息类型与映射。

## 特别核对项

- Web 系统消息 href：`rating_target`、`aircraft_submission`、`brand_application` 是当前最明确 gap。问题不宜在 Web 页面层用私有字符串兼容掩盖，应优先由 server/shared 收敛可消费目标。
- Admin navigation href / filters：当前 `navigation.href` 可经 `app.tsx` alias 或 canonical route 落到真实审核页；`status`、`targetId`、`rankingId`、`entity=rating_target` 等 query 已有目标消费点。
- 已读与待办：Web / Admin 已读操作均只更新通知 `isRead`；Admin todos 由业务对象待审核状态聚合，不被已读操作直接移除。
- Query invalidation：Web 使用 `getNotificationsQueryKey(userId)` 覆盖入口与列表；Admin 使用 `["admin-messages"]` 前缀覆盖 shell、overview、messages、todos 的实际消息查询，额外 overview key 为冗余兼容。

## 当前结论

- `gap`：0 条
- `degraded`：0 条
- `pass`：7 条
- 剩余关注项：评论类审核目前通过 todos 进入，不新增 admin inbox 消息类型；若后续需要评论类系统消息，再回流共享契约扩展。
