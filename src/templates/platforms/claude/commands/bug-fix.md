---
description: Bug 修复闭环——浏览器复现→定位根因→修复→浏览器验证，涉及前端/页面交互类 Bug 的完整闭环
name: bug-fix
model: inherit
argument-hint: [Bug 描述、URL 或复现步骤]
tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Skill", "AskUserQuestion", "Agent", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_jump", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__gate_enforce", "mcp__jarvis-engine__advance_gate", "mcp__playwright__browser_navigate", "mcp__playwright__browser_snapshot", "mcp__playwright__browser_click", "mcp__playwright__browser_type", "mcp__playwright__browser_press_key", "mcp__playwright__browser_take_screenshot", "mcp__playwright__browser_console_messages", "mcp__playwright__browser_network_requests", "mcp__playwright__browser_wait_for"]
---

# Bug 修复闭环（浏览器复现 → 修复 → 验证）

立即执行以下步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("browser-testing")
```

**引擎会话注册**（硬约束——引擎确保修复操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "auto" })`
- 使用 `mcp__jarvis-engine__gate_jump({ gate: "Gate C2" })`
- 使用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 上下文
- 修复代码前调用 `mcp__jarvis-engine__gate_check({ operation: "fix" })`
- 质量检查（Lint/Type-check/Build）作为修复验证的一部分执行，非独立操作；修复前调用 `mcp__jarvis-engine__gate_check({ operation: "fix" })`
- 修复完成后 `mcp__jarvis-engine__gate_enforce` 验证当前 Gate 条件

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

产物输出目录: `.jarvis/YYYY-MM-DD/bug-fix/`

### 步骤 0：并行信息收集（同一消息同时发出）
Agent(code-explore-expert, "根据Bug描述探索相关代码区域：定位可能的根因文件、分析调用链、检查相关测试用例和最近的git变更")

## 步骤 1：收集 Bug 信息（不可绕过）
向用户确认（如未提供）：
- **Bug 描述**：预期行为 vs 实际行为
- **影响页面/URL**
- **复现步骤**：具体操作流程
- **环境信息**：浏览器、设备、登录状态
- **严重程度**：P0 阻塞 / P1 功能受损 / P2 轻微

输出 Bug Report 摘要，等待用户确认。

## 步骤 2：浏览器复现——捕获证据（不可绕过）

使用 agent-browser (精确获取页面结构) + Playwright MCP (稳定执行交互操作) 混合模式。

### 2.1 加载文档并初始化
```
# agent-browser 打开页面并获取结构
agent-browser open <url>
agent-browser snapshot -i               # 获取页面结构和 @ref
```

### 2.2 逐步复现
```
# agent-browser 获取页面快照确认状态
agent-browser snapshot -i
# Playwright MCP 执行交互操作（更稳定）
browser_click / browser_type / browser_press_key
# 每步交互后 agent-browser snapshot -i 确认页面状态变化
```

### 2.3 异常发生时立即截图和收集证据
```
browser_take_screenshot                 # 截图
browser_console_messages --level error  # JS 错误
browser_network_requests                # 失败的网络请求
```

### 2.4 边界探测
尝试至少 1 个变体操作确认 Bug 触发边界。

**复现成功 → 进入步骤 3**
调用 `mcp__jarvis-engine__advance_gate` 推进到下一 Gate
**复现失败 → 回问用户补充复现条件，最多 2 轮**

## 步骤 3：定位根因（不可绕过）
1. 从页面反查代码，定位前端组件文件
2. 追踪数据流：状态管理、API 调用、数据处理逻辑
3. 检查边界条件：空值、未定义、异常数据、竞态条件

输出根因分析：
```
## Root Cause Analysis
- 故障文件：<文件路径>:<行号>
- 故障类型：逻辑错误 / 状态异常 / API 数据问题 / 样式 Bug / 兼容性
- 直接原因：<一句话>
- 影响范围：<受影响的组件/页面/功能>
- 修复方案：<具体的代码修改方案>
```

根因分析完成后调用 `mcp__jarvis-engine__advance_gate` 推进到下一 Gate

## 步骤 4：修复代码（不可绕过）
按最小改动原则修复：只改必须改的文件，遵循现有代码风格，不引入新依赖或重构无关代码。
修复后立即自查：改动是否正确、是否影响其他功能。

修复完成后调用 `mcp__jarvis-engine__advance_gate` 推进到下一 Gate

## 步骤 5：代码质量验证——Lint + Type-check + Build（不可绕过）
```
1. Lint（eslint/ruff/golangci-lint）— 必须 0 error
2. Type-check（tsc --noEmit/mypy/cargo check）— 必须 0 error
3. Build（npm run build/cargo build/go build）— 必须成功
```
**三项全部通过 → 进入步骤 6；任一失败 → 修复后重新执行失败的检查项**

## 步骤 6：浏览器验证——确认修复（不可绕过）

使用 agent-browser + Playwright MCP 混合模式，按**完全相同复现步骤**重新操作：

```
# agent-browser 打开页面并获取结构
agent-browser open <url>
agent-browser snapshot -i
# Playwright MCP 执行相同交互操作序列
browser_click / browser_type / browser_press_key
# 修复后截图
browser_take_screenshot
# 确认无新增错误
browser_console_messages --level error
```

**验证通过标准：**
- 原异常操作现在产生预期结果（agent-browser snapshot 确认页面状态）
- 截图对比修复前后，异常已消除
- 控制台无新增错误（`browser_console_messages --level error` 确认）
- 未引入新问题（相关功能抽查通过）

**通过 → 进入步骤 7；失败 → 回到步骤 3 重新分析（最多 2 轮回退）**
验证通过后调用 `mcp__jarvis-engine__advance_gate` 推进到下一 Gate

## 步骤 7：关闭 Bug
输出 `.jarvis/YYYY-MM-DD/bug-fix/<bug-title>-bug-fix-report.md`：
```markdown
# Bug 修复报告
## Bug 信息
- 描述、严重度、影响页面
## 复现证据
- 复现步骤、修复前截图、控制台错误
## 根因分析
- 故障文件:行号、故障类型、直接原因
## 修复内容
- 修改文件、变更摘要
## 验证证据
- 相同步骤复测结果、修复后截图、修复前后对比
## 回归风险
- 低 / 中 / 高，建议补充的测试用例
```

## 闭环图示
```
Bug Report → 浏览器复现(agent-browser+Playwright MCP) → 截图/证据 → 定位根因 → 修复代码
                                                                   ↓
                                                   Lint + Type-check + Build
                                                    ↓                ↓
                                               三项通过          任一失败
                                                    ↓                ↓
                                          浏览器验证(agent-browser+Playwright MCP)   回到修复代码
                          ↓           ↓
                     Bug 不再出现  Bug 仍存在
                          ↓           ↓
                      ✅ 关闭     回到定位根因（最多 2 轮回退）
```

**最多 2 轮回退**，第 3 轮仍失败则标记为 BLOCKED，不修改代码，输出已有证据和分析，请求人工介入。

## 红线
- 不复现就直接改代码（没有证据的修复 = 猜测）
- 复现成功不截图（丢失关键证据）
- 不定位根因直接打补丁（治标不治本）
- 修改代码后不用浏览器验证（无法确认修复生效）
- 修复范围超出 Bug 本身（夹带无关改动）
- 在浏览器中执行破坏性操作（删除数据、发起支付等）
- 用 sleep/wait 硬等待替代 `browser_wait_for` 轮询确认页面状态
