# 执行计划：流程面板 Gate 任务时长统计

> **需求文档**：`docs/requirements/2026-05-09-gate-duration-stats.md`
> **任务文档**：`docs/tasks/2026-05-09-gate-duration-stats-tasks.md`
> **计划日期**：2026-05-09 | **预计总变更**：~460 行 | **轮次**：1/1

---

## 1. 当前轮次目标

在 Jarvis 流水线系统中实现 Gate 时间记录与耗时统计功能：记录每个 Gate 的进入时间、计算 Gate 耗时、计算任务总耗时，并通过 Web API 和面板展示时长数据。

## 2. 当前轮次范围

| 任务 | 关联需求 | 内容摘要 | 估计行数 |
|------|---------|---------|---------|
| TASK-001 | REQ-001, REQ-002 | Gate 进入时间记录与耗时计算（DB Schema + MCP 工具） | ~150 |
| TASK-002 | REQ-003 | 任务总耗时计算（DB 层 `completeRun`/`abortRun`） | ~80 |
| TASK-003 | REQ-004 | Web API 返回时长数据（`/api/pipeline`, `/api/pipeline-runs`） | ~80 |
| TASK-004 | REQ-005, REQ-006, REQ-007 | Web 面板时长展示（Gate 列表 + 统计卡片 + 历史 Runs） | ~150 |

## 3. 完成标准

1. `advance_gate` 推进 Gate 时自动记录新 Gate 进入时间，并计算上一 Gate 耗时
2. `gate_jump` 跳转时记录目标 Gate 进入时间
3. `createPipelineRun` 创建时写入 Gate A 进入时间
4. `completeRun` / `abortRun` 执行时计算并写入总耗时
5. 迁移脚本处理已有数据库（`ALTER TABLE ADD COLUMN` + 已有数据回填）
6. `/api/pipeline` 和 `/api/pipeline-runs` 返回新增时长字段
7. Web 面板三个 UI 区域（Gate 步骤列表、统计卡片、历史 Runs）正确展示时长
8. 现有功能不退化（FSM 约束、API 字段结构、前端展示）

## 4. 前置研究

不需要先查阅 code-explore-expert 或 docs-research-expert。计划者已完成对以下文件的源码审查：
- `src/engine/db.ts` — 完整 Schema、迁移模式、所有 CRUD 函数签名
- `src/engine/server.ts` — MCP 工具定义、`advance_gate`/`gate_jump`/`pipeline_status` 逻辑
- `src/web/routes.ts` — API 路由结构、`/api/pipeline` 和 `/api/pipeline-runs` 响应格式
- `src/web/views/pipeline.html` — 前端渲染逻辑、Gate 步骤条、统计卡片、历史 Runs 列表
- `tests/db.test.ts` — 现有测试结构（vitest + describe/it 模式）

## 5. 执行代理分工

| 任务 | 代理选型 | 选型理由 |
|------|---------|---------|
| TASK-001 | `backend-dev-expert` | DDD+TDD 后端任务：涉及 `db.ts` Schema 迁移 + `server.ts` MCP 工具逻辑变更，跨数据层和业务层 |
| TASK-002 | `backend-dev-expert` | TDD 后端任务：涉及 `db.ts` CRUD 更新 + 迁移脚本，纯数据层变更 |
| TASK-003 | `backend-api-expert` | 后端 API 增强：修改 `routes.ts` 中的 REST 端点响应结构，追加新字段 |
| TASK-004 | `frontend-dev-expert` | 前端 UI 变更：修改 `pipeline.html` 中的三个 UI 区域（Gate 步骤、统计卡片、历史 Runs） |

## 6. 共享区域改动归属

| 共享文件 | 唯一责任方 | 变更时机 | 后续任务规则 |
|---------|-----------|---------|-------------|
| `src/engine/db.ts` | **TASK-001** 拥有首次修改权 | Batch 1 | TASK-002 在 TASK-001 修改后的 `db.ts` 基础上增量添加，禁止覆盖 TASK-001 的变更 |
| `src/engine/server.ts` | **TASK-001** 独占 | Batch 1 | TASK-002 不接触此文件，TASK-003/004 不接触此文件 |
| `src/web/routes.ts` | **TASK-003** 独占 | Batch 3 | 无冲突 |
| `src/web/views/pipeline.html` | **TASK-004** 独占 | Batch 4 | 无冲突 |
| `tests/db.test.ts` | **TASK-001** 首先添加测试 | Batch 1 | TASK-002 在 TASK-001 的测试基础上追加新的 describe block，禁止修改 TASK-001 的测试代码 |

**共享区域串行规则**：
- `db.ts` 和 `tests/db.test.ts` 是唯二的共享文件
- TASK-001 完成后，TASK-002 拿到 TASK-001 的最终版本后再开始修改
- 编排者需确保 TASK-002 启动时 `db.ts` 已包含 TASK-001 的全部变更

## 7. 并行 / 串行策略

**整体串行链**（由共享文件冲突和功能依赖决定）：
```
TASK-001（Batch 1）
    │ 依赖：无
    │ 共享 db.ts 首次变更
    ▼
TASK-002（Batch 2）
    │ 依赖：TASK-001 的 db.ts Schema 变更 + gate_entered_at 字段就绪
    │ 在 TASK-001 的 db.ts 基础上增量添加
    ▼
TASK-003（Batch 3）
    │ 依赖：TASK-001/002 的 DB 字段全部就绪（gate_entered_at, duration_seconds, total_duration_seconds）
    │ API 才能读出完整数据
    ▼
TASK-004（Batch 4）
    │ 依赖：TASK-003 的 API 返回新字段
    │ 前端才能渲染时长数据
```

**并行机会分析**：

| 任务对 | 可并行？ | 理由 |
|--------|---------|------|
| TASK-001 ∥ TASK-002 | **否** | 共享 `db.ts`，TASK-002 必须在 TASK-001 的 Schema 变更之后 |
| TASK-002 ∥ TASK-003 | **否** | TASK-003 读取 `total_duration_seconds`，TASK-002 未完成则字段恒为 NULL（任务文档明确建议顺序执行） |
| TASK-003 ∥ TASK-004 | **否** | TASK-004 渲染依赖 TASK-003 的新 API 字段 |

**结论**：本需求无并行机会，4 个任务严格串行，每 Batch 仅 1 个任务。

## 8. 风险提醒

| 风险点 | 风险等级 | 影响任务 | 缓解措施 |
|--------|---------|---------|---------|
| `db.ts` 迁移脚本冲突 | 高 | TASK-001, TASK-002 | TASK-002 严格在 TASK-001 完成的 `db.ts` 基础上追加；编排者在 Batch 2 启动前 diff 确认 `db.ts` 状态 |
| 已有 `checkpoints` 回填耗时时首个 checkpoint 无基准时间 | 中 | TASK-001 | 首个 checkpoint 的 `duration_seconds` 设为 NULL；回填脚本 try/catch 包裹 |
| SQLite `julianday()` 精度 | 中 | TASK-002 | 单元测试覆盖同年、跨年边界；秒级精度满足需求 |
| `advance_gate` FSM 约束退化 | 高 | TASK-001 | 现有 FSM 检查（不进不退不跳）在新增耗时计算逻辑前先执行；单元测试覆盖 FSM 不变性 |
| API 响应结构向后兼容 | 低 | TASK-003 | 只追加字段，不删除/重命名现有字段 |
| 前端对 null 值降级展示 | 低 | TASK-004 | 所有新增字段为 null 时显示 `--`，不报错 |
| 前端实时耗时刷新 | 低 | TASK-004 | 已存在的 5 秒轮询机制自动更新实时耗时；新字段随 API 数据一起刷新 |

## 9. 实现者交接信息

**TASK-001 完成后向 TASK-002 传递**：
- `db.ts` 迁移脚本新增的列：`pipeline_runs.gate_entered_at TEXT`、`checkpoints.duration_seconds INTEGER`
- `db.ts` 新增的函数签名（如有）：扩展的 `addCheckpoint`（新增 `durationSeconds` 可选参数）、可能的 `updateRunGateEnteredAt` 辅助函数
- `server.ts` 中 `advance_gate` 和 `gate_jump` 变更行号
- 测试文件中 TASK-001 新增的 describe block 所在行号

**TASK-002 完成后向 TASK-003 传递**：
- `db.ts` 迁移脚本新增的列：`pipeline_runs.total_duration_seconds INTEGER`
- `completeRun` 和 `abortRun` 修改后的逻辑行号
- 测试文件中 TASK-002 新增的 describe block 所在行号

**TASK-003 完成后向 TASK-004 传递**：
- `/api/pipeline` 响应中 gate 对象的新增字段名及示例值
- `/api/pipeline-runs` 响应中 run 对象的新增字段名及示例值
- `formatDuration` 辅助函数的格式化规则

## 10. parallel_batches

### Batch 1（无依赖，可立即启动）
- TASK-001 → subagent_type: backend-dev-expert

**验证命令**：
```bash
npx vitest run tests/
```

### Batch 2（依赖 Batch 1 全部完成）
- TASK-002 → subagent_type: backend-dev-expert

**验证命令**：
```bash
npx vitest run tests/
```

### Batch 3（依赖 Batch 2 全部完成）
- TASK-003 → subagent_type: backend-api-expert

**验证命令**：
```bash
# 手工 curl 验证（TASK-003 test_after 策略）
curl -s http://localhost:3456/api/pipeline | python3 -m json.tool | head -80
curl -s "http://localhost:3456/api/pipeline-runs?session_id=<sid>" | python3 -m json.tool | head -40
npx vitest run tests/
```

### Batch 4（依赖 Batch 3 全部完成）
- TASK-004 → subagent_type: frontend-dev-expert

**验证命令**：
```bash
# 浏览器手动验证三个 UI 区域（TASK-004 manual_only 策略）
# 1. 打开 http://localhost:3457/dashboard
# 2. Gate 步骤列表：检查耗时展示
# 3. 统计卡片：检查总耗时卡片
# 4. 历史 Runs 列表：检查每条 run 的耗时
npx vitest run tests/
```

## 11. plan patch / contract change request 触发条件

| 条件 | 响应动作 |
|------|---------|
| TASK-001 发现需要修改 `gates.ts` 或 `agent-registry.ts` | 立即停止，向编排者提交 plan patch |
| TASK-001 的 Schema 变更导致现有查询崩溃 | 回滚后 plan patch，评估是否需要额外迁移步骤 |
| TASK-002 发现 TASK-001 的 `gate_entered_at` 字段语义与需求不符 | 提交 contract change request，不可直接修改 TASK-001 的代码 |
| TASK-003 发现 API 响应结构需要删除或重命名现有字段 | 停止，回编排者确认——需求规定仅追加 |
| TASK-004 发现需要修改 `server.ts` 或 `routes.ts` | 回编排者，不应由前端任务修改后端代码 |
| 任何任务发现需要修改 `gates.ts` 中的 Gate 定义 | 立即停止，Gate 定义变更影响所有流水线逻辑 |
| 单任务实际变更行数超过估计值 2 倍 | 暂停并向编排者报告实际情况，评估是否需要拆轮 |

## 12. Execution Packets

---

### task_id: TASK-001
### task_name: Gate 进入时间记录与耗时计算
### requirement_ids: REQ-001, REQ-002
### owner: backend-dev-expert
### objective: 为流水线系统添加 Gate 进入时间记录和 Gate 耗时计算能力，使每个 Gate 推进时自动记录时间并计算耗时
### in_scope:
- `pipeline_runs` 表新增 `gate_entered_at TEXT` 列（迁移脚本：`ALTER TABLE ADD COLUMN`，try/catch 包裹，遵循现有模式）
- `checkpoints` 表新增 `duration_seconds INTEGER` 列（同上迁移模式）
- 迁移脚本回填已有 `checkpoints` 的 `duration_seconds`（使用上一个 checkpoint 的 `passed_at` 作为近似进入时间；首个 checkpoint 的 duration 设为 NULL）
- `createPipelineRun` 创建时写入 `gate_entered_at = started_at`（Gate A 进入时间）
- `addCheckpoint` 新增可选参数 `durationSeconds`（第四个参数后追加），传入时写入 `duration_seconds` 列
- `advance_gate` MCP 工具增强：推进前读取 `gate_entered_at` → 计算 `duration = (now - gate_entered_at)` 秒数 → 调用 `addCheckpoint` 传入 `durationSeconds` → 将新 Gate 的进入时间写入 `gate_entered_at`
- `gate_jump` MCP 工具增强：跳转时写入目标 Gate 的 `gate_entered_at = now`（通过 UPDATE `pipeline_runs`）
- `server.ts` 的 `advance_gate` 和 `gate_jump` 在完成现有 FSM 检查后再执行新增的耗时逻辑
- TDD：先写单元测试验证 `advance_gate` 两阶段耗时（Gate A→B→C，B 的 duration 正确，C 的 entered_at 正确），再实现
### out_of_scope:
- `pipeline_runs.total_duration_seconds` 列（由 TASK-002 负责）
- `completeRun` / `abortRun` 的总耗时计算（由 TASK-002 负责）
- Web API 返回时长字段（由 TASK-003 负责）
- Web 面板 UI 展示（由 TASK-004 负责）
- CLI 输出（`pipeline_status` / `report_status`）不变
- Gate 定义和流水线逻辑不变
### input_documents:
- `docs/requirements/2026-05-09-gate-duration-stats.md`
- `docs/tasks/2026-05-09-gate-duration-stats-tasks.md`
### allowed_paths:
- `src/engine/db.ts`
- `src/engine/server.ts`
- `tests/db.test.ts`（在文件末尾追加新的 describe block）
### forbidden_paths:
- `src/engine/gates.ts`
- `src/engine/agent-registry.ts`
- `src/engine/agent-fs.ts`
- `src/web/routes.ts`
- `src/web/views/pipeline.html`
- `tests/gates.test.ts`
- `tests/docs-api.test.ts`
### dependencies:
- 无外部依赖。`addCheckpoint` 签名变更需同步更新 `server.ts` 中的 2 个调用点（`advance_gate` 内部 + `gate_jump` 内部无需传 duration），`routes.ts` 中的 1 个调用点（`/api/gate/advance`）通过可选参数兼容无需修改。
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
- `test-driven-development`
### parallel_group: []
### wait_for: []
### acceptance_criteria:
1. `pipeline_runs` 表存在 `gate_entered_at` 列，默认 NULL
2. `checkpoints` 表存在 `duration_seconds` 列，默认 NULL
3. 迁移脚本不因重复执行报错（try/catch 包裹 ALTER TABLE）
4. 迁移脚本正确回填已有 checkpoints 的 `duration_seconds`
5. `createPipelineRun` 创建时 `gate_entered_at` 不为 NULL（等于 `started_at`）
6. `advance_gate` 推进后：旧 Gate 的 checkpoint 有 `duration_seconds` 值，新 Gate 的 `gate_entered_at` 已更新
7. `gate_jump` 跳转后：目标 Gate 的 `gate_entered_at` 已更新
8. FSM 约束不变：不允许回退、不允许跳 Gate（`advance_gate` 的 `ti <= ci` 和 `ti > ci + 1` 检查通过）
9. 单元测试全部通过（`npx vitest run tests/`）
10. 现有 `db.test.ts` 和 `gates.test.ts` 中的测试全部通过（无退化）
### test_strategy: tdd
### handoff_notes:
- 向 TASK-002 传递：`db.ts` 最终 diff（特别是新增列的迁移位置、新增/修改的函数签名）、测试文件中 TASK-001 新增 describe block 的行号范围
- 确认 `addCheckpoint` 的新签名：`addCheckpoint(db, gate, advanceTo, sessionId, durationSeconds?)`
- 确认 `gate_entered_at` 写入方式：直接用 SQL UPDATE `pipeline_runs`，不要新增导出函数除非必要
### escalation_rule:
- 如需修改 `gates.ts`、`agent-registry.ts`、`agent-fs.ts`：立即停止，提交 plan patch 到编排者
- 如需修改 `routes.ts` 中的 `addCheckpoint` 调用：评估后如必须修改则提交 contract change request
- 如需修改 `pipeline_runs` 表的主键或索引：停止并回编排者

---

### task_id: TASK-002
### task_name: 任务总耗时计算
### requirement_ids: REQ-003
### owner: backend-dev-expert
### objective: 在任务完成或中止时自动计算并记录从 `started_at` 到 `completed_at` 的总耗时
### in_scope:
- `pipeline_runs` 表新增 `total_duration_seconds INTEGER` 列（迁移脚本：`ALTER TABLE ADD COLUMN`，try/catch 包裹）
- 迁移脚本回填已完成/已中止 run 的 `total_duration_seconds`（计算 `(julianday(completed_at) - julianday(started_at)) * 86400`）
- `completeRun` 函数增强：执行 `UPDATE pipeline_runs SET status='completed', completed_at=datetime('now')` 后，追加计算 `total_duration_seconds`
- `abortRun` 函数增强：同上模式，中止时也计算总耗时
- `started_at` 或 `completed_at` 缺失时不报错，`total_duration_seconds` 保持 NULL
- TDD：先写单元测试验证 `completeRun` 和 `abortRun` 的总耗时计算（含边界：started_at 为 NULL），再实现
### out_of_scope:
- `gate_entered_at` 和 `duration_seconds` 的 Schema 变更（已由 TASK-001 完成）
- `advance_gate` 或 `gate_jump` 逻辑变更
- Web API 返回 `total_duration_seconds` 字段（由 TASK-003 负责）
- Web 面板展示总耗时（由 TASK-004 负责）
### input_documents:
- `docs/requirements/2026-05-09-gate-duration-stats.md`
- `docs/tasks/2026-05-09-gate-duration-stats-tasks.md`
### allowed_paths:
- `src/engine/db.ts`
- `tests/db.test.ts`（在 TASK-001 的测试之后追加新的 describe block）
### forbidden_paths:
- `src/engine/server.ts`
- `src/engine/gates.ts`
- `src/engine/agent-registry.ts`
- `src/engine/agent-fs.ts`
- `src/web/routes.ts`
- `src/web/views/pipeline.html`
- `tests/gates.test.ts`
- `tests/docs-api.test.ts`
### dependencies:
- TASK-001 完成的 `db.ts`（含 `gate_entered_at` 列和 `duration_seconds` 列）
- TASK-001 完成的 `tests/db.test.ts`（TASK-002 在此文件基础上追加测试）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
- `test-driven-development`
### parallel_group: []
### wait_for: [TASK-001]
### acceptance_criteria:
1. `pipeline_runs` 表存在 `total_duration_seconds` 列，默认 NULL
2. 迁移脚本不因重复执行报错
3. 迁移脚本正确回填已完成/已中止 run 的 `total_duration_seconds`
4. `completeRun` 执行后 `total_duration_seconds` > 0（正常情况）
5. `abortRun` 执行后 `total_duration_seconds` > 0（正常情况）
6. `started_at` 为 NULL 时 `total_duration_seconds` 保持 NULL（不报错）
7. TASK-001 的 10 个验收标准全部保持通过（无退化）
8. 单元测试全部通过（`npx vitest run tests/`）
9. `db.ts` 中 TASK-001 新增的代码未被修改（仅在其后追加）
### test_strategy: tdd
### handoff_notes:
- 向 TASK-003 传递：`db.ts` 中 `total_duration_seconds` 列的位置、`completeRun`/`abortRun` 修改后的确切行号和函数体
- 确认迁移脚本的 ALTER TABLE 语句追加在 TASK-001 的迁移之后、其他逻辑之前
- 确认 `db.ts` 导出的 `completeRun` 和 `abortRun` 签名未变（内部逻辑增强，接口不变）
### escalation_rule:
- 如需修改 TASK-001 新增的任何代码（`gate_entered_at` 相关逻辑、`addCheckpoint` 签名等）：立即停止，提交 contract change request
- 如需修改 `server.ts`：停止并回编排者
- 如需新增 `db.ts` 的导出函数：正常新增即可，但必须追加在现有导出之后

---

### task_id: TASK-003
### task_name: Web API 返回时长数据
### requirement_ids: REQ-004
### owner: backend-api-expert
### objective: 在 `/api/pipeline` 和 `/api/pipeline-runs` 接口中追加 Gate 耗时和任务总耗时字段
### in_scope:
- `/api/pipeline` 的每个 gate 对象新增字段：`entered_at`、`duration_seconds`、`duration_display`
- `/api/pipeline-runs` 的每个 run 对象新增字段：`completed_at`、`total_duration_seconds`、`total_duration_display`
- 所有新增字段均为**追加**，不删除、不重命名现有字段
- 抽取 `formatDuration(seconds)` 辅助函数，格式化规则：
  - `<60秒` → `"X秒"`
  - `60秒 ≤ t < 3600秒` → `"X分Y秒"`（Y 为 0 时省略"Y秒"）
  - `t ≥ 3600秒` → `"X小时Y分Z秒"`（Y/Z 为 0 时省略对应部分）
  - `seconds` 为 null/undefined → 返回 `null`
- `/api/gate/advance` POST 端点不修改（`addCheckpoint` 可选参数兼容，无需传入 `durationSeconds`）
### out_of_scope:
- 数据库 Schema 变更或 CRUD 函数修改
- `server.ts` 中的 MCP 工具逻辑
- Web 面板 UI 修改（由 TASK-004 负责）
- 新增 API 端点（仅增强现有端点）
### input_documents:
- `docs/requirements/2026-05-09-gate-duration-stats.md`
- `docs/tasks/2026-05-09-gate-duration-stats-tasks.md`
### allowed_paths:
- `src/web/routes.ts`
### forbidden_paths:
- `src/engine/db.ts`
- `src/engine/server.ts`
- `src/engine/gates.ts`
- `src/engine/agent-registry.ts`
- `src/engine/agent-fs.ts`
- `src/web/views/pipeline.html`
- `tests/`（所有测试文件）
### dependencies:
- TASK-001 完成的 `db.ts`：`gate_entered_at`、`duration_seconds` 列存在
- TASK-002 完成的 `db.ts`：`total_duration_seconds` 列存在，`completeRun`/`abortRun` 写入该列
- `db.ts` 导出的 `getSessionRuns`、`getCheckpoints`、`getPipelineRun` 等查询函数（签名不变）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: []
### wait_for: [TASK-001, TASK-002]
### acceptance_criteria:
1. `/api/pipeline` 每个 gate 对象包含 `entered_at`（string|null）、`duration_seconds`（number|null）、`duration_display`（string|null）
2. `/api/pipeline-runs` 每个 run 对象包含 `completed_at`（string|null）、`total_duration_seconds`（number|null）、`total_duration_display`（string|null）
3. 现有字段（`session_id`、`platform`、`gate`、`passed` 等）保持不变
4. `formatDuration(3600)` 返回 `"1小时"`，`formatDuration(3661)` 返回 `"1小时1分1秒"`，`formatDuration(125)` 返回 `"2分5秒"`，`formatDuration(30)` 返回 `"30秒"`
5. `formatDuration(null)` 返回 `null`
6. API 响应 JSON 结构可通过 `curl` 手动验证
7. TypeScript 编译通过（`npx tsc --noEmit`）
8. 现有测试全部通过（`npx vitest run tests/`）
### test_strategy: test_after
### handoff_notes:
- 向 TASK-004 传递：`formatDuration` 函数的格式化规则（精确行为描述），API 响应示例（含新增字段的实际 JSON 片段）
- 确认新增字段在 `routes.ts` 中的具体行号，方便前端对接
- `duration_display` 为 null 时前端显示 `--`（降级逻辑由 TASK-004 负责）
### escalation_rule:
- 如需修改 `db.ts` 或新增查询函数：停止，提交 contract change request
- 如需修改 `/api/pipeline-runs` 的查询参数或响应顶层结构：停止并回编排者
- 如需删除或重命名任何现有 API 字段：停止，回编排者确认——需求规定仅追加

---

### task_id: TASK-004
### task_name: Web 面板时长展示
### requirement_ids: REQ-005, REQ-006, REQ-007
### owner: frontend-dev-expert
### objective: 在 Web 面板的三个 UI 区域（Gate 步骤列表、统计卡片、历史 Runs 列表）展示 Gate 耗时和任务总耗时
### in_scope:
- **Gate 步骤列表（REQ-005）**：
  - 每个 Gate 卡片增加时间信息行
  - 已通过的 Gate：显示 `开始: YYYY-MM-DD HH:mm:ss` + `通过: YYYY-MM-DD HH:mm:ss` + `耗时: X分X秒 / X小时X分`
  - 当前进行中的 Gate：显示 `开始: YYYY-MM-DD HH:mm:ss` + `进行中` 标签
  - 未开始的 Gate：不显示时间信息
  - 时间格式：`YYYY-MM-DD HH:mm:ss`（本地时间展示，无时区标记）
- **统计卡片（REQ-006）**：
  - 替换第 4 张统计卡片（"产物文件"）为总耗时卡片，或新增第 5 张卡片
  - 已完成任务：显示 `开始时间` / `完成时间` / `总耗时 X小时X分X秒`
  - 未完成任务：显示 `开始时间` / `进行中` / `已用时 X小时X分X秒`（基于 `started_at` 计算实时用时）
  - 实时用时通过已有的 5 秒轮询自动更新
- **历史 Runs 列表（REQ-007）**：
  - 每条 run 条目显示耗时信息
  - 已完成/已中止的 run：显示耗时（如 `1小时23分`）
  - 正在运行的 run：显示 `运行中`
- **降级展示**：`duration_display` / `entered_at` / `total_duration_display` 为 null 时显示 `--`
### out_of_scope:
- 修改后端 API 或数据库
- 修改 `pipeline.html` 之外的任何文件
- CLI 输出变更
- 新增 SSE 事件或 WebSocket
- 修改归档面板（`#panel-archive`）
### input_documents:
- `docs/requirements/2026-05-09-gate-duration-stats.md`
- `docs/tasks/2026-05-09-gate-duration-stats-tasks.md`
### allowed_paths:
- `src/web/views/pipeline.html`
### forbidden_paths:
- `src/engine/db.ts`
- `src/engine/server.ts`
- `src/engine/gates.ts`
- `src/engine/agent-registry.ts`
- `src/engine/agent-fs.ts`
- `src/web/routes.ts`
- `tests/`（所有测试文件）
### dependencies:
- TASK-003 完成的 `/api/pipeline` 响应结构（gate 对象含 `entered_at`、`duration_seconds`、`duration_display`）
- TASK-003 完成的 `/api/pipeline-runs` 响应结构（run 对象含 `completed_at`、`total_duration_seconds`、`total_duration_display`）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: []
### wait_for: [TASK-003]
### acceptance_criteria:
1. Gate 步骤列表：已通过 Gate 显示完整的开始/通过时间 + 耗时
2. Gate 步骤列表：进行中 Gate 显示开始时间 + "进行中"标签
3. Gate 步骤列表：未开始 Gate 无时间信息（与当前行为一致）
4. 统计卡片：新增或替换的耗时卡片展示格式正确
5. 统计卡片：卡片颜色与现有 4 张统计卡片风格一致（复用 `bg-white rounded-xl p-5 border border-slate-200 shadow-sm`）
6. 历史 Runs 列表：已完成/已中止 run 显示耗时，运行中 run 显示"运行中"
7. null 值降级：所有显示 `--` 的地方不出现 `undefined`、`null`、`NaN` 字样
8. 现有 UI 功能不退化：Gate 点击验证、会话切换、归档面板、文档抽屉
9. 浏览器控制台无 JavaScript 错误
10. `npx vitest run tests/` 全部通过（确认后端无退化）
### test_strategy: manual_only
### handoff_notes:
- 前端 `formatDuration` 逻辑需与 TASK-003 后端的 `formatDuration` 保持格式一致（如前后端都显示 `1小时15分` 而非 `1小时15分0秒`）
- 实时用时计算：使用 `Date.now() - new Date(started_at).getTime()` 获取毫秒差，除以 1000 得到秒数
- 时间格式化：使用 `new Date(isoString).toLocaleString('zh-CN', {...})` 或手动 `getFullYear()` + `padStart(2, '0')` 拼接
- 统计卡片区域当前为 4 列 grid（`grid-cols-4`），新增第 5 张卡片需改为 `grid-cols-5` 或替换现有卡片
### escalation_rule:
- 如需修改 `routes.ts`（如添加新的 API 端点）：停止，提交 contract change request 到编排者
- 如需修改 `server.ts`：停止并回编排者
- 如需修改 `db.ts`：停止并回编排者
- 如需修改归档面板渲染逻辑（`renderArchiveList`）：可在同文件中修改，但需在 handoff 中标注

---

## 13. 推荐的下一步

1. **编排者启动 Batch 1**：spawn `backend-dev-expert` 执行 TASK-001 的 Execution Packet
2. **Batch 1 验证通过后**：编排者 diff 确认 `db.ts` 状态，然后 spawn `backend-dev-expert` 执行 TASK-002
3. **Batch 2 验证通过后**：spawn `backend-api-expert` 执行 TASK-003
4. **Batch 3 验证通过后**：spawn `frontend-dev-expert` 执行 TASK-004
5. **全部完成后**：spawn `qa-review-expert` 审查所有变更，对照 REQ-001 ~ REQ-007 逐项确认
