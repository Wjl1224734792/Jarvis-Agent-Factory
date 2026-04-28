---
name: agent-orchestration
description: "主编排技能。仅在用户显式要求「启动编排」「走编排流程」「用多代理做」「帮我编排这个需求」时触发；需要 Codex 已开启 multi_agent 并可使用 spawn。只能通过显式调用。禁止用到 superpowers/openspec 的技能。"
---

# 多代理主编排（需求文档先行版）

本技能将加载了它的主会话变为**唯一的编排者**，通过 spawn 统一调度所有子代理。
**本技能必须由用户显式触发**——当用户明确表示「启动编排」「走完整流程」「用多代理处理」「帮我编排这个需求」等意图时才激活。

---

## 前置条件

- `[features] multi_agent = true`
- `.codex/agents/` 目录下所有子代理配置文件存在
- 编排者可访问并传递上游文档全文
- 编排者可访问并传递 `.codex/AGENTS.md` 与 `.codex/rules/` 下的子智能体必读规范
- 所有实现代理均遵守：**不得 spawn，不得越权重定义需求或任务**

---

## 主线原则

编排流程只有一条主线：**澄清需求 → 生成并确认需求文档 → 任务分解 → 执行规划 → 分配实现 → 评审交付**。

需求文档是后续所有阶段的事实源。任务文档、计划文档、Execution Packet、实现文档和评审矩阵都必须能追溯到需求文档中的 `REQ-XXX` 条目。

---

## 核心约束

1. **单一编排者** — 只有主会话有权 spawn，子代理禁止再 spawn 其他子代理
2. **阶段 1 澄清不得外包** — 需求澄清必须由编排者直接与用户对话完成；只读探索可按需插入作为事实输入，但不得替代用户对话或生成需求结论
3. **阶段 1 必须先问后写** — 收到用户需求后，编排者**必须先输出澄清问题**，不得直接撰写任务或计划。即使用户描述看似完整，也必须至少确认 1 个关键假设后再收敛。详见 `reference/workflow.md` 阶段 1 的提问框架。
4. **需求文档是硬输入** — 未生成并通过 Gate A 的需求文档前，不得 spawn `task_design`、`planner` 或任何实现代理。后续文档不得以聊天记录替代需求文档。
5. **传递完整上下文** — 每次 spawn 必须传递与本次子任务相关的上游文档全文或等效完整摘要；子代理不能假设自己能读取主会话历史
6. **子代理角色单一** — 每个 agent 只完成自己被分配的职责，不越权扩展范围，不擅自修改共享区域
7. **阶段推进受文档对齐闸门约束** — 每个阶段不仅要有文档产物，还要满足最小对齐条件；未通过闸门时必须回退，不得硬推进
8. **共享区域唯一责任方** — 共享契约、共享类型、数据库结构、路由入口、根配置、全局请求客户端等高风险区域，必须在计划中指定唯一责任方；未指定前，不允许多个代理同时修改
9. **变更必须留痕** — 若实现阶段发现必须调整计划、契约、Schema、共享边界，必须先提交 plan patch 或 contract change request，编排者确认后方可继续推进
10. **默认并发** — 每个阶段先识别无依赖、无共享写入冲突的工作批次；能并发就并发，只有阶段闸门、用户确认、同文件/同共享区域写入、TDD 步骤依赖时才串行
11. **先批量 spawn，后批量等待** — 同一并发批次必须先一次性启动全部子代理，再等待整批结果；不得对无依赖任务逐个 spawn / wait
12. **只读 sidecar 优先并发** — 代码探索、文档研究、只读专项审查可在不改变阶段闸门的前提下，与主线阶段并发收集事实证据
13. **子智能体必读规范** — 每次 spawn 必须要求子代理阅读并遵守 `.codex/AGENTS.md`、`.codex/rules/TypeScript与Interface使用规范.md`、`.codex/rules/团队协作规范.md`、`.codex/rules/通用编程规范与指南.md`

---

## 执行流程

| 阶段 | 执行方式 | 产出 |
|------|----------|------|
| 1A 需求澄清 | 编排者直接与用户对话 | 已确认的目标、范围、约束、成功标准 |
| 1B 需求文档 | 编排者直接撰写并确认 | `docs/requirements/` + `REQ-XXX` |
| 2 任务分解 | spawn `task_design`；独立事实问题可并发 spawn 只读 sidecar | `docs/tasks/` |
| 3 执行规划 | spawn `planner`；缺失的独立事实输入可并发探索 | `docs/plans/` + Execution Packets |
| 4 探索（按需） | 并发 spawn `repo_explorer` / `docs_researcher` | `docs/analysis/` 或 `docs/research/` |
| 5 实现 | 按 `parallel_batches` 批量 spawn 对应 agent | `docs/implementation/` |
| 6 评审 | 必要时先并发 spawn 只读专项审查，再 spawn `review_qa` 汇总结论 | `docs/review/` |

详见 `reference/workflow.md`。

---

## 并发策略

- `repo_explorer` 与 `docs_researcher` 是只读 sidecar：有多个独立事实问题时可同时 spawn，并与主线阶段并行收集证据。
- `planner` 必须把实现任务写成 `parallel_batches`：同批任务由编排者一次性全部 spawn，等待整批完成后再推进下一批。
- 前后端、UI/状态/API/数据/测试等不同文件域的 Execution Packet 默认可并发；同一共享区域或同一文件只能有一个责任方，必要时串行。
- `test_strategy: tdd` 的同一任务内部 Red → Green → Refactor 串行；不同任务的 Red 阶段若文件不重叠，可并发。
- 只读专项审查与独立验证可并发收集证据；最终 `review_qa` 必须等待实现文档和关键验证结果齐备。
- 修复/优化阶段同样按 `parallel_batches` 执行；多个 finding 互不依赖、修改路径不重叠时默认并发。
- 每个无法并发的任务都必须写明具体阻塞原因，不能只写“串行执行”。

详见 `reference/agents-overview.md` 的并发策略与批次规则。

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
- 对应需求 ID：
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
