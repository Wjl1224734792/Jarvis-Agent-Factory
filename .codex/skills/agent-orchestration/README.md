# Agent Orchestration

单一编排者通过 spawn 统一调度所有子代理的 6 阶段交付流程。

## 快速开始

当用户说「启动编排」「走完整流程」「用多代理处理」时，加载本技能。需确保 Codex 配置中 `[features] multi_agent = true`。

```
用户 ──→ 编排者（自己问需求）
           ├──→ task_design（拆任务）
           ├──→ planner（出计划+工单）
           ├──→ 各实现代理（按工单干）
           └──→ review_qa（验收）
```

**主会话是唯一的指挥官，子代理只干自己那摊事，边界通过 Execution Packet 和 Gate 控制。**

## 6 阶段流程

| 阶段 | 名称 | 执行方式 | 产出物 |
|------|------|----------|--------|
| 1 | 需求澄清 | 编排者直接与用户对话（禁止 spawn） | `docs/requirements/` |
| 2 | 任务分解 | spawn `task_design` | `docs/tasks/` |
| 3 | 执行规划 | spawn `planner` | `docs/plans/` + Execution Packets |
| 4 | 按需探索 | spawn `repo_explorer` / `docs_researcher`（可选） | `docs/analysis/` |
| 5 | 实现 | 按 Execution Packet spawn 对应实现代理 | `docs/implementation/` |
| 6 | 评审 | spawn `review_qa` | `docs/review/` |

## 文档对齐闸门

阶段间设有硬性 Gate（A ~ D），未满足条件不得进入下一阶段。详见 [alignment-gates.md](reference/alignment-gates.md)。

## 核心约束

1. **单一编排者** — 只有主会话能 spawn
2. **阶段 1 禁止 spawn** — 需求澄清必须编排者直接对话
3. **传递完整上下文** — spawn 时必须传递上游文档全文
4. **子代理角色单一** — 每个 agent 只完成被分配的职责
5. **共享区域唯一责任方** — 高风险区域指定唯一责任人
6. **变更必须留痕** — 调整共享区域须先提交 plan patch

## 参考文档

| 文档 | 说明 |
|------|------|
| [SKILL.md](SKILL.md) | Codex 加载入口（完整流程定义） |
| [agents-overview.md](reference/agents-overview.md) | 代理清单、职责、spawn 策略表 |
| [alignment-gates.md](reference/alignment-gates.md) | 文档对齐闸门详细说明 |
| [execution-packet.md](reference/execution-packet.md) | 执行包模板与使用方式 |
| [plan-patch.md](reference/plan-patch.md) | 计划补丁 / 契约变更单模板 |
| [tdd-rules.md](reference/tdd-rules.md) | TDD Red/Green/Refactor 规则 |
| [worker-common.md](reference/worker-common.md) | 所有 Worker 共享的公共指令 |
| [workflow.md](reference/workflow.md) | 6 阶段详细流程、回滚规则、产出物清单 |

## 目录结构

```
agent-orchestration/
├── SKILL.md                  # 技能入口（Codex 加载）
├── README.md                 # 本文件（人类快速指南）
├── reference/
│   ├── agents-overview.md    # 代理清单
│   ├── alignment-gates.md    # 对齐闸门
│   ├── execution-packet.md   # 执行包模板
│   ├── plan-patch.md         # 计划补丁模板
│   ├── tdd-rules.md          # TDD 规则
│   ├── worker-common.md      # Worker 公共指令
│   └── workflow.md           # 详细工作流程
└── scripts/                  # 预留脚本目录
```
