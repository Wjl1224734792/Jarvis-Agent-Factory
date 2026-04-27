# opencode 代理清单

单一编排者 `orchestrator` 统一通过 Task 工具调度以下子代理。子代理禁止再调用 Task 工具。

## 规划与评审

| 代理 | 职责 |
|---|---|
| `task_design` | 已确认需求文档 → 任务分解，维护 `REQ-XXX` 到 `TASK-XXX` 映射，DDD/TDD 分类 |
| `planner` | 任务 → 执行计划，分工、test_strategy 与 Execution Packet |
| `review_qa` | 需求一致性、实现质量、验证证据与追踪矩阵 |

## 探索与资料

| 代理 | 职责 |
|---|---|
| `repo_explorer` | 只读探索代码库结构、入口与风险边界 |
| `docs_researcher` | 搜索外部文档、API 参考与代码示例 |

## 前端实现

| 代理 | 职责 |
|---|---|
| `frontend_implementer` | 前端多维度完整实现：页面、状态、请求接入与测试 |
| `frontend_ui_worker` | UI、样式、布局、响应式、a11y |
| `frontend_state_worker` | 状态、数据获取、缓存、请求客户端、路由 |
| `frontend_test_worker` | 前端测试、TDD 流程 |

## 后端实现

| 代理 | 职责 |
|---|---|
| `backend_implementer` | 后端多维度完整实现：API、业务、数据与测试 |
| `backend_api_worker` | 路由、控制器、验证、中间件、错误处理 |
| `backend_service_worker` | 业务规则、领域逻辑、状态机、权限、幂等性 |
| `backend_data_worker` | 数据库 Schema、ORM、Repository、迁移与查询优化 |
| `backend_test_worker` | 后端测试、TDD 流程 |

## Task 调用策略

| 任务特征 | 调用 agent |
|---|---|
| 需求拆解、DDD/TDD 分类 | `task_design` |
| 执行计划、分工、Execution Packet | `planner` |
| 代码库结构、入口、共享边界 | `repo_explorer` |
| 第三方库/API 文档事实 | `docs_researcher` |
| 前端涉及页面+状态+测试多个维度 | `frontend_implementer` |
| 前端仅 UI/样式/组件 | `frontend_ui_worker` |
| 前端仅状态/数据/路由 | `frontend_state_worker` |
| 前端仅测试 | `frontend_test_worker` |
| 后端涉及 API+业务+数据+测试多个维度 | `backend_implementer` |
| 后端仅路由/控制器 | `backend_api_worker` |
| 后端仅业务逻辑 | `backend_service_worker` |
| 后端仅数据层 | `backend_data_worker` |
| 后端仅测试 | `backend_test_worker` |
| 交付评审 | `review_qa` |