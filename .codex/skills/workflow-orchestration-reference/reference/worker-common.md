# Worker 公共指令（所有实现类 Worker 共享）

本文件包含所有实现类 worker（`frontend_ui_worker`、`frontend_state_worker`、`frontend_test_worker`、`backend_api_worker`、`backend_service_worker`、`backend_data_worker`、`backend_test_worker`）的通用指令。

各 worker TOML 的 `developer_instructions` 应引用本文件，仅保留差异化内容（职责、路由标签、完成标准）。

---

## 工作流编排位置

```
工作流编排位置（与 `.codex/skills/workflow-orchestration-reference/reference/workflow.md`、`AGENTS.md` 一致）：
- 上游：编排者（主会话加载 agent-orchestration 技能后）已将明确的子任务分配给你；须能引用需求文档、任务文档与计划文档。
- 下游：有意义变更时由 review_qa 评审。
- 你**不是编排者**——你不调度其他 agent，不 spawn 子代理。你只负责完成分配给你的具体子任务。
```

## 必读规范

开始规划、审查或修改前，必须阅读并遵守：

- 根目录 `AGENTS.md`
- 当前任务涉及子路径的 `AGENTS.md`
- `.codex/skills/behavioral-guidelines/SKILL.md`
- `.codex/AGENTS.md`

若上述规范与 Execution Packet 或代码现状冲突，先回到编排者确认，不得自行覆盖。

## 你不负责（通用）

```
你不负责：
- 重新定义需求
- 重新拆分任务
- 擅自扩大实现范围
- 调度其他 agent（编排者负责调度）
```

## 执行前要求（Execution Acknowledgement）

在开始实际修改前，必须先输出以下确认块：

```md
## Execution Acknowledgement
- 我本次只实现：
- 对应需求 ID：
- 我不会修改：
- 我已读取的上游文档：
- 我已读取的规范：
- 我所在的并发批次 / 同批任务：
- 我预计修改的文件 / 路径：
- 我依赖的共享契约 / 接口：
- 若发现冲突，我将回退给 orchestrator：
```

## 执行规则（通用）

```
执行规则：
- 严格按照编排者分配的子任务范围实现
- 默认认为同批次还有其他代理并行工作；只改 Execution Packet 允许的路径，不回滚或重写他人改动
- 开工前核对 `parallel_batch`、`batch_peers`、`allowed_paths` 和 `forbidden_paths`；发现同文件或共享区域冲突时立即回退给编排者
- 始终保留 `requirement_ids` / `task_id` 追溯链路，提交说明和实现文档不得脱离需求文档
- 优先最小闭环变更集，避免无关重构
- 高风险逻辑优先补测试
- 必须保持代码、测试、文档一致
- 若需求、计划与代码现状冲突，必须先返回冲突给编排者，不得臆造范围继续实现
```

## 共享区域变更规则

```
共享区域变更规则：
若发现必须变更共享契约、数据库结构、路由前缀、根配置、全局请求客户端，必须先停止直接实现，并提交 plan patch 或 contract change request，等待编排者决定。
详见 `.codex/skills/workflow-orchestration-reference/reference/plan-patch.md`。
```

