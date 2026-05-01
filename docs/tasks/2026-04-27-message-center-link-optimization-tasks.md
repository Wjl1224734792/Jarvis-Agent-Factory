# 2026-04-27 消息中心互动链路优化任务拆解

## 需求文档路径

- `docs/requirements/2026-04-27-message-center-link-optimization-requirements.md`

## 参考文档

- `docs/requirements/2026-04-18-message-center-rebuild-requirements.md`
- `docs/plans/2026-04-18-message-center-rebuild-plan.md`
- `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`
- `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`
- `docs/plans/2026-04-19-admin-message-audit-center-plan.md`

## 任务概览

- 本轮主线是“链路优化与可用性验证”，只修通现有 Web / Admin / Server / 共享契约之间的读取、筛选、已读、批量已读、计数与跳转链路。
- 本轮不重建消息模型、不新增实时推送、不做数据库迁移；若排查发现不改库无法修通，必须先提交 plan patch / contract change request。
- 共享契约仍按 `packages/schemas -> packages/http-client -> packages/shared -> apps/server -> apps/web | apps/admin` 的顺序评估。
- `packages/schemas`、`packages/http-client`、`packages/shared` 只能由 `TASK-MCLO-001` 统一负责，其他任务不得在应用层补写第二套 DTO、target、filter 或路由常量。
- 需求未给出具体已失效链路清单，因此实现阶段必须先产出链路盘点矩阵，再按本任务边界做最小修复。

## 任务分解列表

### TASK-MCLO-001

- 任务名：消息链路共享契约基线校验与最小修正
- 类型：共享
- 优先级：P0
- 完成标准：
  - 盘点 Web 与 Admin 当前消费的消息 DTO、筛选参数、统计结构、已读接口、批量已读接口、跳转 target 与共享常量。
  - 若发现字段命名、枚举值、target、filter 或 typed client 方法存在漂移，只在 `packages/schemas`、`packages/http-client`、`packages/shared` 中做最小修正。
  - 明确 `待办` 独立于 `已读` 的既有口径：已读只影响消息 unread 状态，不直接移除仍待处理的业务待办。
  - 为 `apps/server`、`apps/web`、`apps/admin` 输出可直接消费的契约口径，不把语义留给页面层字符串判断。
  - 不引入 `packages/db`、迁移、seed 重建或新消息模型。
- DDD 分类：`required`
- 验证策略：`tdd`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：共享契约责任方
  - 允许修改：`packages/schemas/**`、`packages/http-client/**`、`packages/shared/**` 及其直接相关测试
  - 只读参考：`apps/server/**`、`apps/web/**`、`apps/admin/**`
  - 禁止事项：修改 `packages/db/**`；在 `apps/*` 内重复定义消息 DTO、跳转 target、筛选协议、共享路由常量

### TASK-MCLO-002

- 任务名：后端消息查询、已读写回、计数与跳转载荷修通
- 类型：后端
- 优先级：P0
- 完成标准：
  - 盘点并修通用户端消息列表、分类统计、未读计数、单条已读、批量已读的服务端链路。
  - 盘点并修通管理端消息中心、审核待办、首页摘要、壳层角标所需的聚合查询、计数和已读写回链路。
  - 服务端返回的 target / navigation / filter 能被 Web 与 Admin 直接消费；历史消息缺少目标时返回安全可降级的信息，不触发前端运行时异常。
  - 后端不新增 admin 私有 DTO，不绕开 `TASK-MCLO-001` 的共享契约。
  - 补齐或修复与查询、计数、已读写回、target 生成直接相关的后端测试。
- DDD 分类：`required`
- 验证策略：`tdd`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：后端实现责任方
  - 允许修改：`apps/server/**` 及后端直接相关测试
  - 只读参考：`packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`
  - 禁止事项：修改 `packages/*` 共享契约；引入数据库迁移；把待办语义简化为未读语义

### TASK-MCLO-003

- 任务名：Web 消息中心入口、操作与跳转链路优化
- 类型：前端
- 优先级：P0
- 完成标准：
  - 修通登录态恢复后的未读数加载、首页或导航入口展示、进入消息中心、分类切换与列表状态一致性。
  - 修通单条已读、批量已读后的缓存失效或本地状态同步，使未读数、列表未读态与入口角标一致。
  - 修通消息项 target 到 `message-actions` 的解析链路，覆盖帖子、评论上下文、用户主页、内容状态页和系统消息目标。
  - 对缺少 target 或历史不可落地消息提供明确前端降级，不出现运行时异常或死链。
  - 页面只通过既有数据层、`@feijia/http-client` 与 `@feijia/schemas` 消费数据，不在组件内散落请求或重写契约。
- DDD 分类：`not_required`
- 验证策略：`test_after`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：Web 消息链路责任方
  - 允许修改：`apps/web/src/routes/notifications-page.tsx`、`apps/web/src/features/notifications/**`、`apps/web/src/features/auth/notification-state.ts`、`apps/web/src/features/auth/use-notifications.ts`、`apps/web/src/lib/api-client.ts`、Web 直接相关测试
  - 只读参考：`packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`、`apps/server/**`
  - 禁止事项：修改 `packages/**`；在 Web 本地发明 target / filter；借链路修复重做无关主页或导航

### TASK-MCLO-004

- 任务名：Admin 消息中心、待办、计数与审核跳转链路优化
- 类型：前端
- 优先级：P0
- 完成标准：
  - 修通后台壳层角标、首页最近通知、首页待办入口与消息中心 / 待办页之间的跳转和计数口径。
  - 修通业务域、消息类型、已读状态、待办状态筛选链路：URL query -> 筛选控件 -> typed client 参数 -> server 响应 -> 表格 / 待办列表。
  - 修通单条已读、批量已读后的 query invalidation，使消息中心、首页摘要与壳层角标同步刷新。
  - 修通消息 target / navigation 到审核页路径与 query 的落点，进入审核页后能消费筛选参数。
  - 保持 Ant Design 后台体系和既有壳层，不做新一轮布局重整。
- DDD 分类：`not_required`
- 验证策略：`test_after`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：Admin 消息链路责任方
  - 允许修改：`apps/admin/src/features/messages/**`、`apps/admin/src/features/auth/admin-overview-page.tsx`、`apps/admin/src/features/auth/admin-shell.tsx`、`apps/admin/src/lib/api-client.ts`、`apps/admin/src/lib/admin-routes.ts`、Admin 直接相关测试
  - 只读参考：`packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`、`apps/server/**`
  - 禁止事项：修改 `packages/**`；把筛选参数或 target 字符串写死在各审核页；借链路修复重做 admin 壳层或无关业务页面

### TASK-MCLO-005

- 任务名：跨端计数、缓存失效与跳转闭环联调
- 类型：集成
- 优先级：P0
- 完成标准：
  - 对齐 Web 入口未读数、Web 消息列表未读态、Admin 壳层角标、Admin 首页摘要、Admin 消息中心统计的刷新口径。
  - 验证 Web 与 Admin 的单条已读 / 批量已读均不会误伤待办计数，也不会留下入口角标与列表状态不一致。
  - 验证 Web target 与 Admin target / filter 均能落到各自目标页面；无法落地的历史消息必须走降级路径。
  - 若联调暴露共享契约缺字段、缺 target 或缺 filter，回流 `TASK-MCLO-001`；若暴露服务端语义问题，回流 `TASK-MCLO-002`；不得在页面层堆兼容分支。
  - 产出链路矩阵，至少覆盖需求中的 7 条关键链路。
- DDD 分类：`not_required`
- 验证策略：`test_after`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：集成联调责任方
  - 允许修改：本轮已触达路径中的最小联调阻塞修复、必要联调说明文档
  - 只读优先：`packages/**`、`apps/server/**`、`apps/web/**`、`apps/admin/**`
  - 禁止事项：越过对应任务责任方直接改共享契约或服务端语义；把联调问题处理成页面私有兼容

### TASK-MCLO-006

- 任务名：消息链路定向测试补齐
- 类型：测试
- 优先级：P0
- 完成标准：
  - 补齐或修复共享契约 / typed client 的消息查询、筛选、已读、批量已读、target 类型测试。
  - 补齐或修复后端查询、统计、已读写回、待办独立于已读、target 生成的定向测试。
  - 补齐或修复 Web 消息入口、分类切换、已读操作、跳转降级的组件或集成测试。
  - 补齐或修复 Admin 筛选、计数刷新、已读操作、审核页跳转落点的组件或集成测试。
  - 测试只覆盖本轮链路，不借机扩大到消息模型重建、实时推送或无关页面。
- DDD 分类：`not_required`
- 验证策略：`test_after`
- 风险任务：否
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：测试责任方
  - 允许修改：本轮相关测试文件、必要测试夹具或测试辅助方法
  - 只读参考：对应实现文件与共享契约
  - 禁止事项：为通过测试改写生产契约；与 `TASK-MCLO-003`、`TASK-MCLO-004` 并行修改同一测试文件

### TASK-MCLO-007

- 任务名：最终人工回归与仓库级验证
- 类型：集成
- 优先级：P0
- 完成标准：
  - 执行根级 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`，并记录结果。
  - 完成人工回归：Web 入口链路、Web 已读链路、Web 跳转链路、Admin 入口链路、Admin 筛选链路、Admin 已读链路、Admin 跳转链路。
  - 记录链路矩阵的通过 / 失败 / 降级状态，明确剩余风险与是否需要 plan patch。
  - 触发后续 `review_qa` 时，能提供需求 -> 任务 -> 实现 -> 测试的追踪材料。
  - 若发现必须新增数据库字段、迁移、实时推送或新消息模型，停止收口并升级，不在本轮直接实现。
- DDD 分类：`not_required`
- 验证策略：`manual_only`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：主会话 / 收口责任方
  - 允许修改：必要收口文档、验证记录、极小阻塞修复
  - 禁止事项：把未通过验证的链路包装为完成；绕过根级验证或不记录失败原因

## DDD 分类

### 需要 DDD 的任务

- `TASK-MCLO-001`
  - 原因：消息 DTO、target、filter、待办 / 已读口径属于跨 Web、Admin、Server 的领域契约边界。
- `TASK-MCLO-002`
  - 原因：消息查询、计数、已读写回、待办聚合与 target 生成包含服务端领域规则，会影响多端一致性。

### 不需要 DDD 的任务

- `TASK-MCLO-003`
  - 原因：以消费既有契约、修通 Web 交互链路和降级体验为主，不新增领域模型。
- `TASK-MCLO-004`
  - 原因：以消费既有契约、修通 Admin 页面链路和审核页落点为主，不新增领域模型。
- `TASK-MCLO-005`
  - 原因：以跨端联调、状态同步和链路矩阵验证为主。
- `TASK-MCLO-006`
  - 原因：以补齐定向测试为主。
- `TASK-MCLO-007`
  - 原因：以人工回归、仓库级验证和评审交接为主。

## TDD / test_after / manual_only 分类

### 必须 TDD

- `TASK-MCLO-001`：共享契约和 typed client 漂移修复必须先有契约 / client 级失败用例或类型断言。
- `TASK-MCLO-002`：服务端查询、计数、已读写回和 target 生成必须先用后端用例锁定行为。

### 开发后补测试或做定向验证

- `TASK-MCLO-003`：`test_after`
- `TASK-MCLO-004`：`test_after`
- `TASK-MCLO-005`：`test_after`
- `TASK-MCLO-006`：`test_after`

### 非开发收口任务

- `TASK-MCLO-007`：`manual_only`

## 风险任务

- `TASK-MCLO-001`
  - 风险点：共享契约一旦继续漂移，后续 Web、Admin、Server 会各自补丁化，链路无法真正收敛。
- `TASK-MCLO-002`
  - 风险点：已读、待办、统计和 target 生成口径集中在服务端，若不一致会直接造成多端计数错乱和死链。
- `TASK-MCLO-003`
  - 风险点：Web 历史消息可能缺 target，且入口未读数与列表状态容易因缓存 key 不一致而漂移。
- `TASK-MCLO-004`
  - 风险点：Admin 消息中心、首页摘要、壳层角标和审核页筛选横跨多个文件，容易出现“跳到了页但没落到上下文”。
- `TASK-MCLO-005`
  - 风险点：联调阶段若用页面兼容掩盖契约或服务端问题，会把问题留到下一轮继续放大。
- `TASK-MCLO-007`
  - 风险点：人工回归不完整会让入口、已读、跳转三个链路看似可用但实际断在边缘状态。

## 文件所有权和共享路径提醒

- 共享区域唯一责任方：`TASK-MCLO-001` 统一维护 `packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`。
- 后端唯一责任方：`TASK-MCLO-002` 负责 `apps/server/**`，只能消费共享契约，不能反向定义共享协议。
- Web 消息唯一责任方：`TASK-MCLO-003` 负责 `apps/web/src/routes/notifications-page.tsx`、`apps/web/src/features/notifications/**`、Web 消息入口状态与 Web 数据消费层。
- Admin 消息唯一责任方：`TASK-MCLO-004` 负责 `apps/admin/src/features/messages/**`、Admin 消息入口、首页摘要、壳层角标、Admin 数据消费层与审核跳转接线。
- 集成联调唯一责任方：`TASK-MCLO-005` 负责链路矩阵、跨端计数和跳转闭环验证；发现契约或服务端缺口时回流对应任务。
- 测试唯一责任方：`TASK-MCLO-006` 负责本轮相关自动化测试补齐，不与功能任务并行修改同一测试文件。
- 收口唯一责任方：`TASK-MCLO-007` 负责根级验证、人工回归、风险记录与 `review_qa` 交接。
- 共享路径风险提醒：
  - `packages/schemas/**` 只定义消息契约、筛选协议、统计结构，不写 Web / Admin 私有展示字段。
  - `packages/http-client/**` 只镜像共享契约与 typed client 方法，不写页面视图拼装逻辑。
  - `packages/shared/**` 只维护共享 target、共享路由常量、业务域常量，不写应用私有导航结构。
  - `apps/web/src/lib/api-client.ts` 与 `apps/admin/src/lib/api-client.ts` 只能作为各自应用的数据消费层，不得绕开 `@feijia/http-client` 与 `@feijia/schemas` 重发明契约。

## 推荐交付顺序

1. `TASK-MCLO-001`
2. `TASK-MCLO-002`
3. `TASK-MCLO-003` 与 `TASK-MCLO-004`
4. `TASK-MCLO-005`
5. `TASK-MCLO-006`
6. `TASK-MCLO-007`

## 并行与串行策略

### 严格串行

- `TASK-MCLO-001 -> TASK-MCLO-002`
- `TASK-MCLO-002 -> TASK-MCLO-005`
- `TASK-MCLO-003 / TASK-MCLO-004 -> TASK-MCLO-005`
- `TASK-MCLO-005 -> TASK-MCLO-006 -> TASK-MCLO-007`

### 条件并行

- `TASK-MCLO-003` 与 `TASK-MCLO-004` 可并行推进，因为分别只写 `apps/web/**` 与 `apps/admin/**`。
- `TASK-MCLO-002` 完成共享契约消费方式确认后，可与 `TASK-MCLO-003`、`TASK-MCLO-004` 的页面侧链路修复并行，但前端不得先行假定未冻结的接口形状。
- `TASK-MCLO-006` 中的测试补齐只能在对应功能任务交付后推进，不与功能任务抢同一测试文件。

### 不应并行修改的文件 / 路径

- `packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`：只允许 `TASK-MCLO-001` 写。
- `apps/server/**`：只允许 `TASK-MCLO-002` 写；若联调发现服务端问题，回流 `TASK-MCLO-002`。
- `apps/web/src/features/notifications/message-actions.ts`、`apps/web/src/features/notifications/message-center.ts`、`apps/web/src/routes/notifications-page.tsx`、`apps/web/src/features/auth/use-notifications.ts`、`apps/web/src/features/auth/notification-state.ts`：只允许 `TASK-MCLO-003` 写。
- `apps/admin/src/features/messages/**`、`apps/admin/src/lib/api-client.ts`、`apps/admin/src/lib/admin-routes.ts`、`apps/admin/src/features/auth/admin-overview-page.tsx`、`apps/admin/src/features/auth/admin-shell.tsx`：只允许 `TASK-MCLO-004` 写。
- 同一测试文件不得由 `TASK-MCLO-003` / `TASK-MCLO-004` 与 `TASK-MCLO-006` 并行修改；测试任务在对应功能任务交付后接手。

## plan patch / contract change request 触发条件

- 触发条件 1：需要新增或修改 `packages/db/**`、数据库迁移、seed 或消息持久化结构。
- 触发条件 2：需要新增实时推送、WebSocket、SSE 或移动端推送能力。
- 触发条件 3：需要重建消息模型或引入新的消息业务域。
- 触发条件 4：需要修改 `.env.example`、根 `README.md`、根脚本、根路由前缀或工作区级配置。
- 触发条件 5：`TASK-MCLO-005` 发现现有共享契约无法表达某类 Web / Admin target、filter 或统计口径。
- 触发条件 6：有人提议让多个任务同时修改 `packages/*` 或同一应用核心消息文件。

## 推荐的下一步

1. planner 基于本任务文档生成执行计划与 Execution Packets。
2. 执行前先 spawn `TASK-MCLO-001`，冻结共享契约责任边界。
3. `TASK-MCLO-001` 完成后，按计划推进后端、Web、Admin 三条泳道，并保持共享区单一责任方。
4. 前五项完成后再进入测试补齐、仓库级验证与 `review_qa`。
