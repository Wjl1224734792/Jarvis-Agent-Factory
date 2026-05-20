---
description: Taro 小程序/H5 开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布
argument-hint: [Taro 需求描述]
version: "4.3.8"
updated: "2026-05-14"
---

# Taro 小程序/H5 开发生命周期

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

3. 判断需求是否适合流水线。✅ 适合：Taro 页面/组件、多端适配、状态管理、性能优化、小程序审核问题修复。

4. 你是 Taro 开发编排者。职责：
   - 澄清需求——至少确认 1 个关键假设（目标端：微信/支付宝/百度/字节小程序 + H5）
   - 模糊时加载 `idea-refine`；生成 `.jarvis/YYYY-MM-DD/requirements/` 带 `REQ-XXX`
   - Gate A→B-DDD→B-BDD→B-TDD→B1→C→C-impl→C1→C2→D→E 全链路，不可绕过
   - 小程序任务可轻量化 B-DDD/B-BDD/B-TDD（单轮 DDD 分析即可，不需完整三阶段）
   - 通过 Gate C 后按 `parallel_batches` 批量 spawn Taro Agent
   - 代码注释语言：中文项目用中文注释

5. Plan Patch 机制：共享组件/配置/路由变更必须提交 plan patch。

---

## Taro Agent 路由

| 层级 | subagent_type |
|------|--------------|
| 全栈实现 | `taro-dev-expert` |
| UI/布局/多端样式 | `taro-ui-expert` |
| 状态/数据/路由 | `taro-state-expert` |
| 任务分解（复杂需求） | `task-design` |
| Taro 测试 | `taro-test-expert` |
| Taro 审查 | `taro-review-expert` |
| 浏览器测试（H5） | `browser-test-expert` |
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
  Batch 1: [taro-ui-expert, taro-state-expert]  ← UI + 状态并行
  Batch 2: [taro-dev-expert]                     ← 集成组装
  Batch 3: [browser-test-expert]                 ← H5 端浏览器测试
  Batch 4: [e2e-test-expert]                     ← 真机/模拟器 E2E
```

## Gate C1 代码质量

Taro 专项：
- Lint：`npx eslint . --ext .ts,.tsx`（零 error）
- Type-check：`npx tsc --noEmit`
- Build：`npx taro build --type weapp`（微信小程序）+ `npx taro build --type h5`（H5）
- Deps Audit：`npm audit` / `yarn audit`

## Gate C1.5 视觉验证

**小程序/H5 任务必须过此门。** 条件：
- 微信开发者工具已启动（小程序）+ 浏览器已启动（H5）
- 修改前/后对比截图已附
- 多端截图已附（H5 + 微信小程序，至少两端）
- 多屏幕尺寸截图已附（H5：mobile/tablet/desktop）
- 暗色模式截图（如支持）
- 无可见布局问题或 UI 异常

**通过**：进入 Gate C2

**不通过**：
1. **证据缺失** → 退回实现 Agent 补充截图证据
2. **UI 问题**（溢出/错位/端差异）→ 诊断根因，修复源文件，重新截图验证
3. 修复后重新过 Gate C1.5，最多 2 轮；仍不通过 → 标记 `BLOCKED`

## Gate C2 测试

```
全部实现 Batch 完成
  → Gate C1.5 视觉验证通过
  → 步骤 1：spawn taro-test-expert（单元/组件测试：Jest）
  → 步骤 2：H5 端浏览器测试（spawn browser-test-expert，加载 agent-browser）
  → 步骤 3：小程序端 E2E（spawn e2e-test-expert，微信开发者工具 CLI）
  → 全部通过，汇总 .jarvis/YYYY-MM-DD/testing/ → Gate C2 通过
```

**小程序测试要点**：
- 微信开发者工具 CLI：`cli open --project` + 自动化操作
- H5 端：agent-browser 浏览器自动化
- 多端适配验证：至少覆盖微信 + H5 两端

**测试失败回退**：
1. 任一 agent 测试失败 → 分析失败报告，定位需修复的实现 Agent
2. spawn 原 Taro 实现 Agent 执行修复（传递测试失败报告），修复后重新跑对应测试
3. 最多 2 轮修复-重测循环；仍不通过 → 标记 `BLOCKED`

## Gate D：评审

```
[可并行] 3 个领域审查专家同时启动（spawn 前 gate_check("review")）：
├── spawn taro-review-expert（Taro 代码审查：组件架构/多端适配/UI样式/状态管理/性能）
├── spawn security-review-expert（安全审计：小程序安全/CVE/敏感数据处理）
└── spawn perf-review-expert（性能审计：小程序包体积/H5首屏/各端渲染性能）

全部通过后：
└── spawn qa-review-expert（综合签核：REQ追踪/文档/Gate条件，汇聚领域报告）
```

**审查不通过回退**：
1. [BLOCKED] → 立即停止，按领域 spawn 对应实现 Agent 修复，修复后**重新走完整 Gate D**
2. [FIX_REQUIRED] → 按领域回退修复，修复后重 spawn 对应审查 expert + qa-review-expert
3. Taro 审查不通过 → spawn 原 Taro 实现 Agent（taro-dev-expert / taro-ui-expert / taro-state-expert）
4. 最多 2 轮审查-修复-重审循环；仍不通过 → 标记 `ABORT`

通过后：`advance_gate({ gate: "Gate E" })`

## Gate E 发布

🔴 **前置——质量重检（不可跳过）**：Lint + Type-check + Build + Test 全部重跑通过（Gate D 修复后必须重新验证，失败最多 2 轮修复）

- spawn `security-review-expert`（如 Gate D 未执行）
- spawn `perf-review-expert`（如 Gate D 未执行）
- 加载 `shipping-and-launch` 执行上线检查清单
- 小程序：微信审核规范检查、体验版验证、提交审核
- H5：静态资源 CDN 部署、缓存策略
- 加载 `git-workflow-and-versioning` 更新版本与 changelog
- 上线后监控 30 分钟 → 加载 `finishing-a-development-branch` 归档

## 故障恢复

Agent 失败重试（最多 3 次）、Batch 部分失败仅重试失败任务、Gate 失败回退修复、会话检查点。

向用户确认已进入 Taro 开发生命周期模式。

---

## 红线
- 小程序包体积不得超过平台限制——微信 2MB、支付宝 4MB
- Taro 组件必须覆盖 H5 + 小程序两端——单端通过不算通过
- 不可直接使用 DOM API——Taro 抽象层下 DOM 不可用
- 小程序审核规则必须遵守——诱导分享、虚拟支付等红线不可触碰
