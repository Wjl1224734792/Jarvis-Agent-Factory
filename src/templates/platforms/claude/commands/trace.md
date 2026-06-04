---
name: trace
description: 因果追踪——T0问题框架→T1假设生成→T2证据收集→T3因果分析→T4解决方案，假设驱动的科学根因定位
model: inherit
argument-hint: [异常/问题/症状描述]
tools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit", "Skill", "AskUserQuestion", "Agent", "WebFetch", "WebSearch", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__gate_enforce", "mcp__jarvis-engine__report_status", "mcp__jarvis-engine__session_context", "mcp__jarvis-engine__jarvis_priority_context"]
---

# 因果追踪

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎

```
Skill("behavioral-guidelines")
Skill("debugging-and-error-recovery")
```

**引擎会话注册**：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "trace", task_name: "因果追踪: <问题简述>" })`
- 每个 Gate 开始前调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 允许的操作和 Agent 调度策略
- 写文档前调用 `mcp__jarvis-engine__gate_check({ operation: "write_doc" })`
- spawn Agent 前调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_impl" })`

> **核心理念**：用科学方法定位根因——生成竞态假设→收集证据→贝叶斯更新→逐步缩小根因范围。不做无方向的随机探索。

---

## T0：问题框架

**Gate 检查条件**：问题框架已明确，含症状描述+上下文+已知信息+时间线

### 步骤

1. **症状描述**——精确记录：
   - 什么异常？（错误信息/异常行为/性能退化）
   - 什么时候开始？（引入版本/触发条件）
   - 影响范围？（哪些用户/功能/环境）

2. **上下文收集**——编排者自行 Read 关键文件：
   - 异常堆栈中涉及的源文件
   - 最近的 git log 变更
   - 相关配置和环境变量

3. **已知信息矩阵**：
   | 维度 | 已知 | 未知 |
   |------|------|------|
   | 时间 | 何时开始 | 具体引入 commit |
   | 范围 | 影响哪些功能 | 是否影响其他 |
   | 环境 | 哪些环境复现 | 环境差异 |
   | 数据 | 特定数据触发？ | 数据模式 |

4. 产出 `.jarvis/YYYY-MM-DD/trace/problem-frame.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "T1" })`

---

## T1：假设生成

**Gate 检查条件**：2-5个竞态假设已生成，每个假设含先验概率+支持条件+证伪条件

### 步骤

1. **生成竞态假设**——spawn `algorithm-expert` 辅助（subagent，只读）：
   - 每个假设必须是**可证伪的**（有明确的证伪条件）
   - 每个假设分配**先验概率**（基于已知信息，总和 = 100%）
   - 优先考虑**最近变更**相关的假设

2. **假设登记表**：
   | ID | 假设描述 | 先验概率 | 若为真则应有 | 若为假则应有 |
   |----|---------|:--------:|-------------|-------------|
   | H1 | ... | 30% | 日志中出现 X | 日志中无 X |
   | H2 | ... | 25% | 某文件含 Y | 某文件不含 Y |
   | H3 | ... | 20% | 特定输入触发 | 所有输入均正常 |
   | H4 | ... | 15% | ... | ... |
   | H5 | ... | 10% | ... | ... |

3. 产出 `.jarvis/YYYY-MM-DD/trace/hypotheses.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "T2" })`

---

## T2：证据收集

**Gate 检查条件**：每个假设的证据已收集，含支持证据+反对证据+不确定性评估

### 步骤

1. **并行证据收集**——spawn `code-explore-expert`（subagent，只读，可按假设并行）：
   - 读取每个假设相关的源文件
   - 搜索关键代码路径和日志点
   - 检查相关 git blame 和变更历史

2. **可选**——spawn `external-resource-expert` 搜索类似问题

3. **证据矩阵**：
   | 假设 | 支持证据 | 反对证据 | 证据质量 | 后验概率 |
   |------|---------|---------|:--------:|:--------:|
   | H1 | 发现 X | 未发现 Y | 高 | ↑ 45% |
   | H2 | 弱关联 | 关键证据缺失 | 低 | ↓ 10% |
   | H3 | ... | ... | 中 | → 20% |

4. 产出 `.jarvis/YYYY-MM-DD/trace/evidence-matrix.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "T3" })`

---

## T3：因果分析

**Gate 检查条件**：因果分析完成：贝叶斯更新已执行+假设排序+根因概率+置信度

### 步骤

1. **编排者执行贝叶斯更新**：
   - 对每个假设：P(H|E) = P(E|H) × P(H) / P(E)
   - 证据质量高的更新权重更大
   - 有决定性反对证据的假设概率归零

2. **假设排序**——按后验概率降序排列

3. **根因判定**：
   - 概率 > 70% → **确认根因**，进入 T4
   - 概率 40-70% → **高度怀疑**，可能需要补充证据（回到 T2 补充）
   - 概率 < 40% → **排除**，聚焦剩余假设
   - 所有假设 < 40% → 可能需要生成新假设（回到 T1）

4. 产出 `.jarvis/YYYY-MM-DD/trace/causal-analysis.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "T4" })`

---

## T4：解决方案

**Gate 检查条件**：解决方案已产出，含推荐修复+验证步骤+预防建议

### 步骤

1. **修复方案**——基于确认的根因：
   - 具体修复代码或配置变更
   - 修复影响范围评估
   - 修复风险评级

2. **验证步骤**：
   - 最小复现 → 应用修复 → 确认消失
   - 回归测试范围

3. **预防建议**：
   - 如何防止同类问题再次发生？
   - 是否需要添加监控/告警？
   - 是否需要更新文档/规范？

4. 产出 `.jarvis/YYYY-MM-DD/trace/resolution.md`

---

## Agent 调度约束

| Gate | 调度方式 | 约束 |
|------|---------|------|
| T0 | 编排者直接执行 | 不 spawn Agent |
| T1 | Subagent（`Agent` 直接 spawn） | algorithm-expert 辅助生成假设 |
| T2 | Subagent 并行 | code-explore-expert 按假设并行收集证据 |
| T3 | 编排者直接执行 | 贝叶斯分析+假设排序 |
| T4 | 编排者直接产出 | 修复方案+验证步骤+预防建议 |

## 红线

- **无假设就收集证据**（T1 必须先产出假设清单，否则 T2 是无方向的随机搜索）
- **假设不可证伪**（"可能是环境问题"不是可证伪假设——必须写"环境变量 X 的值 > Y 导致"）
- **跳过贝叶斯更新**（T3 必须执行严格的概率更新，不能凭直觉选一个假设）
- **证据收集不充分就下结论**（至少收集 3 个维度的证据）
- **修复方案缺少验证步骤**（没有验证步骤的解决方案 = 不知道修好没有）
