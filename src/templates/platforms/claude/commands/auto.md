---
name: auto
description: 智能自动路由编排——自动检测任务类型→路由最优流水线→智能跳过无关Gate→按复杂度分配Team/Subagent，对标OMC autopilot+ralplan自动路由模式
model: deepseek-v4-pro
effort: max
argument-hint: "[任务描述]"
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill, Agent, AskUserQuestion, WebFetch, WebSearch
version: "4.3.8"
updated: "2026-05-19"
---

# 智能自动路由编排

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎

```
Skill("behavioral-guidelines")
Skill("using-agent-skills")
Skill("context-engineering")
Skill("incremental-implementation")
Skill("verification-before-completion")
Skill("concurrency-policy")
Skill("session-memory")
```

> **核心理念**：参考 OMC 插件 `autopilot`（全自动执行）和 `ralplan`（共识路由）的自动路由模式。**你输入什么，我自动检测 → 自动选流水线 → 自动跳过无关 Gate → 自动分配 Agent**。不需要你告诉我"这是 bug 修复"或"这是重构"。

---

## 步骤 1：任务分类与流水线路由

### 1a. 解析用户输入

分析用户描述，从以下维度分类：

| 维度 | 选项 | 来源 |
|------|------|------|
| 任务性质 | 新功能 / Bug修复 / 重构 / 审查 / 发布 / 调研 / 调试 / 迁移 / 评估 / 优化 | 关键词+语义 |
| 变更范围 | 前端 / 后端 / 全栈 / 配置 / 文档 | 关键词+上下文 |
| 复杂度 | 小(<3文件) / 中(3-10文件) / 大(>10文件) | 范围推断 |
| 紧急性 | 正常 / 紧急 | 关键词 |

### 1b. 路由决策表

| 任务性质 | 路由流水线 | 入口 Gate | 说明 |
|---------|-----------|-----------|------|
| 新功能开发 | `full` | Gate A | 完整需求→实现→测试→评审→发布流程 |
| Bug修复 | `full` | Gate C | 跳过需求/任务/架构，直接规划→实现→测试 |
| 小修改(<3文件) | `full` | Gate C-impl | 跳过所有前置，直接进入实现 |
| 重构 | `refactor` | R1 | R1边界→R2基线→R3重构→R4漂移→R5报告 |
| 紧急修复 | `hotfix` | H0 | H0声明→H1修复→H2验证→H3审计 |
| 代码审查 | `full` | Gate D | 直接进入评审阶段 |
| 技术调研 | `research` | RS0 | RS0课题→RS1收集→RS2分析→RS3验证→RS4报告 |
| 调试诊断 | `debug` | D0 | D0信息→D1复现→D2会话→D3诊断→D4报告 |
| 代码简化 | `simplify` | S0 | S0分析→S1简化→S2验证→S3报告 |
| 迭代改进 | `improve` | IM0 | IM0目标→IM1研究→IM2计划→IM3执行→IM4评估 |
| 框架迁移 | `migrate` | M1 | M1规则→M2迁移→M3编译→M4修复 |
| 技术评估 | `evaluate` | E0 | E0标准→E1原型→E2指标→E3报告 |
| 发布上线 | `release` | RL0 | RL0检测→RL1质量→RL2版本→RL3发布→RL4验证 |
| 前端开发 | `frontend` | Gate A | 全流程但跳过C1.5(后端跳C1.5) |
| 后端开发 | `backend` | Gate A | 全流程但跳过C1.5 |
| 无法分类 | `full` | Gate A | 默认全流程，编排者逐步澄清 |

**路由输出**（一句话声明）：
```
🔀 自动路由：检测到 [任务性质] → [流水线名称] 流水线，从 [入口Gate] 开始
```

---

## 步骤 2：引擎会话注册

根据路由结果注册引擎：

```
mcp__jarvis-engine__session_join({ 
  platform: "claude", 
  pipeline_type: "<路由的流水线>", 
  task_name: "<任务摘要>" 
})
```

- 若路由到 `full` 流水线但非 Gate A 入口 → 使用 `mcp__jarvis-engine__gate_jump({ gate: "<入口Gate>" })` 跳转
- 每个 Gate 开始前调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 的 `team_strategy` 和允许的操作
- 写代码前调用 `mcp__jarvis-engine__gate_check({ operation: "write_code" })`
- spawn Agent 前调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_impl" })`

### 2.1 加载会话上下文

`session_join` 返回的 `context_summary` 包含历史会话摘要（最近 3 次归档）。若有内容，AI 必须在开始任务前将其作为参考上下文：

1. 检查 `context_summary` 是否为非空字符串 — 包含上次会话的 Gate 进度、关键决策、未完成事项
2. 若有 `pending_items`（未完成事项），提醒用户上次有遗留任务
3. 可选：调用 `mcp__jarvis-engine__session_context()` 获取更详细的历史上下文
4. 设置/更新优先上下文：`mcp__jarvis-engine__jarvis_priority_context({ action: "get" })` 读取项目关键约束
5. 若 `context_summary` 为空 — 说明是首次使用或历史已清理，正常开始

> 这个步骤消除了 Jarvis 的"冷启动"问题——每次新会话自动获得上次会话的上下文。

---

## 步骤 3：按 Gate 智能推进

根据路由的流水线和入口 Gate，按需执行以下各 Gate。**若当前 Gate 与任务无关 → 跳过**（引擎自动通过 `allow_jump` 支持）。

### Gate A：需求澄清（新功能/大改动时强制执行）

**🔴 设计类任务硬约束**：路由到 `full` 流水线 Gate A 入口的任务（新功能/中大型改动），**必须先与用户确认需求再产出文档**。使用 `AskUserQuestion` 或对话确认关键假设。跳过确认直接写需求文档 → 违反红线。

1. 与用户澄清需求，至少确认 1 个关键假设；模糊时加载 `Skill("idea-refine")`
2. 产出需求文档到 `.jarvis/YYYY-MM-DD/requirements/<topic>.md`
3. **跳过条件**：Bug修复（已明确知道修什么）/小修改（<3文件，无新增功能）/审查/调试 → 跳过 Gate A

### Gate B-DDD/B-BDD/B-TDD：任务分解（新功能/大改动时执行）

1. `spawn task-design` Agent 产出 DDD/BDD/TDD 文档
2. **跳过条件**：Bug修复/小修改/审查 → 全部跳过

### Gate B1：架构评审（涉及架构变更时执行）

1. `spawn` 对应架构师并行审查
2. **跳过条件**：不涉及新架构/新技术栈 → 跳过

### Gate C：执行规划

1. `spawn planner` Agent 产出执行计划
2. **跳过条件**：小修改(可直接实现) → 跳过

### Gate C-impl：并行实现

**核心原则**：编排者不写代码，所有代码变更通过 spawn Agent 完成。
**并发规范**：详见 `Skill("concurrency-policy")` — 无依赖=并行，同 batch 同发，Team 按规模触发。

**代码智能工具（Agent 可用）：**
- `mcp__jarvis-engine__jarvis_ast_search` — AST 语法树搜索，比 Grep 精确
- `mcp__jarvis-engine__jarvis_ast_replace` — 安全替换（dryRun 默认 true）
- `mcp__jarvis-engine__jarvis_lsp_hover` / `jarvis_lsp_goto_definition` / `jarvis_lsp_find_references` — 理解现有代码
- `mcp__jarvis-engine__jarvis_lsp_diagnostics` — 秒级诊断，无需编译

按复杂度选择调度策略：
| 复杂度 | 调度方式 | 首条消息 |
|--------|---------|---------|
| 小(<3文件) | Subagent ×1-2 | 1-2 个 Agent 同发 |
| 中(3-10文件) | Subagent 并行 ×2-3 | 同发 2-3 个 |
| 大(>10文件或跨≥3目录) | **Team 模式** | TeamCreate → 按模块分配 |

### Gate C1：代码质量门

Lint → Type-check → Build → Deps Audit，全部通过后推进。

### Gate C1.5：视觉验证（条件性）

纯后端/逻辑任务 → 跳过。

### Gate C2：测试验证

spawn 测试 Agent，验证功能正确。

### Gate D：评审

spawn 审查 Agent，领域审查+综合签核。

### Gate E：发布上线

质量重检 → 版本递增 → 上线。

---

## 步骤 4：Agent 调度策略

参考 OMC 插件编排模式，根据任务复杂度自动选择调度方式：

### 小任务（< 3 文件变更）

- **Subagent 模式**：`Agent` 工具直接 spawn 1-2 个实现 Agent
- 不创建 Team（TeamCreate 有开销，小任务不值得）
- Agent 串行或简单并行

### 中等任务（3-10 文件变更）

- **Subagent 并行**：同一消息中并发 spawn 2-3 个 Agent
- 按文件/模块划分，各 Agent 独占文件区域
- 编排者协调共享区域变更

### 大型任务（> 10 文件变更）

- **Team 模式**（`prefer_team`）：
  ```
  TeamCreate({ team_name: "auto-<topic>", description: "<任务描述>" })
  → Agent({ team_name: "auto-<topic>", subagent_type: "<expert>", ... })
  ```
- 每个 Team 成员独占模块/文件区域
- 前端按组件拆分，后端按服务模块拆分
- 共享区域由编排者处理

### 调度速查表

| Gate | 小任务 | 中任务 | 大任务 |
|------|--------|--------|--------|
| Gate A | 编排者直接 | 编排者直接 | subagent 探索 |
| Gate B | 跳过 | 跳过/subagent | subagent task-design |
| Gate C | 跳过 | subagent planner | subagent planner |
| Gate C-impl | subagent 1个 | subagent 并行2-3个 | **Team** |
| Gate C2 | subagent 测试 | subagent 并行测试 | **Team** 并行测试 |
| Gate D | subagent 审查 | subagent 并行审查 | **Team** 并行审查 |

---

## 红线

- **跳过需求确认直接写文档**（设计类任务路由到 Gate A 时，必须先与用户确认需求再产出文档，未确认不得产出）
- **路由错误导致全流程浪费**（步骤 1 必须认真分类，选错流水线必然返工）
- **小任务用 Team**（TeamCreate 有创建/销毁开销，<3 文件的修改直接用 subagent）
- **大任务不用 Team**（>10 文件修改用 subagent 串行会超时且质量不可控）
- **编排者直接写代码**（你是编排中枢，不是实现者，所有代码变更通过 spawn Agent）
- **跳过质量门**（Gate C1 Lint+Type-check+Build+Deps Audit 不可跳过，即使是小修改）
- **测试不通过就推进**（Gate C2 是硬门禁）
- **Agent 递归 spawn**（子 Agent 不得再生成其他子 Agent）
- **混淆流水线边界**（refactor/hotfix/debug/research 等专业流水线不可与 full 流水线混合）

---

## 与 `/jarvis` 的区别

| 维度 | `/jarvis` | `/auto` |
|------|----------|---------|
| 模式 | **全流程严格模式** | **智能路由模式** |
| Gate 序列 | A→B→B1→C→C-impl→C1→C1.5→C2→D→E **全部强制执行** | **自动判断**，无关 Gate 跳过 |
| 适用场景 | 中大型功能开发 | **一切场景**（自动适配） |
| 流水线选择 | 固定 `full` | **自动路由** 15 条流水线 |
| 推荐用法 | 明确的功能开发 | 日常所有任务的默认入口 |

> `/auto` 是推荐的日常入口。不确定用什么指令时，直接用 `/auto`。

---

## 与 `/ask` 的区别

| 维度 | `/ask` | `/auto` |
|------|--------|---------|
| 定位 | **需求探询入口** | **任务执行入口** |
| 核心任务 | 澄清需求、分析问题、产出计划 | 自动路由、分配 Agent、执行实现 |
| 何时用 | 需求不清晰、需要分析、意见分歧 | 需求已明确、知道要做什么 |
| 典型流程 | K0→K1→K2→K3（4 Gate 自适应） | 自动选流水线→跳过无关 Gate→执行 |
| 产出 | 需求规格/计划/优化方案 | 可直接运行的代码/修复 |

> `/ask` 探询 → 澄清需求 → `/auto` 执行。二者互补，覆盖从"不知道该做什么"到"自动完成"的全流程。

## 指令速查

| 场景 | 指令 | 说明 |
|------|------|------|
| 日常任务 | `/auto` | 智能路由，自动适配（**推荐默认入口**） |
| 需求不清晰 | `/ask` | 4 模式自适应探询（Interview/Direct/Consensus/Review） |
| 新功能开发 | `/jarvis` | 全流程严格模式，Gate 全部强制执行 |
| 只读审查 | `/audit` | 审查代码/项目，不修改任何文件 |
| 审查+修复 | `/audit-fix` | 初审→规划→执行→验证→复审闭环 |
