# 2026-04-15 项目审查后续优化执行计划

## 当前轮次目标

- 修复本轮只读审查确认的高置信度工程问题，并保持变更最小、可验证、可回退。
- 先完成可自动化验证的后端与前端行为修复，再处理脚本和编排配置。

## 当前轮次范围

- 需求文档：`docs/requirements/2026-04-15-project-audit-optimization-requirements.md`
- 任务文档：`docs/tasks/2026-04-15-project-audit-optimization-tasks.md`
- 覆盖任务：TASK-AUDOPT-001 至 TASK-AUDOPT-004

## 执行代理分工

- 主会话：统一负责本轮实现、测试、文档和评审。
- 子代理使用情况：
  - `repo_explorer` 专用角色因当前账号不支持其配置模型启动失败，已回退为通用 `explorer` 完成只读审查。
  - `task_design` 专用角色因本地 provider 不支持 `gpt-5.4-mini` 启动失败，任务文档由主会话按 Gate B 手工补齐。

## 共享区域唯一责任方

- `.codex/agents/**`、`.codex/skills/agent-orchestration/**`：主会话。
- `scripts/run-e2e.mjs`、`apps/server/package.json`：主会话。
- `apps/server/src/modules/admin-reports/**` 与相关 server tests：主会话。
- `apps/admin/src/features/posts/**` 与相关 admin tests：主会话。

## 并行 / 串行顺序

1. 串行执行 TASK-AUDOPT-003 的 TDD Red / Green。
2. 串行执行 TASK-AUDOPT-004 的 TDD Red / Green。
3. 执行 TASK-AUDOPT-002 的脚本修复并运行相关验证。
4. 执行 TASK-AUDOPT-001 的配置修复并用静态搜索验证。
5. 汇总实现文档、验证结果和评审。

## 风险提醒

- 通用举报详情路由加 schema parse 前，必须确保 service 输出的 `evidenceImages` 含 `mimeType` 与 `byteSize`。
- 评论审核页按域启用 query 后，loading 状态和刷新函数必须只依赖当前域，避免隐藏域 query 未启用时误判。
- 编排配置只替换不可用模型，不改变 agent 职责描述。

## 实现者交接信息

- 使用 PowerShell 作为本地 shell。
- 手动代码编辑必须使用 `apply_patch`。
- 修改共享协议、数据库或环境变量不在本轮范围；如发现必须修改，停止并记录 plan patch。

## Execution Packet

### task_id
TASK-AUDOPT-003

### task_name
补齐通用举报详情共享契约校验

### owner
orchestrator

### objective
让 `/admin/reports/{kind}/{id}` 与专用举报详情路由一样通过共享 schema 校验，并补齐证据图片字段。

### in_scope

- 新增 server 行为测试覆盖通用举报详情成功响应中的 `evidenceImages` 契约字段。
- 修改 `adminReportsService` 的证据图片序列化输出。
- 修改 `adminReportsRoute` 使用 `adminReportRecordsResponseSchema.parse`。

### out_of_scope

- 不新增举报聚合接口。
- 不修改数据库结构或 report table。
- 不修改 admin 页面展示。

### input_documents

- requirements: `docs/requirements/2026-04-15-project-audit-optimization-requirements.md`
- tasks: `docs/tasks/2026-04-15-project-audit-optimization-tasks.md`
- plan: `docs/plans/2026-04-15-project-audit-optimization-plan.md`

### allowed_paths

- `apps/server/src/modules/admin-reports/admin-reports.route.ts`
- `apps/server/src/modules/admin-reports/admin-reports.service.ts`
- `apps/server/tests/*.test.ts`

### forbidden_paths

- `packages/db/**`
- `packages/schemas/**`，除非现有 schema 与其他专用路由不一致
- `apps/admin/**`

### dependencies

- `adminReportRecordsResponseSchema`
- `API_ROUTES.admin.reportDetail`
- 已有 test helper：`loginAdmin`、`loginUser`、`uploadReportImage` 等可参照 `apps/server/tests/rankings.test.ts`

### acceptance_criteria

- 新增测试在实现前失败，失败原因是通用举报详情缺少证据图片契约字段。
- 实现后测试通过。
- `adminReportsRoute` 明确调用共享 schema parse。

### test_strategy
tdd

### handoff_notes

- 该任务只收紧契约，不改变前端 UI。

### escalation_rule

如需改变 `adminReportRecordsResponseSchema` 或 evidence image 结构，必须先确认不会破坏已有专用举报详情接口。

## Execution Packet

### task_id
TASK-AUDOPT-004

### task_name
收敛 Admin 评论审核页按域请求

### owner
orchestrator

### objective
让评论审核页只启用当前 `domain` 对应的评论列表请求。

### in_scope

- 新增按域 query 启用辅助函数与测试。
- 给 5 个评论域 query 加 `enabled`。
- 调整 query key、records、loading、refresh 逻辑，使其只围绕当前域。

### out_of_scope

- 不新增后端统计接口。
- 不改变评论审核页面信息架构。
- 不改 ReportsPage 的多域聚合行为。

### input_documents

- requirements: `docs/requirements/2026-04-15-project-audit-optimization-requirements.md`
- tasks: `docs/tasks/2026-04-15-project-audit-optimization-tasks.md`
- plan: `docs/plans/2026-04-15-project-audit-optimization-plan.md`

### allowed_paths

- `apps/admin/src/features/posts/post-comments-page.tsx`
- `apps/admin/src/features/posts/post-comments-page-helpers.ts`
- `apps/admin/tests/*.test.ts`

### forbidden_paths

- `apps/server/**`
- `packages/http-client/**`
- `packages/schemas/**`

### dependencies

- React Query `enabled`
- 现有 `apiClient.listAdmin*Comments` 方法

### acceptance_criteria

- 新增测试在实现前失败，失败原因是辅助函数不存在或未返回预期域启用结果。
- 实现后测试通过。
- 页面当前域之外的 query 不会自动执行。

### test_strategy
tdd

### handoff_notes

- 待处理数本轮采用当前已加载域的数据，后续如需要全域精确计数再补轻量统计接口。

### escalation_rule

如产品要求卡片继续显示全域精确待审数，不要恢复 5 路请求，应回到编排者规划统计接口。

## Execution Packet

### task_id
TASK-AUDOPT-002

### task_name
修复测试入口与 E2E 默认端口漂移

### owner
orchestrator

### objective
让 server 测试脚本覆盖现有测试文件，并让 E2E wrapper 使用当前默认端口。

### in_scope

- 修改 `apps/server/package.json` 的 `test` 脚本。
- 修改 `scripts/run-e2e.mjs` 的默认 `E2E_*` URL 与等待 URL。

### out_of_scope

- 不修改 Playwright 用例。
- 不改变 infra / db reset 流程。

### input_documents

- requirements: `docs/requirements/2026-04-15-project-audit-optimization-requirements.md`
- tasks: `docs/tasks/2026-04-15-project-audit-optimization-tasks.md`
- plan: `docs/plans/2026-04-15-project-audit-optimization-plan.md`

### allowed_paths

- `apps/server/package.json`
- `scripts/run-e2e.mjs`

### forbidden_paths

- `playwright.config.ts`
- `.env.example`
- `README.md`

### dependencies

- `playwright.config.ts` 当前默认端口
- README 默认访问地址说明

### acceptance_criteria

- `bun run --cwd apps/server test` 能匹配 `provider-config.test.ts`。
- `scripts/run-e2e.mjs` 不再硬编码旧端口 `3000/3001/3002`。

### test_strategy
test_after

### handoff_notes

- E2E 全量可能依赖本地 Docker 和服务启动；若耗时或环境缺失，需要记录未运行原因。

### escalation_rule

如需改变 E2E 数据初始化语义，必须先回到计划阶段。

## Execution Packet

### task_id
TASK-AUDOPT-001

### task_name
修复编排代理模型兼容性与说明文档

### owner
orchestrator

### objective
把当前环境不可用的 agent 模型替换为受支持模型，并同步 README 摘要。

### in_scope

- 替换 `.codex/agents/repo_explorer.toml` 中的不可用模型。
- 替换 `.codex/agents/task_design.toml` 与 `.codex/agents/docs_researcher.toml` 中的不可用 mini 模型。
- 同步 `.codex/skills/agent-orchestration/README.md`。

### out_of_scope

- 不改变 agent 职责和技能标签。
- 不修改 worker 代理模型。

### input_documents

- requirements: `docs/requirements/2026-04-15-project-audit-optimization-requirements.md`
- tasks: `docs/tasks/2026-04-15-project-audit-optimization-tasks.md`
- plan: `docs/plans/2026-04-15-project-audit-optimization-plan.md`

### allowed_paths

- `.codex/agents/repo_explorer.toml`
- `.codex/agents/task_design.toml`
- `.codex/agents/docs_researcher.toml`
- `.codex/skills/agent-orchestration/README.md`

### forbidden_paths

- `AGENTS.md`
- `.codex/AGENTS.md`
- `.codex/skills/agent-orchestration/SKILL.md`

### dependencies

- 当前工具支持的模型清单

### acceptance_criteria

- 静态搜索不再命中 `gpt-5.3-codex-spark` 与 `gpt-5.4-mini`。
- README 模型摘要与 TOML 一致。

### test_strategy
manual_only

### handoff_notes

- 本任务修复的是仓库配置；当前会话内的内置 spawn 角色仍由运行时工具定义，不一定受仓库 TOML 影响。

### escalation_rule

如需要改变 agent 分工或权限，必须先回到需求澄清。

## Plan Patch / Contract Change Request 触发条件

- 需要修改数据库结构、迁移、seed 或环境变量。
- 需要新增评分对象审核聚合接口。
- 需要改动 `packages/http-client` 或 `packages/schemas` 中非本轮举报详情相关契约。
