# 2026-04-19 Admin Message Audit Center Backend Implementation

## 1. 当前实现目标
- 完成 `TASK-AMAC-001`：固定审核消息共享契约、管理端消息中心 / 待办 typed client 基线。
- 完成 `TASK-AMAC-002`：补齐 server 审核系统消息生产链路，并提供 admin 消息中心查询、已读、待办聚合接口。
- 严格保持：
  - `待办` 独立于 `已读`
  - 不引入管理员聊天
  - 评论审核至少进入待办聚合

## 2. 输入依据
- `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`
- `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`
- `docs/plans/2026-04-19-admin-message-audit-center-plan.md`
- `docs/plans/2026-04-18-message-center-rebuild-plan.md`
- 用户补充缺口：`apps/server/src/modules/reviews/reviews.service.ts:updateReviewStatus` 仅改状态不发系统消息。

## 3. 工作区模式
- 执行环境：`danger-full-access`，网络可用。
- 仅在授权路径改动：
  - `packages/schemas`
  - `packages/http-client`
  - `packages/shared`
  - `apps/server`
- 未改动：
  - `apps/admin/**`
  - `packages/db/**`
  - 根配置、`.env.example`、README、脚本

## 4. 变更文件 / 变更范围
- `packages/shared/src/index.ts`
  - 新增 admin 消息中心 API 路由常量：
    - `API_ROUTES.admin.messages`
    - `API_ROUTES.admin.messagesReadAll`
    - `API_ROUTES.admin.messageRead(id)`
    - `API_ROUTES.admin.messageTodos`
  - 新增 admin 前端路由常量：
    - `APP_ROUTES.adminMessages`
    - 评论域相关 admin 路由常量
- `packages/schemas/src/social.ts`
  - 扩展 `messageTypeSchema`：新增 `review_status_changed`
  - 新增管理端消息 / 待办契约：
    - `adminMessageDomainSchema`
    - `adminMessageListQuerySchema`
    - `adminMessageListResponseSchema`
    - `adminModerationTodosResponseSchema`
  - 增加 `adminMessageListQuerySchema` 的 `domain / type` 组合约束，避免共享契约层放过无意义查询组合
- `packages/schemas/tests/social.test.ts`
  - 新增 admin 消息中心契约解析测试
  - 新增不兼容 `domain / type` 组合的约束测试
- `packages/http-client/src/index.ts`
  - 新增 admin 消息 typed client：
    - `listAdminMessages(query)`
    - `listAdminModerationTodos()`
    - `markAdminMessageRead(id)`
    - `markAllAdminMessagesRead()`
  - 新增 admin 消息查询字符串构建
- `packages/http-client/tests/admin-messages.test.ts`
  - 覆盖 admin 消息列表、待办查询、单条已读、批量已读请求行为
- `apps/server/src/modules/social/notification-types.ts`
  - 扩展通知类型：新增 `review_status_changed`，并归类为 `system`
- `apps/server/src/modules/social/social.repo.ts`
  - 新增 `listAdminUsers()`
  - 新增 `getAdminModerationTodoCounts()`
  - 新增 admin inbox 定向查询 / 计数 / 已读方法，避免误伤管理员名下其他通知
- `apps/server/src/modules/social/social.service.ts`
  - `recordSystemNotification`
    - 保持原作者通知
    - 同步 fan-out 到 admin inbox（`metadata.adminInbox = true`）
  - `listAdminMessages(...)`
    - 使用 repo 层 admin inbox 过滤
    - 支持 `domain / type / readStatus / limit`
  - `markAllAdminMessagesRead(...)` 与 `markAdminMessageRead(...)` 仅作用于 admin inbox
  - `listAdminModerationTodos()` 保持待办与已读解耦
- `apps/server/src/modules/social/social.route.ts`
  - 新增 admin 路由：
    - `GET /admin/messages`
    - `POST /admin/messages/read-all`
    - `POST /admin/messages/:id/read`
    - `GET /admin/messages/todos`
- `apps/server/src/modules/reviews/reviews.service.ts`
  - `updateReviewStatus` 新增系统消息生产：`review_status_changed`
- `apps/server/src/openapi/components.ts`
  - 注册 `AdminMessageListResponse`、`AdminModerationTodosResponse`
- `apps/server/src/openapi/paths/social.ts`
  - 新增 admin 消息中心 / 待办 OpenAPI path 描述
- `apps/server/tests/posts.test.ts`
  - 增强集成断言：
    - review 状态变更产出 `review_status_changed`
    - admin 消息中心查询 / 已读可用
    - 待办独立于已读
    - `read-all` 不误伤非 admin inbox 通知

## 5. 实现说明

### 5.1 消息契约收敛
- 在共享 schema 层统一定义 admin 消息域、查询参数、消息导航信息与待办聚合结构，避免 server / admin 二次发明 DTO。
- 在 query schema 层直接约束不兼容的 `domain / type` 组合，让前端在共享契约入口就能被拦住。

### 5.2 审核系统消息补齐
- 将 review 审核状态变化正式纳入系统消息类型，并在 `reviewsService.updateReviewStatus` 中落生产逻辑。

### 5.3 admin 消息中心可消费性
- 继续使用现有 `notifications` 持久化结构，不改 DB。
- 在 `recordSystemNotification` 中同步写入 admin inbox 副本，保证管理端可以直接读取审核状态变化。

### 5.4 待办与已读解耦
- 待办来自业务状态实时聚合（`pending / submitted`），不依赖通知已读位。
- 已读接口只影响 admin inbox 消息读取状态，不影响待办聚合结果。

### 5.5 repo 层过滤与边界修正
- `listAdminMessages` 不再先读该管理员全部通知再内存裁剪，而是把：
  - `adminInbox`
  - `readStatus`
  - `type`
  - `limit`
  下推到 repo 层。
- `read-all` 只标记 `adminInbox = true` 的消息，修复了 review_qa 抓到的越界问题。

## 6. TDD 证据

### TASK-AMAC-001：共享契约 Red → Green
#### Red
- 命令：
  - `bunx vitest run --config ./vitest.config.ts packages/schemas/tests/social.test.ts`
- 结果：
  - 失败
  - 新增断言 `expect(result.success).toBe(false)` 实际收到 `true`
- 结论：
  - 说明共享契约层放过了不兼容的 `domain / type` 查询组合

#### Green
- 修复点：
  - `adminMessageListQuerySchema` 增加 `superRefine`
  - 共享 schema 层直接拒绝不兼容组合
- 命令：
  - `bunx vitest run --config ./vitest.config.ts packages/schemas/tests/social.test.ts packages/http-client/tests/admin-messages.test.ts`
- 结果：
  - 通过（2 files, 7 tests）

### TASK-AMAC-002：后端 read-all 边界 Red → Green
#### Red
- 命令：
  - `bun run --cwd apps/server test posts.test.ts`
- 结果：
  - 失败
  - 新增断言 `expect(untouchedNotification[0]?.isRead).toBe(false)` 实际收到 `true`
- 结论：
  - 证明 `/admin/messages/read-all` 会误把非 `adminInbox` 通知一并标记已读

#### Green
- 修复点：
  - repo 新增 admin inbox 定向已读方法
  - route / service 改为只操作 admin inbox
- 命令：
  - `bun run --cwd apps/server test posts.test.ts`
- 结果：
  - 通过（17 files, 115 tests）

## 7. 测试和验证结果

### 定向测试
- `bunx vitest run --config ./vitest.config.ts packages/schemas/tests/social.test.ts packages/http-client/tests/admin-messages.test.ts`
  - 通过（2 files, 7 tests）
- `bun run --cwd apps/server test posts.test.ts`
  - 通过（含 review 系统消息、admin 消息中心 / 待办、read-all 边界断言）
- `bun run --cwd apps/server test reviews.test.ts`
  - 通过

### 相关 typecheck
- `bun run --cwd packages/shared typecheck`：通过
- `bun run --cwd packages/schemas typecheck`：通过
- `bun run --cwd packages/http-client typecheck`：通过
- `bun run --cwd apps/server typecheck`：通过

### 根级验证（按仓库 L5）
- `bun run lint`：通过
- `bun run typecheck`：通过
- `bun run test`：通过
- `bun run build`：通过

## 8. 数据与接口边界
- 数据层：未修改 `packages/db` 结构 / 迁移 / seed
- 接口层：所有新增 admin 消息中心 / 待办接口均通过 `@feijia/shared` + `@feijia/schemas` 定义，并由 `@feijia/http-client` 消费
- server 未新增 admin 私有 DTO；路由响应统一走共享 schema parse

## 9. 风险 / 未解决项
- 当前 admin inbox 采用系统消息 fan-out 方案实现，无 DB 结构升级；管理员账号数显著增加时，单次状态变更的写入放大会增加。
- `domain` 仍通过 type → domain 映射完成；如果未来消息域继续扩张，可再评估是否把 domain 做成更直接的索引字段。

## 10. 需要前端配合的点
- admin 侧通过 `@feijia/http-client` 接入：
  - `listAdminMessages`
  - `listAdminModerationTodos`
  - `markAdminMessageRead`
  - `markAllAdminMessagesRead`
- 前端可直接消费 `navigation.href + navigation.filters` 做统一跳转 / 筛选。
- `domain` 枚举已固定，前端无需再定义第二套消息域协议。

## 11. 推荐的下一步
1. 在 `apps/admin` 接入新 typed client 与 schema，完成消息中心页与首页待办联动。
2. 执行人工回归，确认消息生成、待办计数、已读操作和审核落点全部闭环。
3. 如后续需要降低 fan-out 成本，可评估“admin inbox 专表 / 异步任务”作为下一阶段演进。
