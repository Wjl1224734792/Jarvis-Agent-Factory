# TASK-002: Agent 事件去重 — 后端实现文档

**日期:** 2026-05-12
**对应需求 ID:** REQ-032
**对应任务 ID:** TASK-002

---

## 1. 实现目标

为 `agent_event`（MCP 工具 + REST API）增加去重逻辑，确保同一 `(run_id, agent_id)` 的重复 `start`/`end`/`error` 事件被忽略，保证 Claude hooks 每个 Agent 生命周期只统计一次事件。

## 2. 输入依据

- 需求文档: `docs/requirements/2026-05-12-dashboard-simplify-mcp-stats-docs-platform.md` (REQ-032)
- 任务文档: `docs/tasks/2026-05-12-dashboard-simplify-tasks.md` (TASK-002)
- 数据库 Schema: `src/engine/db.ts` agent_events 表 + idx_agent_events_lookup 索引

## 3. 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/db.ts` | 新增函数 | `checkAgentEventDuplicate()` — 去重检查核心逻辑 |
| `src/engine/server.ts` | 修改 handler + import | `agent_event` MCP 工具增加去重检查 |
| `src/web/routes.ts` | 修改 handler + import | `POST /api/agent-event` REST 端点增加去重检查 |
| `tests/agent-events.test.ts` | 新增测试用例 | 6 个去重场景测试 (Test 6-11) |

## 4. 实现说明

### 4.1 `checkAgentEventDuplicate(db, runId, agentId, eventType)` — db.ts

新增导出函数，位于 `insertAgentEvent` 之后。

**去重规则:**

- **`eventType === 'start'`**: 查询该 `(run_id, agent_id)` 的最新事件。若最新事件类型为 `start`（说明无对应 `end`/`error`），则视为重复 start。若最新事件是 `end` 或 `error`，允许新的 start（Agent 重启场景）。
- **`eventType === 'end'` 或 `'error'`**: 查询该 `(run_id, agent_id)` 是否已有 `end` 或 `error` 事件。若有，视为重复。

**SQL 查询利用已有索引 `idx_agent_events_lookup(run_id, agent_id, event_type, started_at)`，查询高效。**

**返回值:**
```typescript
{ duplicate: false }  // 非重复，允许写入
{ duplicate: true, id: number, total_tokens: number }  // 重复，返回已有记录
```

### 4.2 MCP 工具 `agent_event` — server.ts

在 session/run 解析和归属验证之后、`insertAgentEvent` 调用之前，插入去重检查：

```typescript
const dupCheck = checkAgentEventDuplicate(db, finalRunId, agent_id, event);
if (dupCheck.duplicate) {
  return resp({
    ok: true, id: dupCheck.id, total_tokens: dupCheck.total_tokens,
    duplicate: true,
    message: event === 'start'
      ? 'start event already recorded for this agent'
      : 'end/error event already recorded for this agent',
  });
}
```

### 4.3 REST API `POST /api/agent-event` — routes.ts

与 MCP 工具相同的去重逻辑，适配 REST 响应格式（`c.json()`）。

### 4.4 未修改 `insertAgentEvent` 函数

严格遵循任务指引：`insertAgentEvent` 函数签名和行为未做任何变更。去重逻辑完全放在 handler 层，通过 `checkAgentEventDuplicate` 独立函数实现。

## 5. 测试和验证结果

### 单元测试（13 passed）

```
npx vitest run tests/agent-events.test.ts
```

| 测试编号 | 测试场景 | 结果 |
|---------|---------|------|
| 1 | Schema 验证（列 + 索引） | PASS |
| 2 | insertAgentEvent start → tokens=0 | PASS |
| 3 | insertAgentEvent end → duration_ms 计算 | PASS |
| 4 | insertAgentEvent error → status=error | PASS |
| 5 | getAgentStatus 分类 | PASS |
| 6 | deleteRun 级联 | PASS |
| VIRTUAL | total_tokens 虚拟列计算 | PASS |
| **6** | **去重：重复 start 事件检测** | **PASS** |
| **7** | **去重：start→end 后允许新 start（重启）** | **PASS** |
| **8** | **去重：重复 end 事件检测** | **PASS** |
| **9** | **去重：重复 error 事件检测** | **PASS** |
| **10** | **去重：新 agent 首次 start 不重复** | **PASS** |
| **11** | **去重：start→error 后允许新 start** | **PASS** |

### TypeScript 类型检查

```
npx tsc --noEmit  → 无错误
```

### 回归测试

```
npx vitest run tests/db.test.ts         → 31 passed (无回归)
```

## 6. 数据与接口边界

- **数据库**: 仅读取 `agent_events` 表做去重查询，不修改表结构。
- **MCP 接口**: `agent_event` 工具返回值新增 `duplicate` 和 `message` 字段（仅去重命中时返回）。
- **REST API**: `POST /api/agent-event` 响应新增 `duplicate` 和 `message` 字段（仅去重命中时返回）。
- **索引依赖**: `idx_agent_events_lookup(run_id, agent_id, event_type, started_at)`

## 7. 风险 / 未解决项

- 无已知风险。去重逻辑简单明确，使用已有索引，不引入性能问题。
- `total_tokens` 使用 SQLite VIRTUAL 列直接 SELECT，已在测试中验证可行。

## 8. 需要前端配合的点

- 前端无需修改。去重逻辑对前端透明，事件写入 API 行为向后兼容。
- 去重命中时返回的 `duplicate: true` 字段前端可忽略（当前不消费），或未来可用于调试日志。

## 9. 推荐的下一步

- TASK-003 (Gate 耗时统计修复) — 同批次后端任务，可并行进行
- TASK-001 (Dashboard 重构) 完成后，整体集成测试
