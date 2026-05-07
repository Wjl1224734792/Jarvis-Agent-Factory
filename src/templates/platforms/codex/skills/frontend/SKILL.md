---
name: frontend
description: 前端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布完整链路。用户说"前端开发""前端页面""前端重构"时加载此技能。
---

# 前端开发生命周期

加载此技能后进入前端开发编排模式。你是前端开发编排者，通过 Task 工具统一调度子代理。

## 会话初始化

加载 `.codex/skills/behavioral-guidelines/` `.codex/skills/using-agent-skills/`
Gate C1: `.codex/skills/code-quality-gate/`
Gate E: `.codex/skills/shipping-and-launch/` `.codex/skills/git-workflow-and-versioning/` `.codex/skills/finishing-a-development-branch/`

**引擎驱动**：每个 Gate 通过后调用引擎 MCP：gate_enforce 验证条件，gate_advance 推进硬状态机。

## 入口判断

- 不适合：纯信息提问、单 agent 可完成的简单样式修改、纯文档翻译
- 适合：页面开发、组件库、状态管理重构、性能优化、前端架构升级、Bug 修复

## 职责

- 直接与用户对话澄清需求——至少确认 1 个关键假设
- 模糊时加载 `.codex/skills/idea-refine/` 结构化提问
- 生成需求文档→任务分解（`task_design`）→执行规划（`planner`）→批量 spawn→评审→发布
- 涉及新技术栈/架构变更时 Gate B→C 间 spawn `frontend_architect`
- 涉及页面/交互的变更开启浏览器测试闭环
- 代码注释语言：遵从 behavioral-guidelines 准则 5

## 闸门（A→B→C→C1→C1.5→C2→D→E，不可绕过）

- **Gate A**：需求文档落盘、状态 confirmed、至少 1 轮提问
- **Gate B**：每个 TASK-XXX 映射至少 1 个 REQ-XXX
- **Gate C**：计划含 parallel_batches、共享区域唯一责任方
- **Gate C1**：Lint + Type-check + Build + Deps Audit 全部通过
- **Gate C1.5**：视觉验证——所有页面/组件变更的截图证据已附（仅涉及 UI 的任务需要）
- **Gate C2**：单元/组件测试全部通过、浏览器交互测试全部通过、测试汇总已生成
- **Gate D**：实现文档 + diff + 验证证据 + Gate C1/C1.5/C2 报告齐备
- **Gate E**：安全审计 + 上线检查清单 + 回滚预案 + 监控告警 + CDN/静态资源就绪

## 前端 Agent 路由

| 层级 | agent |
|------|-------|
| 架构设计 | `frontend_architect` |
| 全栈实现 | `frontend_implementer` |
| UI/布局/样式 | `frontend_ui_worker` |
| 状态/数据/路由 | `frontend_state_worker` |
| 前端测试 | `frontend_test_worker` |
| 浏览器测试 | `browser_test_worker` |
| E2E 测试 | `e2e_test_worker` |
| 性能审计 | `performance_audit_reviewer` |
| 安全审计 | `security_auditor` |
| 基础设施/部署 | `infra_worker` |

## Batch 结构

```
Batch 1: [frontend_ui_worker, frontend_state_worker]   ← UI + 状态并行
Batch 2: [frontend_test_worker]                          ← 单元/组件测试
Batch 3: [browser_test_worker]                           ← 浏览器交互测试
Batch 4: [e2e_test_worker]                               ← 端到端（最后）
```

## 浏览器测试闭环

涉及页面/交互的变更必须开启浏览器测试，使用 `browser_test_worker`（加载 `.codex/skills/agent-browser/` + `.codex/skills/browser-testing/`）：
1. 编写测试用例→逐条执行→截图→验证
2. 失败驱动修复→重测（最多 2 轮）
3. 测试报告包含截图证据、控制台/网络错误日志

## Plan Patch / 故障恢复 / 红线

同 jarvis 标准流程。涉及页面/交互变更跳过浏览器测试闭环为红线。

## 关联技能

`.codex/skills/idea-refine/` `.codex/skills/spec-driven-development/` `.codex/skills/planning-and-task-breakdown/` `.codex/skills/source-driven-development/` `.codex/skills/incremental-implementation/` `.codex/skills/test-driven-development/` `.codex/skills/code-quality-gate/` `.codex/skills/browser-testing/` `.codex/skills/code-review-and-quality/` `.codex/skills/verification-before-completion/` `.codex/skills/shipping-and-launch/` `.codex/skills/git-workflow-and-versioning/` `.codex/skills/finishing-a-development-branch/`
