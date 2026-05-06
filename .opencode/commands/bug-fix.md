---
description: Bug 修复闭环——浏览器复现→定位根因→修复→浏览器验证，涉及前端/页面交互类 Bug 的完整闭环
argument-hint: [Bug 描述、URL 或复现步骤]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent
---

# Bug 修复闭环（浏览器复现 → 修复 → 验证）

立即执行以下步骤：

## 步骤 0：加载技能
```
Skill("behavioral-guidelines")
Skill("agent-browser")
```

## 步骤 1：收集 Bug 信息（不可绕过）
向用户确认（如未提供）。

## 步骤 2：浏览器复现——捕获证据（不可绕过）

使用 `agent-browser` CLI 严格按复现步骤操作：
```bash
agent-browser skills get core
agent-browser open <url>
agent-browser snapshot -i
# 按复现步骤逐步交互
agent-browser click @eN / fill @eN "text" / press "Enter"
# 异常时截图
agent-browser screenshot bug-repro.png
agent-browser console
agent-browser network requests
```

## 步骤 3：定位根因（不可绕过）

## 步骤 4：修复代码（不可绕过）

## 步骤 5：代码质量验证——Lint + Type-check + Build（不可绕过）

## 步骤 6：浏览器验证——确认修复（不可绕过）
```bash
agent-browser open <url>
agent-browser snapshot -i
# 严格按相同步骤操作
agent-browser screenshot fix-verify.png
agent-browser console
```

## 步骤 7：关闭 Bug
输出 `docs/bug-fix/YYYY-MM-DD-<bug-title>-bug-fix-report.md`

**最多 2 轮回退**，第 3 轮仍失败则标记为 BLOCKED。

## 红线
- 不复现就直接改代码
- 复现成功不截图
- 不定位根因直接打补丁
- 修改代码后不用浏览器验证
- 用 sleep/wait 硬等待替代 `agent-browser wait` 轮询确认页面状态
