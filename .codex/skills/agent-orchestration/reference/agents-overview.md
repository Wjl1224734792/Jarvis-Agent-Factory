# 代理清单

单一编排者（加载 agent-orchestration 技能的主会话）统一 spawn 以下所有子代理。禁止子代理再 spawn 其他子代理。

## 规划

| 代理 | 职责 | 模型 | 思考等级 |
|------|------|------|----------|
| `task_design` | 已确认需求文档 → 任务分解，维护 `REQ-XXX` 到 `TASK-XXX` 映射，DDD/TDD 分类 | `gpt-5.5` | `high` |
| `planner` | 任务 → 执行计划，分工、test_strategy 与 Execution Packet | `gpt-5.5` | `high` |

## 探索（只读）

| 代理 | 职责 | 模型 | 思考等级 |
|------|------|------|----------|
| `repo_explorer` | 代码库结构、入口、边界映射 | `gpt-5.3-codex-spark` | `low` |
| `docs_researcher` | find-docs/ctx7 文档搜索 | `gpt-5.4-mini` | `low` |

## 审查与修复链路

| 代理 | 职责 | 模型 | 思考等级 | 写权限 |
|------|------|------|----------|--------|
| `project_audit_reviewer` | 项目结构、模块边界、配置、脚本、文档漂移只读审查 | `gpt-5.3-codex` | `high` | 否 |
| `diff_code_reviewer` | git diff / PR / 指定文件的代码只读审查 | `gpt-5.5` | `high` | 否 |
| `performance_audit_reviewer` | 性能风险、基线缺口、可测指标只读审查 | `gpt-5.5` | `high` | 否 |
| `remediation_planner` | 将 findings 转成修复/优化计划、所有权和验证命令 | `gpt-5.5` | `high` | 仅计划/文档 |
| `remediation_worker` | 无合适领域 worker 时的小范围修复、配置、文档、脚本或胶水改动 | `gpt-5.3-codex` | `high` | 是 |
| `post_change_reviewer` | 修复/优化后复核 findings、diff、验证证据和残余风险 | `gpt-5.5` | `high` | 仅验证/文档 |

## 实现

| 代理 | 职责 | 模型 | 思考等级 | 路由标签（元数据） |
|------|------|------|----------|-------------------|
| `frontend_implementer` | 前端全栈（页面+状态+测试多维度时使用） | `gpt-5.4` | `high` | `frontend`, `ui`, `testing` |
| `frontend_ui_worker` | 页面布局、组件、样式、响应式、a11y | `gpt-5.4` | `low` | `ui`, `design`, `accessibility` |
| `frontend_state_worker` | 状态管理、数据获取、缓存、请求客户端、路由 | `gpt-5.3-codex` | `high` | `state`, `data-fetching`, `routing` |
| `frontend_test_worker` | 前端测试、TDD 流程 | `gpt-5.3-codex-spark` | `medium` | `testing`, `tdd`, `frontend` |
| `backend_implementer` | 后端全栈（API+业务+数据+测试多维度时使用） | `gpt-5.3-codex` | `high` | `backend`, `api`, `data` |
| `backend_api_worker` | 路由、控制器、验证、中间件、错误处理 | `gpt-5.3-codex` | `medium` | `api`, `routing`, `validation` |
| `backend_service_worker` | 业务规则、领域逻辑、状态机、权限 | `gpt-5.5` | `high` | `business-logic`, `domain`, `auth` |
| `backend_data_worker` | 数据库 Schema、ORM、Repository、迁移 | `gpt-5.3-codex` | `high` | `data`, `database`, `migration` |
| `backend_test_worker` | 后端测试、TDD 流程 | `gpt-5.3-codex-spark` | `medium` | `testing`, `tdd`, `backend` |

> **技能使用规则**：本表中的路由标签仅供人工快速判断职责，不写入 TOML，也不代表自动加载技能。编排者应根据子任务类型按需加载真实存在的具体技能，并以 Execution Packet 明确交接上下文。

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
| 只做项目审查 | `project_audit_reviewer` |
| 只做代码差异审查 | `diff_code_reviewer` |
| 只做性能风险审查 | `performance_audit_reviewer` |
| 审查后需要规划修复/优化 | `remediation_planner` |
| 没有合适领域 worker 的小范围修复 | `remediation_worker` |
| 修复/优化完成后复审 | `post_change_reviewer` |
