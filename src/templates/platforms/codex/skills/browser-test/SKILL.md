---
name: browser-test
description: 浏览器自动化测试闭环——先写用例，再操作浏览器执行，记录结果，失败则驱动修复重测。用户说"浏览器测试""页面测试""UI测试"时加载此技能。
---

# 浏览器自动化测试闭环

加载此技能后进入浏览器测试模式。先写用例→执行→截图→报告→失败驱动修复闭环。

## 加载技能
**引擎驱动**：每个 Gate 通过后调用引擎 MCP：gate_enforce 验证条件，gate_advance 推进硬状态机。

`.codex/skills/behavioral-guidelines/` `.codex/skills/agent-browser/` `.codex/skills/browser-testing/`

## 步骤 1：确认测试范围

- 目标 URL、功能范围、关键用户路径、已知风险点

## 步骤 2：编写测试用例

输出到 `docs/testing/YYYY-MM-DD-<topic>-browser-test-cases.md`。
每条用例：编号（TC-001 起）、前置条件、操作步骤、预期结果、验证方式、优先级（P0/P1/P2）。

## 步骤 3：逐条执行

使用 `agent-browser` CLI：

```bash
agent-browser skills get core
agent-browser open <url>
agent-browser snapshot -i           # 获取 @e1, @e2 引用
agent-browser click @eN              # 交互
agent-browser fill @eN "text"        # 填写
agent-browser screenshot tc-NNN.png  # 截图留证
agent-browser get text @eN           # 验证文本
agent-browser console                # 检查 JS 错误
agent-browser network requests       # 检查网络
```

浏览器复用登录态：`agent-browser --profile "Default" open <url>`
响应式：`agent-browser set viewport 375 812` / `768 1024` / `1280 800`

## 步骤 4：汇总报告

输出到 `docs/testing/YYYY-MM-DD-<topic>-browser-test-report.md`。

## 步骤 5：闭环

- 全部通过 → 闭环完成
- 存在失败 → Browser Test Findings → `review-fix-optimize` 技能 → 重测失败用例
- 最多 2 轮，第 3 轮仍失败标记 BLOCKED

## 红线

- 不写用例直接操作浏览器
- 失败不截图、不记录控制台/网络错误
- 跳过修复闭环
- 用硬等待替代 `agent-browser wait` 轮询
