# 2026-04-27 消息中心互动链路优化执行计划

## 输入文档

- `docs/requirements/2026-04-27-message-center-link-optimization-requirements.md`
- `docs/tasks/2026-04-27-message-center-link-optimization-tasks.md`
- `docs/plans/2026-04-18-message-center-rebuild-plan.md`
- `docs/plans/2026-04-19-admin-message-audit-center-plan.md`

## Gate B 检查

- 需求文档已明确覆盖 `apps/web`、`apps/admin`、`apps/server`、`packages/schemas`、`packages/http-client`、`packages/shared`。
- 任务文档已拆出 `TASK-MCLO-001` 到 `TASK-MCLO-007`，每个任务都有任务名、类型、优先级、完成标准、DDD 分类、验证策略、风险标记和文件所有权。
- 共享契约顺序已收敛为 `packages/schemas -> packages/http-client -> packages/shared -> apps/server -> apps/web | apps/admin`。
- 本轮边界已确认：不新增实时推送，不做数据库迁移，不重建消息模型，不恢复 `apps/mobiles`。
- 已读 / 待办口径已收敛：消息已读只影响消息 unread 状态，业务对象仍待处理时，待办继续存在。
- 任务文档要求“先产出链路盘点矩阵，再做最小修复”。本计划将其设为 Wave 0 硬前置。

Gate B 通过，可以进入执行规划。进入任何实现修改前必须先完成链路矩阵。

## 当前轮次目标

本轮目标是让消息中心各类互动链路通畅可用。执行顺序必须先用链路矩阵记录现状，再按共享契约、后端、Web、Admin、联调、测试、收口的顺序做最小正确 diff。

成功标准：

- Web 消息入口、列表、分类、未读、单条已读、批量已读、跳转和降级路径可用。
- Admin 壳层角标、首页摘要、消息中心、审核待办、筛选、已读、批量已读和审核页落点可用。
- Server 返回的 DTO、统计、target、navigation、filter 能被 Web 与 Admin 直接消费。
- `packages/*` 中的消息契约、typed client 和共享路由常量不再与应用消费侧漂移。
- 通过定向测试和根级 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build` 验证，若失败需记录原因和影响。

## 当前轮次范围

范围内：

- `packages/schemas/src/social.ts` 及消息契约相关测试。
- `packages/http-client/src/index.ts` 及消息 typed client 相关测试。
- `packages/shared/src/index.ts` 及 `APP_ROUTES` / `API_ROUTES` 相关测试。
- `apps/server/src/modules/social/**`、必要的 `apps/server/src/openapi/**` 消息接口描述和后端测试。
- `apps/web/src/routes/notifications-page.tsx`、`apps/web/src/features/notifications/**`、`apps/web/src/features/auth/*notification*`、`apps/web/src/lib/api-client.ts` 和 Web 相关测试。
- `apps/admin/src/features/messages/**`、`apps/admin/src/features/auth/admin-overview-page.tsx`、`apps/admin/src/features/auth/admin-shell.tsx`、`apps/admin/src/lib/api-client.ts`、`apps/admin/src/lib/admin-routes.ts` 和 Admin 相关测试。
- `docs/analysis/2026-04-27-message-center-link-matrix.md`、必要的实现说明和验证记录。

范围外：

- `packages/db/**`、数据库迁移、seed 重建和消息持久化模型重建。
- WebSocket、SSE、移动端推送、管理员私聊、群聊或协作 IM。
- `.env.example`、根 README、根脚本、端口、CORS、OpenAPI 开关默认策略。
- 无关页面视觉重做、导航大重构、业务流程重构。

## 链路矩阵前置要求

任何实现代理在修改代码前，必须先读取链路矩阵。链路矩阵由 `TASK-MCLO-005` 以 Phase A 只读模式先产出。

矩阵文件：

- `docs/analysis/2026-04-27-message-center-link-matrix.md`

矩阵至少包含这些字段：

| 字段 | 说明 |
|------|------|
| `link_id` | 对应需求 7 条关键链路之一，例如 `WEB-ENTRY`、`ADMIN-FILTER` |
| `side` | `web`、`admin`、`server`、`shared`、`cross` |
| `entry` | 入口页面、按钮、hook、API 或路由 |
| `client_method` | `@feijia/http-client` 方法或应用数据层方法 |
| `server_endpoint` | `API_ROUTES` 与实际 Hono 路由 |
| `server_logic` | service / repo / target 生成位置 |
| `shared_contract` | schema、typed client、route 常量 |
| `state_refresh` | query key、缓存失效或本地状态同步点 |
| `target_destination` | Web href 或 Admin 审核页 query 落点 |
| `current_status` | `pass`、`gap`、`degraded`、`unknown` |
| `owner_task` | 负责修复的 `TASK-MCLO-XXX` |
| `test_anchor` | 已有或需补测试文件 |

矩阵必须覆盖：

1. Web 入口链路：登录态恢复 / 未读数加载 -> 首页或导航入口 -> 消息中心。
2. Web 操作链路：单条已读 / 批量已读 -> 缓存刷新 -> 列表与角标一致。
3. Web 跳转链路：消息 target -> `message-actions` -> 业务目标页或降级。
4. Admin 入口链路：壳层角标 / 首页摘要 / 首页待办 -> 消息中心或待办页。
5. Admin 筛选链路：URL query -> 控件 -> typed client -> server -> 表格或待办列表。
6. Admin 操作链路：单条已读 / 批量已读 -> query invalidation -> 消息中心、首页、壳层同步。
7. Admin 跳转链路：消息 target / navigation -> 审核页路径与 query -> 审核页筛选落点。

## 共享区域唯一责任方

| 区域 | 唯一责任方 | 规则 |
|------|------------|------|
| `packages/schemas/**` | `TASK-MCLO-001` | 只定义消息 DTO、筛选协议、统计结构、target 语义 |
| `packages/http-client/**` | `TASK-MCLO-001` | 只镜像共享契约和 typed client 方法 |
| `packages/shared/**` | `TASK-MCLO-001` | 只维护 `APP_ROUTES`、`API_ROUTES`、共享 target / 路由常量 |
| `apps/server/**` | `TASK-MCLO-002` | 只消费共享契约，不反向发明 server 私有 DTO |
| `apps/web/**` 消息路径 | `TASK-MCLO-003` | 只消费 `@feijia/http-client`、`@feijia/schemas`、`@feijia/shared` |
| `apps/admin/**` 消息路径 | `TASK-MCLO-004` | 只消费 `@feijia/http-client`、`@feijia/schemas`、`@feijia/shared` |
| 自动化测试 | `TASK-MCLO-006` | 在功能任务完成后接手，不与功能任务并行改同一测试文件 |
| 链路矩阵与联调 | `TASK-MCLO-005` | Phase A 只读产矩阵；Phase B 做跨端闭环验证 |
| 收口验证 | `TASK-MCLO-007` | 运行根级验证、人工回归、交接 `review_qa` |

## 并行 / 串行顺序

### Wave 0：只读链路矩阵

- spawn：`TASK-MCLO-005` Phase A，建议 owner 为 `repo_explorer` 或主会话指定的只读联调代理。
- 允许写：仅 `docs/analysis/2026-04-27-message-center-link-matrix.md`。
- 禁止写：所有生产代码、测试代码和共享契约。
- 完成后才能进入 Wave 1。

### Wave 1：共享契约 TDD

- spawn：`TASK-MCLO-001`，owner 为 `backend_implementer`。
- 严格串行。必须基于链路矩阵和现有代码做契约 Red -> Green。
- 完成后冻结 `schemas`、`http-client`、`shared` 的消息口径。

### Wave 2：后端 TDD

- spawn：`TASK-MCLO-002`，owner 为 `backend_implementer`。
- 依赖 `TASK-MCLO-001`。
- 严格串行。后端用例先 Red，再最小实现 Green。

### Wave 3：Web / Admin 前端并行

- spawn：`TASK-MCLO-003` 与 `TASK-MCLO-004`。
- 两者可并行，因为分别写 `apps/web/**` 与 `apps/admin/**`。
- 两者都依赖 `TASK-MCLO-001` 与 `TASK-MCLO-002` 已完成。
- 禁止任何前端代理修改 `packages/**` 或 `apps/server/**`。

### Wave 4：跨端联调

- spawn：`TASK-MCLO-005` Phase B。
- 依赖 `TASK-MCLO-001` 到 `TASK-MCLO-004`。
- 以链路矩阵逐项验收。发现共享缺口回流 `TASK-MCLO-001`，发现服务端语义问题回流 `TASK-MCLO-002`，发现单端消费问题回流 `TASK-MCLO-003` 或 `TASK-MCLO-004`。

### Wave 5：定向测试补齐

- spawn：`TASK-MCLO-006`。
- 依赖 Wave 4 的矩阵状态和问题归属。
- 只改测试和必要测试夹具，不改生产契约。

### Wave 6：最终验证与评审交接

- 执行：`TASK-MCLO-007`，由主会话或收口责任方完成。
- 运行根级验证命令和人工回归。
- 将矩阵、实现说明、测试结果交给 `review_qa`。

## 不允许并行修改的路径

- `packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`：只允许 `TASK-MCLO-001` 写。
- `apps/server/**`：只允许 `TASK-MCLO-002` 写。
- `apps/web/src/routes/notifications-page.tsx`、`apps/web/src/features/notifications/**`、`apps/web/src/features/auth/*notification*`：只允许 `TASK-MCLO-003` 写。
- `apps/admin/src/features/messages/**`、`apps/admin/src/features/auth/admin-overview-page.tsx`、`apps/admin/src/features/auth/admin-shell.tsx`、`apps/admin/src/lib/admin-routes.ts`：只允许 `TASK-MCLO-004` 写。
- 同一测试文件不得由功能任务和 `TASK-MCLO-006` 同时修改。功能任务完成后，测试任务再接手。

## TDD 执行规则

`TASK-MCLO-001` 与 `TASK-MCLO-002` 必须按 Red -> Green -> Refactor 串行执行。

Red：

- 先写或修正能暴露契约 / 服务端问题的失败测试。
- 运行定向测试，记录失败断言、失败文件和失败原因。

Green：

- 只写让 Red 测试通过的最小实现。
- 运行同一组定向测试，确认通过。

Refactor：

- 只做必要整理，删除本 diff 引入的未使用符号。
- 不做无关重构，不扩大消息模型，不改数据库。

`TASK-MCLO-003`、`TASK-MCLO-004`、`TASK-MCLO-005`、`TASK-MCLO-006` 使用 `test_after`，但如果实现者在排查中发现稳定复现的坏链路，允许先补定向失败用例再修复。

## 风险

- 共享契约漂移：Web、Admin、Server 各自补丁化会让链路矩阵无法收敛。
- 待办 / 已读口径误伤：批量已读不得移除业务仍待处理的待办。
- Web target 死链：历史消息缺少 target 或 href 时，必须降级，不得运行时异常。
- Admin 审核页落点漂移：跳到审核页但 query 不被页面消费，视为链路未通。
- 联调阶段越权修复：联调代理不得直接改共享契约或服务端语义。
- 根配置扩张：一旦需要 env、DB、CORS、OpenAPI 开关或根脚本改动，本轮必须暂停并提交 plan patch。

## 升级规则

- 需要改 `packages/db/**`、迁移、seed、消息持久化结构：停止实现，提交 plan patch。
- 需要新增 WebSocket、SSE、移动端推送、管理员私聊或新消息业务域：停止实现，提交 scope change。
- 需要新增共享字段、共享 target、共享 filter、共享路由常量：回流 `TASK-MCLO-001`，不得由应用层本地兼容。
- 需要改变 server 统计、已读写回或 target 生成语义：回流 `TASK-MCLO-002`。
- 需要修改 `.env.example`、根 README、根脚本、端口、CORS 或 OpenAPI 开关默认值：停止实现，由编排者确认唯一责任方。
- 发现两个代理需要写同一文件：后启动代理暂停，回编排者重排文件所有权。

## 实现者交接信息

所有实现代理启动前必须输出 Execution Acknowledgement，至少包含：

- 本次只实现的任务 ID 与范围。
- 不会修改的路径。
- 已读取的上游文档与链路矩阵。
- 预计修改文件。
- 依赖的共享契约 / API / query key。
- 发现冲突时回退给 orchestrator 的条件。

实现者统一遵守：

- HTTP 使用 `@feijia/http-client`。
- 类型使用 `@feijia/schemas`。
- 路径常量使用 `@feijia/shared`。
- 应用内禁止重复定义共享 DTO、target、filter 或路由常量。
- 历史消息缺少可落地目标时必须走明确降级路径。
- 任何“待办独立于已读”的语义不得在前端被改写。

## Execution Packets

## Execution Packet

### task_id
TASK-MCLO-001

### task_name
消息链路共享契约基线校验与最小修正

### owner
`backend_implementer`

### objective
基于链路矩阵校验 Web、Admin、Server 当前消息 DTO、筛选参数、统计结构、已读接口、批量已读接口、target 与路由常量，修正共享契约漂移，并冻结下游唯一消费口径。

### in_scope
- 读取链路矩阵中所有 `shared` 与 `cross` 缺口。
- 校验 `packages/schemas/src/social.ts` 的消息 category、type、target、admin domain、read status、navigation、todos 结构。
- 校验 `packages/http-client/src/index.ts` 的 `listNotifications`、`markNotificationRead`、`markAllNotificationsRead`、`listAdminMessages`、`listAdminModerationTodos`、`markAdminMessageRead`、`markAllAdminMessagesRead`。
- 校验 `packages/shared/src/index.ts` 的 `APP_ROUTES`、`API_ROUTES.social.*`、`API_ROUTES.admin.messages*`。
- 先写失败的契约 / typed client 测试，再做最小修正。

### out_of_scope
- 不修改 `apps/server/**`、`apps/web/**`、`apps/admin/**`。
- 不修改 `packages/db/**`、迁移、seed。
- 不新增实时推送或新消息模型。

### input_documents
- `docs/requirements/2026-04-27-message-center-link-optimization-requirements.md`
- `docs/tasks/2026-04-27-message-center-link-optimization-tasks.md`
- `docs/plans/2026-04-27-message-center-link-optimization-plan.md`
- `docs/analysis/2026-04-27-message-center-link-matrix.md`
- `docs/plans/2026-04-18-message-center-rebuild-plan.md`
- `docs/plans/2026-04-19-admin-message-audit-center-plan.md`

### allowed_paths
- `packages/schemas/src/social.ts`
- `packages/schemas/tests/social.test.ts`
- `packages/http-client/src/index.ts`
- `packages/http-client/tests/admin-messages.test.ts`
- `packages/http-client/tests/**/*.test.ts` 中与消息 typed client 直接相关的测试
- `packages/shared/src/index.ts`
- `packages/shared/tests/api-routes.test.ts`

### forbidden_paths
- `apps/**`
- `packages/db/**`
- `.env.example`
- `README.md`
- 根配置文件

### dependencies
- Wave 0 链路矩阵已完成。
- 根 AGENTS L0-L3、`packages/AGENTS.md` 已读取。

### acceptance_criteria
- 共享 schema 可表达 Web 与 Admin 现有消息链路所需字段。
- typed client 方法与共享 route 常量一致。
- `待办` 独立于 `已读` 的口径在契约层没有歧义。
- 下游无需在应用内重复定义消息 DTO、target、filter 或 route 常量。
- 定向测试已按 Red -> Green 通过。

### test_strategy
`tdd`

Red：

- 先补或修正 `packages/schemas/tests/social.test.ts` 与 typed client 测试，暴露字段、枚举、query、route 或 response 漂移。

Green：

- 最小修改 `packages/schemas`、`packages/http-client`、`packages/shared` 让测试通过。

Refactor：

- 删除本 diff 引入的未使用导入，保持共享包只承载共享契约。

### handoff_notes
- 向 `TASK-MCLO-002` 交付冻结后的 schema、client 方法、route 常量和读写接口口径。
- 向 `TASK-MCLO-003` 与 `TASK-MCLO-004` 标明前端只可消费的 target、filter 和统计字段。

### escalation_rule
如需改数据库、根配置、OpenAPI 开关默认策略或应用层大范围适配，停止并回编排者。

## Execution Packet

### task_id
TASK-MCLO-002

### task_name
后端消息查询、已读写回、计数与跳转载荷修通

### owner
`backend_implementer`

### objective
基于冻结的共享契约修通 server 侧消息列表、统计、已读写回、批量已读、Admin 待办聚合和 target / navigation 生成链路。

### in_scope
- 校验并修复 `apps/server/src/modules/social/social.route.ts` 的消息路由解析与响应 schema。
- 校验并修复 `apps/server/src/modules/social/social.service.ts` 的 `listNotifications`、`listAdminMessages`、`listAdminModerationTodos`、已读写回和 target / navigation 生成。
- 校验并修复 `apps/server/src/modules/social/social.repo.ts` 的查询、统计、已读写回与 Admin inbox 过滤。
- 校验 `apps/server/src/modules/social/notification-types.ts` 与共享 schema 的消息 type / category 一致性。
- 必要时更新现有消息 OpenAPI path 描述，但不得改 `/docs`、`OPENAPI_ENABLED` 或生产默认暴露策略。

### out_of_scope
- 不修改 `packages/**`。
- 不修改 `apps/web/**`、`apps/admin/**`。
- 不新增数据库迁移、seed 或消息表结构。
- 不把待办语义简化成未读消息语义。

### input_documents
- `docs/requirements/2026-04-27-message-center-link-optimization-requirements.md`
- `docs/tasks/2026-04-27-message-center-link-optimization-tasks.md`
- `docs/plans/2026-04-27-message-center-link-optimization-plan.md`
- `docs/analysis/2026-04-27-message-center-link-matrix.md`
- `TASK-MCLO-001` 交接说明

### allowed_paths
- `apps/server/src/modules/social/notification-types.ts`
- `apps/server/src/modules/social/social.repo.ts`
- `apps/server/src/modules/social/social.route.ts`
- `apps/server/src/modules/social/social.service.ts`
- `apps/server/src/openapi/**` 中与消息接口描述直接相关的文件
- `apps/server/tests/**/*.test.ts` 中与消息查询、计数、已读写回、target 生成直接相关的测试
- `apps/server/tests/*test-helpers.ts` 中必要测试辅助方法

### forbidden_paths
- `packages/**`
- `apps/web/**`
- `apps/admin/**`
- `packages/db/**`
- `.env.example`
- `README.md`
- 根配置文件

### dependencies
- `TASK-MCLO-001` 完成并冻结共享契约。
- Wave 0 链路矩阵已指出 server 缺口。

### acceptance_criteria
- Web 消息列表、分类统计、未读计数、单条已读、批量已读的服务端链路可用。
- Admin 消息中心、审核待办、首页摘要、壳层角标所需查询和计数可用。
- target / navigation / filter 能被 Web 和 Admin 直接消费。
- 历史消息缺少目标时返回安全可降级信息。
- 定向后端测试已按 Red -> Green 通过。

### test_strategy
`tdd`

Red：

- 先写后端失败用例，覆盖查询、未读统计、单条已读、批量已读、Admin 待办独立于已读、target / navigation 生成。

Green：

- 最小修改 route / service / repo 让失败用例通过。

Refactor：

- 保持 `*.route.ts`、`*.service.ts`、`*.repo.ts` 分层，不引入应用私有 DTO。

### handoff_notes
- 向 Web / Admin 前端代理提供稳定接口形状、query key 影响面、可降级 target 规则和待办 / 已读口径。
- 标记链路矩阵中已经由后端修复的行。

### escalation_rule
如需新增共享字段、数据库字段、迁移、seed 或根级 API 前缀，停止并回编排者。

## Execution Packet

### task_id
TASK-MCLO-003

### task_name
Web 消息中心入口、操作与跳转链路优化

### owner
`frontend_implementer`

### objective
修通用户端消息入口、分类列表、未读状态、单条已读、批量已读、target 跳转和历史消息降级链路。

### in_scope
- 对照链路矩阵修复 Web 入口未读数加载与消息中心列表状态。
- 修复分类切换、空态、错误态、未读态显示。
- 修复单条已读、批量已读后的 query invalidation 或本地状态同步。
- 修复 `message-actions` 到帖子、评论上下文、用户主页、内容状态页、系统消息目标的跳转。
- 对缺 target 或不可落地历史消息提供明确降级。

### out_of_scope
- 不修改 `packages/**`。
- 不修改 `apps/server/**`。
- 不修改 `apps/admin/**`。
- 不重做无关主页、导航或消息中心视觉体系。

### input_documents
- `docs/requirements/2026-04-27-message-center-link-optimization-requirements.md`
- `docs/tasks/2026-04-27-message-center-link-optimization-tasks.md`
- `docs/plans/2026-04-27-message-center-link-optimization-plan.md`
- `docs/analysis/2026-04-27-message-center-link-matrix.md`
- `TASK-MCLO-001`、`TASK-MCLO-002` 交接说明

### allowed_paths
- `apps/web/src/routes/notifications-page.tsx`
- `apps/web/src/features/notifications/message-actions.ts`
- `apps/web/src/features/notifications/message-center.ts`
- `apps/web/src/features/auth/notification-state.ts`
- `apps/web/src/features/auth/use-notifications.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/lib/web-routes.ts` 中与消息 target 打开方式直接相关的最小改动
- `apps/web/tests/message-actions.test.ts`
- `apps/web/tests/message-center.test.ts`
- `apps/web/tests/notification-state.test.ts`
- `apps/web/tests/**/*.test.ts` 中与本任务链路直接相关的测试

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/admin/**`
- `packages/db/**`
- 根配置文件

### dependencies
- `TASK-MCLO-001` 与 `TASK-MCLO-002` 完成。
- 链路矩阵中 Web 行已列出当前状态和缺口。

### acceptance_criteria
- 登录态恢复后未读数加载、入口角标和消息中心列表一致。
- 分类切换、空态、错误态、未读态可用。
- 单条已读、批量已读后入口未读数和列表状态同步。
- target 跳转覆盖帖子、评论、用户主页、内容状态页、系统消息目标。
- 无 target 历史消息走降级，不产生运行时异常。

### test_strategy
`test_after`

- 修复后运行 Web 消息相关定向测试。
- 若链路矩阵中有稳定复现的坏链路，优先补失败测试再修复。

### handoff_notes
- 更新链路矩阵中 Web 行的状态、测试锚点和剩余风险。
- 向 `TASK-MCLO-005` 说明 Web target 降级规则和 query invalidation 口径。

### escalation_rule
如需新增共享 target、共享 response 字段或后端行为，停止并回流 `TASK-MCLO-001` 或 `TASK-MCLO-002`。

## Execution Packet

### task_id
TASK-MCLO-004

### task_name
Admin 消息中心、待办、计数与审核跳转链路优化

### owner
`frontend_implementer`

### objective
修通管理端壳层角标、首页摘要、消息中心、审核待办、筛选、已读、批量已读和审核页跳转落点。

### in_scope
- 对照链路矩阵修复 Admin 壳层角标、首页最近通知、首页待办入口。
- 修复消息中心业务域、消息类型、已读状态筛选链路。
- 修复待办页与首页待办的计数和跳转。
- 修复单条已读、批量已读后的 query invalidation。
- 修复 `admin-message-navigation` 到审核页路径与 query 的落点。
- 保持 Ant Design 后台体系。

### out_of_scope
- 不修改 `packages/**`。
- 不修改 `apps/server/**`。
- 不修改 `apps/web/**`。
- 不重构 Admin 壳层、导航或审核页整体结构。

### input_documents
- `docs/requirements/2026-04-27-message-center-link-optimization-requirements.md`
- `docs/tasks/2026-04-27-message-center-link-optimization-tasks.md`
- `docs/plans/2026-04-27-message-center-link-optimization-plan.md`
- `docs/analysis/2026-04-27-message-center-link-matrix.md`
- `TASK-MCLO-001`、`TASK-MCLO-002` 交接说明
- `docs/plans/2026-04-19-admin-message-audit-center-plan.md`

### allowed_paths
- `apps/admin/src/features/messages/admin-message-navigation.ts`
- `apps/admin/src/features/messages/admin-messages-page.tsx`
- `apps/admin/src/features/messages/admin-moderation-todos-page.tsx`
- `apps/admin/src/features/auth/admin-overview-page.tsx`
- `apps/admin/src/features/auth/admin-shell.tsx`
- `apps/admin/src/lib/api-client.ts`
- `apps/admin/src/lib/admin-routes.ts`
- `apps/admin/src/features/**` 中审核页 query 消费的最小接线改动
- `apps/admin/tests/admin-message-navigation.test.ts`
- `apps/admin/tests/admin-navigation.test.ts`
- `apps/admin/tests/**/*.test.ts` 中与本任务链路直接相关的测试

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/web/**`
- `packages/db/**`
- 根配置文件

### dependencies
- `TASK-MCLO-001` 与 `TASK-MCLO-002` 完成。
- 链路矩阵中 Admin 行已列出当前状态和缺口。

### acceptance_criteria
- 壳层角标、首页摘要、消息中心统计和待办计数口径一致。
- URL query、筛选控件、typed client 参数、server 响应、表格 / 待办列表链路可用。
- 单条已读、批量已读后消息中心、首页摘要、壳层角标同步刷新。
- 消息 target / navigation 能落到审核页，并被审核页消费。
- Admin 不本地发明共享 DTO、target 或 filter。

### test_strategy
`test_after`

- 修复后运行 Admin 消息、导航、审核页 query 相关定向测试。
- 若链路矩阵中有稳定复现的坏链路，优先补失败测试再修复。

### handoff_notes
- 更新链路矩阵中 Admin 行的状态、测试锚点和剩余风险。
- 向 `TASK-MCLO-005` 说明每个 domain 的目标审核页、query 参数和预期落点。

### escalation_rule
如需新增共享 target、共享 filter、共享路由常量或后端聚合语义，停止并回流 `TASK-MCLO-001` 或 `TASK-MCLO-002`。

## Execution Packet

### task_id
TASK-MCLO-005

### task_name
跨端计数、缓存失效与跳转闭环联调

### owner
`repo_explorer`（Phase A） / `review_qa` 或主会话指定的联调代理（Phase B）

### objective
先产出链路矩阵，再在实现完成后按矩阵验证 Web、Admin、Server、shared 的计数、缓存失效和跳转闭环。

### in_scope
- Phase A：只读扫描现有链路，创建链路矩阵。
- Phase B：按链路矩阵验证 7 条关键链路。
- 标记 Web 与 Admin 已读操作后是否误伤待办计数。
- 标记 target / navigation 是否落到预期页面。
- 将缺口回流给唯一责任方，不在联调任务里越权修契约。

### out_of_scope
- Phase A 不修改任何生产代码或测试代码。
- Phase B 不直接修改 `packages/**` 或 `apps/server/**`。
- 不把共享或后端缺口转成页面私有兼容。

### input_documents
- `docs/requirements/2026-04-27-message-center-link-optimization-requirements.md`
- `docs/tasks/2026-04-27-message-center-link-optimization-tasks.md`
- `docs/plans/2026-04-27-message-center-link-optimization-plan.md`
- `docs/plans/2026-04-18-message-center-rebuild-plan.md`
- `docs/plans/2026-04-19-admin-message-audit-center-plan.md`
- Phase B 还需读取 `TASK-MCLO-001` 到 `TASK-MCLO-004` 的交接说明

### allowed_paths
- Phase A：`docs/analysis/2026-04-27-message-center-link-matrix.md`
- Phase B：`docs/analysis/2026-04-27-message-center-link-matrix.md`
- Phase B：必要的联调记录文档
- Phase B：经编排者确认后的本轮已触达路径极小阻塞修复

### forbidden_paths
- Phase A：除链路矩阵文档外的所有路径
- Phase B：未经对应责任方确认的 `packages/**`、`apps/server/**`、Web / Admin 核心消息文件
- `packages/db/**`
- 根配置文件

### dependencies
- Phase A 无实现依赖，必须最先执行。
- Phase B 依赖 `TASK-MCLO-001` 到 `TASK-MCLO-004` 完成。

### acceptance_criteria
- Phase A 输出完整链路矩阵，覆盖 7 条关键链路。
- Phase B 矩阵中每条链路都有 `pass`、`degraded` 或明确 `gap` 归属。
- Web 与 Admin 已读 / 批量已读不误伤待办计数。
- Web target 与 Admin target / filter 均有可验证落点或明确降级。
- 联调暴露的共享或后端问题已回流对应任务。

### test_strategy
`test_after`

- Phase A 不运行测试，只做只读盘点。
- Phase B 运行相关定向验证命令或记录人工复现步骤。

### handoff_notes
- Phase A 完成后通知 `TASK-MCLO-001` 使用矩阵作为输入。
- Phase B 完成后通知 `TASK-MCLO-006` 根据矩阵缺口补测试。

### escalation_rule
如矩阵发现必须新增 DB 字段、实时推送、新消息模型、共享协议无法表达的 target / filter，停止并回编排者。

## Execution Packet

### task_id
TASK-MCLO-006

### task_name
消息链路定向测试补齐

### owner
`frontend_test_worker` / `backend_test_worker`，由编排者按缺口拆分；若只能单代理执行，则 owner 为 `review_qa`

### objective
根据链路矩阵和已完成实现补齐本轮直接相关的共享契约、后端、Web、Admin 定向测试。

### in_scope
- 补齐共享契约 / typed client 的消息查询、筛选、已读、批量已读、target 类型测试。
- 补齐后端查询、统计、已读写回、待办独立于已读、target 生成测试。
- 补齐 Web 消息入口、分类切换、已读操作、跳转降级测试。
- 补齐 Admin 筛选、计数刷新、已读操作、审核页跳转落点测试。

### out_of_scope
- 不修改生产代码，除非测试辅助方法必须跟随已有公开测试接口做极小调整。
- 不扩大到实时推送、新消息模型或无关页面测试。
- 不为通过测试改写生产契约。

### input_documents
- `docs/requirements/2026-04-27-message-center-link-optimization-requirements.md`
- `docs/tasks/2026-04-27-message-center-link-optimization-tasks.md`
- `docs/plans/2026-04-27-message-center-link-optimization-plan.md`
- `docs/analysis/2026-04-27-message-center-link-matrix.md`
- `TASK-MCLO-001` 到 `TASK-MCLO-005` 交接说明

### allowed_paths
- `packages/schemas/tests/**/*.test.ts`
- `packages/http-client/tests/**/*.test.ts`
- `packages/shared/tests/**/*.test.ts`
- `apps/server/tests/**/*.test.ts`
- `apps/server/tests/*test-helpers.ts`
- `apps/web/tests/**/*.test.ts`
- `apps/admin/tests/**/*.test.ts`
- 必要测试夹具或测试辅助文件

### forbidden_paths
- `packages/schemas/src/**`
- `packages/http-client/src/**`
- `packages/shared/src/**`
- `apps/server/src/**`
- `apps/web/src/**`
- `apps/admin/src/**`
- `packages/db/**`
- 根配置文件

### dependencies
- `TASK-MCLO-005` Phase B 完成。
- 对应功能任务已交付，避免同一测试文件并行冲突。

### acceptance_criteria
- 链路矩阵中的每个 `gap` 或 `degraded` 项都有测试覆盖、人工验证记录或明确不可自动化说明。
- 共享、后端、Web、Admin 的定向测试可运行。
- 没有与功能任务并行修改同一测试文件。

### test_strategy
`test_after`

- 优先运行与新增 / 修改测试直接相关的 package 或 app 级测试。
- 将命令、结果和失败原因交给 `TASK-MCLO-007`。

### handoff_notes
- 向 `TASK-MCLO-007` 提供测试命令清单、通过项、失败项和剩余人工验证项。

### escalation_rule
如果测试暴露生产契约缺口，不直接改生产代码，回流对应唯一责任方。

## Execution Packet

### task_id
TASK-MCLO-007

### task_name
最终人工回归与仓库级验证

### owner
主会话 / `review_qa`

### objective
执行仓库级验证和人工回归，基于链路矩阵确认消息中心互动链路是否可交付，并准备评审材料。

### in_scope
- 执行根级 `bun run lint`。
- 执行根级 `bun run typecheck`。
- 执行根级 `bun run test`。
- 执行根级 `bun run build`。
- 人工回归 Web 入口、Web 已读、Web 跳转、Admin 入口、Admin 筛选、Admin 已读、Admin 跳转。
- 更新链路矩阵最终状态和收口验证记录。
- 交接 `review_qa` 做需求 -> 任务 -> 实现 -> 测试追踪。

### out_of_scope
- 不新增业务功能。
- 不绕过失败验证。
- 不把未通过链路包装为完成。
- 不直接修改共享契约、数据库或根配置。

### input_documents
- `docs/requirements/2026-04-27-message-center-link-optimization-requirements.md`
- `docs/tasks/2026-04-27-message-center-link-optimization-tasks.md`
- `docs/plans/2026-04-27-message-center-link-optimization-plan.md`
- `docs/analysis/2026-04-27-message-center-link-matrix.md`
- `TASK-MCLO-001` 到 `TASK-MCLO-006` 交接说明

### allowed_paths
- `docs/analysis/2026-04-27-message-center-link-matrix.md`
- `docs/implementation/2026-04-27-message-center-link-optimization-verification.md`
- 必要的收口文档

### forbidden_paths
- 未经编排者重新分配的生产代码路径
- `packages/db/**`
- `.env.example`
- 根 README
- 根配置文件

### dependencies
- `TASK-MCLO-001` 到 `TASK-MCLO-006` 完成。
- 所有回流项已处理或记录为明确风险。

### acceptance_criteria
- 根级验证命令已执行并记录结果。
- 7 条核心链路人工回归均有通过、降级或失败说明。
- 链路矩阵最终状态可供 `review_qa` 追踪。
- 若存在剩余风险，已明确 owner、影响面和是否需要 plan patch。

### test_strategy
`manual_only`

- 使用根级验证命令和人工回归清单收口。
- 不以局部定向测试替代根级验证。

### handoff_notes
- 向 `review_qa` 提供需求、任务、执行计划、链路矩阵、实现说明、测试结果和人工回归结果。

### escalation_rule
如果最终验证发现必须新增 DB 字段、迁移、实时推送、新消息模型或根配置改动，停止收口并提交 plan patch。

## 推荐下一步

第一波只 spawn `TASK-MCLO-005` Phase A，产出 `docs/analysis/2026-04-27-message-center-link-matrix.md`。

链路矩阵完成后，再按以下顺序推进：

1. `TASK-MCLO-001`
2. `TASK-MCLO-002`
3. 并行 spawn `TASK-MCLO-003` 与 `TASK-MCLO-004`
4. `TASK-MCLO-005` Phase B
5. `TASK-MCLO-006`
6. `TASK-MCLO-007`
