# Agent Orchestration

单一编排者通过 spawn 统一调度所有子代理的 6 阶段交付流程。

## 触发条件

用户显式要求"启动编排""走完整流程""用多代理处理"时激活。需开启 `multi_agent`。

## 前置条件

- Codex 配置中 `[features] multi_agent = true`
- `.codex/agents/` 目录下所有子代理配置文件存在

## 6 阶段流程

| 阶段 | 名称 | 执行方式 | 产出物 |
|------|------|----------|--------|
| 1 | 需求澄清 | 编排者直接与用户对话（禁止 spawn） | `docs/requirements/` |
| 2 | 任务分解 | spawn `task_design` | `docs/tasks/` |
| 3 | 执行规划 | spawn `planner` | `docs/plans/` + Execution Packets |
| 4 | 按需探索 | spawn `repo_explorer` / `docs_researcher`（可选） | `docs/analysis/` |
| 5 | 实现 | 按 Execution Packet spawn 对应实现代理 | `docs/implementation/` |
| 6 | 评审 | spawn `review_qa` | `docs/review/` |

## 工作流程详解

### 第 1 步：需求澄清（自己干，不 spawn）

主会话直接跟用户对话，追问和收敛需求。如果代码结构不清楚，可以 spawn `repo_explorer` 看看仓库结构（只读）。

**产出**：需求文档 → 写到 `docs/requirements/`

**Gate A 检查**：需求文档必须包含摘要、目标、范围内/外、模块列表、风险、收敛结论。缺任何一项就**不能往下走**，必须继续跟用户聊。

### 第 2 步：任务分解（spawn task_design）

主会话把需求文档全文喂给 `task_design`，它负责：

- 把需求拆成具体任务（TASK-001, TASK-002...）
- 判断每个任务该 DDD 还是 TDD 还是直接写
- 标注风险、文件所有权、共享路径

**产出**：任务文档 → 写到 `docs/tasks/`

**Gate B 检查**：任务必须有 ID、名称、类型（前端/后端）、优先级、完成标准、分类。缺了就打回重做。

### 第 3 步：执行规划（spawn planner）

主会话把需求文档 + 任务文档喂给 `planner`，它负责：

- 选择本轮要做哪些任务
- 分配给哪个代理
- **为每个任务产出 Execution Packet**（一个"任务工单"，包含目标、范围、允许改的文件、禁止改的文件、验收标准）
- 规划并行/串行关系

**产出**：计划文档 → 写到 `docs/plans/`

**Gate C 检查**：计划必须有目标、范围、分工、共享区域归属、每个任务的 Execution Packet。缺了打回 planner。

### 第 4 步：按需探索（可选）

如果实现前还需要了解代码细节或查文档，主会话 spawn `repo_explorer` 或 `docs_researcher`。只读，不改代码。

### 第 5 步：实现（按 Execution Packet spawn 对应代理）

这是核心环节。主会话拿着 planner 给的 Execution Packet，直接 spawn 具体的实现代理。

**前端侧**：

- 多维度任务 → `frontend_implementer`
- 仅 UI/样式 → `frontend_ui_worker`
- 仅状态/数据/路由 → `frontend_state_worker`
- 仅测试 → `frontend_test_worker`

**后端侧**：

- 多维度任务 → `backend_implementer`
- 仅 API/控制器 → `backend_api_worker`
- 仅业务逻辑 → `backend_service_worker`
- 仅数据层/Schema → `backend_data_worker`
- 仅测试 → `backend_test_worker`

每个代理被 spawn 后，**必须先输出一个确认块**（Execution Acknowledgement），声明"我只改这些，我不动那些"，主会话确认后才开始写代码。

**TDD 任务**是三步串行：

1. 先 spawn test worker 写失败测试（Red）
2. 再 spawn 实现 worker 写最小代码让它通过（Green）
3. 最后 spawn test worker 整理代码（Refactor）

**前端和后端天然可并行**，因为改的是不同文件。同侧内只要文件不重叠也能并行。

**关键规则**：实现中如果发现必须改共享类型/Schema/路由/配置，不能直接改，要提交 plan patch 给主会话决策。

**Gate D 检查**：实现文档必须有变更文件、实现说明、测试结果、边界处理、对前后端的影响。缺了打回补。

### 第 6 步：评审（spawn review_qa）

主会话把需求 + 任务 + 计划 + 实现文档 + 代码变更 + 测试结果全部喂给 `review_qa`，它产出：

- 审查结论（通过/不通过）
- **追踪矩阵**（需求 → 任务 → 代理 → 改了哪些文件 → 有没有测试）
- 问题列表、回归建议

不通过 → 回到第 5 步修复 → 重新评审。

### 回滚规则

| 问题 | 回退目标 |
|------|----------|
| 需求冲突 | 阶段 1（编排者直接澄清） |
| 任务分解错误 | 阶段 2（spawn task_design） |
| 计划/分工问题 | 阶段 3（spawn planner） |
| 共享区域冲突 | 阶段 3 或 plan patch |
| 实现遗漏/偏离 | 阶段 5（重新 spawn 对应 agent） |
| 评审不通过 | 阶段 5 修复后重新 spawn review_qa |

### 一句话总结

```
用户 ──→ 编排者（自己问需求）
           ├──→ task_design（拆任务）
           ├──→ planner（出计划+工单）
           ├──→ 各实现代理（按工单干）
           └──→ review_qa（验收）
```

**主会话是唯一的指挥官，子代理只干自己那摊事，边界通过 Execution Packet 和 Gate 控制。**

## 文档对齐闸门

阶段间设有硬性 Gate（Gate A ~ D），未满足最低条件不得进入下一阶段：

- **Gate A**：需求文档必须包含摘要、目标、范围内/外、模块列表、风险、收敛结论
- **Gate B**：任务文档必须包含 ID、名称、类型、优先级、完成标准、DDD/TDD 分类、风险、文件所有权
- **Gate C**：计划文档必须包含目标、范围、分工、共享区域归属、每个任务的 Execution Packet、test_strategy
- **Gate D**：实现文档必须包含变更文件、实现说明、测试结果、边界处理、前后端影响

详见 `reference/alignment-gates.md`。

## Spawn 策略

| 任务特征 | spawn 的 agent |
|----------|----------------|
| 前端多维度（页面+状态+测试） | `frontend_implementer` |
| 前端仅 UI/样式 | `frontend_ui_worker` |
| 前端仅状态/数据/路由 | `frontend_state_worker` |
| 前端仅测试 | `frontend_test_worker` |
| 后端多维度（API+业务+数据+测试） | `backend_implementer` |
| 后端仅路由/控制器 | `backend_api_worker` |
| 后端仅业务逻辑 | `backend_service_worker` |
| 后端仅数据层 | `backend_data_worker` |
| 后端仅测试 | `backend_test_worker` |

详见 `reference/agents-overview.md`。

## Execution Packet

planner 为每个任务产出执行包，包含：目标、范围（in/out）、允许/禁止修改的路径、依赖、验收标准、test_strategy、交接说明。编排者 spawn 时原样传递。

详见 `reference/execution-packet.md`。

## TDD 规则

`test_strategy: tdd` 的任务按三步串行执行：

1. **Red** — spawn test worker 写失败测试
2. **Green** — spawn 实现 worker 做最小实现
3. **Refactor** — spawn test worker 整理代码

详见 `reference/tdd-rules.md`。

## Plan Patch / Contract Change

实现中如需调整共享区域（契约/Schema/路由/配置），不得直接修改，须提交 plan patch 由编排者决策。

详见 `reference/plan-patch.md`。

## 目录结构

```
agent-orchestration/
├── SKILL.md                  # 技能入口，完整流程定义
├── README.md                 # 本文件
├── reference/
│   ├── agents-overview.md    # 代理清单、职责、spawn 策略表
│   ├── alignment-gates.md    # 文档对齐闸门详细说明
│   ├── execution-packet.md   # 执行包模板与使用方式
│   ├── plan-patch.md         # 计划补丁 / 契约变更单模板
│   ├── tdd-rules.md          # TDD Red/Green/Refactor 规则
│   └── workflow.md           # 6 阶段详细流程、回滚规则、产出物清单
└── scripts/                  # 预留脚本目录（当前为空）
```

## 核心约束

1. **单一编排者** — 只有主会话能 spawn，子代理禁止再 spawn
2. **阶段 1 禁止 spawn** — 需求澄清必须编排者直接对话
3. **传递完整上下文** — spawn 时必须传递上游文档全文
4. **子代理角色单一** — 每个 agent 只完成被分配的职责
5. **共享区域唯一责任方** — 高风险区域指定唯一责任人
6. **变更必须留痕** — 调整共享区域须先提交 plan patch
