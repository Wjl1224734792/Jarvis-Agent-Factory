# TASK-002 任务总耗时计算 — 后端实现文档

## 1. 当前实现目标

在 `completeRun()` 和 `abortRun()` 中自动计算并记录从 `started_at` 到 `completed_at` 的总耗时，存储于 `pipeline_runs.total_duration_seconds`。

## 2. 对应需求 ID / 任务 ID

- **任务 ID**: TASK-002
- **前置依赖**: TASK-001（Gate 进入时间记录与耗时计算，已完成）
- **需求**: 流水线任务总耗时自动记录

## 3. 输入依据

- 编排者分派的 TASK-002 Execution Packet（包含上下文、in_scope、out_of_scope、acceptance_criteria）
- TASK-001 已在 `db.ts` 中完成的 `gate_entered_at` 和 `duration_seconds` 列迁移
- `pipeline_runs` 表已有 `started_at` 和 `completed_at` 列

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/db.ts` | 追加 | 新增迁移脚本（第 170-185 行）; 增强 `completeRun`（第 372-382 行）; 增强 `abortRun`（第 384-394 行） |
| `tests/db.test.ts` | 追加 | 新增 `TASK-002 Total Duration Calculation` describe block，共 7 个测试用例 |

**未修改 TASK-001 代码**：TASK-001 的迁移脚本（第 145-168 行）、`addCheckpoint`、`createPipelineRun`、`updateRunGateEnteredAt` 均完好保留。

## 5. 实现说明

### 5.1 数据库迁移

```sql
-- 新增列（try/catch 包裹，重复执行不报错）
ALTER TABLE pipeline_runs ADD COLUMN total_duration_seconds INTEGER;

-- 回填已完成/已中止 run 的总耗时
-- 使用 julianday 计算天数差 × 86400，CAST 为整数秒
UPDATE pipeline_runs SET total_duration_seconds = CAST(
  (julianday(completed_at) - julianday(started_at)) * 86400 AS INTEGER
)
WHERE status IN ('completed', 'aborted')
  AND completed_at IS NOT NULL
  AND started_at IS NOT NULL
  AND total_duration_seconds IS NULL;
```

- `julianday()` 返回带小数的儒略日，差值乘以 86400 得到秒数
- `CAST(AS INTEGER)` 向零取整（相当于 `Math.trunc`），而非四舍五入
- WHERE 子句同时检查 `started_at IS NOT NULL` 和 `completed_at IS NOT NULL`，任一缺失时不计算

### 5.2 completeRun 增强

```typescript
export function completeRun(db, runId) {
  // 原有逻辑不变
  db.prepare("UPDATE pipeline_runs SET status='completed', completed_at=datetime('now') WHERE id=?").run(runId);
  // 追加：计算 total_duration_seconds
  db.prepare(`
    UPDATE pipeline_runs SET total_duration_seconds = CAST(
      (julianday(completed_at) - julianday(started_at)) * 86400 AS INTEGER
    )
    WHERE id = ? AND started_at IS NOT NULL AND completed_at IS NOT NULL
  `).run(runId);
}
```

### 5.3 abortRun 增强

与 `completeRun` 同模式，状态设为 `'aborted'`。

### 5.4 边界条件处理

- `started_at` 或 `completed_at` 为 NULL 时：WHERE 子句 `IS NOT NULL` 守卫，UPDATE 不匹配任何行，`total_duration_seconds` 保持 NULL
- 迁移脚本重复执行：`ALTER TABLE ADD COLUMN` 用 `try { } catch {}` 包裹，重复执行不报错
- 回填幂等：`total_duration_seconds IS NULL` 条件确保已计算的不重复计算

## 6. 测试和验证结果

### 测试概览

```
Test Files  1 passed (1)
Tests      30 passed (30)
```

| 测试用例 | 对应 AC | 状态 |
|---------|---------|------|
| `pipeline_runs 表存在 total_duration_seconds 列` | AC1 | PASS |
| `迁移脚本重复执行不报错` | AC2 | PASS |
| `迁移脚本回填已完成 run 的 total_duration_seconds` | AC3 | PASS |
| `迁移脚本回填已中止 run 的 total_duration_seconds` | AC3 | PASS |
| `completeRun 执行后 total_duration_seconds > 0` | AC4 | PASS |
| `abortRun 执行后 total_duration_seconds > 0` | AC5 | PASS |
| `active run 的 completed_at 为 NULL 时 total_duration_seconds 保持 NULL` | AC6 | PASS |

### 存量测试回归

- TASK-001 的 7 个测试：全部通过
- 其他存量测试（Sessions CRUD、Pipeline CRUD、Checkpoints、Agent Config、Pipeline Run Task Name）：全部通过
- 共 23 个存量测试 + 7 个新增测试 = 30 个全通过

### 自动化验证

| 检查项 | 结果 |
|--------|------|
| `npx tsc --noEmit` | 零类型错误 |
| `npx eslint src/engine/db.ts tests/db.test.ts` | 零警告 |
| `npx vitest run tests/db.test.ts` | 30/30 通过 |

## 7. 数据与接口边界

### 表结构变更

```sql
-- pipeline_runs 新增列
total_duration_seconds INTEGER  -- NULL 表示未计算（active run 或 started_at/completed_at 缺失）
```

### 函数签名（无变化）

`completeRun(db, runId)` 和 `abortRun(db, runId)` 签名不变，仅内部逻辑增强。

### 幂等性

- 迁移脚本：`total_duration_seconds IS NULL` 条件确保幂等
- `completeRun`/`abortRun`：每次调用重新计算并覆盖 `total_duration_seconds`（状态变化时数据应保持最新）

## 8. 风险 / 未解决项

| 风险 | 评估 | 缓解 |
|------|------|------|
| `julianday` 精度导致 CAST 截断 | 低风险（生产环境 run 通常持续数分钟至数小时） | CAST 截断误差 < 1 秒，可忽略 |
| 跨时区 ISO 时间字符串 | SQLite `julianday` 支持 ISO 8601 格式含时区 | 当前代码使用 `datetime('now')` 无时区后缀，一致 |
| `started_at` 在校验中不可能为 NULL（NOT NULL 约束） | 极低风险 | WHERE 子句守卫仅作为防御性编程 |

## 9. 需要前端配合的点

- 无。`total_duration_seconds` 是纯后端数据列，前端只需在显示 run 数据时读取此字段即可（不属于 TASK-002 范围）。
- 后续 TASK-003（Web API）和 TASK-004（Web 面板）将消费此字段。

## 10. 推荐的下一步

1. TASK-003：Web API 暴露 `total_duration_seconds`（`GET /api/runs` 等端点）
2. TASK-004：Web 面板展示任务总耗时
3. 前后端联调确认面板正确展示耗时数据
