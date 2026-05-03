# 2026-04-19 管理端消息中心与审核系统消息联动审查

## 1. 需求文档路径
- `E:\CodeStore\feijia\docs\requirements\2026-04-19-admin-message-audit-center-requirements.md`

## 2. 任务文档路径
- `E:\CodeStore\feijia\docs\tasks\2026-04-19-admin-message-audit-center-tasks.md`

## 3. 计划文档路径
- `E:\CodeStore\feijia\docs\plans\2026-04-19-admin-message-audit-center-plan.md`

## 4. 前端实现文档路径
- `E:\CodeStore\feijia\docs\implementation\2026-04-19-admin-message-audit-center-admin-implementation.md`
- 补充参考：`E:\CodeStore\feijia\docs\implementation\2026-04-19-admin-message-audit-center-admin-layout-implementation.md`

## 5. 后端实现文档路径
- `E:\CodeStore\feijia\docs\implementation\2026-04-19-admin-message-audit-center-backend-implementation.md`

## 6. 审查结论
**通过**

无阻塞发现。

本次最终审查已复核：
- 需求、任务、计划、前后端实现文档。
- 当前工作区实际代码变更。
- `TASK-AMAC-001` 共享契约 Red → Green 证据。
- `TASK-AMAC-002` `/admin/messages/read-all` 仅作用于 `adminInbox` 的代码与测试证据。
- `TASK-AMAC-006` 真实后台人工回归证据。
- 本次独立执行的根级验证：
  - `bun run lint`：通过
  - `bun run typecheck`：通过
  - `bun run test`：通过
  - `bun run build`：通过

## 7. 需求覆盖情况
- 需求目标“审核系统消息补齐”已覆盖。
  - `packages/schemas/src/social.ts` 已定义 admin 消息域、查询参数、导航结构和待办聚合结构。
  - `apps/server/src/modules/reviews/reviews.service.ts` 已补 `review_status_changed`。
  - `apps/server/tests/posts.test.ts` 已覆盖帖子、评测、榜单、评分对象、机型投稿、品牌申请相关链路与 admin 消息中心行为。
- 需求目标“管理端消息中心 / 审核待办”已覆盖。
  - `apps/admin/src/features/messages/admin-messages-page.tsx` 支持按 `domain`、`type`、`readStatus` 筛选、单条已读、批量已读和跳转。
  - `apps/admin/src/features/messages/admin-moderation-todos-page.tsx` 已消费 `messageTodos` 聚合，并明确“待办独立于已读”。
- 需求目标“传统后台布局重整”已覆盖。
  - `apps/admin/src/features/auth/admin-shell.tsx`、`apps/admin/src/features/auth/admin-navigation.ts`、`apps/admin/src/features/auth/admin-overview-page.tsx` 已完成传统后台骨架、导航和首页重整。
- 需求目标“关键审核页接线”已覆盖。
  - `apps/admin/src/features/messages/admin-message-navigation.ts` 已收敛落点和 query 协议。
  - 文章 / 动态、评论、评测、品牌申请、机型投稿、榜单、评分对象均已接入统一跳转链路。
- 范围外内容未被误扩。
  - 未引入管理员 IM。
  - 未触碰 `packages/db`、根配置、`.env.example`、README。

## 8. 计划一致性
- 与任务拆分一致。
  - `TASK-AMAC-001` 改动集中在 `packages/schemas`、`packages/http-client`、`packages/shared`。
  - `TASK-AMAC-002` 改动集中在 `apps/server/**`。
  - `TASK-AMAC-004 -> TASK-AMAC-003 -> TASK-AMAC-005` 改动集中在 `apps/admin/**`。
  - `TASK-AMAC-006` 的收口证据已回写到实现文档。
- 与执行顺序一致。
  - 共享契约先落，再由 server 和 admin 消费，最后进入联调与审查。
- 与 owner 归属一致。
  - `backend_implementer` 负责共享契约和后端。
  - `frontend_implementer` 负责 admin 壳层、消息中心与审核页接线。
  - 主会话 / `review_qa` 负责最终验证与审查。
- 与 Open Question 结论一致。
  - `待办` 已按“独立于 `已读`”落地，代码、自动化测试和人工回归证据一致。

## 9. 前后端边界一致性
- 共享契约链路一致。
  - `packages/schemas/src/social.ts` 统一定义 admin message / todo schema。
  - `packages/http-client/src/index.ts` 提供 typed client。
  - `packages/shared/src/index.ts` 维护共享 `APP_ROUTES` / `API_ROUTES`。
  - `apps/server/src/modules/social/social.route.ts` 与 `apps/admin/src/lib/api-client.ts` 均消费共享契约。
- `apps/admin` 未重造消息 DTO 或请求协议。
  - 消息页和待办页通过 `@feijia/http-client` 与 `@feijia/schemas` 消费数据。
  - 页面层只做视图映射与 canonical 导航转换。
- `/admin/messages/read-all` 的边界已正确收敛。
  - `apps/server/src/modules/social/social.repo.ts` 通过 `adminInboxFilter()` 限定更新范围。
  - `apps/server/src/modules/social/social.service.ts` 的 `markAllAdminMessagesRead()` 只调用 admin inbox 专用 repo 方法。
  - `apps/server/tests/posts.test.ts` 已断言非 `adminInbox` 通知不会被误伤。
- 根边界安全。
  - 未发现共享类型反向定义。
  - 未发现数据库结构变更。
  - 未发现根配置、环境变量或路由前缀越界改动。

## 10. 测试覆盖状态
- TDD 证据完整度已达到当前任务要求。
  - `docs/implementation/2026-04-19-admin-message-audit-center-backend-implementation.md` 已补 `TASK-AMAC-001` Red → Green。
  - 同文档已补 `TASK-AMAC-002` `/admin/messages/read-all` Red → Green。
- 自动化验证证据完整。
  - 定向测试：
    - `packages/schemas/tests/social.test.ts`
    - `packages/http-client/tests/admin-messages.test.ts`
    - `apps/server/tests/posts.test.ts`
    - `apps/server/tests/reviews.test.ts`
    - `apps/admin/tests/admin-navigation.test.ts`
    - `apps/admin/tests/admin-message-navigation.test.ts`
  - 根级验证：
    - `bun run lint`：通过
    - `bun run typecheck`：通过
    - `bun run test`：通过
    - `bun run build`：通过
- 人工回归证据完整。
  - `docs/implementation/2026-04-19-admin-message-audit-center-admin-implementation.md` 已记录真实后台回归路径和结果。
  - 必要场景均有留痕：
    - `login = true`
    - `overview = true`
    - `generatedMessage = true`
    - `singleRead = true`
    - `bulkRead = true`
    - `messageNavigation = true`
    - `todoNavigation = true`
    - `todoStableAfterSingleRead = true`
    - `todoStableAfterBulkRead = true`

## 11. 问题列表
### 阻塞
- 无。

### 高
- 无。

### 中
1. `admin inbox` 仍采用同步 fan-out 到全部管理员账号的实现，管理员规模显著增长时会放大单次审核状态变更的写入成本。
   - 依据：`apps/server/src/modules/social/social.service.ts`
   - 影响：当前不阻塞交付，但属于后续容量风险。
2. 消息导航语义目前仍分布在 shared 常量、server 导航输出和 admin canonical 映射三处，后续新增 domain / target 时存在同步漂移风险。
   - 依据：`packages/schemas/src/social.ts`、`apps/server/src/modules/social/social.service.ts`、`apps/admin/src/features/messages/admin-message-navigation.ts`
   - 影响：当前功能闭环成立，但扩域时需重点防漂移。

### 低
1. 根级 `build` 已通过，但 `apps/web` 与 `apps/admin` 仍有 Vite 大 chunk warning。
   - 依据：本次独立执行 `bun run build` 输出。
   - 影响：当前不影响放行，属于后续性能治理项。

## 12. 必须修复项
- 无。

## 13. 优化建议
- 若后续继续扩展 admin 消息域，建议把导航协议进一步收敛为单一来源，减少 shared / server / admin 三处并行维护。
- 若管理员数量增长，建议评估把 admin inbox fan-out 演进为异步任务或专用聚合结构。
- 若要继续优化前端性能，建议针对本次 build 中的大 chunk warning 做按路由或按图表能力拆包。

## 14. 回归建议
- 后续凡是新增消息域、调整 `target` / `filters`、或改审核页路由时，至少回归以下场景：
  - 消息生成
  - 单条已读
  - 批量已读
  - 待办计数稳定性
  - 消息跳转落点
  - 待办跳转落点
  - `/admin/messages/read-all` 不误伤非 `adminInbox` 通知
- 若后续改动共享路由常量或 admin canonical 映射，应优先回归评论域和评分对象域的落点参数。

## 15. 追踪矩阵
说明：需求文档未显式编号，以下 `requirement_id` 为本次审查补充的稳定别名。

| requirement_id | task_id | planned_owner | actual_change_files | verification | review_result |
|---|---|---|---|---|---|
| `REQ-01` 审核系统消息共享契约与 typed client 基线 | `TASK-AMAC-001` | `backend_implementer` | `packages/schemas/src/social.ts`<br>`packages/schemas/tests/social.test.ts`<br>`packages/http-client/src/index.ts`<br>`packages/http-client/tests/admin-messages.test.ts`<br>`packages/shared/src/index.ts` | `TASK-AMAC-001` Red → Green 已记录于 backend implementation；定向 schema/client 测试通过；根级 `lint/typecheck/test/build` 通过 | `pass` |
| `REQ-02` 后端审核消息补齐与 admin 查询扩展 | `TASK-AMAC-002` | `backend_implementer` | `apps/server/src/modules/reviews/reviews.service.ts`<br>`apps/server/src/modules/social/notification-types.ts`<br>`apps/server/src/modules/social/social.repo.ts`<br>`apps/server/src/modules/social/social.route.ts`<br>`apps/server/src/modules/social/social.service.ts`<br>`apps/server/src/openapi/components.ts`<br>`apps/server/src/openapi/paths/social.ts`<br>`apps/server/tests/posts.test.ts` | `TASK-AMAC-002` Red → Green 已记录于 backend implementation；`apps/server/tests/posts.test.ts`、`apps/server/tests/reviews.test.ts` 通过；根级验证通过 | `pass` |
| `REQ-03` 管理端消息中心与审核待办落地 | `TASK-AMAC-003` | `frontend_implementer` | `apps/admin/src/features/messages/admin-message-navigation.ts`<br>`apps/admin/src/features/messages/admin-messages-page.tsx`<br>`apps/admin/src/features/messages/admin-moderation-todos-page.tsx`<br>`apps/admin/src/lib/api-client.ts` | `apps/admin/tests/admin-message-navigation.test.ts` 通过；admin `typecheck/build` 通过；人工回归已覆盖消息生成、单条已读、批量已读、待办稳定性 | `pass` |
| `REQ-04` 传统后台布局重整 | `TASK-AMAC-004` | `frontend_implementer` | `apps/admin/src/app.tsx`<br>`apps/admin/src/features/auth/admin-shell.tsx`<br>`apps/admin/src/features/auth/admin-navigation.ts`<br>`apps/admin/src/features/auth/admin-overview-page.tsx`<br>`apps/admin/src/lib/admin-routes.ts`<br>`apps/admin/src/styles.css`<br>`apps/admin/tests/admin-navigation.test.ts` | `apps/admin/tests/admin-navigation.test.ts` 通过；admin `typecheck/build` 通过；首页与壳层人工回归 `overview = true` | `pass` |
| `REQ-05` 消息 / 待办到关键审核页的统一跳转协议 | `TASK-AMAC-005` | `frontend_implementer` | `apps/admin/src/features/posts/posts-page.tsx`<br>`apps/admin/src/features/posts/post-comments-page.tsx`<br>`apps/admin/src/features/reviews/reviews-page.tsx`<br>`apps/admin/src/features/rankings/rankings-page.tsx`<br>`apps/admin/src/features/rankings/rating-targets-page.tsx`<br>`apps/admin/src/features/models/brand-applications-page.tsx`<br>`apps/admin/src/features/submissions/aircraft-submissions-page.tsx` | `apps/admin/tests/admin-message-navigation.test.ts` 通过；人工回归 `messageNavigation = true`、`todoNavigation = true`，并记录落点 URL | `pass` |
| `REQ-06` 联调收口与最终验证 | `TASK-AMAC-006` | `主会话 / review_qa` | `docs/implementation/2026-04-19-admin-message-audit-center-backend-implementation.md`<br>`docs/implementation/2026-04-19-admin-message-audit-center-admin-implementation.md`<br>`docs/review/2026-04-19-admin-message-audit-center-review.md` | 实现文档已补 TDD 与人工回归证据；主会话口径与文档一致；本次独立复跑根级 `lint/typecheck/test/build` 全通过 | `pass` |

## 16. 推荐的下一步
1. 可以按“通过”状态推进编排者后续收尾动作，无需回滚到主会话澄清。
2. 本轮无需再补业务代码修复，后续只需在下一阶段跟踪残余性能与可维护性风险。
3. 若下一轮继续扩展消息域或审核落点，优先把导航协议收敛为单一来源，再做功能扩张。
