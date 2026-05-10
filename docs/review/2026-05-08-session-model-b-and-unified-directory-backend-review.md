# 后端代码审查报告

> 日期：2026-05-08 | 审查人：backend-review-expert | 状态：**不通过**

---

## 一、审查结论

**不通过**。存在 1 项 [BLOCKED] 问题（stdio 模式下所有 Gate 工具不可用）和 1 项 [FIX_REQUIRED] 问题（markStaleSessions 超时不一致），必须修复后方可合并。

---

## 二、维度检查结果

| 维度 | 结论 | 说明 |
|------|------|------|
| API 设计 | 通过（有警告） | RESTful 语义合理，新 `/api/pipeline-runs` 端点清晰，但缺少 session 存在性校验 |
| 业务逻辑 | **不通过** | stdio 传输模式下 8 个 Gate 工具全部返回 `session_id required` 错误，完全不可用 |
| 数据层 | 通过（有警告） | 迁移逻辑覆盖全面，但缺少事务保护关键写操作，ID 生成有并发风险 |
| 错误处理 | 通过 | 8 个工具的 session_id 校验逻辑一致，Web API 参数校验已加强 |
| 性能 | 通过 | `pipeline_runs` 索引合理，无 N+1 查询，心跳定时器粒度合理 |

---

## 三、问题列表（按严重度排序）

### [BLOCKED] — 必须回退

#### BLOCKED-1：stdio 传输模式下所有 Gate 工具不可用

- **文件**: `src/engine/server.js`
- **行号**: 244, 261, 294, 314, 342, 364, 391, 417
- **证据**:

```javascript
// server.js:244 - pipeline_init
const sid = extra?.sessionId;
if (!sid) return resp({ error: 'session_id required. Call session_join first.' });
```

以上模式在 8 个工具中重复：`pipeline_init`, `pipeline_status`, `gate_enforce`, `advance_gate`, `gate_jump`, `report_status`, `gate_check`, `pipeline_guide`。

在 `StdioServerTransport` 模式下，`extra?.sessionId` **始终为 undefined**（MCP SDK 的 Stdio 传输层不支持会话概念）。这意味着：
- `session_join` 成功（它自带 `|| \`s${Date.now()}\`` 回退，创建会话并返回 `session_id`）
- 后续 8 个 Gate 工具**全部返回错误**：`session_id required. Call session_join first.`
- AI 客户端即使知道了 `session_id`，也无法通过 MCP 协议传回（stdio 传输无此通道）

- **影响**: stdio 模式（`jarvis` 命令自动拉起引擎）完全不可用。用户无法推进 Gate、无法检查 Gate 状态、无法获取流水线引导。
- **与需求关系**: REQ-005 要求废弃 `'legacy'` 回退，但未提供 stdio 模式的替代机制。需求本身存在缺陷，实现忠实复现了这一缺陷。
- **建议**:
  1. 为所有工具添加可选参数 `session_id: z.string().optional()`，允许 AI 显式传递会话 ID
  2. 或引入"当前会话"概念：在 stdio 模式下，将第一个（或唯一）active 会话作为隐式当前会话
  3. 修复后确保 stdio 模式下两个并发会话的 Gate 推进互不干扰（需求 REQ-005 验收标准第 3 条）

---

### [FIX_REQUIRED] — 必须修复后才能通过

#### FIX-1：`routes.js` 中 `markStaleSessions` 超时与 `SESSION_TIMEOUT` 不一致

- **文件**: `src/web/routes.js`
- **行号**: 61, 158
- **证据**:

```javascript
// routes.js:61
markStaleSessions(db, 600_000);   // 硬编码 10 分钟

// routes.js:158
markStaleSessions(db, 600_000);   // 硬编码 10 分钟

// server.js:20
const SESSION_TIMEOUT = 1_800_000; // 30 分钟

// server.js:78 — 正确使用常量
setInterval(() => { markStaleSessions(db, SESSION_TIMEOUT); }, 30_000);

// server.js:220 — 正确使用常量
markStaleSessions(db, SESSION_TIMEOUT);
```

Web API 端点调用 `markStaleSessions` 时使用硬编码的 `600_000`（10 分钟），而引擎使用 `SESSION_TIMEOUT = 1_800_000`（30 分钟）。这导致：Web 面板调用的 API 会把 10 分钟无心跳的会话标记为 inactive，而引擎本身要等到 30 分钟。不同入口点使用不同阈值，行为不一致。

- **影响**: 通过 Web API 访问时，会话可能在 10 分钟后被标记为 inactive，而引擎定时器要到 30 分钟才标记。行为分裂。
- **建议**: `routes.js` 应从 `db.js` 或共享常量文件导入 `SESSION_TIMEOUT`，或至少使用相同的 30 分钟值：
  ```javascript
  const SESSION_TIMEOUT = 1_800_000; // 与 server.js 保持一致
  ```

---

### [WARNING] — 建议修复但不阻塞通过

#### WARN-1：`createPipelineRun` ID 在高并发下可能冲突

- **文件**: `src/engine/db.js`
- **行号**: 237-242
- **证据**:

```javascript
export function createPipelineRun(db, sessionId, project, pipelineType = 'full') {
  const id = 'run_' + Date.now();
  db.prepare(`INSERT INTO pipeline_runs ...`).run(id, sessionId, project, pipelineType);
  return id;
}
```

`Date.now()` 在同一个毫秒内多次调用返回相同值。虽然在单进程 Node.js 中通常不会并发冲突，但 WAL 模式允许并发读取，若未来引入 worker_threads 或多进程共享同一数据库，两个 `createPipelineRun` 调用可能在同一毫秒产生相同 ID。`INSERT OR REPLACE` 可能导致后一条覆盖前一条（如果使用），但当前代码使用普通 `INSERT`，第二插入会因 PRIMARY KEY 冲突抛异常并被吞掉（无 try-catch）。

- **建议**: 使用 `crypto.randomUUID()` 生成 run ID：
  ```javascript
  import { randomUUID } from 'node:crypto';
  const id = 'run_' + randomUUID();
  ```

#### WARN-2：`advance_gate` / `gate_jump` 缺少事务包裹

- **文件**: `src/engine/server.js`
- **行号**: 325-334（advance_gate）, 351-356（gate_jump）
- **证据**:

```javascript
// advance_gate: 三个写操作，无事务
addCheckpoint(db, cur, gate, sid);       // 写 checkpoints
updatePipelineGate(db, sid, gate);        // 写 pipeline
if (runId) updateRunGate(db, runId, gate); // 写 pipeline_runs
```

如果进程在 `addCheckpoint` 成功后、`updatePipelineGate` 之前崩溃（或电源故障），数据库状态不一致：`checkpoints` 记录了通过但 `pipeline.current_gate` 未更新，`pipeline_runs.current_gate` 也不同步。

- **影响**: 进程崩溃后数据不一致，包括 `checkpoints`、`pipeline`、`pipeline_runs` 三表不同步。
- **建议**: 使用 `db.exec('BEGIN')` / `db.exec('COMMIT')` 包裹这三个操作。SQLite 的 WAL 模式支持并发读取，但写操作仍需要事务保证原子性。

同样问题存在于 `gate_jump`（`updatePipelineGate` + `updateRunGate` 无事务）。

#### WARN-3：`server.js` 导入了未使用的函数

- **文件**: `src/engine/server.js`
- **行号**: 12
- **证据**:

```javascript
import { ..., getPipelineRun, getSessionRuns, completeRun } from './db.js';
```

- `getPipelineRun` — 在 `server.js` 中从未被调用（只在 MCP 工具的响应构造中使用 `getActiveRun`）
- `getSessionRuns` — 仅在 `routes.js` 中调用，`server.js` 中无调用
- `completeRun` — 完全未被调用（任何 MCP 工具都不会将 run 标记为 completed）

这违反了代码规范中的"无循环依赖"和"精准修改"准则（准则 3）。

- **建议**:
  - 从 server.js 的 import 中移除 `getPipelineRun`、`getSessionRuns`、`completeRun`
  - 或实现 `completeRun` 的调用逻辑（如在 `advance_gate` 到达 Complete 时调用）

#### WARN-4：`completeRun` 和 `abortRun` 完全未被使用

- **文件**: `src/engine/db.js`
- **行号**: 271-278
- **证据**: 搜索整个 `src/` 目录，`completeRun` 仅在 `server.js:12` 的 import 语句中出现，无任何调用点。`abortRun` 甚至未被 import（仅在 `db.js` 中定义但无引用）。

- **影响**: 死代码，增加维护负担。Run 永远不会被标记为 `completed` 或 `aborted`，所有 run 永远保持 `active` 状态。
- **建议**: 
  - 在 `advance_gate` 到达最后一个 Gate 后调用 `completeRun(runId)`
  - 或添加 `pipeline_abort` MCP 工具供用户中止 run
  - 若近期无计划使用，遵循准则 2 删除未用代码

#### WARN-5：旧数据库 WAL/SHM 文件迁移可能携带损坏数据

- **文件**: `src/engine/server.js`
- **行号**: 61-71
- **证据**:

```javascript
if (existsSync(oldDbPath) && !existsSync(newDbPath)) {
  copyFileSync(oldDbPath, newDbPath);
  for (const suffix of ['-wal', '-shm']) {
    const oldAux = oldDbPath + suffix;
    const newAux = newDbPath + suffix;
    if (existsSync(oldAux)) copyFileSync(oldAux, newAux);
  }
}
```

如果旧数据库没有正常关闭（异常崩溃），WAL 文件中可能包含未提交的事务。直接将 WAL 文件复制到新位置会导致这些未提交的事务被错误地应用到新数据库。

- **建议**: 迁移前先检查 WAL 文件大小（空 WAL 无需复制），或使用 `PRAGMA wal_checkpoint(TRUNCATE)` 先将 WAL 合并到主文件，再复制。至少应在迁移后对新数据库执行一次 `PRAGMA integrity_check`。

#### WARN-6：`install.js` hash key 从相对路径改为绝对路径导致存量 hash 失效

- **文件**: `src/install.js`
- **行号**: 238-276（mergeDir 函数内）
- **证据**:

```javascript
// 旧代码
const relPath = dp.replace(dest, '').replace(/\\/g, '/');
hashes[relPath] = newHash;

// 新代码
hashes[dp] = newHash;  // dp 是绝对路径
```

Hash 记录的 key 从相对路径（如 `/agents/jarvis.md`）改为绝对路径（如 `/home/user/.claude/agents/jarvis.md`）。升级后 `loadHashes()` 返回的旧 hash 记录使用相对路径 key，而新代码查询时使用绝对路径 key，导致所有旧 hash 记录查找失败（`oldHash = hashes[dp]` 返回 `undefined`）。

- **影响**: 升级后首次 `jarvis install` 会认为所有文件都是"新安装"，触发全量覆盖而非增量跳过。文件内容不变但时间戳更新。这是一次性影响，不会丢失数据，但用户会看到大量不必要的文件重写。
- **建议**: 可以接受（一次性），但应至少在 changelog 中说明。

#### WARN-7：`pipeline_runs` 迁移可能创建重复 run

- **文件**: `src/engine/db.js`
- **行号**: 137-148
- **证据**:

```javascript
const existingRuns = db.prepare('SELECT COUNT(*) as cnt FROM pipeline_runs').get();
if (existingRuns.cnt === 0) {
  const oldPipelines = db.prepare('SELECT * FROM pipeline').all();
  for (const p of oldPipelines) {
    const runId = 'run_' + Date.now() + '_' + p.session_id.slice(-6);
    db.prepare(`INSERT OR IGNORE INTO pipeline_runs ...`).run(...);
  }
}
```

保护逻辑仅依赖 `pipeline_runs` 表是否为空。如果用户手动删除了所有 `pipeline_runs` 行（例如通过 SQLite CLI），重启引擎后会再次迁移，但使用新的 `Date.now()` 生成不同的 run ID。`INSERT OR IGNORE` 基于 PRIMARY KEY 冲突忽略，由于 ID 每次都不同，不会冲突，因此同一 `pipeline` 数据会被迁移多次产生重复 run。

- **影响**: 低。仅在手动操作数据库后触发。
- **建议**: 可添加一个 flag 列或在 `pipeline` 表记录 `migrated_to_run` 字段追踪迁移状态。

#### WARN-8：`/api/pipeline-runs` 不校验 session 是否存在

- **文件**: `src/web/routes.js`
- **行号**: 185-189
- **证据**:

```javascript
app.get('/api/pipeline-runs', (c) => {
  const sessionId = c.req.query('session_id');
  if (!sessionId) return c.json({ error: 'session_id query parameter required' }, 400);
  const runs = getSessionRuns(db, sessionId);
  return c.json({ runs, count: runs.length, session_id: sessionId });
});
```

如果传入一个不存在的 `session_id`，`getSessionRuns` 返回空数组，API 返回 `{ runs: [], count: 0, session_id: "nonexistent" }`。前端无法区分"该会话存在但无 runs"和"该会话根本不存在"。

- **建议**: 调用前检查 session 是否存在：
  ```javascript
  const session = getSession(db, sessionId);
  if (!session) return c.json({ error: 'Session not found' }, 404);
  ```

#### WARN-9：前端 `isOnline` 判活窗口与服务端不匹配

- **文件**: `src/web/views/pipeline.html`
- **行号**: 430
- **证据**:

```javascript
// 前端: 10 分钟（注释写 "10分钟"）
const isOnline = !isInactive && (Date.now() - s.heartbeat) < 600000;

// 后端: 30 分钟
const SESSION_TIMEOUT = 1_800_000;
```

需求 REQ-006 要求"与服务端一致"但实际不一致（前端 10 分钟，后端 30 分钟）。不过这种情况是可接受的——前端更早显示"离线"比延迟显示更好（宁可误报，不可漏报）。然而注释和验收标准声称需要一致。

- **建议**: 统一为同一常量或明确文档说明这是有意设计的"提前预警"机制。

---

### [INFO] — 仅供参考

#### INFO-1：Gate C 权限扩展
- **文件**: `src/engine/gates.js`, 行 84
- **内容**: Gate C 的 `allow` 列表新增 `'write_code'` 和 `'spawn_impl'`
- **说明**: 这会允许在规划阶段（Gate C）就开始编写代码和生成实现 Agent。这是策略层变更，需确认是否符合设计意图。

#### INFO-2：`getPipelineRun` 死代码
- **文件**: `src/engine/db.js`, 行 245-247
- **说明**: 函数定义且导出，`server.js:12` 导入，但无任何 MCP 工具或路由使用它。建议评估是否需要。

#### INFO-3：`abortRun` 死代码
- **文件**: `src/engine/db.js`, 行 276-278
- **说明**: `abortRun` 定义并导出，但 `server.js` 未导入，完全无调用点。Run 无法被中止。

#### INFO-4：需求规格自身有缺陷（REQ-005）
- **说明**: 需求要求"废弃 `'legacy'` 回退"且"返回明确错误"，但未为 stdio 传输模式设计会话 ID 传递机制。`StdioServerTransport` 不支持 `extra.sessionId`，导致需求本身在 stdio 场景下不成立。建议回溯 clarify 此需求的 stdio 兼容策略。

---

## 四、必须修复项

| 编号 | 严重度 | 描述 | 修复方向 |
|------|--------|------|---------|
| BLOCKED-1 | [BLOCKED] | stdio 模式 Gate 工具全部不可用 | 添加 `session_id` 参数或实现"当前会话"回退 |
| FIX-1 | [FIX_REQUIRED] | routes.js markStaleSessions 超时与 SESSION_TIMEOUT 不一致 | 统一使用 1_800_000 或导入共享常量 |

---

## 五、优化建议

1. **事务包裹关键写操作**（WARN-2）：`advance_gate`、`gate_jump`、`pipeline_init` 中的多表写入应包裹在事务中。
2. **使用 UUID 替代 Date.now()**（WARN-1）：消除 run ID 并发冲突风险。
3. **实现 run 生命周期管理**（WARN-4）：`completeRun` 和 `abortRun` 应被实际调用，否则所有 run 永远停留在 `active` 状态。
4. **清理未使用的 import**（WARN-3）：`server.js` 中 `getPipelineRun`、`getSessionRuns`、`completeRun` 未被使用。
5. **添加 session 存在性校验**（WARN-8）：`/api/pipeline-runs` 端点应返回 404 当 session 不存在。
6. **数据库迁移前检查 WAL**（WARN-5）：旧 DB 迁移前 checkpoint WAL 或避免复制非空 WAL 文件。

---

## 六、变更文件清单

| 文件 | 变更类型 | 行数变化 | 覆盖需求 |
|------|---------|---------|---------|
| `src/engine/db.js` | 重构+新增 | +170 行 | REQ-001, REQ-002 |
| `src/engine/server.js` | 重构+增强 | +134 行 | REQ-001, REQ-002, REQ-005, REQ-006 |
| `src/engine/gates.js` | 修改 | +2 行 | Gate C 权限扩展 |
| `src/web/routes.js` | 增强 | +16 行 | REQ-003, REQ-005 |
| `src/install.js` | 重构 | +30 行 | REQ-001 |
| `src/web/views/pipeline.html` | 前端变更 | +169 行 | REQ-003, REQ-006 |
| `src/web/views/agents.html` | 前端变更 | +40 行 | 样式调整（非本次需求） |
| `package.json` | 版本号 | +2 行 | REQ-004 |

**总计**: 440 insertions, 123 deletions，8 文件。变更规模偏大（>300 行），但属于单次逻辑变更（Session Model B），可接受。

---

## 七、未覆盖的验证范围

- 未运行自动化测试（项目中 `src/` 下无单元测试文件）
- 未验证 WAL 模式下的并发写入压力测试
- 未验证跨平台路径兼容性（Windows 反斜杠、macOS/Linux 正斜杠）
- 未验证 MCP HTTP 传输模式下的 session 轮转机制
- 未验证旧数据库从多个历史版本格式迁移的幂等性

---

## 八、行为准则违规

| 准则 | 违规项 | 说明 |
|------|--------|------|
| 准则 3（精准修改） | WARN-3 | `server.js` 导入了 `getPipelineRun`、`getSessionRuns`、`completeRun` 但未使用，属于不必要的变更。 |
| 准则 2（简单优先） | WARN-4 | `completeRun` 和 `abortRun` 函数已实现但从未被调用，属于"为将来可能需要"的投机性代码。 |
