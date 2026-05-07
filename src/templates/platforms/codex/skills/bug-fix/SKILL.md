---
name: bug-fix
description: Bug 修复闭环——浏览器复现→定位根因→修复→浏览器验证。用户说"修复Bug""Bug修复""浏览器复现"时加载此技能。
---

# Bug 修复闭环

加载此技能后进入 Bug 修复模式：浏览器复现→定位根因→修复→代码质量→浏览器验证→关闭。

## 加载技能
**引擎驱动**：每个 Gate 通过后调用引擎 MCP：gate_enforce 验证条件，gate_advance 推进硬状态机。

`.codex/skills/behavioral-guidelines/` `.codex/skills/agent-browser/` `.codex/skills/browser-testing/`

## 步骤 1：收集 Bug 信息

Bug 描述、影响页面/URL、复现步骤、环境信息、严重程度（P0/P1/P2）。输出 Bug Report 摘要确认。

## 步骤 2：浏览器复现

```bash
agent-browser skills get core
agent-browser open <url> --headed
agent-browser snapshot -i
# 按复现步骤操作
agent-browser click @eN / fill @eN "text" / press "Enter"
# 异常时：
agent-browser screenshot bug-repro.png
agent-browser console
agent-browser network requests
```

## 步骤 3：定位根因

从页面反查代码→追踪数据流→检查边界条件。输出 Root Cause Analysis（故障文件:行号/故障类型/直接原因/影响范围/修复方案）。

## 步骤 4：修复代码

最小改动原则，修复后自查。

## 步骤 5：代码质量验证

Lint + Type-check + Build — 必须三项全部通过。

## 步骤 6：浏览器验证

按相同复现步骤重新操作，截图对比修复前后，确认 Bug 不再出现、控制台无新增错误、相关功能无回归。

## 步骤 7：关闭 Bug

输出 `docs/bug-fix/YYYY-MM-DD-<bug-title>-bug-fix-report.md`（Bug 信息/复现证据/根因分析/修复内容/验证证据/回归风险）。

## 红线

- 不复现直接改代码
- 复现不截图
- 不定位根因打补丁
- 修复后不用浏览器验证
- 用硬等待替代 `agent-browser wait`
