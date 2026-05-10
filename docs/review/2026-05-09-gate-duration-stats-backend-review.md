# 后端审查报告：Gate 任务时长统计

> 审查日期: 2026-05-09 | 审查者: backend-review-expert | 需求: `docs/requirements/2026-05-09-gate-duration-stats.md`

---

## 审查结论

**有条件通过** -- 存在 1 项必须修复（FIX_REQUIRED）的数据语义问题，修复后可合并。

---

## 维度检查结果

### 一、API 设计审查

| 检查项 | 结果 | 说明 |
|--------|------|------|
| RESTful 语义 | PASS | 纯追加字段，不改变现有路由语义 |
| 请求/响应 Schema | PASS | 仅追加 `entered_at`、`duration_seconds`、`duration_display`、`completed_at`、`total_duration_seconds`、`total_duration_display` |
| 向后兼容 | PASS | 现有字段名未变，未改响应结构；新字段带 null/fallback |
| 分页/排序/过滤 | PASS | 不涉及新分页需求 |
| 错误响应格式 | PASS | `formatDuration(null)` 返回 `null`，不抛异常 |

### 二、业务逻辑审查

| 检查项 | 结果 | 说明 |
|--------|------|------|
| FSM 约束保持 | PASS | `advance_gate` 中 `ti <= ci` 和 `ti > ci + 1` 校验未被修改 |
| 幂等性 | PASS | `INSERT OR REPLACE` 保证 checkpoint 幂等；backfill 有 `IS NULL` 守卫 |
| 并发冲突 | PASS | SQLite WAL 单写，FSM 校验阻止重复推进 |
| 权限检查 | PASS | 沿用现有鉴权模式，未引入新入口点 |
| 时间一致性 | **WARNING** | `datetime('now')` 与 `new Date().toISOString()` 格式不一致（见 Finding #2） |

### 三、数据层审查

| 检查项 | 结果 | 说明 |
|--------|------|------|
| Schema 变更安全 | PASS | 3 列均为新增，无破坏性变更；`ALTER TABLE ... ADD COLUMN` 包裹 try/catch |
| 迁移可逆性 | PASS | 移除新增列即可回滚（SQLite 不支持 DROP COLUMN 在旧版本中但此处仅 ALTER ADD） |
| 回填逻辑正确 | PASS | `LAG() OVER (PARTITION BY session_id)` 推算近似进入时间；有 `duration_seconds IS NULL` 守卫 |
| 查询效率 | PASS | 无 N+1 查询引入；`getCheckpoints` 按 `session_id, gate` 查询有联合唯一约束隐式索引 |
| SQL 注入 | PASS | 全部使用 `?` 参数化查询，无字符串拼接 |
| 索引需求 | **INFO** | `pipeline_runs.gate_entered_at` 可用于 `strftime` 查询，当前查询量低无需索引（见 Finding #5） |

### 四、错误处理审查

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 异常捕获 | PASS | `ALTER TABLE` 全部 try/catch，backfill 有 NULL 守卫 |
| NULL 值处理 | PASS | `formatDuration(null)` → `null`；`durationSeconds ?? undefined`；`started_at/completed_at IS NOT NULL` 条件保护 |
| 错误信息不泄露 | PASS | 无新增错误路径暴露内部状态 |
| 全局中间件 | PASS | 沿用 Hono 现有错误处理 |

### 五、性能审查（代码级）

| 检查项 | 结果 | 说明 |
|--------|------|------|
| N+1 查询 | PASS | 无循环内数据库查询引入 |
| 大数据量操作 | PASS | `gateList.map()` 在内存中完成；backfill 仅在启动时运行一次（有 NULL 守卫） |
| 缓存策略 | N/A | 不涉及新缓存需求 |
| 不必要写操作 | PASS | `duration_seconds IS NULL` 守卫避免重复回填 |
| 超时/熔断 | N/A | 不涉及外部 API 调用 |

---

## 问题列表（按严重度排序）

### [FIX_REQUIRED] Finding #1：`/api/pipeline` 中 `entered_at` 始终返回当前 Gate 进入时间

- **文件**: `src/web/routes.ts:105`
- **证据**:

  ```js
  // routes.ts lines 97-108
  const run = getActiveRun(db, s.id);
  const gates = gateList.map(g => {
    // ...
    return {
      gate: g,
      passed: cp !== null,
      artifacts: findSessionGateArtifacts(getDocsDir(root), g, s.id, db),
      entered_at: run?.gate_entered_at || null,  // <-- 所有 Gate 的 entered_at 都一样!
      duration_seconds: cp?.duration_seconds ?? null,
      duration_display: cp?.duration_seconds != null ? formatDuration(cp.duration_seconds) : null,
    };
  });
  ```

  `gate_entered_at` 在 `pipeline_runs` 表中仅存储 **当前 Gate** 的进入时间（设计如此，符合 REQ-001）。但 API 将同一个值赋给了所有 Gate 对象，导致：
  - 已通过的 Gate A 的 `entered_at` 错误地显示为 Gate B 的进入时间
  - 未到达的 Gate C-E 的 `entered_at` 错误地显示为当前 Gate 的进入时间

- **影响**: Web 面板（REQ-005）展示 "开始时间" 时，对已完成的 Gate 显示错误时间戳，用户无法正确定位瓶颈。

- **建议**: 修改 `entered_at` 的取值逻辑：
  - **Gate A**: 使用 `run.started_at`（在 `createPipelineRun` 中 Gate A 的 `gate_entered_at` 与 `started_at` 相同）
  - **Gate B 及之后、已通过的 Gate**: 使用该 Gate 的前一个 Gate 的 checkpoint 的 `passed_at` 作为近似进入时间
  - **当前 Gate**: 使用 `run.gate_entered_at`
  - **未到达的 Gate**: 返回 `null`

  ```js
  // 修正后的逻辑示意
  const currentGateIndex = gateList.indexOf(run?.current_gate);
  gates = gateList.map((g, idx) => {
    let enteredAt = null;
    if (idx === 0) {
      enteredAt = run?.started_at || null;  // Gate A
    } else if (idx <= currentGateIndex) {
      const prevGate = gateList[idx - 1];
      const prevCp = getCheckpoints(db, prevGate, s.id);
      enteredAt = prevCp[0]?.passed_at || null;  // 前一个 Gate 通过时间 ≈ 本 Gate 进入时间
    }
    // idx > currentGateIndex: enteredAt 保持 null
    // ...
  });
  ```

---

### [WARNING] Finding #2：`gate_entered_at` 时间格式不一致

- **文件**: `src/engine/server.ts:360,388` 与 `src/engine/db.ts:331-332`
- **证据**:

  `createPipelineRun` (db.ts:331-332) 使用 SQLite `datetime('now')`:
  ```sql
  VALUES (?, ?, ?, ?, 'Gate A', 'active', datetime('now'), datetime('now'))
  ```
  输出格式: `2026-05-09 14:30:22` (SQLite datetime 格式，UTC)

  `advance_gate` / `gate_jump` (server.ts:360,388) 使用 JS Date:
  ```js
  updateRunGateEnteredAt(db, runId, new Date().toISOString());
  ```
  输出格式: `2026-05-09T14:30:22.123Z` (ISO 8601 带毫秒和时区)

  同一列 `gate_entered_at` 存储两种不同格式的时间字符串。

- **影响**: 
  - API 响应中 `entered_at` 值格式不一致，前端展示/排序可能异常
  - `strftime('%s', ...)` 能同时解析两种格式（经核对 SQLite 文档），但直接字符串比较会出错
  - 任何直接消费该字段的客户端都需要处理两种格式

- **建议**: 统一使用一种格式。推荐：
  1. 全部改用 `datetime('now')`（与 `started_at` 和 `completed_at` 一致），将 `updateRunGateEnteredAt` 内的 `datetime('now')` 逻辑下沉到 SQL 层
  2. 或者在 `createPipelineRun` 中也使用 JS 的 `new Date().toISOString()`，保持一致性

  **方案 1 示例**（改动最小）:
  ```diff
  -export function updateRunGateEnteredAt(db, runId, isoTime) {
  -  db.prepare('UPDATE pipeline_runs SET gate_entered_at=? WHERE id=?').run(isoTime, runId);
  +export function updateRunGateEnteredAt(db, runId) {
  +  db.prepare("UPDATE pipeline_runs SET gate_entered_at=datetime('now') WHERE id=?").run(runId);
   }
  ```
  对应 server.ts 调用改为 `updateRunGateEnteredAt(db, runId)`（移除 `new Date().toISOString()` 参数）。

---

### [WARNING] Finding #3：`/api/gate/advance` REST 端点缺少耗时记录与 pipeline_runs 同步

- **文件**: `src/web/routes.ts:143-172`
- **证据**:

  ```js
  // POST /api/gate/advance (routes.ts:162-163)
  addCheckpoint(db, currentGate, targetGate, sid);  // 未传 durationSeconds
  updatePipelineGate(db, sid, targetGate);            // 只更新 pipeline 表，不更新 pipeline_runs
  ```

  对比 MCP 工具 `advance_gate` (server.ts:346-361):
  ```js
  // 计算 duration
  durationSeconds = Math.floor(Date.now() / 1000) - enteredEpoch;
  addCheckpoint(db, cur, gate, sid, durationSeconds ?? undefined);  // 传入耗时
  updateRunGate(db, runId, gate);                                    // 同步 pipeline_runs.current_gate
  updateRunGateEnteredAt(db, runId, new Date().toISOString());      // 写入进入时间
  ```

- **影响**: 通过 REST API 推进 Gate 时：
  - checkpoint 的 `duration_seconds` 为 NULL（Web 面板展示 `--` 或降级显示）
  - `pipeline_runs.current_gate` 不更新（Web 面板 `/api/pipeline` 中 `entered_at` 可能读到过时值）
  - 数据一致性出现双写路径差异

- **建议**: 将 REST 端点的 advance 逻辑与 MCP 工具对齐，或者废弃 REST 端点改为通过 `/api/pipeline` 读取 + MCP 调用推进。**注意**：该端点被 `hook.ts` 和 `pipeline.html` 前端的 "Advance" 按钮调用（经 grep 确认），属于活跃端点。

  若对齐，需要先通过 `getActiveRun` 获取 `runId`，然后复用与 MCP 工具相同的 duration 计算和 `pipeline_runs` 同步逻辑。

---

### [INFO] Finding #4：Backfill 查询在每次引擎启动时执行

- **文件**: `src/engine/db.ts:152-168,173-185`
- **证据**: `initSchema()` 在每次 `openDb()` 调用时运行，内部 backfill SQL 无条件执行（仅依赖 `duration_seconds IS NULL` / `total_duration_seconds IS NULL` 守卫）。

- **影响**: 启动时额外执行一次 `LAG()` 窗口函数 + JOIN UPDATE，对已回填完成的数据库属于无意义计算。当前数据量下（个人工具）无性能问题，但不符合"迁移只执行一次"的最佳实践。

- **建议**: 考虑使用 `PRAGMA user_version` 记录迁移版本，仅在版本低于特定值时执行回填。或保持现有方案，因其在个人工具规模下开销可忽略。

---

### [INFO] Finding #5：`pipeline_runs.gate_entered_at` 无显式索引

- **文件**: `src/engine/db.ts:54-66`（CREATE INDEX 仅覆盖 `session_id, started_at DESC`）
- **证据**: `advance_gate` 中通过 `id` 主键查询 `gate_entered_at`（已走主键索引），当前无其他以 `gate_entered_at` 为条件的查询路径。

- **影响**: 当前查询模式不受影响（按 `id` 主键查询）。若未来需要 "查找所有 gate_entered_at 为空的行" 或按时间排序，才需要索引。

- **建议**: 当前无需操作。后续迭代如需新增查询路径再考虑。

---

### [INFO] Finding #6：`completeRun`/`abortRun` 双 UPDATE 无事务包裹

- **文件**: `src/engine/db.ts:373-394`
- **证据**:
  ```js
  db.prepare("UPDATE ... SET status='completed', completed_at=...").run(runId);  // 第 1 次 UPDATE
  db.prepare("UPDATE ... SET total_duration_seconds = ...").run(runId);          // 第 2 次 UPDATE
  ```

- **影响**: 若第 2 次 UPDATE 抛异常（SQLite 单文件写入不太可能），run 已被标记为 completed 但 `total_duration_seconds` 为 NULL。影响极低，因为 `total_duration_seconds` 可由 `completed_at - started_at` 重新计算。

- **建议**: 可选地用 `db.exec('BEGIN')` / `db.exec('COMMIT')` 包裹，或合并为一条 UPDATE 语句（SQLite 支持逗号分隔的多列 SET）。考虑到风险极低，当前方案可接受。

---

## 必须修复项

| # | 严重度 | 描述 | 关联 REQ |
|---|--------|------|----------|
| 1 | FIX_REQUIRED | `/api/pipeline` 中 `entered_at` 多 Gate 语义错误 | REQ-004, REQ-005 |

## 优化建议

| # | 严重度 | 描述 | 关联 REQ |
|---|--------|------|----------|
| 2 | WARNING | `gate_entered_at` 格式一致性（`datetime('now')` vs `new Date().toISOString()`） | REQ-001 |
| 3 | WARNING | `/api/gate/advance` REST 端点增加耗时记录与 pipeline_runs 同步 | REQ-002 |

## 行为准则违规检查

| 准则 | 结果 |
|------|------|
| 准则 2 (简单优先) | PASS -- 未发现过度抽象，`formatDuration` 简洁直接 |
| 准则 3 (精准修改) | PASS -- diff 仅包含需求要求的变更，无相邻代码修饰 |

## 变更文件清单

| 文件 | 行变更概览 | 审查结论 |
|------|-----------|----------|
| `src/engine/db.ts` | +3 列迁移 + 2 回填 + 5 函数增强 | 通过（含 1 WARNING + 4 INFO） |
| `src/engine/server.ts` | +14 行 advance_gate + 2 行 gate_jump + import | 通过（含 1 WARNING 依赖） |
| `src/web/routes.ts` | +28 行 API 增强 + formatDuration 函数 | 有条件通过（含 1 FIX_REQUIRED + 1 WARNING） |

## 未覆盖的验证范围

- 前端前端展示逻辑（pipeline.html）不在本次审查范围内
- MCP 工具响应中新增的 `duration_seconds` 字段（server.ts:366）未经 REQ 覆盖但属于良性增强
- `strftime('%s', ...)` 对两种时间格式的实际解析边界未做黑盒验证
- 大量并发 MCP 请求下的 duration 计算精度未压测

---

## Residual Risk

1. **已有 checkpoint 回填精度损失**: 回填使用上一个 checkpoint 的 `passed_at` 作为近似进入时间，忽略了 Gate 之间可能存在的 "等待/思考" 间隔（如 Gate B 条件满足后到用户触发 advance 之间的时间）。此损失是 REQ-002 中明确接受的（"使用上一个 checkpoint 的 passed_at 作为本 Gate 的近似进入时间"）。
2. **时区漂移**: 若 `started_at` 使用 UTC `datetime('now')` 而某次 `completed_at` 在系统时钟调整后写入，`julianday` 差值可能为负。当前无时钟跳变防护。
