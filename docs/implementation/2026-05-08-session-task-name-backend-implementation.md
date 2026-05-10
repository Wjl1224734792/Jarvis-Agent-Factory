# 会话任务名后端实现

## 1. 当前实现目标

为 `pipeline_runs` 表新增 `task_name` 字段，并提供 MCP 工具和 REST API 来设置/清除会话任务名。

## 2. 对应需求 ID / 任务 ID

- 需求 ID: REQ-DASH-001
- 任务 ID: TASK-DASH-001

## 3. 输入依据

- 编排者分配的子任务（会话命名后端：DB schema + MCP 工具 + REST API）
- 现有代码风格：`src/engine/db.ts`、`src/engine/server.ts`、`src/web/routes.ts`

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/db.ts` | 修改 | 新增 `ALTER TABLE` 迁移 + `setRunTaskName()` 函数 |
| `src/engine/server.ts` | 修改 | 新增 `session_set_name` MCP 工具 |
| `src/web/routes.ts` | 修改 | 新增 `PATCH /api/pipeline-runs/:id/name` 路由 |
| `tests/db.test.ts` | 修改 | 新增 6 个 `setRunTaskName` 单元测试 |

## 5. 实现说明

### 5.1 数据库 Schema 迁移（`src/engine/db.ts`）

在 `initSchema()` 函数中添加兼容迁移：

```sql
ALTER TABLE pipeline_runs ADD COLUMN task_name TEXT;
```

使用 `try/catch` 包裹，已有列时静默忽略（兼容旧数据库）。

### 5.2 `setRunTaskName()` 函数

```typescript
export function setRunTaskName(db: DatabaseSync, runId: string, name: string):
  { ok: boolean; task_name: string | null; error?: string }
```

行为：
- `runId` 为空时立即返回错误
- `name` 有效（trim 后非空）时更新 `task_name`
- `name` 为空或纯空白时，`task_name` 设为 `NULL`（清除）
- `runId` 不存在时返回 `{ ok: false, error: "Run not found: ..." }`
- 通过 `result.changes` 检测是否真的更新了行

### 5.3 MCP 工具 `session_set_name`

- **tool_name**: `session_set_name`
- **inputSchema**: `{ name: { type: 'string', description: '...' } }`
- **处理逻辑**: 通过 `resolveSid(extra)` 获取当前会话 → `getActiveRun()` 获取活跃 run → `setRunTaskName()` 执行更新
- **错误处理**: 无会话时提示 `session_join`；无活跃 run 时提示 `pipeline_init`

### 5.4 REST API `PATCH /api/pipeline-runs/:id/name`

- **Body**: `{ "task_name": "新的任务名" }`
- **成功响应**: `{ ok: true, task_name: "新的任务名" }`
- **失败响应（404）**: `{ ok: false, task_name: null, error: "Run not found: ..." }`
- `task_name` 不是字符串时默认使用空字符串（视为清除）

## 6. 测试和验证结果

### 新增测试用例（`tests/db.test.ts` - `Pipeline Run Task Name` describe block）

| 测试用例 | 状态 |
|---------|------|
| 设置有效任务名返回 ok: true | PASS |
| 空字符串清除任务名为 null | PASS |
| 纯空白字符串视为清除 | PASS |
| 不存在的 runId 返回错误 | PASS |
| 空 runId 返回错误 | PASS |
| 更新已有任务名覆盖旧值 | PASS |

### 自动化验证

```
$ npx tsc --noEmit     # passed, zero errors
$ npx eslint src/       # zero new warnings (30 pre-existing)
$ npx vitest run        # 2 files, 24 tests, all passed
$ npm run build         # passed
```

## 7. 数据与接口边界

### 数据库

- 表: `pipeline_runs`
- 新列: `task_name TEXT` (nullable)
- 迁移安全: 使用 `ALTER TABLE ... ADD COLUMN`，`try/catch` 忽略已存在错误

### MCP 接口

- 工具名: `session_set_name`
- 入参: `{ name: string }`
- 返回: `{ ok: boolean, task_name: string | null, error?: string }`

### REST API

- 方法: `PATCH`
- 路径: `/api/pipeline-runs/:id/name`
- Body: `{ "task_name": "string" }`
- 返回: 同 `setRunTaskName()` 返回结构

## 8. 风险 / 未解决项

- 无。所有变更均为纯增量，不影响现有功能。
- 迁移使用 `try/catch` 兜底，已存在列时静默跳过。

## 9. 需要前端配合的点

- 前端 Dashboard 如需展示 `task_name`，从 `/api/pipeline-runs?session_id=xxx` 返回的 runs 中读取 `task_name` 字段
- 前端如需调用改名 API，使用 `PATCH /api/pipeline-runs/:id/name`，body 为 `{ "task_name": "..." }`
- MCP 客户端可通过 `session_set_name` 工具直接设置

## 10. 推荐的下一步

- TASK-DASH-002（如需）：前端会话命名 UI 实现
- 无其他阻塞项
