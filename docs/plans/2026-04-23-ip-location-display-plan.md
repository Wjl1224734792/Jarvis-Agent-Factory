# IP 属地展示调整执行计划

> 本计划为覆盖更新版本。保留原计划的任务边界与执行信息，并基于已批准契约变更新增一轮可直接执行的任务包。  
> 当前主线状态：`TASK-001` 至 `TASK-005` 已按 `docs/implementation/2026-04-23-ip-location-display-frontend-implementation.md` 完成大部分范围；评分对象详情页仍缺少公开时间字段，无法完成“时间行显示属地”；本次新增执行轮次聚焦 `TASK-007 -> TASK-008 -> TASK-006 -> review`。

## 需求文档路径

- `docs/requirements/2026-04-23-ip-location-display-requirements.md`

## 任务文档路径

- `docs/tasks/2026-04-23-ip-location-display-tasks.md`

## Gate B 规划前检查

任务文档满足 Gate B，允许进入规划：

- 任务 ID 完整：`TASK-001` 至 `TASK-008`。
- 任务名称、类型、优先级完整。
- 完成标准完整。
- DDD 分类完整。
- TDD / `test_after` / `manual_only` 分类完整。
- 风险任务已标注。
- 文件所有权与共享路径提醒完整，且已纳入共享协议影响顺序。

结论：Gate B 通过。

## 既有计划信息与当前状态

已完成或已基本完成的既有范围：

- `TASK-001`：`IpLocationText` 已切为显式 `variant` 能力。
- `TASK-002`：首页、圈子流、榜单列表页已移除属地展示。
- `TASK-003`：帖子详情、圈子详情、榜单详情已迁移到时间信息行；评分对象详情页因缺少公开时间字段未闭环。
- `TASK-004`：个人主页与他人主页已统一为 `IP属地:<location>`。
- `TASK-005`：评论与回复已统一为 `<location>`。

未完成或需补齐的部分：

- 评分对象详情页时间行缺少可消费的公开时间字段。
- `TASK-006` 需要覆盖新增契约与评分对象详情页时间行场景。
- 统一收尾仍需 `review_qa`。

上游新增输入：

- 已批准契约变更：`docs/contracts/2026-04-23-rating-target-detail-time-contract-change.md`
- 现状实现记录：`docs/implementation/2026-04-23-ip-location-display-frontend-implementation.md`

## 当前轮次目标

在不改 DB schema、不改 env、不公开 raw `clientIp`、不触碰 `apps/admin` 的前提下，补齐评分对象详情页所需的公开 `createdAt` 契约，并完成评分对象详情页时间信息行的属地展示，随后更新回归测试并进入评审。

## 当前轮次范围

范围内：

- `TASK-007`：补齐评分对象公开时间契约，仅公开并消费 `createdAt`。
- `TASK-008`：在评分对象详情页时间信息行显示时间与 `<location>`。
- `TASK-006`：更新测试策略与测试覆盖，纳入新增契约与评分对象详情页。
- `review_qa`：在上述任务完成后做统一评审。

范围外：

- 不改 DB schema、migration、seed、数据库脚本。
- 不改 env、`.env.example`、README、CORS、OpenAPI 或基础设施配置。
- 不公开 raw `clientIp`，不新增任何原始 IP 字段依赖。
- 不修改 `ipLocationLabel` 生成逻辑。
- 不触碰 `apps/admin`，除非 `TASK-007` 造成明确 typecheck 失败；如发生，必须回退主会话，不得自行扩范围。
- 不在 `apps/web` 手写重复响应类型绕过 `packages/*`。

## 完成标准

- 评分对象详情公开响应包含可消费的 `createdAt`。
- 评分对象详情页时间信息行在有 `createdAt` 与 `ipLocationLabel` 时显示时间与 `<location>`。
- 评分对象详情页作者区域不显示属地。
- `TASK-006` 的测试策略与验收项已覆盖新增契约与评分对象详情页。
- 收尾顺序明确为 `TASK-007 -> TASK-008 -> TASK-006 -> review`。
- 计划中已明确 forbidden、共享区域归属、plan patch 触发条件与 Gate C 结论。

## 是否需要先查阅 repo_explorer / docs_researcher

不需要。

理由：

- 需求、任务、契约变更、前端实现说明均已给出。
- 当前阻塞点明确收敛在评分对象详情公开时间字段。
- 本轮不涉及额外领域建模或外部文档调研。

## 执行代理分工

当前轮次只建议三个执行环节：

- `backend_implementer`：负责 `TASK-007`。唯一 owner，负责共享契约链路评估与最小后端补齐。
- `frontend_implementer`：负责 `TASK-008`。仅消费已公开 `createdAt`，补齐评分对象详情页时间行。
- `frontend_test_worker`：负责 `TASK-006`。更新前端回归覆盖，并核对 `TASK-007` 的契约测试已纳入验收。

评审阶段：

- `review_qa`：在 `TASK-006` 完成后统一验收。

## 共享区域改动归属

唯一责任方如下：

- `packages/schemas/src/rankings.ts`：只允许 `TASK-007 / backend_implementer` 修改。
- `apps/server/src/modules/rankings/rankings.service.ts`：只允许 `TASK-007 / backend_implementer` 修改。
- `packages/http-client`：本轮默认只读，由 `TASK-007` 评估，不预分配给其它代理。
- `packages/shared`：本轮默认只读，由 `TASK-007` 评估，不预分配给其它代理。
- `apps/web/src/routes/rating-target-detail-header.tsx`：只允许 `TASK-008 / frontend_implementer` 修改。
- `apps/web/tests/**`：只允许 `TASK-006 / frontend_test_worker` 修改。

关于 `packages/http-client` 的明确结论：

- `packages/http-client/src/index.ts` 当前直接依赖 `ratingTargetDetailResponseSchema` 做解析与类型推导，没有单独维护评分对象详情结构。
- 因此只要 `@feijia/schemas` 中的 `ratingTargetDetailResponseSchema` 补齐 `createdAt`，`packages/http-client` 的源代码通常无需改动。
- 本计划将 `packages/http-client` 标记为“需要评估但默认不改”的共享区域；只有出现明确编译或类型断裂时，才允许通过 plan patch 重新分配。

关于 `packages/shared` 的明确结论：

- 本轮不涉及路由常量、共享请求入口或全局客户端行为变化，默认无需改动。
- 如 `TASK-007` 发现确有共享常量或类型受影响，必须回退主会话，不得自行扩写。

## 并行 / 串行策略

必须串行：

1. `TASK-007`
2. `TASK-008`
3. `TASK-006`
4. `review_qa`

禁止并行的原因：

- `TASK-008` 依赖 `TASK-007` 提供可消费的公开 `createdAt`。
- `TASK-006` 需要在 `TASK-007`、`TASK-008` 完成后补齐回归与验收覆盖。
- `review_qa` 只能在实现与测试都收口后执行。

## 风险提醒

- `ratingTargetSchema` 被其它评分对象响应复用，新增 `createdAt` 可能影响列表项、详情项或 moderation 响应的 schema 通过性。
- 评分对象服务层可能已持有 `createdAt`，也可能仍被序列化链路遗漏；`TASK-007` 必须先确认是 schema 过滤还是服务输出缺口。
- 若 `TASK-008` 在前端通过本地类型补丁绕过共享契约，会破坏共享协议顺序，必须禁止。
- 若 `TASK-006` 只补前端页面测试而不核对 `TASK-007` 的契约测试，会留下响应字段回归缺口。
- 若 `TASK-007` 影响到 `apps/admin` typecheck，不得顺手修；必须回主会话确认是否扩范围。

## 实现者交接信息

- 本轮唯一新增公开字段是 `createdAt`；不公开 `updatedAt`，除非主会话另行批准。
- 不公开 raw `clientIp`，不引入任何原始 IP 依赖。
- `TASK-008` 只允许消费 `createdAt` 与现有 `ipLocationLabel`。
- 评分对象详情页时间信息行的具体展示文案可沿用页面现有风格，但必须满足“时间 + `<location>`”且作者区域无属地。
- `TASK-006` 不负责补共享契约或后端测试代码；若发现 `TASK-007` 未留下可验收的契约测试，应回退 orchestrator，而不是越权去改共享或后端。

## test_strategy 总览

| task_id | owner | test_strategy | 说明 |
| --- | --- | --- | --- |
| TASK-001 | frontend_implementer | test_after | 既有前端实现，保留原策略。 |
| TASK-002 | frontend_implementer | test_after | 既有前端实现，保留原策略。 |
| TASK-003 | frontend_implementer | test_after | 评分对象详情页相关验收由 TASK-007 / TASK-008 补齐。 |
| TASK-004 | frontend_implementer | test_after | 既有前端实现，保留原策略。 |
| TASK-005 | frontend_implementer | test_after | 既有前端实现，保留原策略。 |
| TASK-006 | frontend_test_worker | test_after | 更新为覆盖评分对象详情页时间行，并核对 TASK-007 的契约测试已存在。 |
| TASK-007 | backend_implementer | TDD | 先固定 schema / service / contract 行为，再做最小实现。 |
| TASK-008 | frontend_implementer | test_after | 在 TASK-007 完成后补前端消费与页面行为。 |

## Execution Packet

### task_id
TASK-001

### task_name
调整 `IpLocationText` 公共展示能力

### owner
frontend_implementer

### objective
让 `IpLocationText` 支持显式无前缀和 `IP属地:` 两种模式。

### in_scope
- 修改 `apps/web/src/components/ip-location-text.tsx`
- 保持空值不渲染
- 保持 `className` 能力

### out_of_scope
- 不改页面调用点
- 不改 `packages/*`
- 不改 `apps/server`

### input_documents
- requirements: `docs/requirements/2026-04-23-ip-location-display-requirements.md`
- tasks: `docs/tasks/2026-04-23-ip-location-display-tasks.md`
- plan: `docs/plans/2026-04-23-ip-location-display-plan.md`

### allowed_paths
- `apps/web/src/components/ip-location-text.tsx`

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/admin/**`
- `apps/web/src/routes/**`
- `apps/web/src/features/**`
- `apps/web/tests/**`

### dependencies
- 现有页面传入的 `ipLocationLabel`

### acceptance_criteria
- 可渲染 `<location>`
- 可渲染 `IP属地:<location>`
- 空值不渲染

### test_strategy
test_after

### handoff_notes
- 后续调用点必须显式选择展示模式

### escalation_rule
若需要改共享契约或后端，回退主会话

## Execution Packet

### task_id
TASK-002

### task_name
移除信息流与列表页属地展示

### owner
frontend_implementer

### objective
从列表与信息流页面移除属地 UI。

### in_scope
- `apps/web/src/routes/home-page.tsx`
- `apps/web/src/routes/circle-page-feed.tsx`
- `apps/web/src/routes/rankings-page.tsx`
- 清理未使用 import

### out_of_scope
- 不删 `ipLocationLabel` 数据字段
- 不改详情页、主页、评论区

### input_documents
- requirements: `docs/requirements/2026-04-23-ip-location-display-requirements.md`
- tasks: `docs/tasks/2026-04-23-ip-location-display-tasks.md`
- plan: `docs/plans/2026-04-23-ip-location-display-plan.md`

### allowed_paths
- `apps/web/src/routes/home-page.tsx`
- `apps/web/src/routes/circle-page-feed.tsx`
- `apps/web/src/routes/rankings-page.tsx`

### forbidden_paths
- `apps/web/src/components/ip-location-text.tsx`
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/routes/circle-page-detail.tsx`
- `apps/web/src/routes/ranking-detail-page.tsx`
- `apps/web/src/routes/rating-target-detail-header.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/user-profile-page.tsx`
- `apps/web/src/features/posts/post-comment-thread.tsx`
- `apps/web/src/routes/model-comments-section.tsx`
- `apps/web/src/routes/rating-target-detail-comment-card.tsx`
- `packages/**`
- `apps/server/**`
- `apps/admin/**`

### dependencies
- `TASK-001`

### acceptance_criteria
- 三个页面均不再渲染属地
- 无未使用 import

### test_strategy
test_after

### handoff_notes
- 只删 UI，不删数据字段

### escalation_rule
若需要改接口或共享类型，回退主会话

## Execution Packet

### task_id
TASK-003

### task_name
详情页发布时间信息行追加 `<location>`

### owner
frontend_implementer

### objective
将详情页属地迁移到时间信息行。

### in_scope
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/routes/circle-page-detail.tsx`
- `apps/web/src/routes/ranking-detail-page.tsx`
- `apps/web/src/routes/rating-target-detail-header.tsx`

### out_of_scope
- 不改数据请求
- 不改评论区
- 不改 `packages/*` 或 `apps/server/*`

### input_documents
- requirements: `docs/requirements/2026-04-23-ip-location-display-requirements.md`
- tasks: `docs/tasks/2026-04-23-ip-location-display-tasks.md`
- plan: `docs/plans/2026-04-23-ip-location-display-plan.md`

### allowed_paths
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/routes/circle-page-detail.tsx`
- `apps/web/src/routes/ranking-detail-page.tsx`
- `apps/web/src/routes/rating-target-detail-header.tsx`

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/admin/**`

### dependencies
- `TASK-001`
- 现有公开 `ipLocationLabel`

### acceptance_criteria
- 详情页时间信息行显示 `<location>`
- 作者区域不显示属地
- 评分对象详情页部分由 `TASK-007`、`TASK-008` 补齐

### test_strategy
test_after

### handoff_notes
- 评分对象详情页不可再依赖作者区域属地

### escalation_rule
若详情页缺少公开字段需改契约，回退主会话

## Execution Packet

### task_id
TASK-004

### task_name
个人主页与他人主页属地统一为 `IP属地:<location>`

### owner
frontend_implementer

### objective
统一主页场景属地口径。

### in_scope
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/user-profile-page.tsx`

### out_of_scope
- 不改资料设置
- 不改详情页与评论区

### input_documents
- requirements: `docs/requirements/2026-04-23-ip-location-display-requirements.md`
- tasks: `docs/tasks/2026-04-23-ip-location-display-tasks.md`
- plan: `docs/plans/2026-04-23-ip-location-display-plan.md`

### allowed_paths
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/user-profile-page.tsx`

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/admin/**`

### dependencies
- `TASK-001`

### acceptance_criteria
- 两个主页场景显示 `IP属地:<location>`
- 空值不渲染前缀

### test_strategy
test_after

### handoff_notes
- 只改展示区域，不碰资料逻辑

### escalation_rule
若主页场景缺公开字段，回退主会话

## Execution Packet

### task_id
TASK-005

### task_name
评论与回复属地统一为 `<location>`

### owner
frontend_implementer

### objective
统一评论区属地口径。

### in_scope
- `apps/web/src/features/posts/post-comment-thread.tsx`
- `apps/web/src/routes/model-comments-section.tsx`
- `apps/web/src/routes/rating-target-detail-comment-card.tsx`

### out_of_scope
- 不改评论接口或排序
- 不改详情页作者区与主页

### input_documents
- requirements: `docs/requirements/2026-04-23-ip-location-display-requirements.md`
- tasks: `docs/tasks/2026-04-23-ip-location-display-tasks.md`
- plan: `docs/plans/2026-04-23-ip-location-display-plan.md`

### allowed_paths
- `apps/web/src/features/posts/post-comment-thread.tsx`
- `apps/web/src/routes/model-comments-section.tsx`
- `apps/web/src/routes/rating-target-detail-comment-card.tsx`

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/admin/**`

### dependencies
- `TASK-001`

### acceptance_criteria
- 评论与回复都只显示 `<location>`
- 不出现前缀

### test_strategy
test_after

### handoff_notes
- 帖子评论主楼与回复都要覆盖

### escalation_rule
若 payload 缺字段且需要改契约，回退主会话

## Execution Packet

### task_id
TASK-006

### task_name
补充页面级回归测试、契约回归核对与全站文案扫描

### owner
frontend_test_worker

### objective
在 `TASK-007` 与 `TASK-008` 完成后，补齐前端回归覆盖，并把新增契约纳入验收闭环。

### in_scope
- 更新 `apps/web/tests/**`
- 覆盖 `IpLocationText` 的 `plain` / `profile` / 空值行为
- 覆盖列表页不显示属地
- 覆盖帖子详情、圈子详情、榜单详情时间信息行显示 `<location>`
- 覆盖评分对象详情页时间信息行显示时间与 `<location>`
- 覆盖评分对象详情页作者区域不显示属地
- 覆盖主页 `IP属地:<location>`
- 覆盖评论与回复仅显示 `<location>`
- 扫描 `apps/web/src` 与 `apps/web/tests` 中旧文案误用
- 运行并记录前端验证命令
- 验收时核对 `TASK-007` 已补齐 schema / server 契约测试，至少能证明 `createdAt` 已受共享契约保护

### out_of_scope
- 不修改 `apps/web/src/**`
- 不修改 `packages/schemas/**`
- 不修改 `apps/server/**`
- 不修改测试配置
- 不为测试目的扩展共享契约

### input_documents
- requirements: `docs/requirements/2026-04-23-ip-location-display-requirements.md`
- tasks: `docs/tasks/2026-04-23-ip-location-display-tasks.md`
- plan: `docs/plans/2026-04-23-ip-location-display-plan.md`
- contract change: `docs/contracts/2026-04-23-rating-target-detail-time-contract-change.md`
- frontend implementation: `docs/implementation/2026-04-23-ip-location-display-frontend-implementation.md`

### allowed_paths
- `apps/web/tests/**`

### forbidden_paths
- `apps/web/src/**`
- `packages/**`
- `apps/server/**`
- `apps/admin/**`
- `vitest.config.ts`
- `.env`
- `.env.example`
- `README.md`

### dependencies
- `TASK-001` 至 `TASK-005` 已完成
- `TASK-007` 已完成并留下契约测试证据
- `TASK-008` 已完成

### acceptance_criteria
- `IpLocationText` 的两种展示模式与空值行为有测试覆盖
- 列表页无属地展示有测试或等价调用点检查
- 评分对象详情页时间信息行显示时间与 `<location>` 有测试覆盖
- 评分对象详情页作者区域无属地有测试覆盖
- 核对 `TASK-007` 已补齐并执行共享契约相关测试；若未补齐，明确阻塞，不得自行去改共享或后端代码
- 文本扫描确认详情页 / 评论区 / 信息流不再误用旧文案
- `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build` 的执行结果已记录

### test_strategy
test_after

### handoff_notes
- 本任务的“覆盖新增契约”指把 `TASK-007` 产出的 schema / server 契约测试纳入验收链路，不是让前端测试代理去修改共享或后端代码
- 若评分对象详情页页面回归失败，应回交 `frontend_implementer`

### escalation_rule
若测试要通过必须修改生产代码、共享契约、后端测试、测试配置或 `apps/admin`，回退主会话

## Execution Packet

### task_id
TASK-007

### task_name
补齐评分对象公开时间契约

### owner
backend_implementer

### objective
按共享协议顺序补齐评分对象公开响应中的 `createdAt`，并确保后端与共享契约一致。

### in_scope
- 评估并按顺序处理 `packages/schemas -> packages/http-client -> packages/shared -> apps/server`
- 在评分对象公开 schema 中补齐 `createdAt`
- 确认评分对象详情响应能通过公开 schema 输出 `createdAt`
- 按 TDD 补齐必要的 schema / service / contract 测试
- 明确记录 `packages/http-client` 与 `packages/shared` 是否需要代码改动及原因

### out_of_scope
- 不改 DB schema、migration、seed
- 不改 env、README、基础设施配置
- 不公开 `updatedAt`
- 不公开 raw `clientIp`
- 不触碰 `apps/web`
- 不触碰 `apps/admin`，除非出现明确 typecheck 失败且已回退主会话

### input_documents
- requirements: `docs/requirements/2026-04-23-ip-location-display-requirements.md`
- tasks: `docs/tasks/2026-04-23-ip-location-display-tasks.md`
- plan: `docs/plans/2026-04-23-ip-location-display-plan.md`
- contract change: `docs/contracts/2026-04-23-rating-target-detail-time-contract-change.md`
- frontend implementation: `docs/implementation/2026-04-23-ip-location-display-frontend-implementation.md`

### allowed_paths
- `packages/schemas/src/rankings.ts`
- `packages/schemas/tests/rankings.test.ts`
- `apps/server/src/modules/rankings/rankings.service.ts`
- `apps/server/tests/ip-location.test.ts`
- `apps/server/tests/rankings.test.ts`

### forbidden_paths
- `packages/db/**`
- `packages/shared/**`
- `packages/http-client/src/**`
- `apps/web/**`
- `apps/admin/**`
- `.env`
- `.env.example`
- `README.md`

### dependencies
- 已批准的 contract change
- 现有评分对象详情服务与 schema 链路

### acceptance_criteria
- `ratingTargetDetailResponseSchema` 对外公开 `createdAt`
- 评分对象详情响应经过 schema 解析后可稳定包含 `createdAt`
- `packages/http-client` 被明确评估为“无需源代码改动”或给出已批准的 plan patch 触发说明
- `packages/shared` 被明确评估为“无需改动”或给出已批准的 plan patch 触发说明
- 不改 DB schema、不改 env、不公开 raw `clientIp`
- 新增或更新的契约测试先失败后通过，能防止 `createdAt` 再次丢失

### test_strategy
TDD

### handoff_notes
- 优先判断问题是 schema 过滤还是服务输出遗漏
- 如果只需改 schema，就不要扩到无关层
- 若 `apps/admin` 因共享契约变化产生错误，只记录阻塞并回退主会话

### escalation_rule
若需要修改 `packages/http-client/src/**`、`packages/shared/**`、`apps/admin/**`、DB schema 或 env，先回 orchestrator 发起 plan patch

## Execution Packet

### task_id
TASK-008

### task_name
评分对象详情页时间行显示属地

### owner
frontend_implementer

### objective
消费 `TASK-007` 公开的 `createdAt`，在评分对象详情页时间信息行显示时间与 `<location>`。

### in_scope
- 修改评分对象详情页头部时间信息行
- 消费公开 `createdAt`
- 继续使用现有 `ipLocationLabel`
- 保持作者区域不显示属地
- 更新前端实现说明

### out_of_scope
- 不改共享契约
- 不改服务端
- 不改 `apps/admin`
- 不使用 `updatedAt` 或任何未批准时间字段兜底
- 不在前端手写重复响应类型

### input_documents
- requirements: `docs/requirements/2026-04-23-ip-location-display-requirements.md`
- tasks: `docs/tasks/2026-04-23-ip-location-display-tasks.md`
- plan: `docs/plans/2026-04-23-ip-location-display-plan.md`
- contract change: `docs/contracts/2026-04-23-rating-target-detail-time-contract-change.md`
- frontend implementation: `docs/implementation/2026-04-23-ip-location-display-frontend-implementation.md`

### allowed_paths
- `apps/web/src/routes/rating-target-detail-header.tsx`
- `docs/implementation/2026-04-23-ip-location-display-frontend-implementation.md`

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/admin/**`
- `apps/web/tests/**`
- `.env`
- `.env.example`
- `README.md`

### dependencies
- `TASK-007`
- 公开 `createdAt`
- 现有公开 `ipLocationLabel`

### acceptance_criteria
- 评分对象详情页时间信息行显示 `createdAt` 对应时间与 `<location>`
- 作者区域不显示属地
- `ipLocationLabel` 为空时不出现残留分隔符
- `createdAt` 缺失时不回退到 `updatedAt` 或其它未批准字段
- 实现说明已同步记录该补丁完成

### test_strategy
test_after

### handoff_notes
- 只消费共享链路已经公开的类型
- 失败时不要在页面本地补类型

### escalation_rule
若仍拿不到 `createdAt` 或需要动共享 / 后端代码，回退主会话

## Plan Patch / Contract Change Request 触发条件

以下任一情况出现时，停止执行并回退主会话：

- `TASK-007` 发现必须修改 `packages/http-client/src/**`。
- `TASK-007` 发现必须修改 `packages/shared/**`。
- `TASK-007` 发现 `apps/admin` 因共享契约变化出现 typecheck 失败。
- 需要公开 `updatedAt`、`clientIp` 或任何未批准字段。
- 需要修改 DB schema、migration、seed、env、README、CORS、OpenAPI 或基础设施配置。
- `TASK-008` 发现评分对象详情页仍无法只靠 `createdAt` 完成时间行展示。
- `TASK-006` 发现现有验证链路不足以验收新增契约，且必须改共享 / 后端测试代码。

## 推荐的下一步

1. Spawn `backend_implementer` 执行 `TASK-007`。
2. `TASK-007` 完成后，Spawn `frontend_implementer` 执行 `TASK-008`。
3. `TASK-008` 完成后，Spawn `frontend_test_worker` 执行更新后的 `TASK-006`。
4. 三项完成后，Spawn `review_qa`。

## Gate C 自检结论

Gate C 通过。

- 当前轮次目标已写明。
- 当前轮次范围已写明。
- 执行代理分工已写明。
- 共享区域唯一责任方已指定。
- 当前待执行任务 `TASK-006`、`TASK-007`、`TASK-008` 均有 Execution Packet。
- 每个待执行任务均指定 `test_strategy`。
- 风险提醒已写明。
- 实现者交接信息已写明。

补充说明：

- 既有计划信息已保留，并明确了 `TASK-001` 至 `TASK-005` 的当前状态。
- 当前新增执行轮次已按 `TASK-007 -> TASK-008 -> TASK-006 -> review` 收敛。
- forbidden 已明确：不改 DB schema、不改 env、不公开 raw `clientIp`、不碰 `apps/admin`，除非 typecheck 必须修复且先回退主会话。
