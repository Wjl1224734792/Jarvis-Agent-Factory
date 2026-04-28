# 代理清单

单一编排者（加载 agent-orchestration 技能的主会话）统一 spawn 以下所有子代理。禁止子代理再 spawn 其他子代理。

本清单只描述职责、权限和路由依据；主编排不关心底层运行参数。

## 规划

| 代理 | 职责 | 输出 |
|------|------|------|
| `task_design` | 已确认需求文档 → 任务分解，维护 `REQ-XXX` 到 `TASK-XXX` 映射，DDD/TDD 分类 | `docs/tasks/` |
| `planner` | 任务 → 执行计划，分工、test_strategy、并发批次与 Execution Packet | `docs/plans/` |

## 探索（只读）

| 代理 | 职责 | 适合并发的时机 |
|------|------|----------------|
| `repo_explorer` | 代码库结构、入口、边界映射 | 阶段 1/2/3/5 中有明确事实问题时 |
| `docs_researcher` | find-docs/ctx7 文档搜索 | 阶段 1/2/3/5 中有外部文档事实问题时 |

## 审查与修复链路

| 代理 | 职责 | 写权限 |
|------|------|--------|
| `project_audit_reviewer` | 项目结构、模块边界、配置、脚本、文档漂移只读审查 | 否 |
| `diff_code_reviewer` | git diff / PR / 指定文件的代码只读审查 | 否 |
| `performance_audit_reviewer` | 性能风险、基线缺口、可测指标只读审查 | 否 |
| `remediation_planner` | 将 findings 转成修复/优化计划、所有权、并发批次和验证命令 | 仅计划/文档 |
| `remediation_worker` | 无合适领域 worker 时的小范围修复、配置、文档、脚本或胶水改动 | 是 |
| `post_change_reviewer` | 修复/优化后复核 findings、diff、验证证据和残余风险 | 仅验证/文档 |

## 实现

| 代理 | 职责 | 路由标签（元数据） |
|------|------|-------------------|
| `frontend_implementer` | 前端全栈（页面+状态+测试多维度时使用） | `frontend`, `ui`, `testing` |
| `frontend_ui_worker` | 页面布局、组件、样式、响应式、a11y | `ui`, `design`, `accessibility` |
| `frontend_state_worker` | 状态管理、数据获取、缓存、请求客户端、路由 | `state`, `data-fetching`, `routing` |
| `frontend_test_worker` | 前端测试、TDD 流程 | `testing`, `tdd`, `frontend` |
| `backend_implementer` | 后端全栈（API+业务+数据+测试多维度时使用） | `backend`, `api`, `data` |
| `backend_api_worker` | 路由、控制器、验证、中间件、错误处理 | `api`, `routing`, `validation` |
| `backend_service_worker` | 业务规则、领域逻辑、状态机、权限 | `business-logic`, `domain`, `auth` |
| `backend_data_worker` | 数据库 Schema、ORM、Repository、迁移 | `data`, `database`, `migration` |
| `backend_test_worker` | 后端测试、TDD 流程 | `testing`, `tdd`, `backend` |

> **技能使用规则**：本表中的路由标签仅供人工快速判断职责，不写入 TOML，也不代表自动加载技能。编排者应根据子任务类型按需加载真实存在的具体技能，并以 Execution Packet 明确交接上下文。

## 评审

| 代理 | 职责 | 输出 |
|------|------|------|
| `review_qa` | 需求一致性、代码质量、回归检查，输出追踪矩阵 | `docs/review/` |

## 并发策略

默认策略：每个阶段先识别可并发批次，能并发就并发；只有存在真实依赖、共享写入冲突或对齐闸门时才串行。

编排者每次调度前都先判断三件事：是否只读、是否写同一路径/共享区域、是否依赖上一批结果。只读且问题独立的任务默认并发；写入任务只有在 `allowed_paths` 不重叠且共享责任方唯一时才进入同批。

| 阶段 | 可并发内容 | 必须串行的内容 |
|------|------------|----------------|
| 需求澄清 | 明确事实问题可并发交给 `repo_explorer` / `docs_researcher` | 与用户确认需求、写入并确认需求文档 |
| 任务分解 | `task_design` 可与独立事实探索并发；探索结果作为后续补充输入 | Gate A 未过、任务文档定稿、Gate B |
| 执行规划 | `planner` 可读取已完成探索结果；缺少多个事实输入时可先并发探索 | 依赖任务文档、共享区域归属、Gate C |
| 实现 | 不同文件域、不同责任方、无依赖的 Execution Packet 同批 spawn | 同一共享区域、同一文件、TDD 同一任务的 Red → Green → Refactor |
| 验证/评审 | 独立验证命令、只读专项审查可并发收集证据 | 最终 `review_qa` 结论必须等待实现与关键证据齐备 |
| 修复/优化 | 不共享文件和契约的修复任务可并发 | 同一 finding 链路、共享区域、复审 |

### 批次规则

- planner / remediation_planner 必须把任务分成 `parallel_batches`，每批列出可同时 spawn 的 agent 和阻塞原因。
- 编排者应先 spawn 同一批内所有代理，再等待该批完成；不要在同批任务之间逐个等待。
- 若某批中出现共享区域变更、同文件写入、契约变更或 TDD 步骤依赖，拆到下一批。
- 只读探索、文档研究、专项只读审查可作为 sidecar 与主线并发，但不得改变阶段闸门。
- 若某任务被安排串行，计划中必须写明阻塞类型：`gate`、`user_confirm`、`shared_owner`、`same_file`、`contract_dependency`、`tdd_step` 或其它具体原因。

## spawn 策略

| 任务特征 | spawn 的 agent |
|----------|---------------|
| 前端涉及页面+状态+测试多个维度 | `frontend_implementer` |
| 前端仅 UI/样式/组件 | `frontend_ui_worker` |
| 前端仅状态/数据/路由 | `frontend_state_worker` |
| 前端仅测试 | `frontend_test_worker` |
| 后端涉及 API+业务+数据+测试多个维度 | `backend_implementer` |
| 后端仅路由/控制器 | `backend_api_worker` |
| 后端仅业务逻辑 | `backend_service_worker` |
| 后端仅数据层 | `backend_data_worker` |
| 后端仅测试 | `backend_test_worker` |
| 只做项目审查 | `project_audit_reviewer` |
| 只做代码差异审查 | `diff_code_reviewer` |
| 只做性能风险审查 | `performance_audit_reviewer` |
| 审查后需要规划修复/优化 | `remediation_planner` |
| 没有合适领域 worker 的小范围修复 | `remediation_worker` |
| 修复/优化完成后复审 | `post_change_reviewer` |
