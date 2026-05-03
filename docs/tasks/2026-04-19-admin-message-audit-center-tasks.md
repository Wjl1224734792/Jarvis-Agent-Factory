# 2026-04-19 管理端消息中心与审核系统消息联动任务拆解

## 需求文档路径

- `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`

## 参考文档

- `docs/tasks/2026-04-18-message-center-rebuild-tasks.md`
- `docs/plans/2026-04-18-message-center-rebuild-plan.md`

## 任务概览

- 本轮范围明确覆盖 `packages/schemas`、`packages/http-client`、`packages/shared`、`apps/server`、`apps/admin`，不是仅做 `apps/admin` 的最小兼容。
- 主线固定为“审核系统消息补齐 -> 管理端消息消费与待办 -> 管理端传统后台布局重整 -> 关键审核页接线 -> 最终验证”。
- 共享契约改动必须按 `packages/schemas -> packages/http-client -> packages/shared -> apps/server -> apps/admin` 的顺序评估，避免先改应用层再倒逼共享层补洞。
- `apps/admin` 只能通过 `@feijia/http-client` 与 `@feijia/schemas` 消费契约；页面层不得散落请求、不得重复定义消息 DTO、跳转目标或筛选协议。
- 本轮不包含管理员之间聊天、协作 IM，也不扩展到 App / 小程序端消息页面。

## Open Question

- `待办` 的判定口径是否独立于 `已读`：
  - 方案 A：待办 = 未读且待处理，消息被标记已读后即从待办移除。
  - 方案 B：待办 = 业务对象仍处于待处理状态，消息已读后仍保留在待办，直到业务状态解除。
  - 这个边界会直接影响 `apps/server` 聚合查询、`apps/admin` 首页计数、消息中心筛选以及批量已读行为。任务可先拆分，但主会话需在 `TASK-AMAC-001` 完成前确认。

## 任务分解列表

### TASK-AMAC-001

- 任务名：审核消息共享契约与跳转目标基线
- 类型：共享
- 优先级：P0
- 完成标准：
  - 在 `packages/schemas` 明确定义审核系统消息的类型、业务域、目标对象、状态字段、摘要字段、跳转目标、筛选参数、统计结构。
  - 在 `packages/http-client` 提供管理端消息中心 / 待办所需的查询、单条已读、批量已读等 typed client 能力。
  - 如需新增跨端共享的跳转目标、路由常量或业务域常量，仅在 `packages/shared` 维护唯一来源，`apps/admin` 不得本地发明第二套常量。
  - 契约中显式消化 Open Question 对 `todo` 统计与列表过滤的影响，不把语义留到 `apps/server` 或 `apps/admin` 页面里临时解释。
  - 契约落定后，`apps/server` 与 `apps/admin` 能直接消费，不再要求应用层自行拼装消息语义。
- DDD 分类：`required`
- 验证策略：`tdd`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：共享契约责任方
  - 允许修改：`packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`
  - 只读参考：`apps/server/**`、`apps/admin/**`
  - 禁止事项：在 `apps/server`、`apps/admin` 或局部 `lib` 中重复定义消息类型、消息载荷、跳转目标、筛选协议

### TASK-AMAC-002

- 任务名：后端审核系统消息补齐与管理端查询扩展
- 类型：后端
- 优先级：P0
- 完成标准：
  - 盘点并补齐文章 / 动态、评测、榜单、评分对象、机型投稿、品牌申请等审核状态变化的系统消息生产链路。
  - 为 `apps/admin` 提供消息中心 / 待办所需的聚合查询、统计、已读写回能力，并严格复用 `TASK-AMAC-001` 定下的共享契约。
  - 对评论审核这类当前未必需要产出系统消息的场景，至少补齐管理端待办聚合与跳转上下文，不在本任务中擅自扩展未确认的消息类型。
  - 所有管理端消息接口保持单一返回模型，禁止在 `apps/server` 内为 admin 再造一套脱离共享契约的临时响应结构。
  - 关键审核状态转换、聚合统计、已读写回与失败场景具备后端测试覆盖。
- DDD 分类：`required`
- 验证策略：`tdd`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：后端实现责任方
  - 允许修改：`apps/server/**`
  - 只读参考：`packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`
  - 禁止事项：绕开共享契约新增 server 私有消息 DTO，或在各审核模块里散落不一致的跳转/统计语义

### TASK-AMAC-003

- 任务名：Admin 消息中心与审核待办落地
- 类型：前端
- 优先级：P0
- 完成标准：
  - 在 `apps/admin` 新增明确的消息中心 / 待办路由与导航入口，并接入首页摘要或角标入口。
  - 页面只通过 `@feijia/http-client` 与 `@feijia/schemas` 消费数据；如需本地封装，只能收敛到集中式 `api-client` / feature data layer，不能在页面组件里直接写请求。
  - 消息中心支持按业务域、消息类型、已读状态、待办状态进行筛选，并展示未读数、待处理数、最近状态变化。
  - 支持单条已读、批量已读、快捷跳转，以及与首页摘要保持一致的计数口径。
  - 管理端展示模型仅做视图映射，不重新定义契约字段或字符串语义。
- DDD 分类：`not_required`
- 验证策略：`test_after`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：管理端消息实现责任方
  - 允许修改：`apps/admin/src/features/**`、`apps/admin/src/components/**`、`apps/admin/src/lib/api-client.ts`、`apps/admin/src/lib/admin-routes.ts`
  - 只读参考：`packages/http-client/**`、`packages/schemas/**`、`packages/shared/**`、`apps/server/**`
  - 禁止事项：在页面散落 `fetch`、手写消息 DTO、手写跳转 target 字符串

### TASK-AMAC-004

- 任务名：Admin 传统后台布局重整
- 类型：前端
- 优先级：P0
- 完成标准：
  - 以现有 `AdminShell`、后台首页和导航分区为基础，整理为更传统、稳定的 Ant Design 后台壳层。
  - 固定头部、左侧分组导航、右侧内容区、首页 KPI / 待办 / 最近通知 / 快捷入口的骨架清晰落地。
  - 保留既有业务模块与路由分区思路，不把这项任务演变成无关页面的大规模视觉重写。
  - 新布局能容纳 `TASK-AMAC-003` 的消息入口与 `TASK-AMAC-005` 的审核跳转，不再依赖临时卡片拼装导航。
  - 关键首页与壳层调整完成后，管理端主流程可用且移动端/窄屏不会立即失效。
- DDD 分类：`not_required`
- 验证策略：`test_after`
- 风险任务：否
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：管理端壳层实现责任方
  - 允许修改：`apps/admin/src/app.tsx`、`apps/admin/src/features/auth/**`、`apps/admin/src/components/**`、`apps/admin/src/lib/admin-routes.ts`、必要样式文件
  - 只读参考：`packages/shared/**`
  - 禁止事项：借布局重整之名改写无关业务逻辑，或在 `packages/*` 写入仅服务 admin 壳层的私有结构

### TASK-AMAC-005

- 任务名：关键审核页消息跳转与筛选接线
- 类型：集成
- 优先级：P0
- 完成标准：
  - 将消息中心 / 待办与文章审核、动态审核、评论审核、评测审核、品牌申请、机型投稿、榜单审核、评分对象审核建立稳定跳转关系。
  - 各目标页能够解析并消费统一的路由参数 / 筛选参数，进入后直接落到可操作上下文，而不是只跳到列表首页。
  - 首页待办卡片、消息中心操作按钮、目标审核页筛选三者使用同一套跳转与筛选协议。
  - 如发现某些目标页缺少必要筛选参数或上下文定位能力，只补足当前接线所需能力，不额外重构审核页。
  - 若需要新增共享路由常量或 target 标识，必须回流 `TASK-AMAC-001` 的共享责任方统一落入 `packages/shared`，避免 `apps/admin` 与共享层双写。
- DDD 分类：`not_required`
- 验证策略：`test_after`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：管理端审核接线责任方
  - 允许修改：`apps/admin/src/features/**`、`apps/admin/src/lib/admin-routes.ts`
  - 只读参考：`packages/shared/**`、`packages/schemas/**`、`packages/http-client/**`
  - 禁止事项：在各审核页分别创造不一致的 query 参数命名或局部跳转协议

### TASK-AMAC-006

- 任务名：联调收口与最终验证
- 类型：验证
- 优先级：P0
- 完成标准：
  - 完成共享契约、后端消息、admin 消息中心、admin 布局、关键审核页跳转的联调验证。
  - 执行仓库根级 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`，并补充与本轮直接相关的定向验证。
  - 至少覆盖以下人工回归：消息生成、待办计数、单条已读、批量已读、首页入口、消息跳转、关键审核页筛选落点。
  - 若联调阶段暴露共享契约与页面消费不一致问题，优先回到共享层收敛，不允许在 `apps/admin` 继续堆兼容分支。
  - 输出剩余风险、未决问题和是否满足 Open Question 结论的落地情况。
- DDD 分类：`not_required`
- 验证策略：`manual_only`
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：主会话 / 收口责任方
  - 允许修改：本轮已触及路径中的最小阻塞修复与必要文档
  - 禁止事项：把联调阶段发现的问题转化为临时页面补丁，而不回收共享契约或服务端语义

## DDD 分类

### 需要 DDD 的任务

- `TASK-AMAC-001`
  - 原因：审核消息涉及多个业务对象、跨模块一致性、统一 target 语义和状态表达，属于明确的领域边界。
- `TASK-AMAC-002`
  - 原因：审核状态转换、消息生产、待办聚合、已读写回存在集中规则，且会影响多个审核对象的一致性。

### 不需要 DDD 的任务

- `TASK-AMAC-003`
  - 原因：以消费既有契约和呈现管理端视图为主，不应在 UI 层承载领域规则。
- `TASK-AMAC-004`
  - 原因：主要是后台壳层、首页信息架构和布局调整。
- `TASK-AMAC-005`
  - 原因：主要是路由接线、筛选参数透传和页面落点对齐。
- `TASK-AMAC-006`
  - 原因：以联调、验证和收口为主，不新增领域模型。

## TDD 与直接开发分类

### 必须 TDD

- `TASK-AMAC-001`
- `TASK-AMAC-002`

### 可直接开发，开发后补测试或做定向验证

- `TASK-AMAC-003`：`test_after`
- `TASK-AMAC-004`：`test_after`
- `TASK-AMAC-005`：`test_after`

### 非开发收口任务

- `TASK-AMAC-006`：`manual_only`

## 风险任务

- `TASK-AMAC-001`
  - 风险点：共享消息契约、跳转 target 与待办口径一旦定义失真，后续 `apps/server` 与 `apps/admin` 会同时偏航。
- `TASK-AMAC-002`
  - 风险点：审核状态变化入口分散在多个模块，容易漏接某条链路，或在 server 侧形成第二套 admin 响应模型。
- `TASK-AMAC-003`
  - 风险点：`apps/admin` 当前存在本地 `api-client` 兼容层，若继续局部扩写，容易再次出现契约漂移。
- `TASK-AMAC-005`
  - 风险点：不同审核页的筛选参数和落点能力可能并不一致，消息跳转容易出现“跳到了页，但没落到上下文”。
- `TASK-AMAC-006`
  - 风险点：如果最后以页面补丁方式掩盖共享层语义问题，会把问题留到下一轮继续放大。

## 文件所有权和共享路径提醒

- 共享区域唯一责任方：`TASK-AMAC-001` 的共享契约责任方统一维护 `packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`。
- 后端唯一责任方：`TASK-AMAC-002` 负责 `apps/server/**`，只能消费共享契约，不能反向定义共享协议。
- 管理端消息唯一责任方：`TASK-AMAC-003` 负责消息中心 / 待办 UI 与 admin 数据消费层，不得越权回写 `packages/*`。
- 管理端壳层唯一责任方：`TASK-AMAC-004` 负责 `AdminShell`、首页骨架与导航重整，不接管共享契约。
- 管理端接线唯一责任方：`TASK-AMAC-005` 负责审核页落点与筛选接线；若需要共享常量增补，提交给 `TASK-AMAC-001` 回收。
- 收口唯一责任方：`TASK-AMAC-006` 统一做联调、验证、风险记录与必要文档收口。
- 共享路径风险提醒：
  - `packages/schemas/**` 只允许定义消息契约、筛选协议、统计结构，不写 admin 私有展示字段。
  - `packages/http-client/**` 只允许镜像共享契约与 client 方法，不写页面视图拼装逻辑。
  - `packages/shared/**` 只允许维护共享路由常量 / target 标识 / 业务域常量，不写 admin 页面私有导航结构。
  - `apps/admin/src/lib/api-client.ts` 可以作为 admin 聚合入口，但不得绕开 `@feijia/http-client` 与 `@feijia/schemas` 重新发明契约。

## 推荐交付顺序

1. `TASK-AMAC-001`
2. `TASK-AMAC-002`
3. `TASK-AMAC-003`
4. `TASK-AMAC-004`
5. `TASK-AMAC-005`
6. `TASK-AMAC-006`

## 并行与串行策略

- 串行：
  - `TASK-AMAC-001 -> TASK-AMAC-002 -> TASK-AMAC-003`
  - `TASK-AMAC-003 -> TASK-AMAC-005`
- 条件并行：
  - `TASK-AMAC-004` 可以在 `TASK-AMAC-003` 确认消息入口所需壳层位置后并行推进，但不得先行冻结与消息入口冲突的导航结构。
- 收口阶段：
  - `TASK-AMAC-006` 仅在前五项交付后执行。

## 推荐的下一步

- 由主会话先确认 Open Question 中 `待办` 与 `已读` 的口径。
- planner 基于本任务文档生成执行计划时，先锁定 `TASK-AMAC-001` 的共享责任方，避免 `packages/*` 多头写入。
- 执行阶段严格按共享契约顺序推进，不接受“先在 admin 页面写死，后面再回填 schema”的实现路径。
