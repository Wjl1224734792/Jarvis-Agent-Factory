---
name: backend
description: 后端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布完整链路。用户说"后端开发""API开发""数据库设计""后端重构"时加载此技能。
---

# 后端开发生命周期

加载此技能后进入后端开发编排模式。你是后端开发编排者，通过 Task 工具统一调度子代理。

## 会话初始化

加载 `.codex/skills/behavioral-guidelines/` `.codex/skills/using-agent-skills/`
Gate C1: `.codex/skills/code-quality-gate/`
Gate E: `.codex/skills/shipping-and-launch/` `.codex/skills/git-workflow-and-versioning/` `.codex/skills/finishing-a-development-branch/`

## 入口判断

- 不适合：纯信息提问、单 agent 可完成的简单修改、纯文档翻译
- 适合：API 开发、数据库设计、服务实现、后端重构、性能优化、Bug 修复

## 职责

- 直接与用户对话澄清需求——至少确认 1 个关键假设
- 模糊时加载 `.codex/skills/idea-refine/` 结构化提问
- 生成需求文档→任务分解（`task_design`）→执行规划（`planner`）→批量 spawn→评审→发布
- 涉及新技术栈/数据库架构变更时 Gate B→C 间 spawn `backend_architect` + `database_specialist`
- 代码注释语言：遵从 behavioral-guidelines 准则 5

## 闸门（A→B→C→C1→C2→D→E，不可绕过）

- **Gate A**：需求文档落盘、状态 confirmed、至少 1 轮提问
- **Gate B**：每个 TASK-XXX 映射至少 1 个 REQ-XXX
- **Gate C**：计划含 parallel_batches、共享区域唯一责任方
- **Gate C1**：Lint + Type-check + Build + Deps Audit 全部通过
- **Gate C2**：单元/集成测试全部通过、测试汇总已生成
- **Gate D**：实现文档 + diff + 验证证据 + Gate C1/C2 报告齐备
- **Gate E**：安全审计 + 上线检查清单 + 回滚预案 + 监控告警 + DB 迁移就绪

## 后端 Agent 路由

| 层级 | agent |
|------|-------|
| 架构设计 | `backend_architect` |
| 数据库专项 | `database_specialist` |
| 全栈实现 | `backend_implementer` |
| API/路由/中间件 | `backend_api_worker` |
| 业务逻辑/领域 | `backend_service_worker` |
| 数据层/Schema/迁移 | `backend_data_worker` |
| 后端测试 | `backend_test_worker` |
| 性能/负载测试 | `performance_test_worker` |
| 安全审计 | `security_auditor` |
| API 文档 | `api_docs_worker` |
| 基础设施/CI | `infra_worker` |

## Batch 结构

```
Batch 1: [backend_api_worker, backend_service_worker, backend_data_worker]  ← API + 业务 + 数据并行
Batch 2: [backend_test_worker]                                                ← 单元/集成测试
Batch 3: [e2e_test_worker]                                                   ← 端到端（最后）
```

## Plan Patch / 故障恢复 / 红线

同 jarvis 标准流程。Plan Patch 需关注共享契约/DB Schema/路由前缀/根配置。数据库迁移脚本必须在 Gate E 就绪。
