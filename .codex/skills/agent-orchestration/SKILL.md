---
name: agent-orchestration
description: "主编排技能：单一编排者通过 spawn 统一调度所有子代理的完整交付流程——从需求澄清到评审交付。仅在用户显式要求「启动编排」「走编排流程」「用多代理做」时触发。确保 Codex 已开启 multi_agent 以支持 spawn。只能通过显式调用。禁止用到superpowers/openspec的技能。"
---

# 多代理编排（带对齐闸门版）

本技能将加载了它的主会话变为**唯一的编排者**，通过 spawn 统一调度所有子代理。
**本技能必须由用户显式触发**——当用户明确表示「启动编排」「走完整流程」「用多代理处理」「帮我编排这个需求」等意图时才激活。

---

## 前置条件

- `[features] multi_agent = true`
- `.codex/agents/` 目录下所有子代理配置文件存在
- 编排者可访问并传递上游文档全文
- 所有实现代理均遵守：**不得 spawn，不得越权重定义需求或任务**

---

## 核心约束

1. **单一编排者** — 只有主会话有权 spawn，子代理禁止再 spawn 其他子代理
2. **阶段 1 禁止 spawn** — 需求澄清必须由编排者直接与用户对话完成（只读探索可按需插入，但不得替代用户对话）
3. **传递完整上下文** — 每次 spawn 必须传递与本次子任务相关的上游文档全文或等效完整摘要；子代理不能假设自己能读取主会话历史
4. **子代理角色单一** — 每个 agent 只完成自己被分配的职责，不越权扩展范围，不擅自修改共享区域
5. **阶段推进受文档对齐闸门约束** — 每个阶段不仅要有文档产物，还要满足最小对齐条件；未通过闸门时必须回退，不得硬推进
6. **共享区域唯一责任方** — 共享契约、共享类型、数据库结构、路由入口、根配置、全局请求客户端等高风险区域，必须在计划中指定唯一责任方；未指定前，不允许多个代理同时修改
7. **变更必须留痕** — 若实现阶段发现必须调整计划、契约、Schema、共享边界，必须先提交 plan patch 或 contract change request，编排者确认后方可继续推进

---

## 执行流程

| 阶段 | 执行方式 | 产出 |
|------|----------|------|
| 1 需求澄清 | 编排者直接执行 | `docs/requirements/` |
| 2 任务分解 | spawn `task_design` | `docs/tasks/` |
| 3 执行规划 | spawn `planner` | `docs/plans/` + Execution Packets |
| 4 探索（按需） | spawn `repo_explorer` / `docs_researcher` | `docs/analysis/` 或 `docs/research/` |
| 5 实现 | 按计划 spawn 对应 agent | `docs/implementation/` |
| 6 评审 | spawn `review_qa` | `docs/review/` |

详见 `reference/workflow.md`。

---

## 文档对齐闸门

阶段间设有硬性 Gate（Gate A ~ D），未满足最低条件不得进入下一阶段。详见 `reference/alignment-gates.md`。

| Gate | 触发时机 | 检查者 |
|------|----------|--------|
| A | 需求 → 任务分解 | 编排者 |
| B | 任务分解 → 执行规划 | 编排者 + planner |
| C | 执行规划 → 实现 | 编排者 |
| D | 实现 → 评审 | 编排者 |

---

## 执行包（Execution Packet）

planner 必须为每个待执行任务产出一个执行包，编排者 spawn 子代理时原样传递。详见 `reference/execution-packet.md`。

---

## 实现前确认块（Execution Acknowledgement）

所有实现类代理在实际修改前，必须先输出：

```md
## Execution Acknowledgement
- 我本次只实现：
- 我不会修改：
- 我已读取的上游文档：
- 我预计修改的文件 / 路径：
- 我依赖的共享契约 / 接口：
- 若发现冲突，我将回退给 orchestrator：
```

详见 `reference/worker-common.md`。

---

## 计划补丁 / 契约变更单

实现中如需调整共享契约、数据库结构、路由前缀、根配置等，不得直接修改。须先提交 plan patch 或 contract change request，由编排者决定。详见 `reference/plan-patch.md`。

---

## TDD 规则

`test_strategy: tdd` 的任务按 Red → Green → Refactor 三步串行执行。详见 `reference/tdd-rules.md`。

---

## Spawn 策略

| 任务特征 | spawn 谁 |
|----------|----------|
| 前端多维度（页面+状态+测试） | `frontend_implementer` |
| 前端仅 UI/样式 | `frontend_ui_worker` |
| 前端仅状态/数据 | `frontend_state_worker` |
| 前端仅测试 | `frontend_test_worker` |
| 后端多维度（API+业务+数据+测试） | `backend_implementer` |
| 后端仅路由/控制器 | `backend_api_worker` |
| 后端仅业务逻辑 | `backend_service_worker` |
| 后端仅数据层 | `backend_data_worker` |
| 后端仅测试 | `backend_test_worker` |

详见 `reference/agents-overview.md`。

---

## 追踪矩阵

`review_qa` 必须输出需求→任务→实现→测试的追踪矩阵，确保每条需求都落到代码和测试。详见 `reference/workflow.md` 阶段 6。

---

## 参考文档

- `reference/agents-overview.md` — 代理清单、职责、spawn 策略表
- `reference/alignment-gates.md` — 文档对齐闸门详细说明
- `reference/execution-packet.md` — 执行包模板
- `reference/plan-patch.md` — 计划补丁 / 契约变更单模板
- `reference/tdd-rules.md` — TDD Red/Green/Refactor 规则
- `reference/worker-common.md` — 所有 Worker 共享的公共指令
- `reference/workflow.md` — 6 阶段详细流程、回滚规则、产出物清单
