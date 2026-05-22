---
name: improve
description: 自主迭代改进——IM0目标定义→IM1研究分析→IM2计划制定→IM3执行验证→IM4评估迭代，对标OMC self-improve+autoresearch+ralph
model: heavy
effort: max
argument-hint: [改进目标/优化方向]
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill, Agent, AskUserQuestion, WebFetch, WebSearch
version: "4.3.8"
updated: "2026-05-19"
---

# 自主迭代改进

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎

```
Skill("behavioral-guidelines")
Skill("code-standards")
Skill("refactoring")
```

**引擎会话注册**：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "improve", task_name: "自主改进: <改进目标>" })`
- 每个 Gate 开始前调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 允许的操作和 Agent 调度策略
- 写代码前调用 `mcp__jarvis-engine__gate_check({ operation: "write_code" })`

> **核心理念**：参考 OMC 插件 `self-improve`（锦标赛选择进化引擎）、`autoresearch`（状态化改进循环）、`ralph`（自引用循环直到完成）。**度量驱动迭代**——定义指标→研究→计划→执行→评估→循环直到达标。

---

## IM0：目标定义

**Gate 检查条件**：改进目标已定义，含量化指标+基准值+目标值+停止条件

### 步骤

1. **目标澄清**——若用户输入模糊，使用 `AskUserQuestion` 逐问澄清：
   - 要改进什么？（性能/质量/可维护性/大小/其他）
   - 当前状态是什么？（基准值）
   - 期望达到什么状态？（目标值）
   - 时间和资源约束？

2. **指标定义**——选择一个**主指标**（必须可量化）：

   | 改进方向 | 主指标示例 | 方向 |
   |---------|-----------|:----:|
   | 性能 | 响应时间 P95 | 越低越好 |
   | 质量 | 测试覆盖率 % | 越高越好 |
   | 可维护性 | 圈复杂度均值 | 越低越好 |
   | 体积 | 包大小 (KB) | 越低越好 |
   | 构建 | 构建时间 (s) | 越低越好 |
   | 自定义 | 用户指定 | 用户指定 |

3. **停止条件**——至少设置 3 个中的 2 个：
   - 目标达成：主指标达到目标值
   - 迭代上限：最多 N 轮迭代（建议 5）
   - 平台期：连续 M 轮改善 < 阈值（建议 3 轮 < 5%）

4. 产出 `.jarvis/YYYY-MM-DD/improvement/goal-definition.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "IM1" })`

---

## IM1：研究分析

**Gate 检查条件**：研究分析完成，代码库改进机会已识别，含优先级排序+预期收益

### 步骤

1. **代码库探索**——spawn `code-explore-expert`（subagent，只读）：
   - 识别与改进目标相关的模块和热点路径
   - 发现明显的改进机会（瓶颈/冗余/低效模式）
   - 分析当前架构对改进目标的制约

2. **外部参考**（可选）——spawn `external-resource-expert` 搜索最佳实践

3. **改进机会排序**——按预期收益 × 可行性排列：
   | 机会 ID | 描述 | 预期收益 | 可行性 | 优先级 |
   |---------|------|:--------:|:------:|:------:|
   | OPP-01 | ... | +15% | 高 | P0 |
   | OPP-02 | ... | +8% | 中 | P1 |
   | OPP-03 | ... | +3% | 低 | P2 |

4. 产出 `.jarvis/YYYY-MM-DD/improvement/research-analysis.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "IM2" })`

---

## IM2：计划制定

**Gate 检查条件**：改进计划已制定，含可测试假设+实现方案+验证方法

### 步骤

1. **spawn `planner`**（subagent，只读建议）——制定改进计划：
   - 可测试假设："如果做 X，则指标 Y 将改善 Z%"
   - 实现步骤和文件清单
   - 验证方法（如何确认改善）
   - 回滚方案（改善无效时如何恢复）

2. **编排者审查并定稿**——确认计划：
   - 假设是可测试的（不是"可能会改善"这种模糊表述）
   - 影响范围可控（不涉及密封文件/共享契约）
   - 回滚方案可行

3. 产出 `.jarvis/YYYY-MM-DD/improvement/improvement-plan.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "IM3" })`

---

## IM3：执行验证

**Gate 检查条件**：改进已执行，基准测试已运行，结果已记录

**Agent 调度策略**：`prefer_team`——多模块改进时用 TeamCreate 并行执行。

### 步骤

1. **执行前基准**——运行基准命令，记录当前指标值

2. **并行执行改进**——spawn 实现 Agent（Team 模式）：
   - 按模块分配：每个 Team 成员独占一个模块
   - 实施计划中的改进
   - 每完成一个模块立即自测

3. **执行后基准**——再次运行基准命令，记录新指标值

4. **验证**——Lint + Type-check + Build + Test 全跑

5. 产出 `.jarvis/YYYY-MM-DD/improvement/execution-result.md`

> **若验证失败**：修复 → 重新跑基准（最多 3 轮修正）

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "IM4" })`

---

## IM4：评估迭代

**Gate 检查条件**：评估完成：指标对比+迭代决策（继续/停止）+总结报告

### 步骤

1. **指标对比**：

   | 指标 | 基准值 | 当前值 | 变化 | 达标? |
   |------|:------:|:------:|:----:|:-----:|
   | 主指标 | B | C | Δ | ✅/❌ |

2. **迭代决策**——检查停止条件：
   - ✅ 目标达成 → **停止**，进入总结
   - ✅ 达到迭代上限 → **停止**，记录最佳结果
   - ✅ 进入平台期 → **停止**，记录收敛点
   - ❌ 未满足任何停止条件 → **继续**，`mcp__jarvis-engine__gate_jump({ gate: "IM1" })` 跳过 IM0 重新研究

3. **总结报告**——产出 `.jarvis/YYYY-MM-DD/improvement/summary-report.md`：
   - 每轮迭代的假设+结果+指标变化
   - 最佳指标值和对应变更
   - 经验教训和后续建议

---

## 迭代循环

```
IM0 目标定义（仅首轮）
  ↓
IM1 研究分析 ←────────────┐
  ↓                        │
IM2 计划制定               │ 继续迭代
  ↓                        │ (gate_jump → IM1)
IM3 执行验证               │
  ↓                        │
IM4 评估迭代 ──停止条件未满足──┘
  │
  ↓ 停止条件满足
✅ 总结报告
```

---

## Agent 调度约束

| Gate | 调度方式 | 约束 |
|------|---------|------|
| IM0 | 编排者直接执行 | AskUserQuestion 澄清目标 |
| IM1 | Subagent（`Agent` 直接 spawn） | code-explore-expert + external-resource-expert 并行 |
| IM2 | Subagent | planner 制定计划（建议），编排者定稿 |
| IM3 | **Team**（`TeamCreate` + `Agent(team_name)`） | 各成员独占模块，执行前+后各跑一次基准 |
| IM4 | 编排者直接执行 | 指标对比+决策+总结报告 |

**Team 模式规则**：
- 每个成员独占文件/模块区域
- 实现 Agent 和测试 Agent 独立，互不干扰
- 基准测试由编排者统一运行（确保一致性）

## 红线

- **没有量化指标就开始改进**（IM0 必须先定义可量化指标+基准值，否则无法判断改进是否有效）
- **跳过基准直接改代码**（IM3 执行前后必须各跑一次基准，没有对比的改进是盲目的）
- **IM4 评估不通过就停止**（除非满足停止条件，否则必须回到 IM1 继续迭代）
- **改进导致回归**（任何改进不得使已有测试失败或性能恶化超过 5%）
- **不考虑回滚**（每次改进必须有明确的回滚方案，改进无效时快速恢复）
- **在密封文件上做实验**（不得修改 .gitignore 排除的关键配置文件）
