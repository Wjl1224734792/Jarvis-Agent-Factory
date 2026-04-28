# Agent Orchestration

单一编排者通过 `spawn` 统一调度子代理，完成“澄清需求 → 需求文档 → 任务拆解 → 执行规划 → 分配实现 → 评审交付”的流程。

## 适用场景

当用户明确要求“启动编排”“走完整流程”“用多代理做”时，加载本技能。使用前需确保 Codex 配置中开启：

```toml
[features]
multi_agent = true
```

## 当前代理分工

主编排只关心子代理职责、权限、上下游交接和并发边界；底层运行参数不写入编排文档。

### 规划与评审

| 代理 | 职责 | 并发提示 |
|------|------|----------|
| `task_design` | 需求拆解、DDD/TDD 分类 | 可与独立只读探索并发 |
| `planner` | 执行计划、分工与 Execution Packet | 必须产出 `parallel_batches` |
| `review_qa` | 需求一致性、实现质量与回归审查 | 可汇总并发审查/验证证据 |

### 探索与资料

| 代理 | 职责 | 并发提示 |
|------|------|----------|
| `repo_explorer` | 只读探索代码库与风险边界 | 多个独立事实问题可并发拆分 |
| `docs_researcher` | 外部文档与示例检索 | 可与代码探索、规划或实现并发 |

### 审查与修复链路

| 代理 | 职责 | 并发提示 |
|------|------|----------|
| `project_audit_reviewer` | 项目结构、配置、边界与文档漂移审查 | 可与其它只读审查并发 |
| `diff_code_reviewer` | diff / PR / 指定文件代码审查 | 可与项目/性能审查并发 |
| `performance_audit_reviewer` | 性能风险、基线缺口与指标审查 | 可与结构/diff 审查并发 |
| `remediation_planner` | findings → 修复/优化计划与所有权 | 必须产出修复 `parallel_batches` |
| `remediation_worker` | 通用小范围修复、配置、文档、脚本、胶水改动 | 按修复批次执行 |
| `post_change_reviewer` | 修复/优化后的复审与关闭矩阵 | 等关键修复和验证证据齐备 |

### 前端实现

| 代理 | 职责 | 并发提示 |
|------|------|----------|
| `frontend_implementer` | 前端多维度完整实现 | 独占前端多维任务，避免与同域 worker 抢写 |
| `frontend_ui_worker` | UI、样式、布局、响应式、a11y | 可与状态/后端任务并发，前提是路径不重叠 |
| `frontend_state_worker` | 状态、数据获取、缓存、路由 | 可与 UI/后端任务并发，前提是契约已稳定 |
| `frontend_test_worker` | 前端测试、TDD 流程 | 按 TDD 子阶段并发或串行 |

### 后端实现

| 代理 | 职责 | 并发提示 |
|------|------|----------|
| `backend_implementer` | 后端多维度完整实现 | 独占后端多维任务，避免与同域 worker 抢写 |
| `backend_api_worker` | 路由、控制器、验证、中间件、错误处理 | 可与业务/数据 worker 并发，前提是边界清楚 |
| `backend_service_worker` | 业务规则、领域逻辑、状态机、权限 | 可与 API/数据 worker 并发，前提是契约已约定 |
| `backend_data_worker` | Schema、ORM、Repository、迁移 | 共享数据结构通常独占责任方 |
| `backend_test_worker` | 后端测试、TDD 流程 | 按 TDD 子阶段并发或串行 |

更完整的职责说明、路由标签、并发批次和 spawn 策略见 [reference/agents-overview.md](reference/agents-overview.md)。

## 6 阶段流程

| 阶段 | 名称 | 执行方式 | 主要产物 |
|------|------|----------|----------|
| 1 | 需求澄清与需求文档 | 主会话直接与用户对话并写需求文档 | `docs/requirements/` + `REQ-XXX` |
| 2 | 任务拆解 | `spawn task_design` | `docs/tasks/` |
| 3 | 执行规划 | `spawn planner` | `docs/plans/` + Execution Packet |
| 4 | 按需探索 | `spawn repo_explorer` / `docs_researcher` | 补充到对应阶段文档 |
| 5 | 实现 | 按 Execution Packet `spawn` 对应实现代理 | `docs/implementation/` |
| 6 | 评审 | `spawn review_qa` | `docs/review/` |

## 核心约束

1. 只有主会话可以 `spawn`，子代理不再派生子代理。
2. 阶段 1 必须先由主会话澄清需求，再生成并确认需求文档。
3. 需求文档是后续任务拆解、执行规划和实现分配的事实源；后续条目必须追溯到 `REQ-XXX`。
4. `spawn` 时必须传递足够的上游上下文，不能让子代理盲做。
5. 高风险共享区域只能有一个明确责任方。
6. 调整共享契约或共享实现时，必须留下明确的计划补丁或文档痕迹。
7. 每个阶段默认先识别可并发批次；只有用户确认、Gate、真实依赖或共享写入冲突才串行。

## 并发总则

- 只读 sidecar（代码探索、文档研究、专项审查）可与主线阶段并发，但只提供事实输入。
- 写入任务必须按 `parallel_batches` 执行：同批一次性全部 `spawn`，整批完成后再推进下一批。
- 同一共享区域、同一文件、同一 TDD 任务的 Red → Green → Refactor 不并发。
- 最终结论类代理（如 `review_qa`、`post_change_reviewer`）必须等待关键实现和验证证据齐备。

## 参考文档

| 文档 | 说明 |
|------|------|
| [SKILL.md](SKILL.md) | 技能入口与完整流程定义 |
| [reference/agents-overview.md](reference/agents-overview.md) | 代理清单、职责、并发策略与 spawn 规则 |
| [reference/alignment-gates.md](reference/alignment-gates.md) | 阶段间对齐闸门 |
| [reference/execution-packet.md](reference/execution-packet.md) | Execution Packet 模板 |
| [reference/plan-patch.md](reference/plan-patch.md) | 计划补丁模板 |
| [reference/tdd-rules.md](reference/tdd-rules.md) | TDD 规则 |
| [reference/worker-common.md](reference/worker-common.md) | Worker 共享约束 |
| [reference/workflow.md](reference/workflow.md) | 详细工作流与回滚规则 |
