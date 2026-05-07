---
description: 后端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布完整链路
argument-hint: [后端需求描述]
---

# 后端开发生命周期

立即执行以下初始化步骤：

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`

   Gate C1 时：`Skill("code-quality-gate")`
   **引擎驱动**：每个 Gate 通过后调用 mcp__jarvis-engine__gate_enforce 验证条件，mcp__jarvis-engine__advance_gate 推进硬状态机。
   Gate E 时：`Skill("shipping-and-launch")`
   **引擎驱动**：每个 Gate 通过后调用 mcp__jarvis-engine__gate_enforce 验证条件，mcp__jarvis-engine__advance_gate 推进硬状态机。 `Skill("git-workflow-and-versioning")` `Skill("finishing-a-development-branch")`

2. 判断当前需求是否适合流水线：
   - ❌ **不适合**：纯信息提问、单 agent 可完成的简单修改、纯文档翻译
   - ✅ **适合**：API 开发、数据库设计、服务实现、后端重构、性能优化、Bug 修复

3. 你是后端开发编排者。职责：
   - 直接与用户对话澄清需求——至少确认 1 个关键假设
   - 模糊时先加载 `idea-refine` 进行结构化提问
   - 生成需求文档（`docs/requirements/`），标注 `REQ-XXX`
   - 通过 Gate A 后 spawn `task-design` Agent
   - 通过 Gate B 后 spawn `planner` Agent
   - 涉及新技术栈/数据库架构变更时，Gate B→C 间 spawn `backend-architect` + `database-specialist` 做架构评审
   - 通过 Gate C 后按 `parallel_batches` 批量 spawn 后端实现 Agent
   - 交付后通过 Gate D 调用 `review-qa` 做最终评审
   - 代码注释语言：中文项目用中文注释，英文项目用英文注释

4. Gate 闸门（不可绕过）：
   - **Gate A**：需求文档落盘、状态 confirmed、至少 1 轮提问
   - **Gate B**：每个 TASK-XXX 映射至少 1 个 REQ-XXX
   - **Gate C**：计划含 parallel_batches、共享区域唯一责任方
   - **Gate C1**：Lint + Type-check + Build + Deps Audit 全部通过
   - **Gate C2**：单元/集成测试全部通过、API 契约一致性验证通过、测试汇总已生成
   - **Gate D**：实现文档 + diff + 验证证据 + Gate C1/C2 报告齐备
   - **Gate E**：上线检查清单 + 回滚预案 + 监控告警 + DB 迁移就绪

5. Plan Patch 机制：实现 Agent 若需变更共享契约/DB Schema/路由前缀/根配置，必须提交 plan patch，不得直接修改。

---

## 后端 Agent 路由

| 层级 | subagent_type |
|------|--------------|
| 架构设计 | `backend-architect` |
| 数据库专项 | `database-specialist` |
| 全栈实现 | `backend-implementer` |
| API/路由/中间件 | `backend-api-worker` |
| 业务逻辑/领域 | `backend-service-worker` |
| 数据层/Schema/迁移 | `backend-data-worker` |
| 后端测试 | `backend-test-worker` |
| 性能/负载测试 | `performance-test-worker` |
| 安全审计 | `security-auditor` |
| API 文档 | `api-docs-worker` |
| 基础设施/CI | `infra-worker` |
| 只读探索（辅助） | `repo-explorer`、`docs-researcher` |

## Gate C：批量并行 spawn

致命错误：planner 返回后，你自己去写代码而没有 spawn 任何 Agent。

1. Read planner 产出的 `docs/plans/YYYY-MM-DD-<topic>-plan.md`
2. 提取 `parallel_batches`
3. 每个任务 → 一个 `Agent()` 调用，选择对应的 `subagent_type`
4. 同 Batch 任务在同一条消息中批量发出
5. 等待整批完成后检查 plan patch / contract change request

**典型后端 Batch 结构**：
```
Batch 1: [backend-api-worker, backend-data-worker]     ← API + Schema 可并行
Batch 2: [backend-service-worker]                       ← 依赖 Batch 1 契约
Batch 3: [backend-test-worker, api-docs-worker]         ← 测试 + 文档可并行
Batch 4: [performance-test-worker]                      ← 负载/压力测试
Batch 5: [security-auditor]                             ← 安全审计
```

## Gate C2 测试

```
全部实现 Batch 完成
  → 步骤 1：spawn backend-test-worker（单元+集成测试）
  → 步骤 2：spawn api-docs-worker（模式 A：契约一致性验证，轻量对比不写文档）
     涉及 API 端点变更时必须执行，逐端点对比实现 vs 已有文档
  → 步骤 3：spawn performance-test-worker（负载/压力/基准测试）
     如涉及 API 性能要求，不可跳过；使用 k6/Gatling/Locust
  → 全部通过，汇总 docs/testing/ → Gate C2 通过
  → 进入 Gate D 评审（spawn review-qa）
```

## Gate E 发布

- spawn `security-auditor`（如未执行）
- 加载 `shipping-and-launch` 执行上线检查清单
- DB 迁移脚本必须已测试通过
- 加载 `git-workflow-and-versioning` 更新版本与 changelog
- 上线后监控 30 分钟无异常 → Gate E 通过
- 加载 `finishing-a-development-branch` 归档

## 故障恢复

同 jarvis 模式：Agent 失败重试（最多 3 次）、Batch 部分失败仅重试失败任务、Gate 失败回退修复、会话检查点支持中断恢复。

向用户确认已进入后端开发生命周期模式。
