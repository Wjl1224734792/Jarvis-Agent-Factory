---
description: Android 原生开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布
argument-hint: [Android 需求描述]
version: "4.3.7"
updated: "2026-05-14"
---

# Android 原生开发生命周期

## 步骤 0：加载技能 + 注册引擎

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`

2. 注册引擎会话（硬约束——引擎驱动全流程，不可绕过）：
   - `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "full" })`
   - **每个 Gate 开始时**调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 上下文
   - **生成 Agent 前**调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_impl" })` 验证操作被允许
   - **Gate C1 时**加载 `Skill("code-quality-gate")`，Lint/Type-check/Build 前调用 `gate_check`
   - **每个 Gate 完成后**调用 `mcp__jarvis-engine__gate_enforce` 验证条件，通过后 `mcp__jarvis-engine__advance_gate` 推进
   - **Gate E 时**加载 `Skill("shipping-and-launch")`、`Skill("git-workflow-and-versioning")`、`Skill("finishing-a-development-branch")`

3. 判断需求是否适合流水线。✅ 适合：Kotlin/Compose 页面、ViewModel/StateFlow、Room 数据库、性能优化、Google Play 审核问题修复。

4. 你是 Android 开发编排者。职责：
   - 澄清需求——至少确认 1 个关键假设（最低 SDK 版本、目标架构）
   - 模糊时加载 `idea-refine`；生成 `docs/YYYY-MM-DD/requirements/` 带 `REQ-XXX`
   - Gate A→B-DDD→B-BDD→B-TDD→B1→C→C-impl→C1→C2→D→E 全链路，不可绕过
   - 移动端任务可轻量化 B-DDD/B-BDD/B-TDD（单轮 DDD 分析即可，不需完整三阶段）
   - 通过 Gate C 后按 `parallel_batches` 批量 spawn Android Agent
   - 代码注释语言：中文项目用中文注释

5. Plan Patch 机制：共享组件/模块/导航图变更必须提交 plan patch。

---

## Android Agent 路由

| 层级 | subagent_type |
|------|--------------|
| 全栈实现 | `android-dev-expert` |
| UI/Compose/Material3 | `android-ui-expert` |
| 状态/ViewModel/Room | `android-state-expert` |
| 任务分解（复杂需求） | `task-design` |
| Android 测试 | `android-test-expert` |
| Android 审查 | `android-review-expert` |
| E2E 测试 | `e2e-test-expert` |
| 质量签核 | `qa-review-expert` |
| 性能审计 | `perf-review-expert` |
| 安全审计 | `security-review-expert` |
| 基础设施/CI | `infra-deploy-expert` |
| 只读探索（辅助） | `code-explore-expert`、`external-resource-expert` |

## Gate C：批量并行 spawn

致命错误：planner 返回后你自己去写代码。

1. Read `docs/YYYY-MM-DD/plans/<topic>-plan.md`
2. 提取 `parallel_batches`
3. 每个任务 → 一个 `Agent()` 调用
4. 同 Batch 同一条消息批量发出

**典型 Batch 结构**：
```
Gate B-DDD/B-BDD/B-TDD: [task-design]（复杂需求时触发，简单需求跳过）
Gate C-impl:
  Batch 1: [android-ui-expert, android-state-expert]  ← Compose UI + ViewModel/Room 并行
  Batch 2: [android-dev-expert]                        ← 集成组装
  Batch 3: [e2e-test-expert]                           ← Instrumentation 测试 + Compose UI 测试
```

## Gate C1 代码质量

Android 专项：
- Lint：`./gradlew lint`（零 error）
- Type-check：`./gradlew compileDebugKotlin`
- Build：`./gradlew assembleDebug`
- Deps Audit：`./gradlew dependencyUpdates` + OWASP dependency-check

## Gate C1.5 视觉验证

**移动端任务必须过此门。** 条件：
- 模拟器/真机已启动
- 修改前/后对比截图已附
- 多屏幕尺寸截图已附（small/medium/large）
- 暗色模式截图（如支持）
- 无可见布局问题或 UI 异常（溢出/错位/重组异常）

**通过**：进入 Gate C2

**不通过**：
1. **证据缺失** → 退回实现 Agent 补充截图证据
2. **UI 问题**（溢出/错位/渲染异常）→ 诊断根因，修复源文件，重新截图验证
3. 修复后重新过 Gate C1.5，最多 2 轮；仍不通过 → 标记 `BLOCKED`

## Gate C2 测试

```
全部实现 Batch 完成
  → Gate C1.5 视觉验证通过
  → 步骤 1：spawn android-test-expert（单元测试：JUnit5 + MockK）
  → 步骤 2：spawn e2e-test-expert（Instrumentation 测试 + Compose UI 测试）
     需模拟器/真机；使用 Espresso + Compose Test Rule
  → 全部通过，汇总 docs/YYYY-MM-DD/testing/ → Gate C2 通过
```

**Android 测试要点**：
- 单元测试：JUnit5 + MockK（ViewModel/Repository/UseCase）
- UI 测试：Compose Test Rule + Espresso
- 端到端：模拟器 + UIAutomator

**测试失败回退**：
1. 任一 agent 测试失败 → 分析失败报告，定位需修复的实现 Agent
2. spawn 原 Android 实现 Agent 执行修复（传递测试失败报告），修复后重新跑对应测试
3. 最多 2 轮修复-重测循环；仍不通过 → 标记 `BLOCKED`

## Gate D：评审

```
[可并行] 3 个领域审查专家同时启动（spawn 前 gate_check("review")）：
├── spawn android-review-expert（Android 代码审查：Compose架构/UI/状态/数据层/性能）
├── spawn security-review-expert（安全审计：OWASP Mobile Top 10/CVE/密钥检测）
└── spawn perf-review-expert（性能审计：启动时间/内存/重组次数/包体积）

全部通过后：
└── spawn qa-review-expert（综合签核：REQ追踪/文档/Gate条件，汇聚领域报告）
```

**审查不通过回退**：
1. [BLOCKED] → 立即停止，按领域 spawn 对应实现 Agent 修复，修复后**重新走完整 Gate D**
2. [FIX_REQUIRED] → 按领域回退修复，修复后重 spawn 对应审查 expert + qa-review-expert
3. Android 审查不通过 → spawn 原 Android 实现 Agent（android-dev-expert / android-ui-expert / android-state-expert）
4. 最多 2 轮审查-修复-重审循环；仍不通过 → 标记 `ABORT`

通过后：`advance_gate({ gate: "Gate E" })`

## Gate E 发布

🔴 **前置——质量重检（不可跳过）**：Lint + Type-check + Build + Test 全部重跑通过（Gate D 修复后必须重新验证，失败最多 2 轮修复）

- spawn `security-review-expert`（如 Gate D 未执行）
- spawn `perf-review-expert`（如 Gate D 未执行）
- 加载 `shipping-and-launch` 执行上线检查清单
- Google Play：签名验证、AAB 构建、Play Console 提交
- 国内渠道：应用宝/华为/小米/OPPO/VIVO 加固与分发
- ProGuard/R8 混淆验证、崩溃率监控（Firebase Crashlytics）
- 加载 `git-workflow-and-versioning` 更新 versionCode/versionName
- 上线后监控 30 分钟 → 加载 `finishing-a-development-branch` 归档

## 故障恢复

Agent 失败重试（最多 3 次）、Batch 部分失败仅重试失败任务、Gate 失败回退修复、会话检查点。

向用户确认已进入 Android 开发生命周期模式。

---

## 红线
- 原生代码必须通过平台特定测试——Android instrumentation test 不可跳过
- UI 组件必须考虑多屏幕尺寸——不同分辨率下的布局不可断裂
- 权限请求必须有用户可理解的说明——敏感权限需动态申请
- 不得在主线程进行网络或数据库操作——ANR 是红线
