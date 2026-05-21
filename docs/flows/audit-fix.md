---
description: 进入审查修复优化闭环——初审→规划→执行→验证→复审完整链路
name: audit-fix
model: deepseek-v4-pro
argument-hint: [审查范围]
allowed-tools: Read, Glob, Grep, Bash, WebFetch, WebSearch, Skill, Agent, Edit, Write
version: "4.4.2"
updated: "2026-05-21"
---

# `/audit-fix` — 审查修复优化闭环

- **命令**：`/audit-fix [审查范围]`
- **类别**：审查
- **说明**：审查→修复→验证闭环——5 阶段完整链路：初审→规划→执行→验证→复审，确保问题修复后质量达标。

## 使用场景

| 场景 | 说明 |
|------|------|
| 代码质量问题修复 | 审查发现的问题需要系统修复 |
| 性能优化闭环 | 性能审计 → 优化实现 → 验证 |
| 安全漏洞修复 | 安全审查 → 修复 → 重审验证 |
| 架构调整后验证 | 架构变更后的全面审查和修复 |

## 关键 Agent

| Agent | 职责 |
|-------|------|
| project-review-expert | 初审：项目全面审查 |
| diff-review-expert | 差异审查 |
| perf-review-expert | 性能审计 |
| change-review-expert | 变更影响审查 |
| remediation-expert | 修复执行 |
| remediation-planner | 修复规划 |
| audit-fix-optimize | 完整闭环编排器（审查→修复→重审） |

## 审查修复优化闭环

## 步骤 0：加载技能 + 注册引擎

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`
   - `Skill("code-review-and-quality")`

2. 注册引擎会话（硬约束——引擎确保各阶段操作权限不可绕过）：
   - `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "full" })`
   - 每个阶段开始调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 允许的操作
   - 关键操作前调用 `gate_check`：审查→`review`，修复→`fix`，Lint→`lint`，构建→`build`

3. 确认进入**审查修复优化闭环模式**。完整链路不可跳过、不可倒置（不可绕过）。

   ### **阶段一：初审**（不可绕过）
   - 界定审查范围，每条 finding 必须有文件/行号、命令输出或文档依据
   - 可并发调用 `project-review-expert`、`diff-review-expert`、`perf-review-expert`、`code-explore-expert` 收集 findings
   - **涉及前端页面/交互的 Bug**：加载 `Skill("browser-testing")`，用 Playwright MCP 工具复现 Bug（browser_navigate→browser_snapshot→复现步骤→browser_take_screenshot 异常状态），复现证据作为 finding 附件
   - 所有只读 Agent 返回后再进入下一阶段

   ### **阶段二：修复/优化规划**（不可绕过）
   - 将 findings 转为可执行修复计划，标注修复顺序、责任方、共享区域唯一责任方
   - 可调用 `remediation-expert` Agent 辅助规划

   ### **阶段三：执行**（不可绕过）
   - 按计划顺序或并发执行；共享区域必须唯一责任方，不得多个 Agent 同时修改

   ### **阶段四：验证**（不可绕过）
   - Lint + Type-check + Build 三项全部通过（失败→回退修复），运行测试确保无回归
   - **涉及前端页面/交互的修复**：用 `agent-browser` CLI 按相同步骤重新操作（open→snapshot -i→复现步骤→screenshot），截图对比修复前后，确认 Bug 不再出现

   ### **阶段五：复审**（不可绕过）
   - 逐项关闭初审 findings，输出关闭矩阵，报告未关闭风险项
   - 可调用 `change-review-expert` Agent

4. 代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

5. **红线**：不跳过初审直接修复；不缺少验证证据就宣称完成；涉及前端页面 Bug 时必须用浏览器复现和验证，不可仅凭代码审查替代；不用硬等待（sleep/wait）替代内容轮询。
