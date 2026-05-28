---
name: simplify
description: 代码简化与质量清理——S0代码分析→S1简化执行→S2回归验证→S3报告产出，对标OMC simplify+ai-slop-cleaner
model: inherit
argument-hint: [目标文件/目录/模块]
tools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit", "Skill", "Agent", "AskUserQuestion", "WebFetch", "WebSearch"]
---

# 代码简化与质量清理

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎

```
Skill("behavioral-guidelines")
Skill("code-simplification")
Skill("code-standards")
```

**引擎会话注册**：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "simplify", task_name: "代码简化: <目标模块>" })`
- 每个 Gate 开始前调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 允许的操作和 Agent 调度策略
- 写代码前调用 `mcp__jarvis-engine__gate_check({ operation: "write_code" })`

> **核心理念**：参考 OMC 插件 `simplify`（代码质量审查）和 `ai-slop-cleaner`（AI痕迹清理），**回归安全第一**——只删冗余不删功能，只简化不重写，每一步都验证功能不变。

---

## S0：代码分析

**Gate 检查条件**：代码分析报告已产出，含复杂度/冗余/AI痕迹/改进机会清单

**🔴 前置约束**：若用户输入模糊（未指定具体文件/目录/模块），必须先使用 `AskUserQuestion` 与用户确认目标范围，确认后再进入分析步骤。跳过确认直接分析 → 违反红线。

### 步骤

0. **确认目标范围**——若未明确，`AskUserQuestion` 确认：
   - 要简化哪些文件/目录/模块？
   - 有什么特别注意或不可触碰的区域？
   - 确认后记录到分析报告中

1. **扫描目标代码**——spawn `code-explore-expert`（subagent，只读）：
   - 文件结构和模块依赖
   - 代码复杂度和嵌套深度
   - 重复代码块（DRY 违反）
   - 死代码和未使用变量/导入
   - AI 生成痕迹（过度注释、冗余类型标注、无意义变量名如 data/temp/result）

2. **编排者补充分析**——汇总 subagent 发现，分类：
   | 类别 | 特征 | 安全级别 |
   |------|------|:--------:|
   | 死代码 | 未引用的函数/变量/导入 | 🟢 安全 |
   | 重复代码 | 3+ 处相同逻辑 | 🟡 谨慎 |
   | 过度抽象 | 只有一次调用的 wrapper | 🟢 安全 |
   | AI 痕迹 | 无意义注释/明显的AI命名模式 | 🟢 安全 |
   | 复杂度 | 嵌套 > 4 层/函数 > 50 行 | 🔴 高风险 |

3. 产出 `.jarvis/YYYY-MM-DD/simplification/code-analysis.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "S1" })`

---

## S1：简化执行

**Gate 检查条件**：简化执行完成，代码已按分析报告优化，所有功能保持不变

**Agent 调度策略**：`prefer_team`——多模块时用 TeamCreate 并行简化，单模块用编排者直接执行。

### 步骤

1. **按优先级执行简化**（从安全的开始）：
   - 🟢 先处理：删除死代码、移除无意义注释、合并重复导入
   - 🟡 再处理：提取公共逻辑为工具函数（3+ 次重复）
   - 🔴 最后：简化深层嵌套（guard clause / early return）

2. **简化原则**（硬约束）：
   - 不改变任何功能行为
   - 不修改 API 签名（除非同时更新所有调用点）
   - 不删除错误处理逻辑
   - 不合并不同职责的代码

3. **Team 模式规则**：
   - 每个成员独占文件/模块，禁止共享
   - 前端按组件拆分，后端按服务模块拆分
   - 共享工具文件由编排者处理

4. **每完成一个模块立即验证**：保存 → lint → 确认无新增错误

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "S2" })`

---

## S2：回归验证

**Gate 检查条件**：回归验证通过：Lint+Type-check+Build+Test全部通过，无回归

### 步骤

1. **全量质量检查**（顺序执行）：
   ```
   Lint → Type-check → Build → Test
   ```
   任一步失败 → 修复 → 从 Lint 重新开始（最多 3 轮）

2. **回归检查清单**：
   - 无新增 lint 错误
   - 无新增类型错误
   - 构建成功
   - 所有测试通过（无减少）

3. **若 3 轮仍失败** → 回滚 S1 的最后一个变更，记录问题

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "S3" })`

---

## S3：报告产出

**Gate 检查条件**：简化报告已产出，含before/after对比+简化统计+变更清单

### 输出 `.jarvis/YYYY-MM-DD/simplification/simplification-report.md`：

```markdown
# 代码简化报告：<目标模块>

## 简化统计
| 指标 | 简化前 | 简化后 | 变化 |
|------|--------|--------|------|
| 总行数 | N | N' | -X (Y%) |
| 函数数 | N | N' | -X |
| 重复代码块 | N | N' | -X |
| 死代码行 | N | N' | -X |
| 平均嵌套深度 | N | N' | -X |

## 变更清单
| 文件 | 变更类型 | 描述 | 风险级别 |
|------|---------|------|:--------:|
| ... | 删除 | 移除未使用函数 | 🟢 |
| ... | 提取 | 抽取公共逻辑 | 🟡 |
| ... | 简化 | guard clause 替换嵌套 | 🔴 |

## 验证结果
- Lint: ✅ 通过
- Type-check: ✅ 通过
- Build: ✅ 通过
- Test: ✅ 全部通过

## 后续建议
- 进一步重构建议（如有）
- 需要人工审查的高风险变更
```

---

## Agent 调度约束

| Gate | 调度方式 | 约束 |
|------|---------|------|
| S0 | Subagent（`Agent` 直接 spawn） | code-explore-expert 只读扫描 |
| S1 | **Team**（`TeamCreate` + `Agent(team_name)`） | 各成员独占文件，严禁共享修改 |
| S2 | Subagent + 编排者 | 测试 Agent spawn 验证，编排者修修复 |
| S3 | 编排者直接产出 | 不 spawn Agent |

## 红线

- **跳过确认直接写文档**（S0 必须先与用户确认目标范围，未确认不得产出分析报告）
- **改变功能行为**（简化不是重写，所有测试必须保持通过）
- **删除错误处理**（try/catch、边界检查不得简化）
- **合并不同职责**（一个函数只做一件事，但也不要把不相干的事合并）
- **忽略回归验证**（S2 必须完整执行 Lint+Type-check+Build+Test）
- **跳过 S0 直接简化**（不分析就动手，必然遗漏或误删）
