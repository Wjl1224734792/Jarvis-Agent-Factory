---
description: 浏览器自动化——agent-browser + Playwright MCP 混合模式：精确获取 + 稳定执行
name: browser
model: inherit
argument-hint: "[URL 或功能描述]"
tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Skill", "AskUserQuestion", "Agent", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__gate_enforce", "mcp__jarvis-engine__gate_jump"]
---

# 浏览器自动化

> 默认探索本地 Web 面板(127.0.0.1:3456)，也可传入 URL。
> 若需修复已知 Bug 并用浏览器复现，请使用 `/bug-fix`。

## 模式选择

spawn `browser-test-expert` 执行浏览器交互测试——agent-browser (精确获取页面结构) + Playwright MCP (稳定执行交互操作)。

## 步骤 0：加载技能 + 注册引擎

加载：
- `Skill("behavioral-guidelines")`
- `Skill("browser-testing")`

注册引擎：`mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "auto" })`
使用 `mcp__jarvis-engine__gate_jump({ gate: "Gate C2" })`
获取当前 Gate 上下文：`mcp__jarvis-engine__pipeline_guide()`
生成 Agent 前调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_test" })`

产物输出目录: `.jarvis/YYYY-MM-DD/testing/`

## 步骤 1：确认探索范围

1. 确认目标 URL（默认 `http://127.0.0.1:3456`）
2. **explore 模式** — 确认探索范围与目标
3. **test 模式** — 加载已有测试用例文档

## 步骤 2：spawn browser-test-expert

```
Agent(
  description="browser interaction test session",
  subagent_type="browser-test-expert",
  prompt="<测试用例、URL、报告要求>"
)
```

## 步骤 3：汇总报告

输出到 `.jarvis/YYYY-MM-DD/testing/<topic>-browser-report.md`

## Gate C2 完成

汇总报告完成后：
- `mcp__jarvis-engine__gate_enforce` — 验证 Gate C2 条件
- 通过后 `mcp__jarvis-engine__advance_gate` — 推进到下一 Gate（或结束流水线）

## 步骤 4：修复循环

发现 P0/P1 Bug → 调用 `/bug-fix` → 重新探索/test

## 红线
- 仅控制本地浏览器，不得访问未经授权的生产环境
- 探索结果需附截图证据
- 未经确认的发现标记为"疑似"而非"确认"
