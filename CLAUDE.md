# Jarvis Agent Factory

多智能体配置工程，专注 **Claude Code** 平台。32 条指令、71 个 Agent、35 个 Skill、15 条流水线。

> **所有智能体启动时必须读取 [AGENTS.md](./AGENTS.md)** — 分层文档含项目约束、流水线、Agent/Skill 目录、发布流程。

## 快速导航 → AGENTS.md

| 要查什么 | 跳转到 |
|---------|--------|
| 核心约束（红线） | [AGENTS.md § L2](./AGENTS.md#l2-核心约束不可绕过) |
| 流水线 Gate 序列 | [AGENTS.md § L3](./AGENTS.md#l3-流水线体系) |
| 指令列表（32条） | [AGENTS.md § L4](./AGENTS.md#l4-工作模式与指令入口) |
| Agent 目录（71个） | [AGENTS.md § L5](./AGENTS.md#l5-智能体体系) |
| Skill 目录（35个） | [AGENTS.md § L6](./AGENTS.md#l6-技能体系) |
| 文档产物规范 | [AGENTS.md § L7](./AGENTS.md#l7-文档驱动体系) |
| 发布流程 | [AGENTS.md § L8](./AGENTS.md#l8-发布流程) |
| 文档同步约束 | [AGENTS.md § L1](./AGENTS.md#l1-快速索引) |

## session_join 约定

调用 `session_join` 时必须传 `task_name`（用户任务的一句话摘要，如"实时发布订阅：SSE 推送替代轮询"），确保 Web 面板显示有意义的标题。
