# Agent Orchestration for opencode

本目录是从 `.codex/agents` 与 `.codex/skills/agent-orchestration` 迁移出的 opencode 专用编排配置。

## 入口

- 主代理：`.opencode/agents/orchestrator.md`
- 技能：`.opencode/skills/agent-orchestration/SKILL.md`
- 子代理：`.opencode/agents/*.md`

## 使用方式

在 opencode 中切换到 `orchestrator` 主代理；当用户明确要求“启动编排”“走完整流程”“用多代理做”时，`orchestrator` 应先加载 `agent-orchestration` skill，再按需求澄清、任务拆解、执行规划、实现、评审的阶段推进。

## 约束

- 所有 opencode agent 均不配置 `model`。
- 子代理全部是 `mode: subagent` 且 `hidden: true`，由 `orchestrator` 通过 Task 工具调度。
- 子代理均配置 `permission.task: { "*": "deny" }`，禁止二次调度。
- Codex 源配置仍保留在 `.codex/`，两套配置彼此独立。