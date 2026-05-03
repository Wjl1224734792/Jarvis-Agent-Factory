---
name: workflow-orchestration-reference
description: "编排流程参考：主控编排者与子智能体之间的工作流契约、阶段定义、闸门条件、并发策略和角色边界。用于所有需要编排的开发任务，由 config.toml 默认加载。"
license: MIT
compatibility: Requires .codex/agents/ directory with sub-agent TOML files
---

# 编排流程参考

## 概述

本文档定义主控编排者与子智能体之间的工作流契约。编排者是唯一的主控线程（config.toml 中的 `developer_instructions`），子智能体是 `.codex/agents/*.toml` 中注册的可 spawn 代理。

**核心原则：** 编排者负责决策、调度和闸门检查；子智能体负责执行分配的具体子任务。子智能体不得再 spawn 其他子智能体。

## 主线流程

编排只有一条主线：**（想法细化）→ 澄清需求 → 生成并确认需求文档 → 任务分解 → 执行规划 → 分配实现 → 评审交付 → 发布上线**。

需求文档是后续所有阶段的事实源。任务文档、计划文档、Execution Packet、实现文档和评审矩阵都必须能追溯到需求文档中的 `REQ-XXX` 条目。

### 阶段与闸门

| 阶段 | 执行方式 | 产出 | 闸门条件 |
|------|---------|------|---------|
| 0 想法细化 | 编排者直接与用户对话 | 细化摘要、明确范围 | 用户确认 |
| 1A 需求澄清 | 编排者直接与用户对话 | 目标、范围、约束、成功标准 | 至少 1 轮提问 |
| 1B 需求文档 | 编排者撰写 | `docs/requirements/` + `REQ-XXX` | Gate A |
| 2 任务分解 | spawn `task_design` | `docs/tasks/` | Gate B |
| 3 执行规划 | spawn `planner` | `docs/plans/` + Execution Packets | Gate C |
| 4 探索（按需） | spawn `repo_explorer` / `docs_researcher` | `docs/analysis/` 或 `docs/research/` | 可与阶段 0-2 并行 |
| 5 实现 | 按计划并发 spawn 实现代理 | `docs/implementation/` | Gate D |
| 6 评审 | spawn `review_qa` | `docs/review/` + 追踪矩阵 | Gate E |
| 7 发布上线 | 编排者执行 | `docs/shipping/` | — |

## 通用行为准则

所有子智能体必须遵守以下四项核心准则：

1. **先思考，再编码** — 不假设。不隐藏困惑。主动暴露权衡。不确定时先问，多种解释时列出全部方案。
2. **简单优先** — 最小代码解决问题。不添加需求外功能，不为单点使用创建抽象，不为不可能场景做错误处理。
3. **精准修改** — 只动必须动的，遵循现有风格，每个改动行可追溯到用户请求。移除自身改动造成的孤儿代码。
4. **目标驱动执行** — 将任务转化为可验证目标。先写测试再使其通过。多步骤时陈述计划与验证点。

## 子智能体规则

- `.codex/agents/*.toml` 只放可 spawn 的子智能体；主控逻辑在 `config.toml` 中生效。
- 子智能体不得再 spawn 其他子智能体（`max_depth = 1`）。
- 每次 spawn 必须传递完整上游文档或等效完整摘要、相关 skill 摘要、允许路径、禁止路径、验收标准、验证命令和升级规则。
- 共享契约、共享类型、数据库结构、路由入口、根配置、全局请求客户端等共享区域必须指定唯一责任方。
- 实现中如需调整计划、契约、schema 或共享边界，子智能体必须先提交 plan patch / contract change request，由编排者确认后继续。

## 反合理化表

| 合理化借口 | 现实 |
|-----------|------|
| "这个需求很简单，跳过 Gate A 直接实现" | 即使最简单的需求也有隐含假设。Gate A 是强制减压点，不可绕过。 |
| "用户描述得很清楚了，不需要提问" | 即使再清晰的描述也有未说出口的隐含知识。至少确认 1 个关键假设。 |
| "这些任务都可以串行做，并发太复杂" | 串行 = N 倍耗时。3 个独立任务并发可以节省 67% 的时间。 |
| "task-design 的结果应该直接用，不需要复核" | planner 对任务文档的依赖是硬性的。未通过 Gate B 的劣质任务文档会导致实现阶段全部偏航。 |
| "实现代理反馈了一个小问题，我直接处理就行" | 任何共享区域变更（plan patch / contract change）必须显式记录。口头传递 = 丢失追踪。 |
| "文档后面再补，先把代码写完" | 流程禁止倒置。文档是下一个阶段的事实源。补丁式写文档 = 断裂的追溯链。 |

## 并发调度策略

### 并行判定规则

两个子智能体可以并发调用的充要条件：
1. 它们互不依赖对方的输出作为输入
2. 它们不修改同一个共享区域
3. 它们不属于同一个 TDD Red→Green→Refactor 步骤链中的相邻步骤

### 具体并发时机

| 时机 | 并发调用的代理组合 | 条件 |
|------|-------------------|------|
| Gate A 通过后 | `repo_explorer` + `docs_researcher` | 两者都是只读，互不依赖 |
| Gate A 通过后 | `repo_explorer` + `docs_researcher` + `task_design` | 探索结果对 task-design 是增强而非必需时可三重并行 |
| Gate C 通过后 | 所有无共享依赖的实现代理 | 按 parallel_batches 分组 |
| 实现全部交付后 | `review_qa`（仅一个） | review-qa 是串行单点 |

### 反例：不可并行的情形

| 情形 | 原因 |
|------|------|
| `task_design` → `planner` | planner 强依赖 task-design 的任务文档输出 |
| `planner` → 实现代理 | 实现代理强依赖 plan 的 Execution Packet |
| 同一 TDD 任务的 Red → Green → Refactor | 链式依赖，必须串行 |
| 两个实现代理同时修改同一个共享 Schema 文件 | 共享区域冲突 |

## Execution Packet 模板

planner 产出计划后，编排者调用实现代理时必须传递 Execution Packet：

```
### task_id: TASK-XXX
### task_name: <名称>
### requirement_ids: REQ-XXX
### objective: <本次子任务的唯一目标（一句话）>
### in_scope / out_of_scope: <明确范围>
### allowed_paths / forbidden_paths: <文件路径>
### dependencies: <依赖的 API/契约/schema>
### parallel_group: <可并行的任务 ID 列表>
### wait_for: <必须等待完成的任务 ID 列表>
### acceptance_criteria: <可验证的验收条件>
### test_strategy: tdd / test_after / manual_only
### change_sizing: <预期变更行数>
### escalation_rule: 如需变更共享区域，必须先回编排者
```

## 支持模型与分配策略

- 编排者、需求/任务/计划/终审：`gpt-5.5` + `xhigh`
- 代码实现、测试、diff 审查、后端专项 worker：`gpt-5.3-codex` + `high`；深度代码审查用 `xhigh`
- 前端页面、UI、交互体验和视觉实现：`gpt-5.4` + `high`
- 文档研究、外部 API 查询：`gpt-5.4-mini` + `medium`
- 只读仓库探索、小范围通用修复：`gpt-5.3-codex-spark` + `medium`
- 架构/项目审查和变更后复审：`gpt-5.2` + `high`

## 红线

- 跳过 Gate 检查直接推进下一阶段
- 凭直觉决定未经闸门验证
- 替用户做需求级补全（必须回问用户）
- 单轮次变更超过 1000 行未拆分
- 存在水平切片（按技术层级拆分的任务）
- 共享区域分配了多个并行代理
