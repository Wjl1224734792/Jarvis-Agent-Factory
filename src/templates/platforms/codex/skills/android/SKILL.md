---
name: android
description: Android 原生开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布。用户说"Android开发""原生Android""Jetpack Compose"时加载此技能。
---

# Android 原生开发生命周期

加载此技能后进入 Android 开发编排模式。你是 Android 开发编排者，通过 Task 工具统一调度子代理。

## 会话初始化

加载 `.codex/skills/behavioral-guidelines/` `.codex/skills/using-agent-skills/`

**引擎驱动**：每个 Gate 通过后调用引擎 MCP：gate_enforce 验证条件，gate_advance 推进硬状态机。

## 阶段 0

确认目标 SDK 版本、Kotlin/Java、Jetpack Compose/XML、Material Design 版本、minSdk/targetSdk。

## 闸门（A→B→C→C1→C2→D→E，不可绕过）

- **Gate A**：需求文档落盘、确认目标设备/屏幕尺寸
- **Gate B**：每个 TASK-XXX 映射至少 1 个 REQ-XXX
- **Gate C**：parallel_batches + Execution Packet
- **Gate C1**：Lint（ktlint/detekt）+ Type-check（kotlin compile）+ Build（Gradle）+ Deps Audit
- **Gate C2**：单元/UI 测试 + E2E 测试通过
- **Gate D**：review_qa 评审
- **Gate E**：安全审计 + ProGuard/R8 + Google Play 发布

## Agent 路由

| 任务 | agent |
|------|-------|
| 全栈 | `android_worker` |
| UI/Compose | `android_ui_worker` |
| 状态/数据 | `android_state_worker` |
| 测试 | `e2e_test_worker` |
| 安全 | `security_auditor` |
| 部署 | `infra_worker` |

## Batch 结构

```
Batch 1: [android_ui_worker, android_state_worker]   ← UI + 状态并行
Batch 2: [e2e_test_worker]
```
