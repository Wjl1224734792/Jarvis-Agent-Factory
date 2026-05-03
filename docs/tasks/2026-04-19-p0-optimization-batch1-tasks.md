# 2026-04-19 P0 优化第一批任务拆解

## 需求文档路径

- `docs/requirements/2026-04-19-p0-optimization-batch1-requirements.md`

## 任务概览

- 本轮只实现路线图中的 `P0-2`、`P0-3`、`P0-4`。
- `P0-1` 共享 client / 契约边界收口不进入本轮实现。
- 当前优先级顺序：
  1. 品牌申请状态机修复
  2. 榜单评分/评论写入解耦
  3. 测试/seed 基础设施降重
  4. 收口验证与实现文档

## 任务列表

### TASK-POB1-001

- 任务名：品牌申请状态机修复
- 类型：共享契约 + 后端
- 优先级：P0
- 完成标准：
  - `packages/schemas`、`apps/server`、`packages/db` 对品牌申请状态语义一致
  - 移除或拒绝 `hidden` 状态，不再出现 schema/route/service/DB 断裂
  - 相关测试补齐并通过
- DDD 分类：not_required
- test_strategy：tdd
- 风险任务：是
- 文件所有权 / 允许修改路径 / 禁止事项：
  - 允许修改：
    - `packages/schemas/src/brand-applications.ts`
    - `apps/server/src/modules/brand-applications/**`
    - 相关测试
  - 禁止事项：
    - 不新增新的品牌申请状态
    - 不扩散到前端 app

### TASK-POB1-002

- 任务名：榜单评分与评论写入解耦
- 类型：后端
- 优先级：P0
- 完成标准：
  - 纯评分只更新评分表，不再隐式追加评论
  - 提交评论时仅在明确提供评论内容时创建评论
  - 排名相关测试覆盖“评分更新不制造脏评论”
- DDD 分类：required
- test_strategy：tdd
- 风险任务：是
- 文件所有权 / 允许修改路径 / 禁止事项：
  - 允许修改：
    - `apps/server/src/modules/rankings/**`
    - 相关测试
  - 禁止事项：
    - 不改变无关 ranking API 语义
    - 不把修复扩散为整套 ranking 重构

### TASK-POB1-003

- 任务名：server 测试与 seed 基础设施降重
- 类型：后端数据层 / 测试基础设施
- 优先级：P0
- 完成标准：
  - 降低关键 server 测试对整库 `reset + seedDatabase()` 的依赖
  - 优先收敛最重或最敏感的初始化链路
  - 不破坏现有测试语义
- DDD 分类：not_required
- test_strategy：test_after
- 风险任务：是
- 文件所有权 / 允许修改路径 / 禁止事项：
  - 允许修改：
    - `packages/db/src/seed.ts`
    - `packages/db/src/index.ts`
    - `apps/server/tests/**`
  - 禁止事项：
    - 不引入新的复杂测试框架
    - 不顺手重写整套 seed 系统

### TASK-POB1-004

- 任务名：收口验证与实现文档
- 类型：验证
- 优先级：P0
- 完成标准：
  - 补实现文档
  - 跑 `lint/typecheck/test/build`
  - 记录残余风险
- DDD 分类：not_required
- test_strategy：manual_only
- 风险任务：否

## 并行与串行关系

- `TASK-POB1-001` 与 `TASK-POB1-002` 可以并行推进，但都涉及 server 测试文件时必须串行收口。
- `TASK-POB1-003` 可与前两项并行推进。
- `TASK-POB1-004` 必须在前三项完成后执行。
