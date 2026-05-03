# 2026-04-19 管理端消息中心与审核系统消息联动执行计划

## 需求文档路径

- `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`

## 任务文档路径

- `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`

## Gate B 检查结果

- `TASK-AMAC-001` 到 `TASK-AMAC-006` 均具备完整任务 ID、任务名称、类型、优先级、完成标准、DDD 分类、`test_strategy`、风险标记与文件所有权说明。
- 任务文档原有 `待办` / `已读` Open Question 已由主会话补充结论：`待办` 独立于 `已读`，消息已读后只要业务对象仍处于待处理状态，待办继续存在。
- Gate B 通过，可以进入执行规划。

## 当前轮次目标

- 打通审核系统消息共享契约、服务端生产与管理端消费链路。
- 在 `apps/admin` 落地消息中心 / 待办，并将其接入传统 Ant Design 后台壳层。
- 完成关键审核页的跳转与筛选接线，保证“消息 -> 待办 -> 审核上下文”闭环成立。

## 当前轮次范围

- `packages/schemas`
- `packages/http-client`
- `packages/shared`
- `apps/server`
- `apps/admin`
- 与本轮直接相关的测试、必要文档与最小阻塞修复

## 完成标准

- `TASK-AMAC-001` 到 `TASK-AMAC-006` 全部完成并通过验收。
- 共享契约顺序严格遵守 `packages/schemas -> packages/http-client -> packages/shared -> apps/server -> apps/admin`。
- `apps/admin` 不再本地发明消息 DTO、跳转 target 或筛选协议。
- 管理端保留 Ant Design 体系，壳层、首页、消息中心和审核落点形成一致操作路径。
- 最终完成根级 `lint`、`typecheck`、`test`、`build` 以及本轮定向人工回归。

## 是否需要先查阅 repo_explorer / docs_researcher

- `repo_explorer`：当前不作为前置必需。需求、任务、参考计划与现有 `apps/admin` 路由/壳层边界已足够进入实现。
- `docs_researcher`：当前不需要。本轮依赖仓内代码与既有契约，不存在外部库规范不明导致的前置阻塞。
- 仅当 `TASK-AMAC-001` 或 `TASK-AMAC-002` 在盘点审核状态入口时无法定位现有消息生产点，再回退补做 `repo_explorer`。

## 当前轮次任务包

- 本轮任务包覆盖全部六个任务，但实现上收敛为三条泳道：
  - 共享契约泳道：`TASK-AMAC-001`
  - 后端泳道：`TASK-AMAC-002`
  - 管理端单泳道：`TASK-AMAC-004 -> TASK-AMAC-003 -> TASK-AMAC-005`
- 收口与评审泳道：`TASK-AMAC-006 -> review_qa`

## 执行代理分工

| 任务 | owner | 是否可并行 spawn | 说明 |
|------|-------|------------------|------|
| `TASK-AMAC-001` | `backend_implementer` | 否 | 共享契约基线，必须先落定，作为后续全部实现输入 |
| `TASK-AMAC-002` | `backend_implementer` | 是 | 在 `TASK-AMAC-001` 完成后可与前端泳道并行 |
| `TASK-AMAC-004` | `frontend_implementer` | 是 | 在 `TASK-AMAC-001` 完成后可启动，负责 admin 壳层与首页骨架基线 |
| `TASK-AMAC-003` | `frontend_implementer` | 否 | 需等待 `TASK-AMAC-002` 返回稳定接口，同时复用 `TASK-AMAC-004` 壳层槽位 |
| `TASK-AMAC-005` | `frontend_implementer` | 否 | 依赖 `TASK-AMAC-003` 的消息入口、路由与筛选协议 |
| `TASK-AMAC-006` | 主会话 / `review_qa` | 否 | 非实现任务，待前五项交付后统一联调、验证、评审 |

## 共享区域改动归属

| 共享区域 | 唯一责任方 | 顺序要求 |
|----------|------------|----------|
| `packages/schemas/**` | `TASK-AMAC-001` / `backend_implementer` | 第一顺位，先定义消息类型、筛选协议、统计结构 |
| `packages/http-client/**` | `TASK-AMAC-001` / `backend_implementer` | 第二顺位，只镜像共享契约与 typed client |
| `packages/shared/**` | `TASK-AMAC-001` / `backend_implementer` | 第三顺位，只维护共享 target、共享路由常量、业务域常量 |
| `apps/server/**` | `TASK-AMAC-002` / `backend_implementer` | 只能消费共享契约，不得反向发明 server 私有 admin DTO |
| `apps/admin/src/app.tsx` | `TASK-AMAC-004` / `frontend_implementer` | 先由壳层任务稳定外壳与路由骨架，后续同一前端泳道串行续做 |
| `apps/admin/src/lib/admin-routes.ts` | `TASK-AMAC-004` / `frontend_implementer` | 先收敛路由常量，再由同一前端泳道消费，不允许第二前端代理并改 |
| `apps/admin/src/features/auth/admin-navigation.ts` | `TASK-AMAC-004` / `frontend_implementer` | 导航结构归壳层任务唯一负责 |
| `apps/admin/src/features/auth/admin-overview-page.tsx` | `TASK-AMAC-004` / `frontend_implementer` | 首页骨架先由壳层任务确定，消息摘要随后在同一泳道内补入 |
| `apps/admin/src/features/messages/**` | `TASK-AMAC-003` / `frontend_implementer` | 新增消息中心 / 待办 feature 的唯一实现区 |
| `apps/admin/src/lib/api-client.ts` | `TASK-AMAC-003` / `frontend_implementer` | 仅补管理端聚合消费层，仍必须基于 `@feijia/http-client` |

## 并行 / 串行策略

### 总体波次

1. Wave 1 串行：`TASK-AMAC-001`
2. Wave 2 并行：
   - Lane A：`TASK-AMAC-002`
   - Lane B：`TASK-AMAC-004`
3. Wave 3 串行：
   - Lane B 继续执行 `TASK-AMAC-003`
   - Lane B 继续执行 `TASK-AMAC-005`
4. Wave 4 收口：
   - `TASK-AMAC-006`
   - `review_qa`

### 为什么 admin 消息中心与 admin 壳层重整不直接并行

- 不建议把 `TASK-AMAC-003` 与 `TASK-AMAC-004` 拆给两个并行前端代理。
- 原因不是抽象上的“可能冲突”，而是当前代码结构下存在真实共享文件集合：
  - `apps/admin/src/app.tsx`
  - `apps/admin/src/lib/admin-routes.ts`
  - `apps/admin/src/features/auth/admin-navigation.ts`
  - `apps/admin/src/features/auth/admin-overview-page.tsx`
  - `apps/admin/src/features/auth/admin-shell.tsx`
  - `apps/admin/src/styles.css`
- 这几个文件同时承载壳层路由、导航入口、首页消息摘要与布局槽位。若拆成两个并行代理，只会把冲突后移到联调阶段。
- 因此本轮采取“单一前端泳道串行推进”的策略：先壳层与首页骨架，再消息中心，再审核页接线。

### 可并行的安全边界

- 真正适合 spawn 并行的是“后端泳道”和“管理端单泳道”：
  - `TASK-AMAC-002` 只写 `apps/server/**`
  - `TASK-AMAC-004 -> TASK-AMAC-003 -> TASK-AMAC-005` 只写 `apps/admin/**`
- 两条泳道都依赖 `TASK-AMAC-001` 完成后的共享契约，但彼此文件边界明确，可以并行推进。

## 风险提醒

- 风险 1：若现有消息持久化结构无法表达新增审核消息或待办语义，可能触发 `packages/db` 范围扩张；这超出当前任务文档范围，必须 plan patch。
- 风险 2：若某些审核域无法用统一 target / filter 落到具体页面上下文，`TASK-AMAC-005` 可能反向暴露共享协议缺口；必须回收至 `TASK-AMAC-001`，不能在页面层打补丁。
- 风险 3：`apps/admin` 当前壳层、导航、首页与消息入口高度耦合，任何“先并行再人工合并”的做法都容易让路由常量与页面落点漂移。
- 风险 4：评论审核是否仅进入待办聚合、还是也需要新增系统消息，当前任务文档限定前者优先；若后续扩展到后者，属于 contract change request。
- 风险 5：若需要改 `.env.example`、根 README、根脚本、共享路由前缀或工作区级配置，说明本轮已超出纯实现范畴，必须主会话批准升级。

## 升级规则

### 共享契约升级规则

- 仅 `TASK-AMAC-001` 允许修改 `packages/schemas/**`、`packages/http-client/**`、`packages/shared/**`。
- `TASK-AMAC-002`、`TASK-AMAC-003`、`TASK-AMAC-005` 一旦发现缺字段、缺 target、缺 filter，不得直接在 `apps/*` 本地补洞。
- 正确处理顺序：
  1. 记录缺口
  2. 回流 `TASK-AMAC-001`
  3. 由共享责任方更新契约
  4. 再按 `packages/schemas -> packages/http-client -> packages/shared -> apps/server -> apps/admin` 重新消费

### 路由前缀升级规则

- 若仅新增 admin 内部子路由，归 `TASK-AMAC-004` 负责，局限在 `apps/admin` 内处理。
- 若需改共享路由常量、`APP_ROUTES`、`API_ROUTES`、`/admin` 前缀或跨端 target 标识，视为共享升级：
  1. 停止 `TASK-AMAC-004` 与 `TASK-AMAC-005`
  2. 发起 plan patch / contract change request
  3. 由共享责任方先改 `packages/shared`
  4. 再同步 `apps/server` 与 `apps/admin`

### 根配置升级规则

- 根级配置包括但不限于 `.env.example`、根 `README.md`、根 `package.json` / workspace 脚本、Vite/Bun/TS 根配置、根路由入口与全局请求客户端约定。
- 本轮任何实现代理均不得未经批准直接修改上述根配置。
- 如确有必要，必须先由主会话确认，再以 plan patch 形式指定唯一责任方和执行顺序。

## 实现者交接信息

- 所有实现代理统一采用已确认口径：`待办` 独立于 `已读`。
- 后端与前端都不得在各自应用层重新解释消息类型、待办含义、跳转 target。
- 前端单泳道需要先稳定壳层和首页骨架，再接消息中心与审核页跳转，避免重复改 `app.tsx`、`admin-routes.ts`、`admin-navigation.ts`。
- `review_qa` 重点核查三件事：
  - 已读后待办是否仍保留，直到业务状态解除
  - 消息中心、首页待办卡片、审核页筛选是否使用同一套协议
  - `apps/admin` 是否仍然只通过 `@feijia/http-client` 与 `@feijia/schemas` 消费数据

## 每个任务的 Execution Packet

## Execution Packet

### task_id
TASK-AMAC-001

### task_name
审核消息共享契约与跳转目标基线

### owner
backend_implementer

### objective
定义审核系统消息、待办统计与共享跳转协议的唯一契约基线，作为后续 server 与 admin 的唯一输入。

### in_scope
- 在 `packages/schemas` 定义审核系统消息类型、业务域、状态字段、摘要字段、目标对象、target、filter、统计结构
- 在 `packages/http-client` 补管理端消息中心 / 待办查询与已读写回的 typed client
- 在 `packages/shared` 收敛共享 target、共享路由常量、业务域常量
- 将“待办独立于已读”的口径显式固化进契约与统计语义
- 为后续 `apps/server` 与 `apps/admin` 提供可直接消费的共享类型

### out_of_scope
- 不修改 `apps/server/**`
- 不修改 `apps/admin/**`
- 不引入 `packages/db/**` 结构变更
- 不扩大到管理员私聊、协作 IM

### input_documents
- requirements: `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`
- tasks: `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`
- plan: `docs/plans/2026-04-19-admin-message-audit-center-plan.md`
- analysis/research: `docs/plans/2026-04-18-message-center-rebuild-plan.md`

### allowed_paths
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`

### forbidden_paths
- `apps/server/**`
- `apps/admin/**`
- `packages/db/**`
- 根配置文件

### dependencies
- 需求文档与任务文档的既定范围
- “待办独立于已读”的主会话确认
- 现有消息领域与共享路由常量

### acceptance_criteria
- 审核系统消息、待办过滤、统计结构均有共享 schema 且命名稳定
- 管理端消息查询、单条已读、批量已读具备 typed client 能力
- 新增 target / route / domain 常量仅存在于 `packages/shared`
- 下游无需在 `apps/server` 或 `apps/admin` 手写第二套 DTO 或 target 协议

### test_strategy
tdd

### handoff_notes
- 向 `TASK-AMAC-002` 明确说明哪些审核域必须产消息，哪些当前只进入待办聚合
- 向前端泳道明确说明 target、filter、统计字段已经冻结，可直接消费

### escalation_rule
如需变更共享契约之外的数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

## Execution Packet

### task_id
TASK-AMAC-002

### task_name
后端审核系统消息补齐与管理端查询扩展

### owner
backend_implementer

### objective
基于共享契约补齐审核状态变化的系统消息生产链路，并提供管理端消息中心 / 待办所需的聚合查询与已读写回接口。

### in_scope
- 盘点并补齐文章 / 动态、评测、榜单、评分对象、机型投稿、品牌申请等审核状态变化的消息生产
- 为 admin 提供消息列表、待办列表、统计、单条已读、批量已读接口
- 确保评论审核至少可进入待办聚合与跳转上下文
- 为关键状态转换、统计、已读写回与失败场景补后端测试

### out_of_scope
- 不改 `packages/schemas/**`
- 不改 `packages/http-client/**`
- 不改 `packages/shared/**`
- 不改 `apps/admin/**`
- 不擅自引入新的消息类型范围

### input_documents
- requirements: `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`
- tasks: `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`
- plan: `docs/plans/2026-04-19-admin-message-audit-center-plan.md`

### allowed_paths
- `apps/server/**`

### forbidden_paths
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `apps/admin/**`
- 根配置文件

### dependencies
- `TASK-AMAC-001` 已完成并冻结共享契约
- 现有各审核模块的状态转换入口

### acceptance_criteria
- 约定范围内审核域的状态变化均能正确产出系统消息或进入待办聚合
- admin 消息查询、统计、已读写回全部复用共享契约返回
- server 内不存在额外的 admin 私有消息 DTO
- 后端相关测试覆盖通过

### test_strategy
tdd

### handoff_notes
- 向前端泳道输出稳定接口形状、计数口径与失败场景说明
- 若发现某审核域无法按既定 target/filter 落地，必须回流 `TASK-AMAC-001`

### escalation_rule
如需新增共享字段、共享 target、数据库结构或根级接口前缀，必须先回编排者，不得直接修改。

## Execution Packet

### task_id
TASK-AMAC-004

### task_name
Admin 传统后台布局重整

### owner
frontend_implementer

### objective
在不拆散现有业务路由分区的前提下，先把 `apps/admin` 壳层、导航与首页骨架收敛为稳定的 Ant Design 传统后台布局。

### in_scope
- 调整 `AdminShell`、导航、内容容器与首页基础骨架
- 固定头部、左侧分组导航、右侧内容区
- 为首页预留 KPI、待办、最近通知、快捷入口的稳定槽位
- 收敛 `app.tsx`、`admin-routes.ts`、`admin-navigation.ts` 中的壳层与路由基线

### out_of_scope
- 不接入真实消息数据查询
- 不实现消息中心列表逻辑
- 不改共享契约
- 不改 `apps/server/**`

### input_documents
- requirements: `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`
- tasks: `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`
- plan: `docs/plans/2026-04-19-admin-message-audit-center-plan.md`

### allowed_paths
- `apps/admin/src/app.tsx`
- `apps/admin/src/features/auth/**`
- `apps/admin/src/components/**`
- `apps/admin/src/lib/admin-routes.ts`
- `apps/admin/src/styles.css`

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/admin/src/lib/api-client.ts`
- `apps/admin/src/features/messages/**`
- 根配置文件

### dependencies
- `TASK-AMAC-001` 已完成，相关消息命名与 target 词汇已稳定
- 现有 admin 路由与导航结构

### acceptance_criteria
- 后台壳层、导航与首页骨架已稳定，不再依赖临时卡片式导航
- 路由基线已为后续消息中心与审核接线预留明确入口
- 本任务改动不引入无关业务逻辑重写
- 产物可被同一前端泳道继续串行接入 `TASK-AMAC-003` 与 `TASK-AMAC-005`

### test_strategy
test_after

### handoff_notes
- 向同一前端泳道交代哪些路由常量、首页槽位、导航位置已稳定，不应再次发散改名
- 若需要消息入口文案或 badge，仅预留位置，不在本任务里临时拼接假数据

### escalation_rule
如需升级共享路由常量、`APP_ROUTES`、根配置或跨端 target，必须先回编排者，不得直接修改。

## Execution Packet

### task_id
TASK-AMAC-003

### task_name
Admin 消息中心与审核待办落地

### owner
frontend_implementer

### objective
在稳定壳层基础上落地 admin 消息中心 / 待办页面、数据消费层与首页摘要入口。

### in_scope
- 新增消息中心 / 待办 feature 页面与路由消费实现
- 在 `api-client` 或 feature data layer 中接入共享 typed client
- 支持按业务域、消息类型、已读状态、待办状态筛选
- 展示未读数、待处理数、最近状态变化
- 支持单条已读、批量已读、首页摘要入口

### out_of_scope
- 不修改共享契约
- 不修改 `apps/server/**`
- 不实现审核页深度接线
- 不在页面散落 `fetch`

### input_documents
- requirements: `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`
- tasks: `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`
- plan: `docs/plans/2026-04-19-admin-message-audit-center-plan.md`

### allowed_paths
- `apps/admin/src/features/messages/**`
- `apps/admin/src/components/**`
- `apps/admin/src/lib/api-client.ts`
- `apps/admin/src/features/auth/**`
- `apps/admin/src/app.tsx`
- `apps/admin/src/lib/admin-routes.ts`
- `apps/admin/src/styles.css`

### forbidden_paths
- `packages/**`
- `apps/server/**`
- 其他工作区根配置文件

### dependencies
- `TASK-AMAC-002` 已提供稳定接口
- `TASK-AMAC-004` 已稳定壳层、首页槽位与基础路由
- `@feijia/http-client` 与 `@feijia/schemas` 已可直接消费

### acceptance_criteria
- 消息中心 / 待办页面可正常加载、筛选、展示统计并执行已读操作
- 首页摘要与消息中心计数口径一致
- 页面层只做视图映射，不手写消息 DTO、target 或 filter 协议
- 所有请求入口收敛在 admin 数据消费层

### test_strategy
test_after

### handoff_notes
- 向 `TASK-AMAC-005` 明确说明当前消息项如何产出跳转 target 与 filter
- 若发现目标页能力不足，记录为接线缺口，不得在消息中心本地伪造落点

### escalation_rule
如需新增共享字段、共享 target、共享路由前缀或根级请求客户端约定，必须先回编排者，不得直接修改。

## Execution Packet

### task_id
TASK-AMAC-005

### task_name
关键审核页消息跳转与筛选接线

### owner
frontend_implementer

### objective
把消息中心、首页待办与各审核页筛选协议接成同一条可落地的跳转链路。

### in_scope
- 为文章、动态、评论、评测、品牌申请、机型投稿、榜单、评分对象审核页接入统一 query / filter 协议
- 让首页待办卡片、消息中心按钮、审核页落点三者使用同一套 target/filter
- 仅补足当前落点所需的最小筛选与上下文定位能力

### out_of_scope
- 不重构审核页整体结构
- 不扩展新的消息类型
- 不改共享契约
- 不改 `apps/server/**`

### input_documents
- requirements: `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`
- tasks: `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`
- plan: `docs/plans/2026-04-19-admin-message-audit-center-plan.md`

### allowed_paths
- `apps/admin/src/features/**`
- `apps/admin/src/lib/admin-routes.ts`
- `apps/admin/src/app.tsx`

### forbidden_paths
- `packages/**`
- `apps/server/**`
- 根配置文件

### dependencies
- `TASK-AMAC-003` 已落地消息中心 / 待办与首页摘要
- `TASK-AMAC-004` 已稳定壳层与导航
- `TASK-AMAC-001` 已冻结 target / filter 协议

### acceptance_criteria
- 消息中心、首页待办和目标审核页之间存在稳定跳转关系
- 进入审核页后可直接落到对应筛选上下文，而不是回到无上下文首页
- 各审核页不再各自发明 query 参数命名
- 若目标页能力不足，仅做最小接线补足，不引发大规模页面重构

### test_strategy
test_after

### handoff_notes
- 向 `review_qa` 标注每个审核域的目标页、关键 query 参数与预期落点
- 若某审核域仍无法稳定落点，必须明确列为残余风险

### escalation_rule
如需新增共享 target、共享 query 协议、路由前缀或根配置，必须先回编排者，不得直接修改。

## Execution Packet

### task_id
TASK-AMAC-006

### task_name
联调收口与最终验证

### owner
主会话 / review_qa

### objective
对共享契约、后端消息、admin 壳层、消息中心与审核页接线做统一联调、回归与评审收口。

### in_scope
- 执行根级 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`
- 执行消息生成、待办计数、单条已读、批量已读、首页入口、消息跳转、审核页落点的人工回归
- 输出剩余风险、未决项与是否满足本轮目标
- 触发 `review_qa`

### out_of_scope
- 不新增业务功能
- 不把联调问题转为页面层临时补丁
- 不绕过共享层修复契约问题

### input_documents
- requirements: `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`
- tasks: `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`
- plan: `docs/plans/2026-04-19-admin-message-audit-center-plan.md`

### allowed_paths
- 本轮已触达路径中的最小阻塞修复
- 必要的收口文档

### forbidden_paths
- 与本轮无关的功能区
- 未经批准的共享契约、根配置和数据库结构升级

### dependencies
- `TASK-AMAC-001` 到 `TASK-AMAC-005` 已完成
- `review_qa` 可获取完整实现说明与测试结果

### acceptance_criteria
- 根级验证命令执行完毕并记录结果
- 核心人工回归场景全部走通或留下明确风险说明
- `review_qa` 可直接依据 Execution Packet 与实现说明开展验收

### test_strategy
manual_only

### handoff_notes
- 若联调暴露契约缺口，优先回到共享层收敛，不接受 admin 页面兼容分支
- 评审重点是“待办独立于已读”和“消息跳转落到审核上下文”两个主线

### escalation_rule
如需变更共享契约、数据库结构、路由前缀或根配置，必须先回编排者，不得直接修改。

## plan patch / contract change request 触发条件

- 触发条件 1：需要引入 `packages/db/**`、迁移、seed 或消息持久化结构变更。
- 触发条件 2：`TASK-AMAC-002` 或 `TASK-AMAC-005` 发现现有共享契约无法表达某审核域的 target、filter、统计口径。
- 触发条件 3：需要修改 `APP_ROUTES`、`API_ROUTES`、`/admin` 路由前缀或跨端共享 target 标识。
- 触发条件 4：需要修改 `.env.example`、根 `README.md`、根 `package.json` / workspace 脚本、Vite/Bun/TS 根配置。
- 触发条件 5：有人提议把 `TASK-AMAC-003` 与 `TASK-AMAC-004` 拆给两个并行前端代理；这必须先重做路径隔离并更新计划，否则禁止执行。
- 触发条件 6：评论审核被确认也必须产出系统消息，而不只是进入待办聚合。

## 推荐的下一步

1. 主会话按本计划先 spawn `TASK-AMAC-001`。
2. `TASK-AMAC-001` 完成后，立即并行 spawn：
   - `TASK-AMAC-002`
   - `TASK-AMAC-004`
3. 前端泳道完成 `TASK-AMAC-004` 后，在同一代理 / 同一工作区内继续串行执行 `TASK-AMAC-003 -> TASK-AMAC-005`。
4. 前五项全部交付后，由主会话执行 `TASK-AMAC-006` 并交给 `review_qa`。
