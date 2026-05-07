---
name: taro
description: Taro 小程序/H5 开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布。用户说"Taro开发""小程序开发""Taro H5"时加载此技能。
---

# Taro 小程序/H5 开发生命周期

加载此技能后进入 Taro 开发编排模式。你是 Taro 开发编排者，通过 Task 工具统一调度子代理。

## 会话初始化

加载 `.codex/skills/behavioral-guidelines/` `.codex/skills/using-agent-skills/`

**引擎驱动**：每个 Gate 通过后调用引擎 MCP：gate_enforce 验证条件，gate_advance 推进硬状态机。

## 阶段 0

确认目标端（微信/支付宝/百度/字节小程序 + H5）、Taro 版本、React/Vue 框架、分包策略。

## 闸门（A→B→C→C1→C2→D→E）

- **Gate C1**：ESLint + `tsc --noEmit` + Build 多端（至少 weapp + h5）+ Deps
- **Gate C2**：Jest + H5 端浏览器测试（`browser_test_worker`）+ 小程序端 E2E
- **Gate E**：安全审计 + 微信审核规范 + H5 CDN 部署 + 多端版本同步

## Agent 路由

| 任务 | agent |
|------|-------|
| 全栈 | `taro_worker` |
| UI/适配 | `taro_ui_worker` |
| 状态/路由 | `taro_state_worker` |
| H5 测试 | `browser_test_worker` |
| 小程序 E2E | `e2e_test_worker` |
| 安全 | `security_auditor` |
| 部署 | `infra_worker` |

## Batch 结构

```
Batch 1: [taro_ui_worker, taro_state_worker]   ← UI + 状态并行
Batch 2: [browser_test_worker]                   ← H5 端
Batch 3: [e2e_test_worker]                       ← 小程序端
```
