# TASK-003: Web API 返回时长数据 — 实现报告

## 1. 当前实现目标

在 `/api/pipeline` 和 `/api/pipeline-runs` 接口中追加 Gate 耗时和任务总耗时字段。

## 2. 对应需求 ID / 任务 ID

- **Task**: TASK-003
- **上游依赖**: TASK-001（Checkpoint 耗时字段）、TASK-002（Run 总耗时字段）— 已完成数据库 Schema 变更

## 3. 变更文件 / 变更范围

| 文件 | 变更类型 | summary |
|------|---------|---------|
| `src/web/routes.ts` | 修改 | +43 / -6 行 |

**未修改文件**: `src/engine/db.ts`（禁止路径）、`src/engine/gates.ts`（禁止路径）、`src/engine/server.ts`（禁止路径）、`tests/`（禁止路径）

## 4. 路由清单

| 方法 | 路径 | 变更类型 | 说明 |
|------|------|---------|------|
| GET | `/api/pipeline` | 字段追加 | 每个 gate 对象新增 `entered_at`, `duration_seconds`, `duration_display` |
| GET | `/api/pipeline-runs` | 字段追加 | 每个 run 对象新增 `total_duration_display`（`completed_at` 和 `total_duration_seconds` 已由 SQL SELECT \* 返回） |

## 5. 请求/响应格式说明

### GET /api/pipeline

**gate 对象新字段**（追加到现有 `gate`、`passed`、`artifacts` 之后）：

```typescript
{
  "gate": "Gate A",
  "passed": true,
  "artifacts": ["...md"],
  "entered_at": "2026-05-09 11:30:00",       // 新增：来自 active run 的 gate_entered_at
  "duration_seconds": 125,                     // 新增：来自 checkpoint.duration_seconds
  "duration_display": "2分5秒"                 // 新增：formatDuration(duration_seconds)
}
```

**数据来源**:
- `entered_at` — 取自当前 session 的 active run 的 `pipeline_runs.gate_entered_at` 字段
- `duration_seconds` — 取该 gate 的 checkpoint 记录的 `duration_seconds` 字段（若 gate 未完成则为 null）
- `duration_display` — `formatDuration(duration_seconds)` 格式化的中文可读字符串

### GET /api/pipeline-runs?session_id=xxx

**run 对象新字段**（追加到现有字段之后）：

```typescript
{
  "id": "run_1715000000000",
  "session_id": "xxx",
  "project": "jarvis",
  "pipeline_type": "full",
  "current_gate": "Gate B",
  "status": "active",
  "started_at": "2026-05-09 11:00:00",
  "completed_at": "2026-05-09 11:30:00",       // 已有但新增显式返回（SQL SELECT * 已包含）
  "total_duration_seconds": 1800,               // 已有但新增显式返回（SQL SELECT * 已包含）
  "total_duration_display": "30分"              // 新增
}
```

## 6. 辅助函数: formatDuration

```typescript
function formatDuration(seconds: number | null | undefined): string | null
```

格式化规则：

| 输入 | 输出 | 说明 |
|------|------|------|
| `null` / `undefined` / `< 0` | `null` | 无有效时长 |
| `30` | `"30秒"` | < 60 秒 |
| `60` | `"1分"` | 满 60 秒，Y 秒为 0 时省略 |
| `125` | `"2分5秒"` | < 3600 秒 |
| `3600` | `"1小时"` | 满 3600 秒，Z 秒为 0 时省略 |
| `3661` | `"1小时1分1秒"` | 完整格式 |

## 7. 中间件与错误处理说明

无变更。本任务仅在现有 API 端点响应中追加字段，不涉及新增路由、中间件或错误处理逻辑。

## 8. 测试和验证结果

### TypeScript 类型检查

```
> npm run typecheck
> tsc --noEmit
```
通过，零类型错误。

### 单元测试

```
> npm run test
> vitest run

Test Files  3 passed (3)
     Tests  45 passed (45)
```
全部 45 个测试通过，零回归。

### 验收标准对照

| # | 标准 | 状态 |
|---|------|------|
| 1 | `/api/pipeline` gate 对象含 `entered_at`、`duration_seconds`、`duration_display` | 已实现 |
| 2 | `/api/pipeline-runs` run 对象含 `completed_at`、`total_duration_seconds`、`total_duration_display` | 已实现 |
| 3 | 现有字段保持不变 | 已确认（字段追加，无删除/重命名） |
| 4 | `formatDuration` 格式化规则符合规范 | 已验证：null/30/125/3600/3661 均正确 |
| 5 | TypeScript 编译通过 | 通过 |
| 6 | 现有测试全部通过 | 通过 |

## 9. 风险 / 未解决项

- `entered_at` 取自 `pipeline_runs.gate_entered_at`（run 级别字段），所有 gate 显示同一值。若后续需要每个 gate 独立 `entered_at`，需要在 checkpoints 表增加 `entered_at` 列或在 pipeline_runs 增加 gate 级别的进入时间记录。
- 无其他未解决项。

## 10. 推荐的下一步

- TASK-004: Web 面板 UI 已可消费这些新字段，建议在 Dashboard 展示 Gate 耗时和总耗时。
