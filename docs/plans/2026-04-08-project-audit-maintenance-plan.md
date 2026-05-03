# 执行计划：2026-04-08 项目审查与维护

## 执行顺序

1. 串行完成 `AUDIT-001`：先输出高置信度审查结论，锁定本轮可直接修复的问题与共享边界。
2. 串行完成 `AUDIT-002` 与 `AUDIT-003`：在已确认的问题上直接修复，并同步补齐 `apps/web` 自动化测试。
3. 串行完成 `AUDIT-004`：运行 `lint / typecheck / test / build`，以结果反哺审查结论。
4. 最后整理评审输出，形成“已修 / 待修 / 结构性建议”的闭环。

## 共享区域唯一责任方

- `packages/shared`、根级构建与测试配置、`apps/*/vite.config.ts` 由主会话唯一负责。
- `packages/http-client` 与 `packages/schemas` 本轮仅在高置信度且必要时触达，避免和其他区域并发修改。

## Execution Packet

### task_id
AUDIT-001

### task_name
架构与维护性审查输出

### owner
orchestrator

### objective
输出按严重级别排序的项目审查结论，并锁定本轮可直接修复的问题。

### in_scope
- 审查 `apps/server` 的入口、错误处理、OpenAPI 组织与热点 service/repo
- 审查 `apps/web`、`apps/admin` 的路由、鉴权、状态与构建热点
- 审查 `packages/http-client`、`packages/shared` 的维护性风险

### out_of_scope
- 新业务开发
- 无法在当前仓库内验证的基础设施改造

### input_documents
- requirements: `E:/CodeStore/feijia/docs/requirements/2026-04-08-project-audit-maintenance-requirements.md`
- tasks: `E:/CodeStore/feijia/docs/tasks/2026-04-08-project-audit-maintenance-tasks.md`

### allowed_paths
- `apps/server/**`
- `apps/web/**`
- `apps/admin/**`
- `packages/http-client/**`
- `packages/shared/**`
- `docs/**`

### forbidden_paths
- `packages/db/src/schema.ts`
- `.env.example`
- `README.md`

### dependencies
- 现有 Vitest 覆盖面
- 当前 Vite 构建结果
- `APP_ROUTES` / `API_ROUTES` 契约

### acceptance_criteria
- 审查结论按严重级别排序
- 每个高优先级问题带文件定位
- 明确区分本轮已修与暂缓项

### test_strategy
test_after

### handoff_notes
- 后续修复只处理高置信度、低风险项
- 结构性重构只作为审查建议输出

### escalation_rule
如需修改共享契约、数据库结构、路由前缀或根配置，先由主会话确认，不并发扩散。

## Execution Packet

### task_id
AUDIT-002

### task_name
高置信度低风险问题修复

### owner
orchestrator

### objective
修复本轮审查中最明确、回归成本最低的问题。

### in_scope
- 前后台登录重定向与鉴权边界修复
- 前端构建性能热点的低风险优化
- 与上述修复直接相关的轻量辅助函数

### out_of_scope
- 大规模页面重写
- 跨模块契约重构

### input_documents
- requirements: `E:/CodeStore/feijia/docs/requirements/2026-04-08-project-audit-maintenance-requirements.md`
- tasks: `E:/CodeStore/feijia/docs/tasks/2026-04-08-project-audit-maintenance-tasks.md`
- plan: `E:/CodeStore/feijia/docs/plans/2026-04-08-project-audit-maintenance-plan.md`

### allowed_paths
- `apps/web/src/**`
- `apps/admin/src/**`
- `packages/shared/src/**`
- `apps/web/vite.config.ts`
- `apps/admin/vite.config.ts`

### forbidden_paths
- `packages/db/**`
- `apps/server/src/**`

### dependencies
- `APP_ROUTES`
- Web / Admin 路由与登录页现有行为
- 当前 Vite 路由与构建配置

### acceptance_criteria
- 修复后的重定向能保留 `pathname + search + hash`
- 登录后不会回跳到登录页或外部不安全地址
- 至少一项前端性能热点得到可验证优化

### test_strategy
test_after

### handoff_notes
- 所有修复必须配套自动化测试或可复现构建结果
- 不引入新的重型依赖

### escalation_rule
如需抽取到共享包之外的全局契约或引入新测试框架，先回主会话确认。

## Execution Packet

### task_id
AUDIT-003

### task_name
apps/web 自动化测试补充

### owner
orchestrator

### objective
为本轮前端修复点与高风险逻辑补齐自动化测试。

### in_scope
- `apps/web/tests/**` 新增逻辑 / 路由辅助测试
- 必要时扩展 `apps/admin/tests/**` 的轻量辅助测试

### out_of_scope
- 引入 DOM-heavy 测试框架
- 端到端浏览器自动化

### input_documents
- requirements: `E:/CodeStore/feijia/docs/requirements/2026-04-08-project-audit-maintenance-requirements.md`
- tasks: `E:/CodeStore/feijia/docs/tasks/2026-04-08-project-audit-maintenance-tasks.md`
- plan: `E:/CodeStore/feijia/docs/plans/2026-04-08-project-audit-maintenance-plan.md`

### allowed_paths
- `apps/web/tests/**`
- `apps/admin/tests/**`
- 与测试直接相关的轻量 helper 文件

### forbidden_paths
- `vitest.config.ts`
- 新增第三方测试框架依赖

### dependencies
- 现有 Vitest 运行方式
- 新增的重定向/路由辅助逻辑

### acceptance_criteria
- 新增测试可稳定运行
- 至少覆盖一个关键重定向场景和一个非法输入场景
- 测试不依赖真实 DOM 与手工操作

### test_strategy
tdd

### handoff_notes
- 测试优先覆盖修复点，避免与 UI 实现强耦合

### escalation_rule
如需引入新依赖或改动全局测试环境配置，先回主会话确认。

## Execution Packet

### task_id
AUDIT-004

### task_name
运行并记录关键验证命令

### owner
orchestrator

### objective
通过全量命令验证本轮修复没有引入新的回归。

### in_scope
- 运行 `bun run lint`
- 运行 `bun run typecheck`
- 运行 `bun run test`
- 运行 `bun run build`

### out_of_scope
- 与本轮改动无关的长期性能 profiling

### input_documents
- requirements: `E:/CodeStore/feijia/docs/requirements/2026-04-08-project-audit-maintenance-requirements.md`
- tasks: `E:/CodeStore/feijia/docs/tasks/2026-04-08-project-audit-maintenance-tasks.md`
- plan: `E:/CodeStore/feijia/docs/plans/2026-04-08-project-audit-maintenance-plan.md`

### allowed_paths
- 仓库根目录

### forbidden_paths
- 无

### dependencies
- 前三项任务完成后的代码状态

### acceptance_criteria
- 四条命令完成并记录结果
- 若有失败，明确归因与影响范围

### test_strategy
test_after

### handoff_notes
- 验证结果将直接纳入最终审查结论

### escalation_rule
若出现与本轮无关的仓库既有失败，需在最终结论中明确标记。
