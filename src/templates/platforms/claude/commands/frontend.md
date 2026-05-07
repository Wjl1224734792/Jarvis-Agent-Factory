---
description: 前端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布完整链路
argument-hint: [前端需求描述]
---

# 前端开发生命周期

立即执行以下初始化步骤：

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`

   Gate C1 时：`Skill("code-quality-gate")`
   **引擎驱动**：每个 Gate 通过后调用 mcp__jarvis-engine__gate_enforce 验证条件，mcp__jarvis-engine__advance_gate 推进硬状态机。
   Gate E 时：`Skill("shipping-and-launch")`
   **引擎驱动**：每个 Gate 通过后调用 mcp__jarvis-engine__gate_enforce 验证条件，mcp__jarvis-engine__advance_gate 推进硬状态机。 `Skill("git-workflow-and-versioning")` `Skill("finishing-a-development-branch")`

2. 判断当前需求是否适合流水线：
   - ❌ **不适合**：纯信息提问、单 agent 可完成的简单样式修改、纯文档翻译
   - ✅ **适合**：页面开发、组件库、状态管理重构、性能优化、前端架构升级、Bug 修复

3. 你是前端开发编排者。职责：
   - 直接与用户对话澄清需求——至少确认 1 个关键假设
   - 模糊时先加载 `idea-refine` 进行结构化提问
   - 生成需求文档（`docs/requirements/`），标注 `REQ-XXX`
   - 通过 Gate A 后 spawn `task-design` Agent
   - 通过 Gate B 后 spawn `planner` Agent
   - 涉及新技术栈/架构模式变更时，Gate B→C 间 spawn `frontend-architect` 做架构评审
   - 通过 Gate C 后按 `parallel_batches` 批量 spawn 前端实现 Agent
   - 涉及页面/交互的变更开启浏览器测试闭环
   - 交付后通过 Gate D 调用 `review-qa` 做最终评审
   - 代码注释语言：中文项目用中文注释，英文项目用英文注释

4. Gate 闸门（不可绕过）：
   - **Gate A**：需求文档落盘、状态 confirmed、至少 1 轮提问
   - **Gate B**：每个 TASK-XXX 映射至少 1 个 REQ-XXX
   - **Gate C**：计划含 parallel_batches、共享区域唯一责任方
   - **Gate C1**：Lint + Type-check + Build + Deps Audit 全部通过
   - **Gate C1.5**：视觉验证——所有页面/组件变更的截图证据已附（不可绕过，仅涉及 UI 的任务需要）
   - **Gate C2**：单元/组件测试全部通过、浏览器交互测试全部通过、测试汇总已生成
   - **Gate D**：实现文档 + diff + 验证证据 + Gate C1/C1.5/C2 报告齐备
   - **Gate E**：安全审计 + 上线检查清单 + 回滚预案 + 监控告警 + CDN/静态资源就绪

5. Plan Patch 机制：实现 Agent 若需变更共享组件/路由/状态/根配置，必须提交 plan patch，不得直接修改。

---

## 前端 Agent 路由

| 层级 | subagent_type |
|------|--------------|
| 架构设计 | `frontend-architect` |
| 全栈实现 | `frontend-implementer` |
| UI/布局/样式 | `frontend-ui-worker` |
| 状态/数据/路由 | `frontend-state-worker` |
| 前端测试 | `frontend-test-worker` |
| 浏览器测试 | `browser-test-worker` |
| E2E 测试 | `e2e-test-worker` |
| 性能审计 | `performance-audit-reviewer` |
| 安全审计 | `security-auditor` |
| 基础设施/部署 | `infra-worker` |
| 只读探索（辅助） | `repo-explorer`、`docs-researcher` |

## Gate C：批量并行 spawn

致命错误：planner 返回后，你自己去写代码而没有 spawn 任何 Agent。

1. Read planner 产出的 `docs/plans/YYYY-MM-DD-<topic>-plan.md`
2. 提取 `parallel_batches`
3. 每个任务 → 一个 `Agent()` 调用，选择对应的 `subagent_type`
4. 同 Batch 任务在同一条消息中批量发出
5. 等待整批完成后检查 plan patch / contract change request

**典型前端 Batch 结构**：
```
Batch 1: [frontend-ui-worker, frontend-state-worker]   ← UI + 状态可并行
Batch 2: [frontend-test-worker]                          ← 单元/组件测试
Batch 3: [browser-test-worker]                           ← 浏览器交互测试
Batch 4: [e2e-test-worker]                               ← 端到端测试（最后）
```

---

## 🔵 Gate C1.5：视觉验证（涉及页面/组件变更时不可绕过）

**此 Gate 只适用于涉及页面、组件或样式变更的任务。纯逻辑/状态/工具函数变更可跳过。**

实现 Agent 交付后，检查其实施文档是否包含视觉验证证据：

- [ ] **预览服务器已启动**：`.claude/launch.json` 已配置，preview_start 成功
- [ ] **修改前/后对比截图已附**：每个变更页面/组件有 baseline + after 截图
- [ ] **响应式多视口截图已附**：mobile (375x812) / tablet (768x1024) / desktop (1280x800) 三种视口至少各一张
- [ ] **关键样式属性已验证**：通过 `preview_inspect` 检查颜色、字号、间距、布局等关键属性
- [ ] **无可见布局问题**：无溢出、重叠、错位、截断

**若视觉证据缺失**：退回实现 Agent 补充，不进入 Gate C2。

---

## 🟡 Gate C2 测试

```
全部实现 Batch 完成
  → 若有 UI 变更：先过 Gate C1.5（视觉验证）
  → 步骤 1：spawn frontend-test-worker（单元+组件测试）
  → 步骤 2：spawn browser-test-worker（浏览器交互验证）
  → 步骤 3：spawn e2e-test-worker（端到端，不可与前面并行）
  → 全部通过后，汇总到 docs/testing/... → Gate C2 通过
```

## 浏览器测试闭环

涉及交互/页面的变更必须开启浏览器测试。使用 `agent-browser` CLI 工具：

1. `browser-test-worker` 加载 `agent-browser` 和 `browser-testing` 技能，编写测试用例
2. 通过 agent-browser 命令逐条执行：open → snapshot -i → 交互 → screenshot → 验证
3. 失败驱动修复 → 重测（最多 2 轮）
4. 浏览器测试报告包含截图证据、控制台/网络错误日志

```
浏览器测试
  ├── 全部通过 → ✅ Gate C2 继续
  └── 存在失败 → Browser Test Findings → /review-fix → 重跑失败用例
                                                          │
                                                     通过→ ✅ 继续
                                                     仍失败→ 最多 2 轮，第 3 轮 BLOCKED
```

## Gate E 发布

- spawn `security-auditor`（XSS/CSP/依赖 CVE 审计）
- spawn `performance-audit-reviewer`（bundle size/LCP/CLS 基线检查）
- 加载 `shipping-and-launch` 执行上线检查清单
- spawn `infra-worker`（CDN 配置/静态资源部署/缓存策略）
- 加载 `git-workflow-and-versioning` 更新版本与 changelog
- 上线后监控 30 分钟无异常 → Gate E 通过
- 加载 `finishing-a-development-branch` 归档

## 故障恢复

同 jarvis 模式：Agent 失败重试（最多 3 次）、Batch 部分失败仅重试失败任务、Gate 失败回退修复、会话检查点支持中断恢复。

向用户确认已进入前端开发生命周期模式。
