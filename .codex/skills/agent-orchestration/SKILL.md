---
name: agent-orchestration
description: "主编排技能：单一编排者通过 spawn 统一调度所有子代理的完整交付流程——从需求澄清到评审交付。仅在用户显式要求「启动编排」「走编排流程」「用多代理做」时触发。确保 Codex 已开启 multi_agent 以支持 spawn。只能通过显式调用。"
---

# 多代理编排

本技能将加载了它的主会话变为**唯一的编排者**，通过 spawn 统一调度所有子代理。**本技能必须由用户显式触发**——当用户明确表示「启动编排」「走完整流程」「用多代理处理」「帮我编排这个需求」等意图时才激活。

## 前置条件

- `[features] multi_agent = true`（已在 `config.toml` 启用）
- `.codex/agents/` 目录下所有 14 个代理配置文件存在

## 核心约束

1. **单一编排者**：只有本技能的执行者（主会话）有权 spawn。子代理禁止 spawn 其他子代理。
2. **阶段 1 禁止 spawn**：需求澄清必须编排者直接与用户对话。
3. **传递完整上下文**：每次 spawn 须传递上游文档全文，子代理无法读取主会话历史。
4. **子代理角色单一**：每个 agent 完成自己职责后返回，不越权调度。

## 执行流程

按以下顺序执行，详见 `reference/workflow.md`：

| 阶段 | 执行方式 | 说明 |
|------|----------|------|
| 1 需求澄清 | 编排者直接执行 | 禁止 spawn，与用户对话 |
| 2 任务分解 | spawn `task_design` | 产出任务文档 |
| 3 执行规划 | spawn `planner` | 产出计划文档，指定每条任务的执行 agent 和 test_strategy |
| 4 探索（按需） | spawn `repo_explorer` / `docs_researcher` | 只读辅助 |
| 5 实现 | 按计划 spawn 对应 agent | 见 `reference/agents-overview.md` spawn 策略 |
| 6 评审 | spawn `review_qa` | 产出评审文档 |

## 参考文档

- `reference/agents-overview.md` — 代理清单、职责、spawn 策略表
- `reference/workflow.md` — 6 阶段详细流程、回滚规则、产出物清单
- `reference/tdd-rules.md` — TDD Red/Green/Refactor 规则与 spawn 顺序
