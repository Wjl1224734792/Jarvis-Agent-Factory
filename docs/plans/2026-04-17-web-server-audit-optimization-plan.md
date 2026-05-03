# 2026-04-17 Web / Server 审查优化执行计划

## 输入文档

- `docs/requirements/2026-04-17-web-server-audit-optimization-requirements.md`
- `docs/tasks/2026-04-17-web-server-audit-optimization-tasks.md`

## 当前轮次目标

- 按固定顺序完成 `apps/web` 与 `apps/server` 的分阶段审查和最小优化。
- 先收口 Web 审查结论并完成 Web 最小修复，再进入 Server 审查与修复。
- 严守共享边界，不在本轮直接吸收 `packages/*`、数据库语义、环境变量、根脚本或跨应用契约变更。

## 阶段顺序

1. Web review
2. Web optimize
3. Server review
4. Server optimize
5. Validation & closeout

## 共享边界

- 可写：`apps/web/**`、`apps/server/**`、本轮 `docs/plans/**`、`docs/review/**`
- 只读：`packages/config/**`、`packages/db/**`、`packages/http-client/**`、`packages/schemas/**`、`packages/shared/**`、`README.md`、`.env.example`、`apps/admin/**`
- 一旦确认修复必须跨共享边界，停止直改，升级为计划补丁。

## 验证策略

- 阶段内先跑与改动直接相关的验证。
- 收尾尝试：
  - `bun run lint`
  - `bun run typecheck`
  - `bun run test`
  - `bun run build`
- 若命令失败或受环境限制未完成，记录失败原因、影响与残余风险。

## 风险提醒

- Web 问题可能表面在 `apps/web`，根因却落在共享包或 Server 契约；发现后必须停止越界修改。
- Server 若命中权限、状态转换、接口契约、计数、幂等、重试或故障恢复问题，默认按高风险处理。
- 本轮目标是最小正确改动，不做顺手重构。

## Execution Packet

### task_id
TASK-WSAO-001

### task_name
Web review

### owner
orchestrator

### objective
对 `apps/web` 做只读审查并产出可直接驱动后续最小优化的书面问题清单。

### in_scope
- 只读审查 `apps/web/src/**`、`apps/web/tests/**`、`apps/web/e2e/**`
- 产出 `docs/review/2026-04-17-web-audit-optimization-review.md`
- 标记每个问题为 `本轮修复`、`仅记录` 或 `转共享补丁`

### out_of_scope
- 不修改业务代码、测试代码或共享文件

### input_documents
- requirements: `docs/requirements/2026-04-17-web-server-audit-optimization-requirements.md`
- tasks: `docs/tasks/2026-04-17-web-server-audit-optimization-tasks.md`
- plan: `docs/plans/2026-04-17-web-server-audit-optimization-plan.md`

### allowed_paths
- `docs/review/2026-04-17-web-audit-optimization-review.md`

### forbidden_paths
- `apps/server/**`
- `packages/**`
- `apps/admin/**`
- `README.md`
- `.env.example`

### dependencies
- `apps/web/AGENTS.md`
- `apps/web/package.json`

### acceptance_criteria
- 形成完整 Web 已确认问题清单
- 未完成书面结论前，不进入 Web optimize

### test_strategy
manual_only

### handoff_notes
- Web optimize 只能消费书面确认的问题，不允许边改边补问题定义。

### escalation_rule
- 若需改共享包、环境变量、根文档或 Server 契约，回到编排者升级处理。

## Execution Packet

### task_id
TASK-WSAO-002

### task_name
Web optimize

### owner
orchestrator

### objective
仅对 Web 审查结论中标记为“本轮修复”的问题做最小正确改动，并补齐验证证据。

### in_scope
- 修改 `apps/web/src/**`
- 视需要修改 `apps/web/tests/**`
- 更新 `docs/review/2026-04-17-web-audit-optimization-review.md`

### out_of_scope
- 不修复未在 Web 审查文档中确认的问题
- 不修改 `apps/server/**`、`packages/**`、`apps/admin/**`

### input_documents
- requirements: `docs/requirements/2026-04-17-web-server-audit-optimization-requirements.md`
- tasks: `docs/tasks/2026-04-17-web-server-audit-optimization-tasks.md`
- plan: `docs/plans/2026-04-17-web-server-audit-optimization-plan.md`
- review: `docs/review/2026-04-17-web-audit-optimization-review.md`

### allowed_paths
- `apps/web/src/**`
- `apps/web/tests/**`
- `docs/review/2026-04-17-web-audit-optimization-review.md`

### forbidden_paths
- `apps/server/**`
- `packages/**`
- `apps/admin/**`
- `README.md`
- `.env.example`

### dependencies
- `TASK-WSAO-001` 输出的 Web 审查文档

### acceptance_criteria
- 只修已确认问题
- 文档中写明 `已修复`、`未处理`、`转共享补丁`
- 有针对性验证证据

### test_strategy
conditional_tdd

### handoff_notes
- 若影响鉴权、缓存、查询状态或错误恢复，优先补测试。

### escalation_rule
- 如实现依赖共享包、环境变量、CORS、README 或 Server 契约调整，停止修改并升级处理。

## Execution Packet

### task_id
TASK-WSAO-003

### task_name
Server review

### owner
backend_implementer

### objective
对 `apps/server` 做只读审查并产出可直接驱动后续最小优化的书面问题清单。

### in_scope
- 只读审查 `apps/server/src/**`、`apps/server/tests/**`
- 产出 `docs/review/2026-04-17-server-audit-optimization-review.md`
- 标记每个问题为 `本轮修复`、`仅记录` 或 `转共享补丁`

### out_of_scope
- 不修改业务代码、测试代码或共享文件

### input_documents
- requirements: `docs/requirements/2026-04-17-web-server-audit-optimization-requirements.md`
- tasks: `docs/tasks/2026-04-17-web-server-audit-optimization-tasks.md`
- plan: `docs/plans/2026-04-17-web-server-audit-optimization-plan.md`
- review: `docs/review/2026-04-17-web-audit-optimization-review.md`

### allowed_paths
- `docs/review/2026-04-17-server-audit-optimization-review.md`

### forbidden_paths
- `apps/web/**`
- `packages/**`
- `apps/admin/**`
- `README.md`
- `.env.example`

### dependencies
- `apps/server/AGENTS.md`
- `apps/server/package.json`

### acceptance_criteria
- 形成完整 Server 已确认问题清单
- 未完成书面结论前，不进入 Server optimize

### test_strategy
manual_only

### handoff_notes
- 对认证、上传、会话、缓存、OpenAPI、日志相关问题要额外注明边界风险。

### escalation_rule
- 若需改数据库语义、共享 schema、环境变量或根文档，回到编排者升级处理。

## Execution Packet

### task_id
TASK-WSAO-004

### task_name
Server optimize

### owner
backend_implementer

### objective
仅对 Server 审查结论中标记为“本轮修复”的问题做最小正确改动，并按高风险规则执行测试与验证。

### in_scope
- 修改 `apps/server/src/**`
- 视需要修改 `apps/server/tests/**`
- 更新 `docs/review/2026-04-17-server-audit-optimization-review.md`

### out_of_scope
- 不修复未在 Server 审查文档中确认的问题
- 不修改 `apps/web/**`、`packages/**`、`apps/admin/**`
- 不改数据库 schema、迁移或 seed 语义

### input_documents
- requirements: `docs/requirements/2026-04-17-web-server-audit-optimization-requirements.md`
- tasks: `docs/tasks/2026-04-17-web-server-audit-optimization-tasks.md`
- plan: `docs/plans/2026-04-17-web-server-audit-optimization-plan.md`
- review: `docs/review/2026-04-17-server-audit-optimization-review.md`

### allowed_paths
- `apps/server/src/**`
- `apps/server/tests/**`
- `docs/review/2026-04-17-server-audit-optimization-review.md`

### forbidden_paths
- `apps/web/**`
- `packages/**`
- `apps/admin/**`
- `README.md`
- `.env.example`

### dependencies
- `TASK-WSAO-003` 输出的 Server 审查文档

### acceptance_criteria
- 只修已确认问题
- 高风险行为问题先有失败测试，再修实现
- 文档中写明 `已修复`、`未处理`、`转共享补丁`
- 有针对性验证证据

### test_strategy
tdd

### handoff_notes
- 若涉及 OpenAPI、CORS、日志、上传限制或认证语义，不得在本轮直接扩边界。

### escalation_rule
- 如实现依赖共享 schema、数据库层、HTTP Client、环境变量、OpenAPI 默认策略、README 或根脚本调整，停止修改并升级处理。
