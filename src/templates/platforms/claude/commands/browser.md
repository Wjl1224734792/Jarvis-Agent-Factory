---
description: 浏览器自动化——自由探索发现 Bug 或按测试用例逐条执行验证
name: browser
model: deepseek-v4-pro
effort: max
argument-hint: "[--mode explore|test] [URL 或功能描述]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent
version: "4.3.8"
updated: "2026-05-20"
---

# 浏览器自动化

> 默认探索本地 Web 面板(127.0.0.1:3456)，也可传入 URL。
> 若需修复已知 Bug 并用浏览器复现，请使用 `/bug-fix`。

## 模式选择

| 模式 | 说明 | Agent |
|------|------|-------|
| `explore` | 自主探索——browser-use 自主浏览 → 自动发现 Bug → 出报告 | `browser-use-expert` |
| `test` | 结构化测试——按预先编写的测试用例逐条执行验证 → 出报告 | `browser-use-expert` |

## 步骤 0：加载技能 + 注册引擎

加载：
- `Skill("behavioral-guidelines")`
- `Skill("browser-testing")`
- `Skill("browser-use")`

注册引擎：`mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "lite" })`
使用 `mcp__jarvis-engine__gate_jump({ gate: "Gate C2" })`

## 步骤 1：确认探索范围

1. 确认目标 URL（默认 `http://127.0.0.1:3456`）
2. **explore 模式** — 确认探索范围与目标
3. **test 模式** — 加载已有测试用例文档

## 步骤 2：spawn browser-use-expert

```
Agent(
  description="{explore|test} browser session",
  subagent_type="browser-use-expert",
  prompt="<探索目标/测试用例、URL、报告要求>"
)
```

## 步骤 3：汇总报告

输出到 `.jarvis/YYYY-MM-DD/testing/<topic>-browser-report.md`

## 步骤 4：修复循环

发现 P0/P1 Bug → 调用 `/bug-fix` → 重新探索/test

## 红线
- 仅控制本地浏览器，不得访问未经授权的生产环境
- 探索结果需附截图证据
- 未经确认的发现标记为"疑似"而非"确认"
