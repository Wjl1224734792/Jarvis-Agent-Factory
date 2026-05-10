# TASK-004：引入 Pipeline Runs 表（Session Model B）

## 1. 当前实现目标

新增 `pipeline_runs` 表，使每次 `/jarvis` 调用产生独立的流水线运行记录。`pipeline` 表保留作为当前活跃 run 的快照缓存（向后兼容）。

## 2. 对应需求 ID / 任务 ID

- **需求**：Session Model B — 每次 `/jarvis` 产生独立流水线运行记录
- **任务**：TASK-004

## 3. 输入依据

- 编排者分配的子任务文档（TASK-004）
- 当前代码现状（db.js / server.js / routes.js）
- 前序任务：TASK-001（统一数据目录）、TASK-002（移除 legacy 回退）、TASK-003（SESSION_TIMEOUT 延长）

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/engine/db.js` | 修改 | 新增 `pipeline_runs` 表 DDL、CRUD 函数、旧数据迁移 |
| `src/engine/server.js` | 修改 | 导入新函数、更新 session_join / pipeline_init / 7 个 Gate 工具 |
| `src/web/routes.js` | 修改 | 新增 `GET /api/pipeline-runs` 端点 |

**未修改的文件（不在范围内）**：
- `src/engine/gates.js` — 不涉及
- `src/engine/agent-registry.js` — 不涉及
- `src/web/views/` — 前端不在此任务范围
- `checkpoints` 表逻辑 — 核心原则 4，不绑定到具体 run

## 5. 实现说明

### 5.1 步骤 1：pipeline_runs 表 DDL（db.js L53-66）

在 `initSchema()` 中 agent_models 表之后，执行独立的 `db.exec()` 创建：

```sql
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project TEXT NOT NULL,
  pipeline_type TEXT NOT NULL DEFAULT 'full',
  current_gate TEXT NOT NULL DEFAULT 'Gate A',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_session ON pipeline_runs(session_id, started_at DESC);
```

索引按 `(session_id, started_at DESC)` 建立，支持按会话快速查询最新 run。

### 5.2 步骤 2：CRUD 函数（db.js L227-278）

新增 7 个导出函数：

| 函数 | 用途 |
|------|------|
| `createPipelineRun(db, sid, project, pipelineType)` | 创建新 run，返回 runId |
| `getPipelineRun(db, runId)` | 按 ID 查询单条 run |
| `getActiveRun(db, sessionId)` | 查询 session 最新活跃 run |
| `getSessionRuns(db, sessionId)` | 查询 session 所有 runs（倒序） |
| `updateRunGate(db, runId, gate)` | 更新 run 的当前 Gate |
| `completeRun(db, runId)` | 标记 run 为 completed |
| `abortRun(db, runId)` | 标记 run 为 aborted |

### 5.3 步骤 3：旧数据迁移（db.js L136-148）

在 `initSchema()` 末尾、函数闭合前：
- 检查 `pipeline_runs` 是否为空
- 若为空，遍历 `pipeline` 表的旧数据，为每条创建首条 pipeline_run
- 使用 `INSERT OR IGNORE` 防止重复迁移
- runId 格式：`run_<timestamp>_<session_id 后 6 位>`

### 5.4 步骤 4：server.js 导入更新（server.js L12）

在一行导入中追加 6 个新函数：`createPipelineRun`, `getPipelineRun`, `getActiveRun`, `getSessionRuns`, `updateRunGate`, `completeRun`。

### 5.5 步骤 5：session_join 改造（server.js L177-200）

**已有会话**：
```js
const runId = getActiveRun(db, sid)?.id || createPipelineRun(db, sid, p?.project || root, p?.pipeline_type || pt);
```
- 查找活跃 run，若不存在则自动创建
- 响应增加 `run_id` 字段

**新会话**：
```js
const runId = createPipelineRun(db, sid, p?.project || root, p?.pipeline_type || pt);
```
- 在 addSession + initPipeline 之后创建首条 run
- 响应增加 `run_id` 字段

### 5.6 步骤 6：pipeline_init 改造（server.js L244-253）

```js
const runId = createPipelineRun(db, sid, project_name || root, pt);
initPipeline(db, sid, project_name || root, pt);
```
- 先创建 run 记录，再同步更新 pipeline 快照
- 不再覆盖旧 pipeline（保留历史）
- 响应增加 `run_id` 字段

### 5.7 步骤 7：Gate 工具 run_id 参数（server.js 多处）

对 7 个 Gate 工具统一改造：

| 工具 | 变更 |
|------|------|
| `pipeline_status` | 新增 `run_id` 参数，响应含 `run_id` |
| `gate_enforce` | 新增 `run_id` 参数，响应含 `run_id` |
| `advance_gate` | 新增 `run_id` 参数，推进成功时调用 `updateRunGate` |
| `gate_jump` | 新增 `run_id` 参数，跳转成功时调用 `updateRunGate` |
| `report_status` | 新增 `run_id` 参数，响应含 `run_id` |
| `gate_check` | 新增 `run_id` 参数，响应含 `run_id` |
| `pipeline_guide` | 新增 `run_id` 参数，响应含 `run_id` |

每个工具的模式：
```js
// 参数定义
{ ..., run_id: z.string().optional() }

// 函数体
const runId = run_id || getActiveRun(db, sid)?.id;
// advance_gate / gate_jump 额外调用
if (runId) updateRunGate(db, runId, gate);
```

### 5.8 步骤 8：API 端点（routes.js L185-190）

```js
app.get('/api/pipeline-runs', (c) => {
  const sessionId = c.req.query('session_id');
  if (!sessionId) return c.json({ error: 'session_id query parameter required' }, 400);
  const runs = getSessionRuns(db, sessionId);
  return c.json({ runs, count: runs.length, session_id: sessionId });
});
```

## 6. 测试和验证结果

### 6.1 node --check（语法检查）

```
node --check src/engine/db.js     → 通过（无输出）
node --check src/engine/server.js → 通过（无输出）
node --check src/web/routes.js    → 通过（无输出）
```

### 6.2 函数引用一致性

- `createPipelineRun`：5 处引用（db.js 定义 1 + server.js 使用 3 + import 1）
- `getActiveRun`：7 处引用
- `updateRunGate`：3 处引用
- `getSessionRuns`：2 处引用（db.js 定义 1 + routes.js 使用 1）
- `completeRun` / `abortRun`：仅 db.js 导出，供后续使用

### 6.3 项目无测试基础设施

当前项目无测试脚本配置（`package.json` 无 `"scripts"`），无测试文件（`src/engine/*.test.*` 和 `src/web/*.test.*` 均不存在）。建议在后续任务中建立测试基础设施。

## 7. 数据与接口边界

### 7.1 数据库

| 表 | 行数增长 | 说明 |
|----|---------|------|
| `pipeline` | 1 行 / session | 快照缓存，每次 initPipeline 覆盖 |
| `pipeline_runs` | N 行 / session | 每次 `/jarvis` 调用 +1，只增不删 |

### 7.2 接口契约影响

| 端点/工具 | 新增字段 | 类型 | 说明 |
|----------|---------|------|------|
| `session_join` 响应 | `run_id` | `string` | 当前会话的 run ID |
| `pipeline_init` 响应 | `run_id` | `string` | 新创建的 run ID |
| 所有 Gate 工具参数 | `run_id` | `string?` | 可选，指定操作的 run |
| 所有 Gate 工具响应 | `run_id` | `string?` | 解析后的 run ID |
| `GET /api/pipeline-runs` | 新端点 | - | 查询 session 的 runs 列表 |

## 8. 风险 / 未解决项

### 8.1 migrateSession 未迁移 pipeline_runs

`migrateSession()` 函数（db.js L207-211）目前只迁移 `pipeline` 和 `checkpoints`，不迁移 `pipeline_runs`。当 session 通过 `resume_session_id` 恢复时，旧 session 的 pipeline_runs 将随旧 session 删除而变成孤儿数据（虽然物理行仍在，但 session_id 不再被任何活跃会话引用）。

**建议**：编排者决定是否需要在 `migrateSession` 中追加 `UPDATE pipeline_runs SET session_id=? WHERE session_id=?`。

### 8.2 无测试覆盖

当前项目无测试基础设施，本次改动未附测试。按照 `code-standards` 的 TDD 原则，新增核心业务逻辑应先写测试。建议创建 `src/engine/db.pipeline-runs.test.js` 覆盖 pipeline_runs CRUD。

### 8.3 completeRun / abortRun 未被调用

`completeRun` 和 `abortRun` 已导出但尚未在任何工具中使用。后续可通过 `pipeline_status` 检测到所有 Gate 完成时自动调用 `completeRun`。

## 9. 需要前端配合的点

| 配合项 | 说明 |
|--------|------|
| `session_join` 响应新增 `run_id` | 前端可存储并在后续 API 调用中传入 |
| `GET /api/pipeline-runs?session_id=xxx` | 前端可展示历史的 pipeline runs 列表 |
| `pipeline_status` 响应新增 `run_id` | 前端可显示当前活跃 run |

## 10. 推荐的下一步

1. **TASK-005**：建立测试基础设施，为 pipeline_runs CRUD 编写单元测试
2. **TASK-006**：前端 Dashboard 展示 pipeline runs 历史列表
3. **非紧急**：研判 `migrateSession` 是否需要迁移 `pipeline_runs`
4. **非紧急**：在流水线完成时自动调用 `completeRun`
