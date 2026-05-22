---
name: refactor
description: 重构指令——R1定义边界→R2基线测试→R3执行重构→R4行为漂移检测→R5生成报告，完整5Gate安全网
model: heavy
effort: max
argument-hint: [重构目标描述或文件路径]
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill, Agent
version: "4.3.8"
updated: "2026-05-18"
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

5. 输出 `.jarvis/YYYY-MM-DD/refactoring/refactor-boundary.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "R2" })`

---

## R2：建立基线测试

**Gate 检查条件**：现有测试套件全部通过，基线覆盖率报告已产出（可选：补充基线测试已由测试 Agent 完成）

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

3. 保存基线覆盖率报告到 `.jarvis/YYYY-MM-DD/refactoring/baseline-coverage.json`

4. **（可选）Spawn 测试 Agent 补充基线测试**——若现有测试覆盖率不足以作为重构安全网，可 spawn 测试 Agent 补充基线测试用例，提高覆盖率：
   - 前端代码 → spawn `frontend-test-expert`
   - 后端代码 → spawn `backend-test-expert`
   - 跨层代码 → spawn `e2e-test-expert`

   ```
   Agent("<测试Agent>", prompt: """
   ## 补充基线测试（重构前安全网）

   重构范围（来自 R1 边界文档）：
   - 涉及文件：<文件列表>
   - 核心行为：<不变行为清单>

   ## 任务
   1. 分析重构范围内的现有测试覆盖率，识别未覆盖的关键路径
   2. 为未覆盖的关键路径补充测试用例（不修改生产代码）
   3. 确保补充的测试在重构前全部通过

   ## 约束
   - 只写测试，不修改生产代码
   - 补充的测试必须在重构前通过（作为基线安全网）
   - 测试用例聚焦重构范围内的行为验证，不扩大范围

   ## 输出
   - 新增测试文件/用例清单
   - 覆盖率提升数据
   - 运行结果：全部通过
   """)
   ```

   编排者审查测试 Agent 的补充测试，确认聚焦在重构范围内后合并。

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "R3" })`

---

## R3：执行重构

**Gate 检查条件**：重构代码已提交，所有修改在重构边界内，未涉及边界外文件

### Agent 选择路由

编排者根据重构范围选择领域实现 Agent：

| 重构范围 | Spawn Agent | 说明 |
|---------|------------|------|
| 纯前端代码（组件、样式、状态、路由） | `frontend-dev-expert` | 前端生命周期重构 |
| 纯后端代码（API、逻辑、数据层） | `backend-dev-expert` | 后端生命周期重构 |
| 跨层胶水改动（前后端接口适配、共享类型） | `remediation-expert` | 跨层重构适配 |

### 步骤

1. **编排者定义重构策略**——将 R1 边界文档转化为可执行的重构指令：
   - 逐文件列出重构手法（Extract Function / Inline Variable / Replace Conditional 等）
   - 明确每步的预期 diff 大小（< 20 行/步）
   - 传递不变行为清单和边界约束

2. **Spawn 领域实现 Agent 执行重构**——按 Agent 选择路由 spawn 对应 Agent：

   ```
   Agent("<领域实现Agent>", prompt: """
   ## 重构任务

   重构策略（来自编排者）：
   - 重构文件列表：<文件列表>
   - 每文件重构手法：<手法 + 预期变更>
   - 不变行为清单：<来自 R1>
   - 重构边界：<范围内文件> / 边界外文件（绝不触碰）：<文件列表>

   ## 执行原则（红线——不可违反）
   - **小步提交**：每 1-2 个文件一个 commit，commit message 关联重构目标
   - **保持行为**：只改实现，不改行为——不变行为清单中的每项必须保持
   - **边界内**：绝不触碰边界外文件
   - **不夹带**：不顺便加功能、修 Bug、改格式
   - **每步验证**：每步重构后运行测试确认无回归
   - **重构手法**：优先使用以下手法——
     - 提取函数（Extract Function）
     - 内联变量（Inline Variable）
     - 以多态替换条件（Replace Conditional with Polymorphism）
     - 替换算法（Substitute Algorithm）
     - 移除死代码（Remove Dead Code）

   ## 输出
   - 逐文件重构 diff 清单
   - 每步 commit 记录
   - 重构后测试运行结果
   """)
   ```

3. **编排者审查每步重构 diff**——确认：
   - 改动在重构边界内，未触碰边界外文件
   - 每步 diff 大小合理（< 20 行/步）
   - 未夹带功能修改、Bug 修复或格式化
   - 不变行为清单中的每项未被破坏
   - 审查不通过 → 退回 Agent 重新执行，附上具体审查意见

4. **编排者确认重构提交完成**后，推进 Gate

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "R4" })`

---

## R4：行为漂移检测

**Gate 检查条件**：Lint + Type-check + Build 重检通过，测试套件再次全部通过（含测试 Agent 补充的测试），覆盖率对比无下降，行为漂移检测通过

### 步骤
1. 🔴 **质量重检**（编排者执行，重构修改后必须重新验证）：
   - Lint + Type-check + Build 全部通过
   - 失败 → spawn R3 使用的同一个领域实现 Agent 修复质量问题，修复后重跑，最多 2 轮

2. **Spawn 测试 Agent 执行完整测试套件+覆盖率对比**——按 Agent 选择路由 spawn 测试 Agent：

   | 重构范围 | Spawn Agent |
   |---------|------------|
   | 前端代码 | `frontend-test-expert` |
   | 后端代码 | `backend-test-expert` |
   | 跨层代码 | `e2e-test-expert` |

   ```
   Agent("<测试Agent>", prompt: """
   ## 重构后行为漂移检测

   R2 基线数据：
   - 行覆盖率：__%
   - 分支覆盖率：__%
   - 测试通过数：__
   - 基线报告路径：.jarvis/YYYY-MM-DD/refactoring/baseline-coverage.json

   ## 任务
   1. 运行完整测试套件（含 R2 阶段补充的基线测试）：
      ```bash
      npm test -- --coverage
      ```
   2. 对比 R2 基线覆盖率：
      | 指标 | R2 基线 | R4 当前 | 差异 | 通过? |
      |------|--------|--------|------|------|
      | 行覆盖率 | __% | __% | __% | 不得下降 |
      | 分支覆盖率 | __% | __% | __% | 不得下降 |
      | 测试通过数 | __ | __ | __ | 不得减少 |
   3. 若发现覆盖率下降，分析原因并补充测试用例修复
   4. 输出测试报告：测试结果 + 覆盖率对比 + 漂移分析

   ## 约束
   - 测试套件必须全部通过（0 failures）
   - 覆盖率不得低于 R2 基线
   - 若发现行为漂移（测试失败），详细记录失败用例和漂移表现

   ## 输出
   - 完整测试运行结果
   - 覆盖率对比表
   - 行为漂移分析报告
   """)
   ```

3. 编排者审查测试 Agent 的报告，确认：
   - 测试全部通过
   - 覆盖率无下降
   - 无行为漂移

4. **行为漂移手动抽查**（编排者执行）：
   - 随机挑选 3 个关键入口函数
   - 用相同输入调用重构前后版本
   - 验证输出完全相同

5. 输出 `.jarvis/YYYY-MM-DD/refactoring/behavior-drift-report.md`

**通过标准**：覆盖率不下降 + 测试全部通过 + 行为漂移检测通过

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "R5" })`

---

## R5：生成重构报告

**Gate 检查条件**：重构报告已产出，含变更摘要+覆盖率对比+行为漂移结论

### 步骤
输出 `.jarvis/YYYY-MM-DD/refactoring/refactor-summary.md`：
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
