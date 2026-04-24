# 代理清单

单一编排者（加载 agent-orchestration 技能的主会话）统一 spawn 以下所有子代理。禁止子代理再 spawn 其他子代理。

## 规划

| 代理 | 职责 | 模型 | 思考等级 |
|------|------|------|----------|
| `task_design` | 需求 → 任务分解，DDD/TDD 分类 | `gpt-5.5` | `high` |
| `planner` | 任务 → 执行计划，分工与 test_strategy | `gpt-5.5` | `high` |

## 探索（只读）

| 代理 | 职责 | 模型 | 思考等级 |
|------|------|------|----------|
| `repo_explorer` | 代码库结构、入口、边界映射 | `gpt-5.3-codex-spark` | `low` |
| `docs_researcher` | context7 MCP 文档搜索 | `gpt-5.4-mini` | `low` |

## 实现

| 代理 | 职责 | 模型 | 思考等级 | 技能标签（元数据） |
|------|------|------|----------|-------------------|
| `frontend_implementer` | 前端全栈（页面+状态+测试多维度时使用） | `gpt-5.4` | `high` | `frontend`, `ui`, `testing` |
| `frontend_ui_worker` | 页面布局、组件、样式、响应式、a11y | `gpt-5.4` | `high` | `ui`, `design` |
| `frontend_state_worker` | 状态管理、数据获取、缓存、请求客户端、路由 | `gpt-5.3-codex` | `high` | `state`, `data-fetching` |
| `frontend_test_worker` | 前端测试、TDD 流程 | `gpt-5.3-codex-spark` | `medium` | `testing`, `tdd` |
| `backend_implementer` | 后端全栈（API+业务+数据+测试多维度时使用） | `gpt-5.3-codex` | `high` | `backend`, `api`, `data` |
| `backend_api_worker` | 路由、控制器、验证、中间件、错误处理 | `gpt-5.3-codex` | `medium` | `api`, `routing` |
| `backend_service_worker` | 业务规则、领域逻辑、状态机、权限 | `gpt-5.5` | `high` | `business-logic`, `auth` |
| `backend_data_worker` | 数据库 Schema、ORM、Repository、迁移 | `gpt-5.3-codex` | `high` | `data`, `database` |
| `backend_test_worker` | 后端测试、TDD 流程 | `gpt-5.3-codex-spark` | `medium` | `testing`, `tdd` |

> **技能使用规则**：TOML 中的 `skills` 字段仅为路由提示元数据（2-3 个标签）。编排者应根据子任务类型按需加载具体技能，详见各 agent TOML 中的「技能使用指引」章节。

## 评审

| 代理 | 职责 | 模型 | 思考等级 |
|------|------|------|----------|
| `review_qa` | 需求一致性、代码质量、回归检查 | `gpt-5.5` | `high` |

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
