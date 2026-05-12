# TASK-005: 归档列表操作验证与修复

**日期:** 2026-05-12
**对应需求:** REQ-035
**任务类型:** 直接开发（验证 + 稳健性修复 + 测试补充）
**变更行数:** ~120 行（Archive.tsx +4 行，db.test.ts +~115 行）

---

## 1. 当前实现目标

验证归档列表操作（删除、恢复/取消归档）的完整链路正确性，修复发现的稳健性缺陷，补充缺失的单元测试覆盖。

## 2. 对应需求 ID / 任务 ID

- 需求 ID: REQ-035（修复归档列表删除/恢复操作）
- 任务 ID: TASK-005（归档列表操作验证）

## 3. 输入依据

- `docs/requirements/2026-05-12-dashboard-simplify-mcp-stats-docs-platform.md` REQ-035
- `docs/tasks/2026-05-12-dashboard-simplify-tasks.md` TASK-005

## 4. 变更文件 / 变更范围

| 文件 | 操作 | 行数 |
|------|------|------|
| `web/src/pages/Archive.tsx` | 修改（稳健性修复） | +4 |
| `tests/db.test.ts` | 修改（新增导入 + 测试块） | +~115 |

**未修改（仅审查确认正确）：**
- `src/engine/db.ts` — `archiveRun`、`unarchiveRun`、`deleteRun`、`getArchivedRuns` 实现正确
- `src/web/routes.ts` — 4 条 REST API 端点实现正确
- `web/src/api.ts` — 前端 API 客户端封装正确

## 5. 实现说明

### 5.1 三层架构审查结果

#### 前端层 (Archive.tsx)

| 功能 | 审查结果 |
|------|---------|
| 删除流程 | ✅ `Modal.confirm` 二次确认 → `api.deleteRun` → 成功则从列表移除 |
| 恢复流程 | ✅ `api.unarchiveRun` → 成功则从列表移除 |
| 搜索过滤 | ✅ 按 `task_name` + `session_id` 大小写不敏感过滤 |
| 空状态 | ✅ 搜索词存在/不存在分别显示不同提示文案 |
| 分组展示 | ✅ 按 `session_id` 分组，每组显示记录数 |
| 错误处理 | ⚠️ `ok: false` 但 HTTP 200 时无错误提示 |

#### 数据层 (db.ts)

| 函数 | 审查结果 |
|------|---------|
| `archiveRun` | ✅ `SET archived=1`，空 runId 返回 `ok: false` |
| `unarchiveRun` | ✅ `SET archived=0`，空 runId 返回 `ok: false` |
| `getArchivedRuns` | ✅ `WHERE archived=1 ORDER BY session_id, started_at DESC` |
| `deleteRun` | ✅ 事务内级联：artifacts → agent_events → pipeline_runs → 检查 session 剩余 runs → 必要时清除 session/checkpoints/pipeline |

#### API 层 (routes.ts)

| 端点 | 审查结果 | 状态码 |
|------|---------|--------|
| `POST /api/pipeline-runs/:id/archive` | ✅ 调用 `archiveRun`，404 回退 | 200/404 |
| `POST /api/pipeline-runs/:id/unarchive` | ✅ 调用 `unarchiveRun`，404 回退 | 200/404 |
| `DELETE /api/pipeline-runs/:id` | ✅ 调用 `deleteRun` + 立即 `broadcastSSE()` | 200/404 |

### 5.2 稳健性修复

**问题描述:** `handleRestore` 和 `handleDelete` 仅处理 `r.ok === true` 的成功路径。若后端未来改为 HTTP 200 + `{ ok: false }` 响应，UI 将静默失败——既不提示错误，也不从列表移除条目。

**修复:** 为两个操作函数添加 `else` 分支，当 `r.ok` 为假时显示 `r.error` 或兜底错误消息：

```typescript
if (r.ok) {
  message.success('已恢复');
  setRuns(prev => prev.filter(r => r.id !== runId));
} else {
  message.error(r.error || '恢复失败');  // 新增
}
```

### 5.3 测试补充

`tests/db.test.ts` 新增 16 个测试用例，覆盖：

**archiveRun (3 测试):**
- 设置 `archived=1`
- 不存在的 runId 返回 `ok: false`
- 空 runId 返回 `ok: false`

**unarchiveRun (2 测试):**
- 设置 `archived=0`
- 不存在的 runId 返回 `ok: false`

**getArchivedRuns (2 测试):**
- 仅返回 `archived=1` 的 run
- 未归档的 run 不出现在列表中

**deleteRun 级联删除 (2 测试):**
- artifacts 级联清除
- agent_events 级联清除

**deleteRun session 处理 (2 测试):**
- session 有其他 run 时不删除 session
- session 最后一个 run 被删除时级联删除 session/checkpoints/pipeline

**deleteRun 边界 (2 测试):**
- 不存在的 runId 返回 `ok: false`
- 空 runId 返回 `ok: false`

**完整生命周期 (1 测试):**
- 归档 → 恢复 → 再归档 → 永久删除，验证每步数据状态

**幂等性 (2 测试):**
- 对已归档 run 再次归档不报错
- 对未归档 run 取消归档不报错

## 6. 测试和验证结果

### 6.1 自动化测试

```
npx vitest run tests/db.test.ts
Test Files  1 passed (1)
Tests       47 passed (47)  // 原有 31 + 新增 16
```

### 6.2 类型检查

```
tsc --noEmit  → 零错误
```

### 6.3 Lint

```
npm run lint  → 零新增警告（仅 `mcp-platform-info.test.ts` 预存 2 条警告，非本次变更引入）
```

## 7. 边界和异常处理

| 场景 | 处理 |
|------|------|
| 删除不存在的 run | 后端返回 404，`fetchJSON` 抛出异常，catch 显示"删除失败" |
| 恢复不存在的 run | 同上 |
| 空 runId | `db` 层返回 `{ ok: false }`，`routes` 返回 404 |
| 删除含 artifacts/agent_events 的 run | 事务内级联清除，ROLLBACK 回退 |
| 删除 session 最后一个 run | 级联清除 checkpoints → pipeline → sessions |
| API 返回 `ok: false` 但 HTTP 200 | `else` 分支显示 `r.error` 消息（新增保护） |
| 搜索无匹配 | 显示"未找到匹配的归档记录"空状态 |
| 无归档记录 | 显示"暂无归档记录"空状态 |

## 8. 风险 / 未解决项

- **无高风险项。** 所有审查功能均正常工作。
- **SQLite `changes` 语义:** `archiveRun`/`unarchiveRun` 对已处于目标状态的 run 仍返回 `ok: true`（因为 SQLite 将 WHERE 匹配到的行计入 `changes()`）。这在功能上无损——数据状态正确——但调用方无法通过返回值区分"实际变更"与"已是目标状态"。当前 `Archive.tsx` 不依赖此区分（总是乐观更新），无需修改。

## 9. 需要后端配合的点

无。后端 `archiveRun`、`unarchiveRun`、`deleteRun`、`getArchivedRuns` 实现均正确，无需修改。

## 10. 推荐的下一步

- TASK-005 验证完成，可进入 Phase 4（TASK-007 发布 v3.43.0）
- 如需进一步提高稳健性，可考虑为 `archiveRun`/`unarchiveRun` 添加 `already_archived`/`already_unarchived` 返回值字段，让前端可跳过不必要的 API 调用
