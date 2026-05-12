# TASK-003: Gate 时间追踪修复 - 后端实现文档

## 1. 当前实现目标

修复 gate 时间追踪，确保：
- `pipeline_init` MCP 工具调用后 `gate_entered_at` 以 JS ISO 格式写入
- REST `POST /api/gate/advance` 端点正确计算 `duration_seconds` 并写入 checkpoint
- REST `POST /api/gate/advance` 端点正确更新新 gate 的 `gate_entered_at`

## 2. 对应需求 ID / 任务 ID

- 需求: REQ-033（Dashboard 简化 + MCP 统计 + 文档平台化）
- 任务: TASK-003

## 3. 输入依据

- `docs/requirements/2026-05-12-dashboard-simplify-mcp-stats-docs-platform.md`
- `docs/tasks/2026-05-12-dashboard-simplify-tasks.md`
- MCP `advance_gate` 工具（`src/engine/server.ts` 518-532 行）的已有正确实现作为参照

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/server.ts` | 新增 1 行 | `pipeline_init` 工具中添加 `updateRunGateEnteredAt` 调用 |
| `src/web/routes.ts` | 新增 12 行 + 修改 import | 添加 `updateRunGate`/`updateRunGateEnteredAt` 导入；添加 `duration_seconds` 计算并传递给 `addCheckpoint`；添加 `updateRunGate`/`updateRunGateEnteredAt` 调用 |
| `tests/db.test.ts` | 新增 10 行 | 新增测试验证 `createPipelineRun` 的 `gate_entered_at` 为有效 ISO 时间戳 |

## 5. 实现说明

### 5.1 `src/engine/server.ts` — `pipeline_init` 工具

在 `createPipelineRun` + `initPipeline` 之后，显式调用 `updateRunGateEnteredAt` 以 JS ISO 格式覆盖 SQLite `datetime('now')` 的默认值，确保格式与系统其他部分一致。

```typescript
// TASK-003: 确保 Gate A 的进入时间以 JS ISO 格式写入
updateRunGateEnteredAt(db, runId, new Date().toISOString());
```

### 5.2 `src/web/routes.ts` — `POST /api/gate/advance` 端点

参照 MCP `advance_gate` 工具的实现模式，添加三部分逻辑：

1. **duration_seconds 计算**：从 `pipeline_runs` 表查询当前 gate 的 `gate_entered_at`（epoch 秒），与 `Date.now()` 差值得到耗时秒数。

2. **传递给 addCheckpoint**：将计算出的 `durationSeconds` 作为第 5 个参数传入，使 checkpoint 记录包含准确的 gate 耗时。

3. **更新 pipeline_runs**：推进到新 gate 后，同步更新 `current_gate`（`updateRunGate`）和新 gate 的 `gate_entered_at`（`updateRunGateEnteredAt`）。

### 5.3 `tests/db.test.ts` — 新增测试

在已有 `createPipelineRun 创建时写入 gate_entered_at` 测试之后，新增：

```
it('createPipelineRun 的 gate_entered_at 是有效 ISO 时间戳', () => {
    // 1. gate_entered_at 非空
    // 2. 可解析为有效 Date
    // 3. 符合 YYYY-MM-DD 格式（ISO 8601 / SQL datetime）
});
```

## 6. 测试和验证结果

| 命令 | 结果 |
|------|------|
| `npx vitest run tests/db.test.ts` | 31 passed |
| `npx vitest run`（全量 10 文件） | 140 passed |
| `npx tsc --noEmit` | 无错误 |
| `npx eslint src/engine/server.ts src/web/routes.ts tests/db.test.ts` | 无警告 |

## 7. 数据与接口边界

- **无契约变更**：所有修改在已有函数签名和数据库 schema 内完成
- **数据库**：`pipeline_runs.gate_entered_at` 和 `checkpoints.duration_seconds` 列已存在（TASK-001/002 添加）
- **向后兼容**：`addCheckpoint` 的 `durationSeconds` 参数为可选（`undefined`），不影响已有调用

## 8. 风险 / 未解决项

- 无。所有变更严格遵循已有模式，无新增风险。

## 9. 需要前端配合的点

- `POST /api/gate/advance` 返回体未新增字段（`duration_seconds` 已存在于 `checkpoints` 表，前端通过 `/api/pipeline` 查询获取）
- `pipeline_init` 返回体无变化

## 10. 推荐的下一步

- 由 qa-review-expert 审查变更
- 验收标准已全部满足，可进入 Gate 检查
