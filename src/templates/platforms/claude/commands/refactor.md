---
name: refactor
description: 重构指令——R1定义边界→R2基线测试→R3执行重构→R4行为漂移检测→R5生成报告，完整5Gate安全网
model: deepseek-v4-pro
argument-hint: [重构目标描述或文件路径]
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill
version: "3.45.8"
updated: "2026-05-14"
---

# 代码重构（安全网保护）

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("code-simplification")
Skill("test-driven-development")
```

**引擎会话注册**（硬约束——引擎确保重构操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "refactor" })`
- 每个 Gate 开始前调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 允许的操作
- 写代码前调用 `mcp__jarvis-engine__gate_check({ operation: "write_code" })`（仅 R3 阶段允许）
- 测试前调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_test" })`（仅 R2/R4 阶段允许）

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

---

## R1：定义重构边界与目标

**Gate 检查条件**：重构边界与目标文档已产出，含重构范围+不变行为清单+成功标准

### 步骤
1. 明确重构目标（性能优化/可维护性/可测试性）
2. 划定重构边界（哪些文件/模块在范围内，哪些绝不触碰）
3. 列出**不变行为清单**——重构后必须保持的对外行为：
   ```
   | 行为 | 当前表现 | 必须保持 |
   |------|---------|---------|
   | 用户登录返回 token | { token, user } | JSON 结构不变 |
   | 空查询参数返回 400 | { error: "..." } | 状态码+错误格式不变 |
   ```
4. 定义成功标准：性能指标、代码行数减少、圈复杂度降低等

5. 输出 `docs/YYYY-MM-DD/refactoring/refactor-boundary.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "R2" })`

---

## R2：建立基线测试

**Gate 检查条件**：现有测试套件全部通过，基线覆盖率报告已产出

### 步骤
1. 运行现有测试套件，确保全部通过：
   ```bash
   npm test -- --coverage    # Jest/Vitest
   pytest --cov=.            # Python
   go test ./... -coverprofile=coverage.out  # Go
   ```

2. 记录基线指标：
   - 行覆盖率：__%
   - 分支覆盖率：__%
   - 测试通过数：__
   - 测试失败数：0（强制）

3. 保存基线覆盖率报告到 `docs/YYYY-MM-DD/refactoring/baseline-coverage.json`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "R3" })`

---

## R3：执行重构

**Gate 检查条件**：重构代码已提交，所有修改在重构边界内，未涉及边界外文件

### 步骤
1. 逐文件执行重构，遵循以下原则：
   - **小步提交**：每 1-2 个文件一个 commit
   - **保持行为**：只改实现，不改行为
   - **边界内**：不触碰边界外文件
   - **不夹带**：不顺便加功能、修 Bug、改格式

2. 常用重构手法：
   - 提取函数（Extract Function）
   - 内联变量（Inline Variable）
   - 以多态替换条件（Replace Conditional with Polymorphism）
   - 替换算法（Substitute Algorithm）
   - 移除死代码（Remove Dead Code）

3. 每步重构后运行测试确认无回归

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "R4" })`

---

## R4：行为漂移检测

**Gate 检查条件**：Lint + Type-check + Build 重检通过，测试套件再次全部通过，覆盖率对比无下降，行为漂移检测通过

### 步骤
1. 🔴 **质量重检**（重构修改后必须重新验证）：
   - Lint + Type-check + Build 全部通过
   - 失败 → 修复后重跑，最多 2 轮

2. 重新运行测试套件：
   ```bash
   npm test -- --coverage
   ```

2. 对比 R2 基线：
   | 指标 | R2 基线 | R4 当前 | 差异 | 通过? |
   |------|--------|--------|------|------|
   | 行覆盖率 | __% | __% | __% | 不得下降 |
   | 分支覆盖率 | __% | __% | __% | 不得下降 |
   | 测试通过数 | __ | __ | __ | 不得减少 |

3. 行为漂移检测（手动抽查）：
   - 随机挑选 3 个关键入口函数
   - 用相同输入调用重构前后版本
   - 验证输出完全相同

4. 输出 `docs/YYYY-MM-DD/refactoring/behavior-drift-report.md`

**通过标准**：覆盖率不下降 + 测试全部通过 + 行为漂移检测通过

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "R5" })`

---

## R5：生成重构报告

**Gate 检查条件**：重构报告已产出，含变更摘要+覆盖率对比+行为漂移结论

### 步骤
输出 `docs/YYYY-MM-DD/refactoring/refactor-summary.md`：
```markdown
# 重构报告
## 重构目标
- 为什么重构、预期收益
## 变更摘要
- 文件数、新增行、删除行、净变更
## 覆盖率对比
- R2 基线 vs R4 最终
## 行为漂移结论
- 漂移检测 通过/发现差异
## 架构改进
- 圈复杂度降低、依赖简化、模块解耦
## 风险与后续建议
```

---

## 红线
- 重构时修改对外 API 契约（破坏了不变行为）
- 重构和功能修改混在一个 commit（无法分辨变更意图）
- 不设基线就重构（不知道是否引入了退化）
- 过度重构（为了"更优雅"重构已经清晰的代码——切斯特顿之栏）
- 不跑测试就推进 Gate（丢失回归保护）
- 重构范围不断膨胀（"顺便把这个也重构了"）
