---
name: expo
description: Expo 跨端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布。用户说"Expo开发""React Native Expo"时加载此技能。
---

# Expo 跨端开发生命周期

加载此技能后进入 Expo 开发编排模式。你是 Expo 开发编排者，通过 Task 工具统一调度子代理。

## 会话初始化

加载 `.codex/skills/behavioral-guidelines/` `.codex/skills/using-agent-skills/`

**引擎驱动**：每个 Gate 通过后调用引擎 MCP：gate_enforce 验证条件，gate_advance 推进硬状态机。

## 阶段 0

确认 Expo SDK 版本、目标平台（iOS/Android/Web）、Expo Router、状态管理方案。

## 闸门（A→B→C→C1→C2→D→E）

- **Gate C1**：`npx expo lint` + `tsc --noEmit` + `npx expo export` + Deps
- **Gate C2**：Jest + Web 端浏览器测试（`browser_test_worker`）+ Detox/Maestro E2E
- **Gate E**：安全审计 + EAS Build/Submit + OTA 更新（expo-updates）

## Agent 路由

| 任务 | agent |
|------|-------|
| 全栈 | `react_native_worker` |
| UI/样式 | `rn_ui_worker` |
| 状态/路由 | `rn_state_worker` |
| Web 测试 | `browser_test_worker` |
| E2E | `e2e_test_worker` |
| 性能 | `performance_test_worker` |
| 安全 | `security_auditor` |
| 部署 | `infra_worker` |

## Batch 结构

```
Batch 1: [rn_ui_worker, rn_state_worker]       ← UI + 状态并行
Batch 2: [browser_test_worker]                   ← Web 端
Batch 3: [e2e_test_worker]                       ← 真机
```
