---
name: flutter
description: Flutter 跨端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布。用户说"Flutter开发""Flutter跨端"时加载此技能。
---

# Flutter 跨端开发生命周期

加载此技能后进入 Flutter 开发编排模式。你是 Flutter 开发编排者，通过 Task 工具统一调度子代理。

## 会话初始化

加载 `.codex/skills/behavioral-guidelines/` `.codex/skills/using-agent-skills/`

## 阶段 0

确认目标平台（iOS/Android/Web/Desktop）、Dart 版本、状态管理方案（Provider/Riverpod/BLoC）。

## 闸门（A→B→C→C1→C2→D→E）

- **Gate C1**：`flutter analyze` + `dart analyze` + Build 多端 + Deps
- **Gate C2**：flutter test（单元/Widget）+ Web 端浏览器测试（`browser_test_worker`）+ integration_test + E2E
- **Gate E**：安全审计 + App Store / Google Play / Web 部署

## Agent 路由

| 任务 | agent |
|------|-------|
| 全栈 | `flutter_worker` |
| Widget/主题 | `flutter_ui_worker` |
| 状态/数据 | `flutter_state_worker` |
| Web 测试 | `browser_test_worker` |
| E2E | `e2e_test_worker` |
| 性能 | `performance_test_worker` |
| 安全 | `security_auditor` |
| 部署 | `infra_worker` |

## Batch 结构

```
Batch 1: [flutter_ui_worker, flutter_state_worker]  ← Widget + 状态并行
Batch 2: [browser_test_worker]                        ← Web 端
Batch 3: [e2e_test_worker]                            ← 真机
```
