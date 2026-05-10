# 实现文档：TASK-001 — Gate 进入时间记录与耗时计算

> 实现日期: 2026-05-09 | 状态: completed | 对应需求: REQ-001, REQ-002

---

## 1. 实现目标

为流水线系统添加 Gate 进入时间记录与 Gate 耗时计算能力，支持 `advance_gate` 推进时自动记录耗时和 `gate_jump` 跳转时更新进入时间。

---

## 2. 对应需求 ID / 任务 ID

- 需求文档: `docs/requirements/2026-05-09-gate-duration-stats.md`
- REQ-001: Gate 进入时间记录
- REQ-002: Gate 耗时计算
- TASK-001

---

## 3. 输入依据

- 需求文档 `docs/requirements/2026-05-09-gate-duration-stats.md`
- 现有代码: `src/engine/db.ts` (数据访问层), `src/engine/server.ts` (MCP 工具)
- 现有测试: `tests/db.test.ts`

---

## 4. 变更文件与变更范围

| 文件 | 变更类型 | 行数变化 |
|------|---------|---------|
| `src/engine/db.ts` | Schema 迁移 + CRUD 更新 + 新函数 | +30 行 |
| `src/engine/server.ts` | MCP 工具逻辑增强 | +15 行 |
| `tests/db.test.ts` | 新增 8 个单元测试 | +85 行 |

**未修改的文件（符合 allowed_paths 约束）：**
- `src/engine/gates.ts` — 无变更
- `src/engine/agent-registry.ts` — 无变更
- `src/engine/agent-fs.ts` — 无变更
- `src/web/routes.ts` — 无变更（`addCheckpoint` 签名通过可选参数向后兼容）

---

## 5. 实现说明

### 5.1 数据库 Schema 迁移 (`db.ts`)

**新增列：**
- `pipeline_runs.gate_entered_at TEXT` — 当前 Gate 的进入时间，默认 NULL
- `checkpoints.duration_seconds INTEGER` — Gate 耗时（秒），默认 NULL

**迁移模式：** 使用 `try { ALTER TABLE ... } catch {}` 包裹，确保重复执行不报错。遵循现有迁移模式（如 `archived`、`pinned` 列）。

**回填脚本：** 使用 SQLite 窗口函数 `LAG` 为已有 checkpoints 回填耗时。对同一 session 内按 `passed_at` 升序排列的 checkpoints，取上一条的 `passed_at` 作为本 Gate 近似进入时间，差值即为耗时。首个 checkpoint 的 duration 保持 NULL。使用 `strftime('%s')` 获取 Unix 时间戳避免浮点精度问题。

### 5.2 createPipelineRun 增强

创建 run 时同时写入 `gate_entered_at = datetime('now')`（与 `started_at` 一致），表示 Gate A 的进入时间。

```sql
INSERT INTO pipeline_runs (..., started_at, gate_entered_at)
VALUES (..., datetime('now'), datetime('now'))
```

### 5.3 addCheckpoint 签名扩展

新增可选参数 `durationSeconds: number | undefined = undefined`。传入时写入 `duration_seconds` 列，不传时保留 NULL。向后兼容所有现有调用点（`routes.ts` 无需修改）。

### 5.4 updateRunGateEnteredAt 新函数

新增 `updateRunGateEnteredAt(db, runId, isoTime)` 用于更新 run 的 Gate 进入时间。由 `advance_gate` 和 `gate_jump` 调用。

### 5.5 advance_gate MCP 工具增强

推进流程（在 FSM 验证通过后）：
1. 读取当前 run 的 `gate_entered_at`，通过 `strftime('%s', ...)` 转为 Unix 时间戳
2. 计算耗时：`duration = Math.floor(Date.now() / 1000) - enteredEpoch`
3. 调用 `addCheckpoint(db, cur, gate, sid, durationSeconds)` 记录耗时
4. 调用 `updateRunGateEnteredAt(db, runId, new Date().toISOString())` 写入新 Gate 进入时间

响应中新增 `duration_seconds` 字段返回本次 Gate 耗时。

### 5.6 gate_jump MCP 工具增强

跳转时调用 `updateRunGateEnteredAt(db, runId, new Date().toISOString())` 写入目标 Gate 的进入时间。

---

## 6. 测试与验证结果

### 6.1 TDD 流程

```
RED → 8 个新测试失败（功能未实现）
GREEN → 实现后全部通过
REFACTOR → 移除未使用导入，lint 零警告
```

### 6.2 测试用例（8 个新增）

| 测试 | 验收标准 | 结果 |
|------|---------|------|
| `pipeline_runs 表存在 gate_entered_at 列` | AC1 | PASS |
| `checkpoints 表存在 duration_seconds 列` | AC2 | PASS |
| `迁移脚本重复执行不报错` | AC3 | PASS |
| `迁移脚本回填已有 checkpoints 的 duration_seconds` | AC4 | PASS |
| `createPipelineRun 创建时写入 gate_entered_at` | AC5 | PASS |
| `addCheckpoint 传入 durationSeconds 时写入 duration_seconds` | AC6 | PASS |
| `addCheckpoint 不传 durationSeconds 时 duration_seconds 为 NULL` | 向后兼容 | PASS |
| `updateRunGateEnteredAt 更新 Gate 进入时间` | AC7 | PASS |

### 6.3 自动化验证

- **测试**: 38/38 通过（3 个测试文件，0 退化）
- **Type-check**: `tsc --noEmit` — 0 错误
- **Lint**: ESLint — 0 警告 0 错误

---

## 7. 数据与接口边界

### 7.1 数据格式

| 字段 | 表 | 类型 | 格式 | 默认值 |
|------|-----|------|------|--------|
| `gate_entered_at` | pipeline_runs | TEXT | ISO 8601 / SQLite datetime | NULL |
| `duration_seconds` | checkpoints | INTEGER | 秒 | NULL |

`gate_entered_at` 支持两种格式：
- SQLite `datetime('now')` 格式（`YYYY-MM-DD HH:MM:SS`）— `createPipelineRun` 使用
- JavaScript ISO 8601 格式（`YYYY-MM-DDTHH:MM:SS.sssZ`）— `updateRunGateEnteredAt` 使用

两者均由 SQLite `strftime('%s', ...)` 和 JavaScript `new Date()` 正确解析。

### 7.2 函数签名变更

```typescript
// 变更前
addCheckpoint(db, gate, advanceTo, sessionId)

// 变更后
addCheckpoint(db, gate, advanceTo, sessionId, durationSeconds?: number)
```

通过可选参数向后兼容，`routes.ts` 无需修改。

### 7.3 新增导出

```typescript
export function updateRunGateEnteredAt(db, runId, isoTime)
```

---

## 8. 风险 / 未解决项

- **TASK-002 依赖**: `completeRun` / `abortRun` 的总耗时计算由 TASK-002 实现，TASK-001 已提供 `gate_entered_at` 和 `duration_seconds` 基础数据。
- **routes.ts 调用点**: `routes.ts` 中的 `addCheckpoint` 调用通过可选参数兼容，不传 `durationSeconds`。后续 TASK-004 可增强。
- **gate_entered_at 格式混用**: 数据库中同时存在 SQLite datetime 格式和 ISO 8601 格式。两者互操作正常，但在直接 SQL 比较时需注意。

---

## 9. 需要前端配合的点

- 后续 TASK-004 可以通过 query `gate_entered_at` 和 `duration_seconds` 展示 Gate 开始时间和耗时
- `advance_gate` 响应中已包含 `duration_seconds` 字段供实时使用

---

## 10. 推荐的下一步

1. **TASK-002** — `pipeline_runs.total_duration_seconds` 列 + `completeRun` / `abortRun` 总耗时计算
2. **TASK-003** — Web API 返回时长字段
3. **TASK-004** — Web 面板 UI 展示

---

## 附录：变更 diff 摘要

### db.ts
- `initSchema()`: 新增 3 段迁移（gate_entered_at、duration_seconds、回填）
- `createPipelineRun()`: INSERT 语句增加 `gate_entered_at` 列
- `addCheckpoint()`: 新增可选参数 `durationSeconds`，条件分支写入 `duration_seconds`
- 新增 `updateRunGateEnteredAt()` 导出函数

### server.ts
- import 新增 `updateRunGateEnteredAt`
- `advance_gate`: 新增耗时计算逻辑（10 行），调用 `addCheckpoint` 传入 duration，调用 `updateRunGateEnteredAt`
- `gate_jump`: 新增 `updateRunGateEnteredAt` 调用

### tests/db.test.ts
- import 新增 `updateRunGateEnteredAt`
- 末尾追加 `describe('TASK-001 Gate Duration Stats')` 含 8 个测试
