# 2026-04-19 管理端消息中心与审核系统消息联动审查

## 1. 输入文档
- `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`
- `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`
- `docs/plans/2026-04-19-admin-message-audit-center-plan.md`
- `docs/implementation/2026-04-19-admin-message-audit-center-backend-implementation.md`
- `docs/implementation/2026-04-19-admin-message-audit-center-admin-implementation.md`
- `docs/implementation/2026-04-19-admin-message-audit-center-admin-layout-implementation.md`

## 2. 审查结论
**通过**

### 结论摘要
- 无阻塞发现。
- 之前识别出的阻塞点已关闭：
  - `/admin/messages/read-all` 现已只处理 `adminInbox`
  - `TASK-AMAC-001 / TASK-AMAC-002` 的 TDD 证据已补齐
  - `TASK-AMAC-006` 的人工回归证据已补齐

## 3. 需求覆盖情况
- 已完成审核系统消息补齐：
  - 帖子 / 动态
  - 评测
  - 榜单
  - 评分对象
  - 机型投稿
  - 品牌申请
- 已完成管理端消息中心与待办页接入。
- 已完成传统管理后台壳层与首页骨架重整。
- 已完成消息中心、首页待办与关键审核页的统一落点接线。

## 4. 功能审查
- `apps/server` 已提供：
  - `GET /admin/messages`
  - `POST /admin/messages/read-all`
  - `POST /admin/messages/:id/read`
  - `GET /admin/messages/todos`
- `apps/admin` 已提供：
  - 消息中心页
  - 审核待办页
  - 首页消息摘要与待办摘要
  - 关键审核页的 `targetId / rankingId / domain / status` 落点承接
- 人工回归已覆盖：
  - 登录后台
  - 首页进入
  - 待办页落点
  - 真实消息生成
  - 单条已读
  - 批量已读
  - 已读后待办计数不变
  - 从消息中心跳回审核页

## 5. 架构审查
- 共享契约顺序保持为：
  - `packages/schemas`
  - `packages/http-client`
  - `packages/shared`
  - `apps/server`
  - `apps/admin`
- 未发现 `packages -> apps` 逆向依赖。
- `apps/admin` 继续通过 `@feijia/http-client` 与 `@feijia/schemas` 消费消息数据，未在页面本地重造 DTO。
- `admin-message-navigation.ts` 已将前端 canonical 落点收敛到统一 helper，避免多页面散落拼装跳转协议。

## 6. 性能审查
- 与初始实现相比，admin 消息查询已把 `adminInbox / readStatus / type / limit` 下推到 repo 层，不再先读全量后内存裁剪。
- 首页只取消息摘要与待办聚合，没有把完整消息列表塞入 overview。
- 仍保留一个中风险残余项：
  - 系统消息 fan-out 到所有管理员账号，后续若管理员数显著增加，写放大会增长。

## 7. 注释与可维护性审查
- 关键边界已有最小必要注释：
  - admin inbox fan-out 的边界
  - canonical 落点 helper 的用途
- 文档层面已补齐：
  - 需求
  - 任务
  - 计划
  - 后端实现说明
  - 前端实现说明
  - TDD 证据
  - 人工回归证据

## 8. 验证证据

### 自动化验证
- `bun run lint`：通过
- `bun run typecheck`：通过
- `bun run test`：通过
- `bun run build`：通过

### TDD 证据
- `TASK-AMAC-001`
  - 共享契约 `domain / type` 不兼容组合的 Red → Green 已记录在 backend implementation 文档
- `TASK-AMAC-002`
  - `read-all` 不误伤非 `adminInbox` 的 Red → Green 已记录在 backend implementation 文档

### 人工回归证据
- 结果：
  - `login = true`
  - `overview = true`
  - `generatedMessage = true`
  - `singleRead = true`
  - `bulkRead = true`
  - `messageNavigation = true`
  - `todoNavigation = true`
  - `todoStableAfterSingleRead = true`
  - `todoStableAfterBulkRead = true`

## 9. 残余风险
- admin inbox 仍采用同步 fan-out，后续可评估异步化或专表聚合。
- server 与 admin 仍各自维护一层消息落点映射；当前可控，但若继续扩 domain，建议进一步收敛唯一来源。
- `styles.css` 历史样式较多，本轮已可用但仍有后续瘦身空间。

## 10. 追踪矩阵
| requirement_id | task_id | executor | changed_files | tests | review_result |
|---|---|---|---|---|---|
| `REQ-01` 审核系统消息共享契约与 typed client 基线 | `TASK-AMAC-001` | `backend_implementer` | `packages/schemas/src/social.ts`, `packages/schemas/tests/social.test.ts`, `packages/http-client/src/index.ts`, `packages/http-client/tests/admin-messages.test.ts`, `packages/shared/src/index.ts` | `packages/schemas/tests/social.test.ts`, `packages/http-client/tests/admin-messages.test.ts`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build` | `pass` |
| `REQ-02` 后端审核消息补齐与 admin 查询扩展 | `TASK-AMAC-002` | `backend_implementer` | `apps/server/src/modules/social/notification-types.ts`, `apps/server/src/modules/social/social.repo.ts`, `apps/server/src/modules/social/social.service.ts`, `apps/server/src/modules/social/social.route.ts`, `apps/server/src/modules/reviews/reviews.service.ts`, `apps/server/src/openapi/components.ts`, `apps/server/src/openapi/paths/social.ts`, `apps/server/tests/posts.test.ts` | `apps/server/tests/posts.test.ts`, `apps/server/tests/reviews.test.ts`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build` | `pass` |
| `REQ-03` 管理端消息中心与待办页 | `TASK-AMAC-003` | `frontend_implementer` | `apps/admin/src/features/messages/admin-message-navigation.ts`, `apps/admin/src/features/messages/admin-messages-page.tsx`, `apps/admin/src/features/messages/admin-moderation-todos-page.tsx`, `apps/admin/src/lib/api-client.ts`, `apps/admin/tests/admin-message-navigation.test.ts` | `apps/admin/tests/admin-message-navigation.test.ts`, `bun run --cwd apps/admin typecheck`, `bun run --cwd apps/admin build`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build` | `pass` |
| `REQ-04` 传统后台壳层与首页重整 | `TASK-AMAC-004` | `frontend_implementer` | `apps/admin/src/app.tsx`, `apps/admin/src/features/auth/admin-navigation.ts`, `apps/admin/src/features/auth/admin-shell.tsx`, `apps/admin/src/features/auth/admin-overview-page.tsx`, `apps/admin/src/lib/admin-routes.ts`, `apps/admin/src/styles.css`, `apps/admin/tests/admin-navigation.test.ts` | `apps/admin/tests/admin-navigation.test.ts`, `bun run --cwd apps/admin typecheck`, `bun run --cwd apps/admin build`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build` | `pass` |
| `REQ-05` 消息 / 待办到审核页统一落点 | `TASK-AMAC-005` | `frontend_implementer` | `apps/admin/src/features/posts/posts-page.tsx`, `apps/admin/src/features/posts/post-comments-page.tsx`, `apps/admin/src/features/reviews/reviews-page.tsx`, `apps/admin/src/features/rankings/rankings-page.tsx`, `apps/admin/src/features/rankings/rating-targets-page.tsx`, `apps/admin/src/features/models/brand-applications-page.tsx`, `apps/admin/src/features/submissions/aircraft-submissions-page.tsx`, `apps/admin/src/app.tsx` | `apps/admin/tests/admin-message-navigation.test.ts`, 人工回归中的 `todoNavigation / messageNavigation` | `pass` |
| `REQ-06` 最终验证与回归闭环 | `TASK-AMAC-006` | `主会话` | `docs/implementation/2026-04-19-admin-message-audit-center-backend-implementation.md`, `docs/implementation/2026-04-19-admin-message-audit-center-admin-implementation.md`, `docs/review/2026-04-19-admin-message-audit-center-review.md` | `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, 人工回归全链路记录 | `pass` |

## 11. 建议
- 当前版本可放行、可提交、可推送。
- 若后续继续演进，优先考虑：
  1. admin fan-out 异步化
  2. 落点映射唯一来源收敛
  3. admin 样式表继续瘦身
