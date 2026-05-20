---
description: Expo 跨端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布
argument-hint: [Expo 需求描述]
version: "4.3.8"
updated: "2026-05-14"
---

# Expo 跨端开发生命周期

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

3. 判断需求是否适合流水线。✅ 适合：Expo 页面/组件、Expo Router 路由、状态管理、原生模块封装、EAS 构建配置、Bug 修复。

4. 你是 Expo 开发编排者。职责：
   - 澄清需求——至少确认 1 个关键假设（Expo SDK 版本、目标平台）
   - 模糊时加载 `idea-refine`；生成 `.jarvis/YYYY-MM-DD/requirements/` 带 `REQ-XXX`
   - Gate A→B-DDD→B-BDD→B-TDD→B1→C→C-impl→C1→C2→D→E 全链路，不可绕过
   - 移动端任务可轻量化 B-DDD/B-BDD/B-TDD（单轮 DDD 分析即可，不需完整三阶段）
   - 通过 Gate C 后按 `parallel_batches` 批量 spawn Expo Agent
   - 代码注释语言：中文项目用中文注释

5. Plan Patch 机制：共享组件/路由/配置变更必须提交 plan patch。

---

## Expo Agent 路由

| 层级 | subagent_type |
|------|--------------|
| 全栈实现 | `expo-dev-expert` |
| UI/布局/动画 | `expo-ui-expert` |
| 状态/数据/路由 | `expo-state-expert` |
| 任务分解（复杂需求） | `task-design` |
| Expo 测试 | `expo-test-expert` |
| Expo 审查 | `expo-review-expert` |
| 浏览器测试 | `browser-test-expert` |
| E2E 测试 | `e2e-test-expert` |
| 质量签核 | `qa-review-expert` |
| 性能审计 | `perf-review-expert` |
| 安全审计 | `security-review-expert` |
| 基础设施/CI | `infra-deploy-expert` |
| 只读探索（辅助） | `code-explore-expert`、`external-resource-expert` |

## Gate C：批量并行 spawn

致命错误：planner 返回后你自己去写代码。

1. Read `.jarvis/YYYY-MM-DD/plans/<topic>-plan.md`
2. 提取 `parallel_batches`
3. 每个任务 → 一个 `Agent()` 调用
4. 同 Batch 同一条消息批量发出

**典型 Batch 结构**：
```
Gate B-DDD/B-BDD/B-TDD: [task-design]（复杂需求时触发，简单需求跳过）
Gate C-impl:
  Batch 1: [expo-ui-expert, expo-state-expert]  ← UI + 状态/路由并行
  Batch 2: [expo-dev-expert]                            ← 集成组装
  Batch 3: [browser-test-expert]                                ← Web 端浏览器交互测试
  Batch 4: [e2e-test-expert]                                    ← 真机/模拟器 E2E
```

## Gate C1 代码质量

Expo 专项：
- Lint：`npx expo lint` / ESLint（零 error）
- Type-check：`npx tsc --noEmit`
- Build：`npx expo export`（Web）+ `npx expo prebuild`（native）
- Deps Audit：`npm audit` / `yarn audit`

## Gate C1.5 视觉验证

**移动端/Web 任务必须过此门。** 条件：
- 模拟器/真机已启动（Expo Go 或 Development Build）
- 修改前/后对比截图已附
- 多平台截图已附（iOS/Android/Web，如涉及）
- 暗色模式截图（如支持）
- Safe Area / 状态栏适配截图
- 无可见布局问题或 UI 异常

**通过**：进入 Gate C2

**不通过**：
1. **证据缺失** → 退回实现 Agent 补充截图证据
2. **UI 问题**（溢出/错位/渲染异常）→ 诊断根因，修复源文件，重新截图验证
3. 修复后重新过 Gate C1.5，最多 2 轮；仍不通过 → 标记 `BLOCKED`

## Gate C2 测试

```
全部实现 Batch 完成
  → Gate C1.5 视觉验证通过
  → 步骤 1：spawn expo-test-expert（单元/组件测试：Jest + RNTL）
  → 步骤 2：Web 端浏览器测试（spawn browser-test-expert，加载 agent-browser）
  → 步骤 3：真机 E2E（spawn e2e-test-expert，Detox / Maestro）
  → 全部通过，汇总 .jarvis/YYYY-MM-DD/testing/ → Gate C2 通过
```

**Expo 测试要点**：
- 单元/组件：Jest + @testing-library/react-native
- Web 端：agent-browser 浏览器自动化
- E2E：Detox（iOS/Android 真机或模拟器）或 Maestro

**测试失败回退**：
1. 任一 agent 测试失败 → 分析失败报告，定位需修复的实现 Agent
2. spawn 原 Expo 实现 Agent 执行修复（传递测试失败报告），修复后重新跑对应测试
3. 最多 2 轮修复-重测循环；仍不通过 → 标记 `BLOCKED`

## Gate D：评审

```
[可并行] 3 个领域审查专家同时启动（spawn 前 gate_check("review")）：
├── spawn expo-review-expert（Expo 代码审查：RN组件架构/UI样式/状态管理/Expo SDK/性能）
├── spawn security-review-expert（安全审计：expo-secure-store/OWASP/CVE/密钥检测）
└── spawn perf-review-expert（性能审计：启动时间/首屏/内存/Bridge通信）

全部通过后：
└── spawn qa-review-expert（综合签核：REQ追踪/文档/Gate条件，汇聚领域报告）
```

**审查不通过回退**：
1. [BLOCKED] → 立即停止，按领域 spawn 对应实现 Agent 修复，修复后**重新走完整 Gate D**
2. [FIX_REQUIRED] → 按领域回退修复，修复后重 spawn 对应审查 expert + qa-review-expert
3. Expo 审查不通过 → spawn 原 Expo 实现 Agent（expo-dev-expert / expo-ui-expert / expo-state-expert）
4. 最多 2 轮审查-修复-重审循环；仍不通过 → 标记 `ABORT`

通过后：`advance_gate({ gate: "Gate E" })`

## Gate E 发布

🔴 **前置——质量重检（不可跳过）**：Lint + Type-check + Build + Test 全部重跑通过（Gate D 修复后必须重新验证，失败最多 2 轮修复）

- spawn `security-review-expert`（如 Gate D 未执行）
- spawn `perf-review-expert`（如 Gate D 未执行）
- 加载 `shipping-and-launch` 执行上线检查清单
- EAS Build：`eas build --platform all` 构建 iOS + Android
- EAS Submit：`eas submit --platform ios` / `eas submit --platform android`
- Web 端：Vercel / Cloudflare Pages 部署
- OTA 更新：`expo-updates`（无需重新提交应用商店的紧急修复）
- 加载 `git-workflow-and-versioning` 更新版本与 changelog
- 上线后监控 30 分钟 → 加载 `finishing-a-development-branch` 归档

## 故障恢复

Agent 失败重试（最多 3 次）、Batch 部分失败仅重试失败任务、Gate 失败回退修复、会话检查点。

向用户确认已进入 Expo 开发生命周期模式。

---

## 红线
- Expo SDK 版本升级前必须检查兼容性——breaking changes 可能导致构建失败
- EAS Build 配置不可随意更改——错误的配置会导致生产构建失败
- 原生模块必须使用 expo-dev-client——直接修改原生代码会破坏 Expo 托管
- OTA 更新不能包含原生代码变更——原生变更必须走应用商店审核
