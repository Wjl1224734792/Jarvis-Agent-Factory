---
name: ask
description: 需求探询指令——4模式(K0需求摄入→K1信息收集→K2分析综合→K3交付产出)，文档驱动，Team/Subagent调度硬约束。支持 --* 标志位指定模式。
model: deepseek-v4-pro
effort: max
argument-hint: [--interview|--direct|--consensus|--review] <需求/想法/计划/指令>
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill, Agent, AskUserQuestion, WebFetch, WebSearch
version: "4.3.9"
updated: "2026-05-23"
---

# 需求探询（4 模式自适应 · 文档驱动 · Flag 可控）

## 快速参考

| Flag | 模式 | 适用场景 |
|------|------|---------|
| `--interview` | Interview | 深度访谈，模糊想法逐步澄清 |
| `--direct` | Direct | 快速分析，需求已明确直接产出 |
| `--consensus` | Consensus | 共识审查，多方审查验证计划/方案 |
| `--review` | Review | 流程优化，改进现有指令/流程编排 |
| *(无 flag)* | 自动判定 | 根据输入清晰度自动选择最优模式 |

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎

```
Skill("behavioral-guidelines")
Skill("idea-refine")
Skill("spec-driven-development")
```

**引擎会话注册**（硬约束——引擎确保探询操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "ask", task_name: "需求探询: <需求主题>" })`
- 每个 Gate 开始前调用 `mcp__jarvis-engine__pipeline_guide()` 获取 `team_strategy` 和 `agent_mode`，按引擎建议选择 Team 或 Subagent 调度
- 写文档前调用 `mcp__jarvis-engine__gate_check({ operation: "write_doc" })`
- spawn Agent 前调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_impl" })`；若引擎拒绝，回退到编排者自行处理

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

> **核心理念**：参考 OMC 插件指令编排模式（ralplan/planner/architect/critic），根据输入清晰度自动选择最优工作模式。每个 Gate 产出明确文档，每轮 Agent 调度有据可查。

---

## 文档产物清单

| Gate | Interview 模式 | Direct 模式 | Consensus 模式 | Review 模式 |
|------|---------------|-------------|-----------------|-------------|
| K0 | `problem-space.md` | `requirement-intake.md` | `plan-loadout.md` | `process-loadout.md` |
| K1 | `exploration-report.md` | `context-check.md` | `plan-analysis.md` | `process-assessment.md` |
| K2 | `requirements-spec.md` | `direct-plan.md` | `consensus-plan.md` | `optimization-proposal.md` |
| K3 | `requirements-spec.md`（定稿） | `direct-plan.md`（定稿） | `consensus-plan.md`（定稿） | `optimization-proposal.md`（定稿） |

> 所有产物存放于 `.jarvis/YYYY-MM-DD/requirements/`。

---

## K0：需求摄入 + 模式选择

**Gate 检查条件**：需求摄入完成，模式已选择（Interview/Direct/Consensus/Review），核心问题或需求已明确

### 步骤

1. **解析 Flag**——从用户输入中提取 `--*` 标志位：

   ```
   解析规则：扫描 ARGUMENTS，按第一个匹配的 flag 确定模式。
   --interview → Interview 模式
   --direct    → Direct 模式
   --consensus → Consensus 模式
   --review    → Review 模式
   (无 flag)   → 自动判定（进入步骤 2）
   ```

   匹配到 flag 后，将其从提示词中移除，剩余部分作为需求文本。**直接跳到步骤 3 进入对应模式，跳过步骤 2 的自动判定。**

2. **（仅无 flag 时）解析用户输入**——评估输入清晰度，自动判定模式：

   | 信号 | 含义 | 倾向模式 |
   |------|------|---------|
   | 一句话/关键词/模糊描述 | 想法未成形 | **Interview** |
   | 详细功能列表/PRD/技术方案 | 需求已明确 | **Direct** |
   | "帮我评审这个计划"/"我们意见不一致" | 需要多方审查 | **Consensus** |
   | "优化这个指令"/"审查流程编排" | 改进现有方案 | **Review** |
   | 用户显式指定模式 | 按用户选择 | 直接进入指定模式 |

   输出模式判定及一句话理由。

3. **按模式执行 K0 摄入**：

   **Interview**——苏格拉底式追问（每轮 1-2 问，AskUserQuestion）：
   - 这个功能最终要达成什么目标？
   - 谁会使用？在什么场景下？
   - 有哪些已知约束？
   - 什么明确不在范围内？
   - 若用户拒绝回答或回答模糊，记录为"待澄清"并继续

   **Direct**——直接解析用户输入，提取关键需求点、约束、验收条件

   **Consensus**——加载用户提供的现有计划/方案，确认审查范围

   **Review**——加载待优化的指令/流程编排，确认优化目标

4. **产出 K0 文档**（必须写入，作为 Gate 检查依据）：
   - Interview → `.jarvis/YYYY-MM-DD/requirements/problem-space.md`
   - Direct → `.jarvis/YYYY-MM-DD/requirements/requirement-intake.md`
   - Consensus → `.jarvis/YYYY-MM-DD/requirements/plan-loadout.md`
   - Review → `.jarvis/YYYY-MM-DD/requirements/process-loadout.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "K1" })`

---

## K1：信息收集

**Gate 检查条件**：信息收集完成：代码上下文已探索（Interview）/需求已解析（Direct）/计划已加载（Consensus/Review）

### Interview 模式——深度代码探索

1. spawn `code-explore-expert`（subagent，只读）：
   - 当前项目的技术栈和架构
   - 相关现有模块和代码路径
   - 可能受影响的区域
   - **失败处理**：重试 1 次；仍失败则编排者自行 Read 关键文件，记录"探索不完整"标记

2. spawn `external-resource-expert`（subagent，只读，可选）补充领域知识

3. 两个 subagent 可并行 spawn（同一消息中并发 Agent 调用）

4. 产出 `.jarvis/YYYY-MM-DD/requirements/exploration-report.md`

### Direct 模式——快速上下文确认

1. spawn `code-explore-expert`（subagent，只读）确认：
   - 相关代码模块是否存在
   - 技术可行性初步判断
   - 若目标模块不存在 → 记录为"需新建模块"，不中断流程

2. 产出 `.jarvis/YYYY-MM-DD/requirements/context-check.md`

### Consensus 模式——计划覆盖范围分析

1. spawn `code-explore-expert`（subagent，只读）分析：
   - 计划涉及哪些模块/文件？
   - 计划的边界和范围是否清晰？
   - 计划假设是否与代码现状一致？
   - 是否有遗漏的关键模块？

2. 产出 `.jarvis/YYYY-MM-DD/requirements/plan-analysis.md`

### Review 模式——流程结构评估

1. 编排者分析当前流程结构（不 spawn Agent）：
   - 识别流程瓶颈和冗余步骤
   - 对比 OMC 插件最佳实践（ralplan/ultrawork/autopilot 调度模式）
   - 检查 Agent Team/Subagent 调度是否合理
   - 检查文档驱动是否完整（每个 Gate 是否有对应产出）

2. 产出 `.jarvis/YYYY-MM-DD/requirements/process-assessment.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "K2" })`

---

## K2：分析综合

**Gate 检查条件**：分析综合完成：需求分析+计划草案已产出（Interview/Direct）/架构审查+批评评估已执行（Consensus/Review）

### Interview 模式——需求分析与计划起草

1. 编排者主导综合分析（汇总 K0+K1 信息）：
   - 核心痛点 → 功能需求映射
   - 场景梳理（主流程 + 边缘场景）
   - 优先级矩阵（MoSCoW：P0/P1/P2/P3）
   - MVP 范围界定

2. spawn `code-explore-expert` 验证技术细节（按需，subagent，只读）

3. 产出 `.jarvis/YYYY-MM-DD/requirements/requirements-spec.md`

### Direct 模式——快速分析直接产出

1. spawn `code-explore-expert` 确认技术细节（按需，subagent，只读）

2. 编排者直接产出：
   - 功能需求清单（含优先级）
   - 非功能需求（性能/安全/可用性）
   - 验收标准（BDD 格式：Given/When/Then）
   - 实现建议

3. 产出 `.jarvis/YYYY-MM-DD/requirements/direct-plan.md`

### Consensus 模式——多角色审查循环（参考 OMC ralplan）

**角色分配（关键）**：
- **编排者 = Planner + Critic**（同一人，不 spawn Critic Agent）
- **Architect** = spawn 对应架构 Agent（只读审查）

**Agent 调度策略**：
- 首选：`pipeline_guide()` 返回 `team_strategy: prefer_team` → 使用 `TeamCreate` + 并行 `Agent(team_name)`
- 回退：若 TeamCreate 不可用（缺少 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`）→ 使用 subagent 模式，Architect Agent 通过 `Agent` 工具直接 spawn

**审查循环**（最多 5 轮）：

1. **Planner 起草**（第 1 轮）——编排者产出计划草案

2. **并行审查**——spawn Architect Agent（1-2 个，按需选择）：
   - 涉及前端架构 → spawn `frontend-architect`
   - 涉及后端架构 → spawn `backend-architect`
   - 涉及算法设计 → spawn `algorithm-expert`
   - 多个 Architect 可并行 spawn（同一消息中并发 Agent 调用）
   - **各 Architect 只读审查**，不修改文件，产出审查意见

3. **Critic 评估**——编排者独立执行（不 spawn Agent）：
   - 约束合规：计划是否遵守项目约束（AGENTS.md 红线）？
   - 范围合理性：计划范围是否过大/过小？
   - 假设验证：计划中的假设是否经过验证？
   - 遗漏检查：是否遗漏了关键场景或边界条件？
   - 调度合理性：Team/Subagent 分配是否恰当？

4. **意见汇总**——编排者综合 Architect 反馈 + Critic 评估

5. **共识裁决**：
   - Agree → 进入 K3 定稿
   - Disagree → 编排者修订计划 → 回到步骤 2（新一轮审查）
   - 第 5 轮仍未达成共识 → 记录所有分歧点，编排者做最终裁决（附分歧说明）

6. 产出 `.jarvis/YYYY-MM-DD/requirements/consensus-plan.md`（含审查轮次记录和分歧说明）

### Review 模式——Critic 评估与优化

1. 编排者作为 Critic 评估（不 spawn Agent）：
   - 流程效率：当前指令流程是否有冗余步骤？是否可以合并 Gate？
   - Agent 调度：Team/Subagent 使用是否合理？是否存在资源争抢？
   - Gate 设计：Gate 序列和检查条件是否恰当？是否有可跳过的 Gate？
   - 文档驱动：每个 Gate 是否有明确的文档产出？
   - 红线合规：是否遵守项目约束？
   - 对比 OMC 插件最佳实践（ralplan 共识流程、ultrawork 并行调度、autopilot 自主执行）

2. 产出优化建议：
   - 具体改进点（按优先级 P0/P1/P2 排序）
   - 改进后的流程编排方案
   - 预期收益（效率提升/质量改善/冲突减少）

3. 产出 `.jarvis/YYYY-MM-DD/requirements/optimization-proposal.md`

---

## 评分与权重框架（所有模式通用）

参考 OMC 插件的数学化评分模式（`deep-interview` 歧义门控 ≤20%、`trace` 贝叶斯更新 P(H|E)、`self-improve` 锦标赛评分+平台期检测、`ralplan` 共识投票），在 K2 产出中引入量化评分：

### 需求评分矩阵（Requirements Scoring Matrix）

每个功能需求按 5 维度评分（1-10），加权计算总分：

| 维度 | 说明 | 权重 | OMC 参考 |
|------|------|:---:|---------|
| **业务价值** (BV) | 对用户/业务目标的核心贡献度 | 30% | deep-interview: 歧义越低价值越高 |
| **实现成本** (EF) | 预估工作量(人时)的倒数得分(低成本=高分) | 25% | self-improve: 收益率 = 改善/成本 |
| **技术风险** (RS) | 技术不确定性(低风险=高分) | 20% | trace: 根因概率越低风险越高 |
| **用户影响** (UI) | 终端用户可见的体验改善程度 | 15% | ralplan: 共识度越高影响越确定 |
| **依赖耦合** (DC) | 独立模块得分(无外部依赖=10分) | 10% | autopilot: 模块隔离度 |

**加权总分** = BV×0.30 + EF×0.25 + RS×0.20 + UI×0.15 + DC×0.10

输出格式：

| ID | 需求描述 | BV | EF | RS | UI | DC | **总分** | 优先级 |
|----|---------|:--:|:--:|:--:|:--:|:--:|:--------:|:------:|
| FR-01 | ... | 8 | 7 | 6 | 9 | 8 | **7.45** | P0 |
| FR-02 | ... | 5 | 4 | 9 | 6 | 10 | **6.15** | P1 |

> **歧义门控**（参考 deep-interview）：若任一需求的任意维度评分依据不充分（"猜的"），标注 `⚠ 歧义` 并限制其优先级不超过 P1。歧义 > 20% 的需求回退到 K0 重新澄清。

### 方案对比矩阵（Solution Comparison Matrix）

当存在多个可行方案时，按加权标准矩阵对比：

| 标准 | 权重 | 方案A得分 | 方案B得分 | 方案C得分 |
|------|:---:|:--------:|:--------:|:--------:|
| 技术可行性 | 30% | 8 | 6 | 9 |
| 实现速度 | 25% | 5 | 9 | 6 |
| 可扩展性 | 20% | 9 | 4 | 7 |
| 维护成本 | 15% | 7 | 8 | 5 |
| 团队熟悉度 | 10% | 8 | 7 | 4 |
| **加权总分** | — | **7.30** | **6.65** | **6.55** |
| **排名** | — | 🥇 推荐 | 🥈 | 🥉 |

> **置信度**（参考 trace）：若方案间总分差 < 0.5，标注 `⚠ 低置信度`，建议补充证据后重新对比。总分差 < 0.2 视为统计平局，由编排者基于非量化因素（战略方向/技术愿景）做最终裁决。

### 权重调整规则

- 默认权重适用于通用场景。若用户指定场景，自动调整：
  - **快速原型/MVP**：EF 权重+10%, BV-5%, RS-5%
  - **核心系统/高可靠**：RS 权重+10%, BV+5%, EF-10%
  - **用户面功能**：UI 权重+10%, DC+5%, RS-5%
- 用户可在 K0 阶段自定义权重分配

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "K3" })`

---

## K3：交付产出

**Gate 检查条件**：最终交付物已产出：结构化需求计划（Interview/Direct）/共识裁决结果（Consensus）/优化建议+修订方案（Review）

### 所有模式——最终定稿

1. **最终检查**（按模式验证对应产物）：

   | 检查项 | Interview | Direct | Consensus | Review |
   |--------|-----------|--------|-----------|--------|
   | 功能需求清晰可测 | ✅ | ✅ | ✅ | — |
   | 非功能需求有度量标准 | ✅ | ✅ | ✅ | — |
   | 验收标准 BDD 格式 | ✅ | ✅ | ✅ | — |
   | 约束和假设明确记录 | ✅ | ✅ | ✅ | ✅ |
   | 审查轮次记录完整 | — | — | ✅ | — |
   | 分歧说明（如有） | — | — | ✅ | — |
   | 需求评分矩阵完整 | ✅ | ✅ | — | — |
   | 方案对比矩阵（如多方案） | ✅ | ✅ | ✅ | — |
   | 改进点优先级排序 | — | — | — | ✅ |
   | 预期收益量化 | — | — | — | ✅ |

2. **定稿**——在 K2 产出的文档末尾追加"✅ K3 定稿"标记和日期

3. **与后续流程衔接**：

```
/ask "需求描述"
  → K0→K1→K2→K3 需求规格/计划/优化方案（结构化文档）
  → /jarvis "实现 FR-01 FR-02..."  （启动全流程编排）
  → /task-ddd 或 /task-bdd 或 /planner（按需选择后续指令）
```

---

## 模式转换规则

在任意 Gate，若发现以下情况，允许回到 K0 重新选择模式：

| 触发条件 | 原模式 | 转换到 | 说明 |
|---------|--------|--------|------|
| K1 探索时发现用户有未提及的现有计划 | Interview | Consensus | 加载现有计划，跳过重复探索 |
| K1 探索时用户补充了足够细节 | Interview | Direct | 信息已充分，加速流程 |
| K2 审查时发现计划严重偏离代码现状 | Consensus | Interview | 重新澄清需求 |
| K2 评估时发现需要多方审查 | Direct | Consensus | 引入 Architect 审查 |
| 用户中途显式要求切换模式 | 任意 | 指定模式 | 从当前 Gate 重新开始新模式的流程 |

> 模式转换时保留已产出的文档，K0 重新产出新模式文档。

---

## 异常处理

| 异常 | 处理方式 |
|------|---------|
| `code-explore-expert` spawn 失败 | 重试 1 次；仍失败则编排者自行 Read 关键文件，产出中标记"探索不完整" |
| `external-resource-expert` spawn 失败 | 跳过外部资源探索，仅基于代码库分析 |
| Architect Agent spawn 失败（Consensus） | 编排者兼任架构审查，记录"架构审查由编排者代行" |
| `AskUserQuestion` 被拒绝/跳过 | 记录为"待澄清"，基于已有信息继续，不阻塞流程 |
| TeamCreate 不可用（Consensus K2） | 回退到 subagent 模式：通过 `Agent` 工具直接 spawn Architect |
| 全部 Architect 审查意见冲突 | 编排者做最终裁决，记录冲突点和裁决理由 |
| K2 5 轮审查后未达成共识 | 编排者做最终裁决，记录所有分歧点和裁决理由 |

---

## Agent Team 与 Subagent 调度约束

参考 OMC 插件编排模式，严格按 `pipeline_guide` 返回的 `team_strategy` 选择调度方式：

| Gate | 引擎策略 | 调度方式 | 约束 |
|------|---------|---------|------|
| K0 | `subagent_only` | 编排者直接执行 | 不 spawn Agent，编排者做模式判定+追问 |
| K1 | `subagent_only` | `Agent` 工具直接 spawn subagent | 只读，1-2 个 code-explore-expert 可并行；external-resource-expert 可并行 |
| K2 Consensus | `prefer_team` | 首选 TeamCreate + Agent(team_name)；回退 subagent | Architect 并行审查，各只读；Critic 由编排者担任 |
| K2 其他 | `prefer_team` | 编排者主导，subagent 辅助 | code-explore-expert 只读确认 |
| K3 | `subagent_only` | 编排者直接产出 | 不 spawn Agent |

**Team 模式规则（硬约束）**：
- 每个 Team 成员独占审查维度（前端架构/后端架构/算法），禁止多成员共享同一维度
- Team 成员只读审查，不修改文件
- 编排者为唯一签核者（Planner + Critic 角色合并），汇总各维度 findings 后综合判定
- Team 环境要求：`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`（`jarvis init` 自动配置）

**Subagent 使用规则**：
- 子 Agent 禁止递归 spawn 其他子 Agent（AGENTS.md 约束 4）
- 子 Agent 只读操作（Read/Glob/Grep/Bash/WebFetch/WebSearch）
- 子 Agent 不直接写入产物文档，产出由编排者汇总写入
- 多个无依赖 subagent 在同一消息中并发 spawn（最大化并行度）

**冲突预防（硬约束）**：
- 同一文件同一时间只有一个修改者（编排者）
- 子 Agent 发现文件冲突立即标记，由编排者裁决
- Consensus 模式：Architect Agent 审查 → 编排者汇总 → 编排者修订 → 下一轮审查，单文件单写者
- 每个 Gate 的文档产出由编排者统一写入，子 Agent 只提供分析结果

---

## 红线

- **跳过模式选择直接执行**（K0 必须先判定输入清晰度，选错模式必然返工）
- **K0 不出文档**（每个模式的 K0 必须有对应的文档产出，无文档 = Gate 不通过）
- **替用户做决策**（探询者的职责是提问和呈现选项，不是代替决策）
- **Interview 模式一次问太多问题**（每轮至多 1-2 个问题，确保深入而非广撒网）
- **Consensus 模式混淆角色**（编排者 = Planner + Critic，Architect 才是 spawn 的 Agent，不可反过来）
- **Consensus 缩减审查轮次**（5 轮是上限但每轮必须完整执行，不可因为"时间不够"而跳过审查）
- **Review 模式只评不改**（Critic 评估后必须产出具体的优化方案，不能只列问题不给出路）
- **混淆 Team 和 Subagent 使用场景**（K1 探索用 Subagent，K2 Consensus 审查用 Team→Subagent 回退，不可互换）
- **在 K0/K1 阶段就承诺技术方案**（先搞清楚"做什么"和"怎么做"，再开始实现）
- **忽略边缘场景**（Happy Path 只占 20% 的工作量，Bug 都在边缘场景里）
- **交付物缺少验收标准**（没有 Given/When/Then 的计划等于没有计划）
- **子 Agent 直接写文件**（所有产物文档由编排者统一写入，子 Agent 只提供内存/终端输出的分析结果）
