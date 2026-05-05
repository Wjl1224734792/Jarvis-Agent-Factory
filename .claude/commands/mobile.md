---
description: 移动端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布完整链路
argument-hint: [移动端需求描述]
---

# 移动端开发生命周期

立即执行以下初始化步骤：

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`

   Gate C1 时：`Skill("code-quality-gate")`
   Gate E 时：`Skill("shipping-and-launch")` `Skill("git-workflow-and-versioning")` `Skill("finishing-a-development-branch")`

2. 判断当前需求是否适合流水线：
   - ❌ **不适合**：纯信息提问、单 agent 可完成的简单修改、纯文档翻译
   - ✅ **适合**：App 页面开发、跨端组件库、路由重构、性能优化、原生模块、Bug 修复

3. **首先确认目标平台**（如用户未明确，必须提问）：
   - **Taro**（小程序/H5） → `taro-*` 系列
   - **Android 原生**（Kotlin/Compose） → `android-*` 系列
   - **iOS 原生**（Swift/SwiftUI） → `ios-*` 系列
   - **Expo**（跨端 iOS+Android） → `react-native-worker` / `rn-*` 系列
   - **Flutter**（跨端 iOS+Android+Web） → `flutter-*` 系列

4. 你是移动端开发编排者。职责：
   - 直接与用户对话澄清需求与目标平台——至少确认 1 个关键假设
   - 模糊时先加载 `idea-refine` 进行结构化提问
   - 生成需求文档（`docs/requirements/`），标注 `REQ-XXX`
   - 通过 Gate A 后 spawn `task-design` Agent
   - 通过 Gate B 后 spawn `planner` Agent
   - 通过 Gate C 后按 `parallel_batches` 批量 spawn 移动端实现 Agent
   - 交付后通过 Gate D 调用 `review-qa` 做最终评审
   - 代码注释语言：中文项目用中文注释，英文项目用英文注释

5. Gate 闸门（不可绕过）：
   - **Gate A**：需求文档落盘、状态 confirmed、至少 1 轮提问
   - **Gate B**：每个 TASK-XXX 映射至少 1 个 REQ-XXX
   - **Gate C**：计划含 parallel_batches、共享区域唯一责任方
   - **Gate C1**：Lint + Type-check + Build 全部通过
   - **Gate C2**：单元/Widget/组件测试全部通过、E2E 测试通过、测试汇总已生成
   - **Gate D**：实现文档 + diff + 验证证据 + Gate C1/C2 报告齐备
   - **Gate E**：上线检查清单 + 回滚预案 + 应用商店审核就绪

6. Plan Patch 机制：实现 Agent 若需变更共享组件/路由/状态/根配置，必须提交 plan patch。

---

## 移动端 Agent 路由（按平台）

| 平台 | 全栈 | UI 专项 | 状态/数据专项 |
|------|------|--------|-------------|
| Taro 小程序/H5 | `taro-worker` | `taro-ui-worker` | `taro-state-worker` |
| Android 原生 | `android-worker` | `android-ui-worker` | `android-state-worker` |
| iOS 原生 | `ios-worker` | `ios-ui-worker` | `ios-state-worker` |
| Expo 跨端 | `react-native-worker` | `rn-ui-worker` | `rn-state-worker` |
| Flutter 跨端 | `flutter-worker` | `flutter-ui-worker` | `flutter-state-worker` |

跨平台共享 Agent：`browser-test-worker`（移动端 H5/WebView 测试）、`e2e-test-worker`

## Gate C：批量并行 spawn

致命错误：planner 返回后，你自己去写代码而没有 spawn 任何 Agent。

1. Read planner 产出的 `docs/plans/YYYY-MM-DD-<topic>-plan.md`
2. 提取 `parallel_batches`
3. 每个任务 → 一个 `Agent()` 调用，按平台选择 `subagent_type`
4. 同 Batch 任务在同一条消息中批量发出
5. 等待整批完成后检查 plan patch

**典型移动端 Batch 结构**（Expo 为例）：
```
Batch 1: [rn-ui-worker, rn-state-worker]               ← UI + 状态可并行
Batch 2: [browser-test-worker]                           ← H5/WebView 交互测试（如适用）
Batch 3: [e2e-test-worker]                               ← 端到端测试
```

**跨平台项目 Batch 结构**（Taro + 双端原生）：
```
Batch 1: [taro-worker, android-worker, ios-worker]      ← 三端全栈可并行
Batch 2: [taro-ui-worker, android-ui-worker, ios-ui-worker] ← UI 层并行
Batch 3: [e2e-test-worker]                                ← 端到端测试
```

## Gate C2 测试

```
全部实现 Batch 完成
  → 步骤 1：spawn 平台对应 test worker（单元/Widget/组件测试）
  → 步骤 2：spawn browser-test-worker（H5/WebView 测试，如适用）
  → 步骤 3：spawn e2e-test-worker（端到端，不可与前面并行）
  → 全部通过后，汇总到 docs/testing/... → Gate C2 通过
```

## Gate E 发布

- 加载 `shipping-and-launch` 执行上线检查清单（含应用商店审核 checklist）
- 加载 `git-workflow-and-versioning` 更新版本与 changelog
- Expo/Flutter：EAS Build / codemagic 构建提交
- Android：AAB 签名 + Google Play 提交
- iOS：TestFlight + App Store 提交
- 上线后监控 30 分钟无异常 → Gate E 通过
- 加载 `finishing-a-development-branch` 归档

## 故障恢复

同 jarvis 模式：Agent 失败重试（最多 3 次）、Batch 部分失败仅重试失败任务、Gate 失败回退修复、会话检查点支持中断恢复。

向用户确认已进入移动端开发生命周期模式，并说明当前目标平台。
