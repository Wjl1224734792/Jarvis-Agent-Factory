# 2026-04-09 分阶段项目审查执行计划

## 执行顺序

1. 完成文档基线与执行假设固化。
2. 串行推进 `apps/web` 审查、修复、验证、提交推送。
3. 串行推进 `apps/admin` 审查、修复、验证、提交推送。
4. 串行推进 `apps/server` 审查、修复、验证、提交推送。
5. 最后处理 OpenAPI 与根脚本，并执行全仓验证。

## 共享区域唯一责任方

- `packages/shared`、`packages/http-client`、`packages/schemas`、根目录 `package.json`、OpenAPI 文档入口与文档文件统一由主会话负责。
- 各子代理只读探索，不直接修改共享区域。

## 并行 / 串行策略

- 阶段之间严格串行，满足用户指定顺序。
- 同一阶段内允许并行做只读探索，例如：
  - 一个 explorer 关注代码健壮性与架构问题
  - 一个 explorer 关注构建与性能热点
- 真正落代码时由主会话集中修改，避免与共享路径冲突。

## Execution Packet

### task_id
TASK-AUDIT-002

### task_name
Web 阶段审查与修复

### owner
orchestrator

### objective
输出 `apps/web` 审查报告，修复高置信度问题，完成单测/构建/浏览器自动化验证并提交推送。

### in_scope
- `apps/web/**`
- 与 Web 直接相关的 `packages/shared/**`、`packages/http-client/**`
- `docs/review/**`
- `docs/implementation/**`

### out_of_scope
- `apps/admin/**`
- `apps/server/**`
- 根脚本分层

### allowed_paths
- `apps/web/**`
- `packages/shared/**`
- `packages/http-client/**`
- `docs/**`

### forbidden_paths
- `packages/db/**`
- `apps/admin/**`
- `apps/server/**`

### test_strategy
test_after

### acceptance_criteria
- 有独立 web 审查报告
- 至少修复一批高置信度问题
- Web 相关测试、构建与浏览器自动化验证完成
- 完成阶段性提交并推送

### escalation_rule
如需修改共享协议或全局脚本，先记录在报告与实现文档中，延后到对应阶段统一处理。

## Execution Packet

### task_id
TASK-AUDIT-003

### task_name
Admin 阶段审查与修复

### owner
orchestrator

### objective
输出 `apps/admin` 审查报告，修复高置信度问题，完成验证并提交推送。

### in_scope
- `apps/admin/**`
- 与 Admin 直接相关的共享前端依赖
- `docs/review/**`
- `docs/implementation/**`

### out_of_scope
- `apps/web/**`
- `apps/server/**`
- 根脚本分层

### allowed_paths
- `apps/admin/**`
- `packages/shared/**`
- `packages/http-client/**`
- `docs/**`

### forbidden_paths
- `packages/db/**`
- `apps/web/**`
- `apps/server/**`

### test_strategy
test_after

### acceptance_criteria
- 有独立 admin 审查报告
- 修复项可通过测试或构建证明
- 完成阶段性提交并推送

### escalation_rule
如触及共享路由或共享契约，交由主会话单点修改并在报告中说明影响。

## Execution Packet

### task_id
TASK-AUDIT-004

### task_name
Server 阶段审查与修复

### owner
orchestrator

### objective
输出 `apps/server` 审查报告，修复高置信度问题，检查并更新 OpenAPI，完成验证并提交推送。

### in_scope
- `apps/server/**`
- OpenAPI 文档相关文件
- 必要的 `packages/schemas/**`、`packages/http-client/**`
- `docs/review/**`
- `docs/implementation/**`

### out_of_scope
- `apps/web/**`
- `apps/admin/**` 的无关重构

### allowed_paths
- `apps/server/**`
- `packages/schemas/**`
- `packages/http-client/**`
- `packages/shared/**`
- `docs/**`

### forbidden_paths
- 与问题无关的数据库结构重构

### test_strategy
test_after

### acceptance_criteria
- 有独立 server 审查报告
- OpenAPI 文档确认最新且完整
- 后端测试/构建通过
- 完成阶段性提交并推送

### escalation_rule
若需要大规模重组 OpenAPI 文档结构，先确保内容正确，再视时间决定是否继续结构优化。

## Execution Packet

### task_id
TASK-AUDIT-005

### task_name
OpenAPI 与根脚本收尾

### owner
orchestrator

### objective
优化种子与测试数据脚本分层，补齐文档并执行最终验证。

### in_scope
- `package.json`
- `README.md`
- `.env.example`
- 与数据库脚本说明直接相关的文件

### out_of_scope
- 新增业务功能

### allowed_paths
- 仓库根目录相关文件
- `packages/db/**` 中与脚本入口直接相关的文件
- `docs/**`

### forbidden_paths
- 与脚本无关的业务模块大改

### test_strategy
test_after

### acceptance_criteria
- seed / test-data / reset 语义清晰
- 必要说明文档同步
- 全仓 `lint / typecheck / test / build` 结果明确

### escalation_rule
涉及生产流程命名时以“语义清晰、默认安全、可组合”为准，不做隐式 destructive 行为。
