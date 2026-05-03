# 2026-04-18 消息中心重建与主页联动执行计划

## 输入文档

- `docs/requirements/2026-04-18-message-center-rebuild-requirements.md`
- `docs/tasks/2026-04-18-message-center-rebuild-tasks.md`

## 当前轮次目标

- 将当前通知页重建为独立消息中心域。
- 打通 `packages/db`、`packages/schemas`、`packages/http-client`、`apps/server`、`apps/web` 的消息模型、接口与展示。
- 同步优化个人主页与他人主页，使它们与新的消息中心、关注关系和内容组织保持一致。

## 共享区域唯一责任方

- `packages/db/**`
  - 唯一责任方：共享/后端实现责任方
- `packages/schemas/**`
  - 唯一责任方：共享/后端实现责任方
- `packages/http-client/**`
  - 唯一责任方：共享/后端实现责任方
- `apps/server/**`
  - 唯一责任方：后端实现责任方
- `apps/web/src/routes/notifications-page.tsx` 及相关消息组件
  - 唯一责任方：前端消息实现责任方
- `apps/web/src/features/auth/profile-page.tsx` 及个人主页相关组件
  - 唯一责任方：前端主页实现责任方
- `apps/web/src/routes/user-profile-page.tsx` 及访客主页相关组件
  - 唯一责任方：前端主页实现责任方
- `apps/admin/**`
  - 默认只读；仅在最终联调阶段出现共享契约阻塞时由主会话做最小兼容处理

## 串并行顺序

1. 共享契约/数据库设计与落地
2. Server 消息域服务与接口
3. Web 消息中心
4. 个人主页优化 与 他人主页优化
5. 联调与仓库级验证

说明：
- `1 -> 2 -> 3` 严格串行。
- `4` 中两类主页优化可以并行，但必须建立在 `3` 的消息导航与入口方案已经稳定的前提下。

## 风险提醒

- 当前 `notifications` 表过轻，只能表达 `actor + post/comment + type`，无法自然承载系统消息与 richer target，DB 与 schema 设计必须一次定清。
- `seed.test-data.ts` 里通知类型已出现与共享 schema 不一致的漂移，重建时必须同时清理 seed 与契约。
- 个人主页和他人主页共享 `userContent` 聚合，但又各自夹带展示逻辑；抽象时要避免把两个页面强行做成同构。
- 消息中心必须依赖稳定 key 的单列虚拟列表，避免因多态卡片和高度抖动造成滚动跳跃。

## 验证策略

- 阶段内优先跑与各自改动直接相关的测试。
- 收尾默认执行：
  - `bun run lint`
  - `bun run typecheck`
  - `bun run test`
  - `bun run build`
- 若 `apps/admin` 因共享契约升级而阻塞，只做最小兼容处理并重新验证。

## Execution Packet

### task_id
TASK-MCR-001

### task_name
Shared message domain / db / schema / http-client

### owner
backend_implementer

### objective
重建消息域的数据库结构、共享 schema 与 HTTP client 契约，为后端服务和前端页面提供统一消息模型。

### in_scope
- 设计并实现新的消息表或消息相关表结构
- 设计消息分类、消息类型、消息目标对象、系统消息载荷
- 更新 `packages/db/**`
- 更新 `packages/schemas/**`
- 更新 `packages/http-client/**`
- 更新与之直接相关的测试、seed 与 reset 流程

### out_of_scope
- 不修改 `apps/web/**`
- 不修改 `apps/admin/**`
- 不修改无关业务模块

### input_documents
- requirements: `docs/requirements/2026-04-18-message-center-rebuild-requirements.md`
- tasks: `docs/tasks/2026-04-18-message-center-rebuild-tasks.md`
- plan: `docs/plans/2026-04-18-message-center-rebuild-plan.md`

### allowed_paths
- `packages/db/**`
- `packages/schemas/**`
- `packages/http-client/**`

### forbidden_paths
- `apps/web/**`
- `apps/admin/**`

### dependencies
- 现有 `notifications` schema
- 现有 `social` 模块通知接口
- 当前个人/他人主页消费的 `userProfile` / `userContent` 契约

### acceptance_criteria
- 新消息域可表达互动、关注、评论/@、系统消息
- `packages/db`、`packages/schemas`、`packages/http-client` 同步一致
- 相关测试与 seed 可运行

### test_strategy
tdd

### handoff_notes
- 输出的消息结构必须让前端无需再本地二次推导分类语义。

### escalation_rule
- 若发现必须大面积牵动 `apps/admin`，只记录阻塞，留到最终联调阶段最小处理。

## Execution Packet

### task_id
TASK-MCR-002

### task_name
Server message domain implementation

### owner
backend_implementer

### objective
基于新的共享消息域，落地 server 侧消息生产、查询、已读和系统消息生成链路。

### in_scope
- 改造或拆分 `apps/server/src/modules/social/**`
- 为内容发布/审核状态变化接入系统消息
- 统一消息查询接口响应
- 补齐 server 测试

### out_of_scope
- 不修改 `apps/web/**`
- 不做无关业务重构

### input_documents
- requirements: `docs/requirements/2026-04-18-message-center-rebuild-requirements.md`
- tasks: `docs/tasks/2026-04-18-message-center-rebuild-tasks.md`
- plan: `docs/plans/2026-04-18-message-center-rebuild-plan.md`

### allowed_paths
- `apps/server/**`

### forbidden_paths
- `apps/web/**`
- `apps/admin/**`

### dependencies
- `TASK-MCR-001` 的共享契约与数据库结构

### acceptance_criteria
- 互动、关注、评论/@、系统消息都能被正确生产和查询
- 消息接口支持分类消费、单条已读、批量已读
- 相关 server 测试通过

### test_strategy
tdd

### handoff_notes
- 系统消息必须覆盖至少文章/动态/投稿/榜单/品牌申请等状态变化。

### escalation_rule
- 若某条状态变化来源无法在本轮安全接入，应在 review 中显式列出，不暗改契约。

## Execution Packet

### task_id
TASK-MCR-003

### task_name
Web message center rebuild

### owner
frontend_implementer

### objective
重建 `notifications-page`，实现新的四分类单列虚拟长列表消息中心。

### in_scope
- 改造消息页布局、状态与导航
- 抽消息列表项组件、分类栏、统计区与空态
- 使用现有 `react-virtuoso` 基础设施实现单列虚拟列表
- 补齐前端测试

### out_of_scope
- 不修改共享契约
- 不修改主页逻辑

### input_documents
- requirements: `docs/requirements/2026-04-18-message-center-rebuild-requirements.md`
- tasks: `docs/tasks/2026-04-18-message-center-rebuild-tasks.md`
- plan: `docs/plans/2026-04-18-message-center-rebuild-plan.md`

### allowed_paths
- `apps/web/src/routes/**`
- `apps/web/src/components/**`
- `apps/web/src/features/**`
- `apps/web/tests/**`

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/admin/**`

### dependencies
- `TASK-MCR-001`
- `TASK-MCR-002`

### acceptance_criteria
- 四个一级分类可切换
- 单列虚拟列表可稳定渲染消息卡片
- 未读、批量已读、空态、错误态和跳转可用

### test_strategy
tdd

### handoff_notes
- 前端不得本地发明新的消息分类规则，优先消费 server 返回的分类与卡片结构。

### escalation_rule
- 若消息项高度无法稳定虚拟化，优先通过结构统一解决，不临时退回普通长列表。

## Execution Packet

### task_id
TASK-MCR-004

### task_name
Profile page optimization

### owner
frontend_implementer

### objective
优化个人主页，使其与新的消息中心、内容组织和关系入口保持一致。

### in_scope
- 审查并优化 `profile-page.tsx`
- 抽取可复用的指标条、入口区或内容组织结构
- 增强消息中心联动入口

### out_of_scope
- 不修改共享契约
- 不修改访客主页

### input_documents
- requirements: `docs/requirements/2026-04-18-message-center-rebuild-requirements.md`
- tasks: `docs/tasks/2026-04-18-message-center-rebuild-tasks.md`
- plan: `docs/plans/2026-04-18-message-center-rebuild-plan.md`

### allowed_paths
- `apps/web/src/features/auth/**`
- `apps/web/tests/**`

### forbidden_paths
- `packages/**`
- `apps/server/**`

### dependencies
- `TASK-MCR-003`

### acceptance_criteria
- 个人主页与消息中心入口、内容组织和关系状态表达协调一致
- 已修复本轮确认的功能缺漏

### test_strategy
test_after

### handoff_notes
- 保留个人主页与访客主页的角色差异，不强行完全共用页面。

### escalation_rule
- 若抽象共享组件会显著拖慢当前功能交付，优先局部复用而非大规模重构。

## Execution Packet

### task_id
TASK-MCR-005

### task_name
Visitor profile optimization

### owner
frontend_implementer

### objective
优化他人主页的资料、关系状态与内容组织，并补齐功能缺漏。

### in_scope
- 审查并优化 `user-profile-page.tsx`
- 改善关注、可见性、空态和内容流展示
- 与消息中心、个人主页保持导航和信息层级一致

### out_of_scope
- 不修改共享契约
- 不修改个人主页主逻辑

### input_documents
- requirements: `docs/requirements/2026-04-18-message-center-rebuild-requirements.md`
- tasks: `docs/tasks/2026-04-18-message-center-rebuild-tasks.md`
- plan: `docs/plans/2026-04-18-message-center-rebuild-plan.md`

### allowed_paths
- `apps/web/src/routes/**`
- `apps/web/src/features/auth/**`
- `apps/web/tests/**`

### forbidden_paths
- `packages/**`
- `apps/server/**`

### dependencies
- `TASK-MCR-003`

### acceptance_criteria
- 他人主页的资料、关注、内容可见性和内容流表达更完整
- 已修复本轮确认的功能缺漏

### test_strategy
test_after

### handoff_notes
- 访客主页要清楚区分“可见内容”“受限内容”和“关系操作”。

### escalation_rule
- 若某个缺漏实为 server 权限逻辑问题，应回切到后端修复，不在前端伪装解决。

## Execution Packet

### task_id
TASK-MCR-006

### task_name
Final verification and compatibility

### owner
orchestrator

### objective
联调消息中心、主页和 server 新消息域，并完成仓库级验证与最小兼容处理。

### in_scope
- 联调 `web` 与 `server`
- 必要时对 `apps/admin` 做最小兼容处理
- 运行仓库级验证
- 更新文档与最终交付说明

### out_of_scope
- 不新增 admin 新功能

### input_documents
- requirements: `docs/requirements/2026-04-18-message-center-rebuild-requirements.md`
- tasks: `docs/tasks/2026-04-18-message-center-rebuild-tasks.md`
- plan: `docs/plans/2026-04-18-message-center-rebuild-plan.md`

### allowed_paths
- 当前轮次涉及的所有实现路径
- `apps/admin/**` 仅在兼容阻塞时允许最小修改

### forbidden_paths
- 无

### dependencies
- `TASK-MCR-001` ~ `TASK-MCR-005`

### acceptance_criteria
- `web` 与 `server` 联调完成
- 根级 `lint/typecheck/test/build` 尽可能通过
- admin 若因共享契约阻塞，已做最小兼容

### test_strategy
verification

### handoff_notes
- 最终交付要区分“本轮完成”“保留风险”“后续可继续扩展”。

### escalation_rule
- 若最终发现共享模型仍不稳定，不继续堆前端修补，回到共享层收敛。
