# 2026-04-19 P0 优化第一批执行计划

## 需求文档路径

- `docs/requirements/2026-04-19-p0-optimization-batch1-requirements.md`

## 任务文档路径

- `docs/tasks/2026-04-19-p0-optimization-batch1-tasks.md`

## Gate B 预检查

- 本轮只包含路线图中的 `P0-2`、`P0-3`、`P0-4`
- `P0-1` 共享 client / 契约边界收口明确延后
- 当前阶段允许改代码，范围主要在 `packages/schemas`、`packages/db`、`apps/server`

## 当前轮次目标

- 修复品牌申请状态机断裂
- 修复榜单评分/评论写入耦合
- 降低关键 server 测试初始化成本
- 完成根级验证

## 执行分工

- `backend_implementer`
  - `TASK-POB1-001`
  - `TASK-POB1-002`
- `backend_data_worker`
  - `TASK-POB1-003`
- 主会话
  - `TASK-POB1-004`

## 共享热点

- `apps/server/tests/**` 是共享热点区域，最终必须由主会话统一收口。

## 并行 / 串行策略

1. 并行：
   - `TASK-POB1-001`
   - `TASK-POB1-002`
   - `TASK-POB1-003`
2. 串行：
   - 主会话统一处理测试冲突和收口
   - 执行 `TASK-POB1-004`

## Execution Packet

### task_id
TASK-POB1-001

### task_name
品牌申请状态机修复

### owner
backend_implementer

### objective
统一品牌申请状态在 schema、route、service、DB 语义上的定义，消除 `hidden` 断裂。

### in_scope
- `packages/schemas/src/brand-applications.ts`
- `apps/server/src/modules/brand-applications/**`
- 品牌申请相关测试

### out_of_scope
- 前端页面适配
- 新状态设计

### test_strategy
tdd

## Execution Packet

### task_id
TASK-POB1-002

### task_name
榜单评分与评论写入解耦

### owner
backend_implementer

### objective
拆分评分写入与评论写入，消除重复评论与排序污染。

### in_scope
- `apps/server/src/modules/rankings/**`
- ranking 相关测试

### out_of_scope
- 整体 ranking 架构重构

### test_strategy
tdd

## Execution Packet

### task_id
TASK-POB1-003

### task_name
server 测试与 seed 基础设施降重

### owner
backend_data_worker

### objective
降低关键 server 测试对整库 reset+seed 的依赖，缩小初始化成本。

### in_scope
- `packages/db/src/seed.ts`
- `packages/db/src/index.ts`
- `apps/server/tests/**`

### out_of_scope
- 全新测试框架
- 整套 seed 系统重写

### test_strategy
test_after

## Execution Packet

### task_id
TASK-POB1-004

### task_name
收口验证与实现文档

### owner
orchestrator

### objective
整合改动、补实现文档并完成根级验证。

### in_scope
- 文档
- 根级验证
- 残余风险说明

### out_of_scope
- 新需求扩展

### test_strategy
manual_only
