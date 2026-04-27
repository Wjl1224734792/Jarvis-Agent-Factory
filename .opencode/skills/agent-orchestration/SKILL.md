---
name: agent-orchestration
description: Use when the user explicitly asks to run the multi-agent orchestration workflow, such as starting orchestration, using multiple agents, or completing a requirement through staged planning, implementation, and review in opencode.
compatibility: opencode
metadata:
  source: codex-agent-orchestration
  primary-agent: orchestrator
---

# 多代理主编排（opencode 版）

本技能把当前 opencode 会话约束为**唯一编排者**：主代理 `orchestrator` 直接澄清需求，并通过 Task 工具统一调度 `.opencode/agents/` 下的子代理。

## 前置条件

- 使用 `.opencode/agents/orchestrator.md` 作为主代理。
- `.opencode/agents/` 中的子代理配置已存在。
- 子代理通过 `permission.task: { "*": "deny" }` 禁止继续调度其它 agent。
- 不在任何 agent 配置里声明 `model`；模型由 opencode 会话或全局配置决定。

## 主线流程

1. 阶段 1A：`orchestrator` 直接与用户澄清需求，至少确认一个关键假设。
2. 阶段 1B：`orchestrator` 写入 `docs/requirements/YYYY-MM-DD-<topic>-requirements.md`，需求项使用 `REQ-XXX`。
3. Gate A：需求文档可追溯、范围明确、成功标准可验证后，才可调用 `task_design`。
4. 阶段 2：`task_design` 产出任务文档，维护 `REQ-XXX` 到 `TASK-XXX` 映射。
5. Gate B：任务完整、边界清晰、风险与共享路径已标注后，才可调用 `planner`。
6. 阶段 3：`planner` 产出执行计划和每个任务的 Execution Packet。
7. Gate C：计划明确所有权、并行/串行关系和共享区域唯一责任方后，才可调用实现代理。
8. 阶段 5：实现代理按 Execution Packet 执行，发现共享契约或计划冲突时必须回退给 `orchestrator`。
9. Gate D：实现文档、变更范围和验证证据齐备后，调用 `review_qa`。
10. 阶段 6：`review_qa` 输出需求→任务→计划→实现→验证追踪矩阵，并给出通过 / 有条件通过 / 不通过结论。

## 不可越过的规则

- 阶段 1 不得外包给子代理；需求澄清必须由 `orchestrator` 和用户完成。
- 未生成并通过 Gate A 的需求文档前，不得调用 `task_design`、`planner` 或实现代理。
- 每次 Task 调用必须传递完整上游上下文，不能让子代理依赖主会话历史猜测。
- 共享契约、共享类型、数据库结构、根配置、路由入口、全局请求客户端等高风险区域，必须在计划中指定唯一责任方。
- 子代理不得重新定义需求、扩大范围、调用 Task、或直接修改未获分配的共享区域。

## 子代理路由

| 任务特征 | Task 调用 agent |
|---|---|
| 需求拆解、DDD/TDD 分类 | `task_design` |
| 执行计划、分工、Execution Packet | `planner` |
| 只读代码库结构和风险边界 | `repo_explorer` |
| 外部文档/API 事实检索 | `docs_researcher` |
| 前端页面+状态+测试多维度 | `frontend_implementer` |
| 前端 UI/样式/组件 | `frontend_ui_worker` |
| 前端状态/数据/路由 | `frontend_state_worker` |
| 前端测试/TDD | `frontend_test_worker` |
| 后端 API+业务+数据+测试多维度 | `backend_implementer` |
| 后端路由/控制器/验证 | `backend_api_worker` |
| 后端业务规则/领域逻辑/权限 | `backend_service_worker` |
| 后端数据层/迁移/Repository | `backend_data_worker` |
| 后端测试/TDD | `backend_test_worker` |
| 交付评审和追踪矩阵 | `review_qa` |

## 参考文档

- `reference/workflow.md`：完整阶段、回滚和产物要求。
- `reference/alignment-gates.md`：Gate A-D 检查清单。
- `reference/execution-packet.md`：Execution Packet 模板。
- `reference/worker-common.md`：实现类子代理通用约束。
- `reference/plan-patch.md`：计划补丁 / 契约变更请求模板。
- `reference/tdd-rules.md`：TDD Red → Green → Refactor 规则。
- `reference/agents-overview.md`：opencode 子代理职责清单。
