# 任务分解文档：流程面板 Gate 任务时长统计

> 需求文档：`docs/requirements/2026-05-09-gate-duration-stats.md`
> 状态：已确认 | 日期：2026-05-09 | 拆分策略：垂直切片 + 共享区域串行

---

## 1. 任务概览

| TASK | 关联 REQ | 名称 | 类型 | 优先级 | 变更行数 | 风险 |
|------|---------|------|------|--------|---------|------|
| TASK-001 | REQ-001, REQ-002 | Gate 进入时间记录与耗时计算 | DDD + TDD | P0 | M (~150) | 高 |
| TASK-002 | REQ-003 | 任务总耗时计算 | TDD | P0 | S (~80) | 中 |
| TASK-003 | REQ-004 | Web API 返回时长数据 | 直接开发 | P1 | S (~80) | 低 |
| TASK-004 | REQ-005, REQ-006, REQ-007 | Web 面板时长展示 | 直接开发 | P1 | M (~150) | 低 |

**总变更估算：~460 行，单轮次交付。**

**交付顺序（串行链）：** TASK-001 → TASK-002 → TASK-003 → TASK-004

**并行机会：** TASK-003 与 TASK-002 的 `server.ts` 改动无重叠（routes.ts 不依赖 `completeRun`/`abortRun` 的改动），但如果 TASK-002 未完成则 API 返回的 `total_duration_seconds` 始终为 NULL。建议顺序执行。

---

## 2. 任务分解列表

### TASK-001：Gate 进入时间记录与耗时计算

- **task_id**: TASK-001
- **requirement_ids**: [REQ-001, REQ-002]
- **type**: DDD + TDD（聚合边界清晰 + 核心业务规则需测试验证）
- **priority**: P0
- **estimated_lines**: M (~150 行)
- **test_strategy**: tdd
- **dependencies**: 无
- **风险等级**: 高
- **风险描述**：
  1. 数据迁移涉及已有 `checkpoints` 表回填耗时数据，必须处理缺失基准时间的情况
  2. `advance_gate` 当前逻辑是核心热路径，加字段不能破坏现有 FSM 约束
  3. `gate_jump` 跳过的 Gate 无 `gate_entered_at`，进入时间只能从跳转时刻算
- **修改文件**：
  - `src/engine/db.ts`：Schema 迁移 + CRUD 更新
  - `src/engine/server.ts`：`advance_gate`、`gate_jump` 工具逻辑
- **完成标准**：
  1. `pipeline_runs` 表新增 `gate_entered_at TEXT` 列，默认 NULL
  2. `checkpoints` 表新增 `duration_seconds INTEGER` 列，默认 NULL
  3. 迁移脚本：`ALTER TABLE … ADD COLUMN` 使用 try/catch 包裹（遵循现有模式）；回填已有 `checkpoints` 的 `duration_seconds`（用上一个 checkpoint 的 `passed_at` 作为近似进入时间）；已完成的 run 的 `gate_entered_at` 无需回填（REQ-001 明确"已有 run 无需回填"）
  4. `createPipelineRun` 创建时写入 `gate_entered_at = started_at`（Gate A 进入时间）
  5. `addCheckpoint` 新增可选参数 `durationSeconds`，有值时写入 `duration_seconds`
  6. `advance_gate` 推进时：
     - 读取当前 run 的 `gate_entered_at`
     - 计算 `duration = (now - gate_entered_at)` 的秒数
     - 调用 `addCheckpoint` 时传入 `durationSeconds`
     - 将新 Gate 的进入时间写入 `gate_entered_at`（通过 `updateRunGate` 扩展或新函数）
  7. `gate_jump` 跳转时：写入目标 Gate 的 `gate_entered_at = now`
  8. 单元测试：验证 `advance_gate` 两阶段耗时计算正确性（模拟 Gate A→B→C，B 的 duration 正确，C 的 entered_at 正确）
  9. 现有 `advance_gate` FSM 约束（不允许回退、不允许跳 Gate）不退化

---

### TASK-002：任务总耗时计算

- **task_id**: TASK-002
- **requirement_ids**: [REQ-003]
- **type**: TDD
- **priority**: P0
- **estimated_lines**: S (~80 行)
- **test_strategy**: tdd
- **dependencies**: [TASK-001]（共享 `db.ts` 文件，且 Schema 变更由 TASK-001 完成）
- **风险等级**: 中
- **风险描述**：
  1. 与 TASK-001 共享 `db.ts` 文件的 `pipeline_runs` 表，需确保迁移脚本不冲突
  2. `started_at` 和 `completed_at` 均为 TEXT 格式（ISO 8601），SQLite 的 `datetime()` 函数可计算差值但需验证精度
- **修改文件**：
  - `src/engine/db.ts`：Schema 迁移 + `completeRun`/`abortRun` 逻辑更新
  - `src/engine/server.ts`：无直接修改（MCP 工具通过 `completeRun`/`abortRun` 间接生效）
- **完成标准**：
  1. `pipeline_runs` 表新增 `total_duration_seconds INTEGER` 列，默认 NULL
  2. 迁移脚本回填已完成/已中止 run 的 `total_duration_seconds`（计算 `(julianday(completed_at) - julianday(started_at)) * 86400`）
  3. `completeRun` 执行时同步计算并写入 `total_duration_seconds`
  4. `abortRun` 执行时同步计算并写入 `total_duration_seconds`
  5. 单元测试：验证已完成 run 和已中止 run 的 `total_duration_seconds` 均为正整数
  6. `started_at` 或 `completed_at` 缺失时不报错，`total_duration_seconds` 保持 NULL

---

### TASK-003：Web API 返回时长数据

- **task_id**: TASK-003
- **requirement_ids**: [REQ-004]
- **type**: 直接开发
- **priority**: P1
- **estimated_lines**: S (~80 行)
- **test_strategy**: test_after（手工 curl 验证 + API 响应快照对比）
- **dependencies**: [TASK-001, TASK-002]（需要 DB 层新字段已就绪，API 才能读到数据）
- **风险等级**: 低
- **修改文件**：
  - `src/web/routes.ts`
- **完成标准**：
  1. `/api/pipeline` 的每个 gate 对象新增字段：
     - `entered_at`：字符串或 null（来自 `pipeline_runs.gate_entered_at`）
     - `duration_seconds`：整数或 null（来自 `checkpoints.duration_seconds`）
     - `duration_display`：人类可读格式或 null（如 `"3分42秒"`、`"1小时15分"`）
  2. `/api/pipeline-runs` 的每个 run 对象新增字段：
     - `completed_at`：字符串或 null（已有字段，确保返回）
     - `total_duration_seconds`：整数或 null
     - `total_duration_display`：人类可读格式或 null
  3. 新增字段均为**追加**，不删除或重命名现有字段
  4. 人类可读格式化逻辑抽取为独立辅助函数（可被前端复用或至少保持前后端格式一致），格式规则：
     - `<60秒` → `"X秒"`
     - `60秒 ≤ t < 3600秒` → `"X分Y秒"`
     - `t ≥ 3600秒` → `"X小时Y分Z秒"`
  5. `duration_display` / `total_duration_display` 为 null 时前端不做降级处理（TASK-004 负责降级展示）

---

### TASK-004：Web 面板时长展示

- **task_id**: TASK-004
- **requirement_ids**: [REQ-005, REQ-006, REQ-007]
- **type**: 直接开发
- **priority**: P1
- **estimated_lines**: M (~150 行)
- **test_strategy**: manual_only（浏览器手动验证三个 UI 区域）
- **dependencies**: [TASK-003]（需要 API 返回新字段）
- **风险等级**: 低
- **修改文件**：
  - `src/web/views/pipeline.html`
- **完成标准**：
  1. **Gate 步骤列表（REQ-005）**：
     - 每个 Gate 步骤显示三行信息：`开始: YYYY-MM-DD HH:mm:ss`、`通过: YYYY-MM-DD HH:mm:ss`、`耗时: X分X秒 / X小时X分`
     - 已通过的 Gate：展示完整三行
     - 当前进行中的 Gate：显示开始时间和"进行中"标签，通过时间和耗时留空或显示 `--`
     - 未开始的 Gate：不显示时间信息
     - 时间格式：`YYYY-MM-DD HH:mm:ss`（ISO 8601 本地展示，不显示时区标记）
  2. **统计卡片（REQ-006）**：
     - 在现有统计卡片区域新增一张耗时卡片
     - 格式：`开始时间` / `完成时间` / `总耗时 X小时X分X秒`
     - 未完成任务：完成时间显示"进行中"，总耗时显示从开始到现在的实时用时
     - 卡片颜色与现有统计卡片风格一致（复用现有 CSS class）
  3. **历史 Runs 列表（REQ-007）**：
     - 每个 run 条目显示耗时（如 `1小时23分`）
     - 已完成/已中止的 run：展示完整耗时
     - 正在运行的 run：显示"运行中"
  4. **降级展示**：API 返回的 `duration_display` / `entered_at` 为 null 时，对应位置显示 `--`（不报错、不显示 undefined/null 字样）

---

## 3. DDD 分类

| 任务 | DDD 判定 | 理由 |
|------|---------|------|
| TASK-001 | **DDD** | `advance_gate` 涉及聚合根 `PipelineRun` 与子实体 `Checkpoint` 的一致性操作（记录进入时间 + 计算耗时 + 更新 Gate + 写入 Checkpoint，跨 3 张表且需事务一致性）。Gate 状态转换是核心业务规则。 |
| TASK-002 | 不需要 DDD | `completeRun`/`abortRun` 是聚合根上的单一操作，不涉及跨聚合协调。但需要 TDD 验证计算正确性。 |

**DDD 实现要求（TASK-001）**：
- `PipelineRun` 聚合根封装 `gate_entered_at` 和 `total_duration_seconds`
- `Checkpoint` 实体封装 `duration_seconds`
- `advance_gate` 领域服务确保：先计算旧 Gate 耗时 → 写 Checkpoint → 更新 current_gate → 设置新 Gate 进入时间，中途失败不产生不一致数据

---

## 4. TDD 与直接开发分类

| 分类 | 任务 | 测试策略 |
|------|------|---------|
| **TDD** | TASK-001 | 红→绿→重构。先写测试验证 `advance_gate` 两阶段耗时计算，再实现。 |
| **TDD** | TASK-002 | 红→绿→重构。先写测试验证 `completeRun`/`abortRun` 总耗时计算（含边界：`started_at` 为 NULL）。 |
| **直接开发** | TASK-003 | test_after。API 响应结构变更，手工 curl 验证 + 快照对比。 |
| **直接开发** | TASK-004 | manual_only。UI 展示变更，浏览器验证三个 UI 区域。 |

---

## 5. 风险任务

| 任务 | 风险等级 | 风险项 | 缓解措施 |
|------|---------|--------|---------|
| TASK-001 | **高** | 数据迁移回填 `checkpoints.duration_seconds`，基准时间可能不存在（首个 checkpoint 无上一个 `passed_at`） | 首个 checkpoint 的 `duration_seconds` 设为 NULL；回填脚本使用 `try/catch` 包裹 |
| TASK-001 | 高 | 共享 `db.ts` 和 `server.ts`，其他任务可能串行等待 | 明确 TASK-002 → TASK-003 → TASK-004 串行依赖 |
| TASK-002 | 中 | SQLite `julianday()` 计算 TEXT 格式时间差，需验证精度 | 单元测试覆盖边界（同年、跨年、跨时区） |

---

## 6. 文件所有权与共享路径风险

| 文件 | 所有任务 | 共享冲突 | 处理方式 |
|------|---------|---------|---------|
| `src/engine/db.ts` | TASK-001, TASK-002 | **冲突** — 两个任务均添加 ALTER TABLE 迁移 + 修改 CRUD 函数 | 串行执行：TASK-001 完成后 TASK-002 在其基础上增量添加 |
| `src/engine/server.ts` | TASK-001 | **无冲突** — 仅 TASK-001 修改（TASK-002 不接触 server.ts） | 无 |
| `src/web/routes.ts` | TASK-003 | 仅 TASK-003 修改 | 无 |
| `src/web/views/pipeline.html` | TASK-004 | 仅 TASK-004 修改 | 无 |

**关键提醒**：
- `db.ts` 中的迁移脚本必须严格遵循现有模式（ALTER TABLE 用 try/catch 包裹），新迁移追加在现有迁移之后、`initSchema` 函数末尾
- `advance_gate` 是 MCP 工具层的核心热路径，改动时保持 FSM 约束不变

---

## 7. 推荐交付顺序

```
TASK-001（Gate 进入时间 + 耗时）
    │
    ▼
TASK-002（任务总耗时）
    │
    ▼
TASK-003（Web API 时长字段）
    │
    ▼
TASK-004（Web 面板UI展示）
```

**理由**：
- TASK-001/002 必须串行（共享 `db.ts`）
- TASK-003 依赖 DB 层新字段就绪
- TASK-004 依赖 API 层返回新字段
- 无法并行化：每个后续任务都依赖前序任务的产物

**单轮次总变更 ~460 行，无需分轮。**

---

## 8. 推荐的下一步

1. **planner** 读取本任务文档，制定执行计划
2. **impl** 按 TASK-001 → TASK-002 → TASK-003 → TASK-004 顺序实现
3. 每个 TASK 完成后在 `checkpoints` 表记录 Gate 通过状态
4. TASK-004 完成后，在浏览器中整体验证三个 UI 区域

---

## 9. REQ → TASK 追溯矩阵

| REQ | TASK | 覆盖状态 |
|-----|------|---------|
| REQ-001（Gate 进入时间记录） | TASK-001 | 完全覆盖 |
| REQ-002（Gate 耗时计算） | TASK-001 | 完全覆盖 |
| REQ-003（任务总耗时计算） | TASK-002 | 完全覆盖 |
| REQ-004（Web API 返回时长数据） | TASK-003 | 完全覆盖 |
| REQ-005（Gate 步骤列表展示耗时） | TASK-004 | 完全覆盖 |
| REQ-006（统计卡片增加总耗时） | TASK-004 | 完全覆盖 |
| REQ-007（历史 Runs 列表展示耗时） | TASK-004 | 完全覆盖 |

**所有 7 个 REQ 均已映射到至少 1 个 TASK，无遗漏。**

---

## 10. 验证清单

- [x] 所有 REQ-XXX 至少映射到 1 个 TASK
- [x] 任务使用垂直切片策略（每个任务交付完整功能路径）
- [x] 无水平切片（按技术层级拆分的任务）
- [x] 每个任务有明确的优先级和 test_strategy
- [x] 依赖关系已明确（TASK-001 → TASK-002 → TASK-003 → TASK-004，无循环依赖）
- [x] 并行机会已识别（无可行并行，已说明理由）
- [x] 风险任务已标注（TASK-001 高风险，TASK-002 中风险）
- [x] 单轮次总变更不超过 1000 行（~460 行）
- [x] 共享区域已指定串行依赖（`db.ts` 由 TASK-001 先改，TASK-002 后改）
- [x] 每个任务有可独立验证的完成标准
