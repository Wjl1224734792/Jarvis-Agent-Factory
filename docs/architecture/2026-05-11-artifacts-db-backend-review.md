# REQ-026 Artifacts 数据库关联 — 后端架构评审

**评审日期 (Date):** 2026-05-11
**评审者 (Reviewer):** 后端架构师
**涉及需求:** REQ-026
**状态 (Status):** Proposed

---

## 目录

1. [架构目标与约束](#1-架构目标与约束)
2. [现状分析：数据流与问题溯源](#2-现状分析数据流与问题溯源)
3. [Artifacts 表设计评审](#3-artifacts-表设计评审)
4. [findSessionGateArtifacts 重构方案评估](#4-findsessiongateartifacts-重构方案评估)
5. [advance_gate 路径修改评估](#5-advance_gate-路径修改评估)
6. [向后兼容策略评估](#6-向后兼容策略评估)
7. [安全与数据一致性评估](#7-安全与数据一致性评估)
8. [ADR-0005：Artifacts 持久化策略](#8-adr-0005artifacts-持久化策略)
9. [改进建议汇总](#9-改进建议汇总)
10. [风险与迁移路径](#10-风险与迁移路径)

---

## 1. 架构目标与约束

### 目标

- 将产物（Artifact）与 Pipeline Run 精确关联，消除同一天多任务产物互相污染的问题
- 保持对历史数据（无 artifacts 表的旧记录）的向后兼容
- 最小化对现有 `advance_gate`、`pipeline_status`、Web Dashboard 数据流的影响

### 约束

| 约束 | 说明 |
|------|------|
| 数据库 | SQLite（Node.js 22 内置 `node:sqlite` / `DatabaseSync`，**非 better-sqlite3**） |
| 同步 API | `DatabaseSync` 为同步 API，需避免异步模式混用 |
| 无物理外键 | 项目编码规范禁止物理外键约束 |
| 数据目录 | `~/.jarvis/engine.db`，所有 Session 共享同一 DB 文件 |
| 产物目录 | `<projectRoot>/docs/`，多项目、多 Session 共享磁盘空间 |

### 非功能需求

| 维度 | 要求 |
|------|------|
| 一致性 | Gate 通过时 artifact 记录必须已持久化（写入在 checkpoint 之前完成） |
| 延迟 | 单次 artifact 写入 < 5ms（SQLite 本地写入） |
| 可用性 | 产物查询不应因 artifacts 表故障而报错（必须有降级路径） |
| 可扩展性 | 每个 run 每个 gate 的 artifact 数量上限可按需调整（当前硬编码 5 条） |

---

## 2. 现状分析：数据流与问题溯源

### 2.1 两条产物查询路径

通过代码审计，发现存在两条产物查询路径，且**各自使用不同函数**：

```
路径 1：MCP 工具层（server.ts）
  └─ findGateArtifacts()          ← 不区分 session/run
      ├─ pipeline_status (server.ts:422)
      ├─ gate_enforce    (server.ts:450)
      ├─ advance_gate    (server.ts:478)  ← Gate 通过条件判断
      └─ report_status   (server.ts:543)

路径 2：Web Dashboard API（routes.ts）
  └─ findSessionGateArtifacts()  ← 通过日期匹配区分 session
      ├─ GET /api/pipeline          (routes.ts:127) ← Dashboard 列表
      ├─ GET /api/gate/:gate/enforce (routes.ts:152) ← Gate 详情
      └─ POST /api/gate/advance     (routes.ts:180)  ← Web 端推进 Gate
```

**关键发现：**

1. **`advance_gate`（MCP 工具）使用的是 `findGateArtifacts`，非 session 感知** —— 这意味着在当前 MCP 工具流程中，Gate 通过条件检查不区分不同 session。所有 session 共享同一个 `docs/` 目录的文件列表。这不是 REQ-026 描述的"污染"场景，而是"不区分"场景——因为 MCP 工具是通过 `extra.sessionId` 来做 session 隔离的，但产物检查却没有隔离。

2. **Web Dashboard 已经使用 `findSessionGateArtifacts`** —— Web 面板通过日期匹配做到了 session 级别的产物过滤，但存在已知的跨日污染问题。

3. **REQ-026 描述的"污染"问题在 Web Dashboard 和 MCP 工具中都存在** —— 但对 MCP 工具侧而言影响轻微（因为 `advance_gate` 只检查"有没有产物"而无须知道"是谁的产物"），主要痛点集中在 Web Dashboard 的展示和 audit 场景。

### 2.2 `findSessionGateArtifacts` 当前实现分析

```typescript
// gates.ts:179-198
export function findSessionGateArtifacts(docsDir, gate, sessionId, db) {
  // 1. 查该 session 的 checkpoint 记录，获取 passed_at 日期集合
  const checkpoints = db.prepare(
    'SELECT passed_at FROM checkpoints WHERE session_id = ? AND gate = ?'
  ).all(sessionId, gate);

  // 2. 扫 docs/<subdir>/ 下的 .md 文件
  const files = readdirSync(dir).filter(f => f.endsWith('.md'));

  // 3. 用文件名前 10 字符（YYY-MM-DD）匹配 checkpoint 日期
  const dates = new Set(checkpoints.map(c => c.passed_at.slice(0, 10)));
  return files.filter(f => dates.has(f.slice(0, 10))).slice(0, 5);
}
```

**污染场景复现：**

| 时间 | Session A | Session B | docs/tasks/ 下 |
|------|-----------|-----------|----------------|
| 09:00 | Gate B 通过 | - | `2026-05-11-任务A.md` |
| 10:00 | - | Gate B 通过 | `2026-05-11-任务B.md` |
| 查询时 | 查询 Session A Gate B 产物 | | 返回 2 个文件（包含 Session B 的） |

根本原因：文件名日期前缀精度只到「天」，同一天内无法区分 session。

---

## 3. Artifacts 表设计评审

### 3.1 提案 Schema

```sql
CREATE TABLE IF NOT EXISTS artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  gate TEXT NOT NULL,
  filepath TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(run_id, gate, filepath)
);
```

### 3.2 评审结论：基本合理，需补充索引

| 评审维度 | 结论 | 说明 |
|---------|------|------|
| 主键设计 | 通过 | INTEGER PRIMARY KEY AUTOINCREMENT 是 SQLite 最优模式，自增 ID 天然聚簇 |
| 关联字段 | **需改进** | `run_id` 关联 `pipeline_runs.id` 正确。但考虑到 `pipeline_runs` 有唯一 `(session_id, started_at)` 组合索引，建议 artifacts 表也加 `session_id` 冗余列，减少 JOIN |
| 唯一约束 | 通过 | UNIQUE(run_id, gate, filepath) 精确防止重复记录，复合键顺序与查询模式一致 |
| 数据类型 | 通过 | TEXT for all fields 是 SQLite 的惯用风格 |
| created_at | 通过 | `DEFAULT (datetime('now'))` 使用 UTC，与现有 checkpoint.passed_at 风格一致 |
| 缺失索引 | **高优先** | SELECT 主查模式为 `WHERE run_id = ? AND gate = ?`，需加 `(run_id, gate)` 复合索引 |
| 缺失索引 | **中优先** | 若增 `session_id` 冗余列，需 `(session_id, gate)` 索引 |
| 软删除 | **建议增加** | 文件系统产物被删除后，DB 记录成为死数据，应加 `deleted INTEGER DEFAULT 0` 字段 |
| 文件大小 | **建议增加** | `file_size INTEGER` 供 Dashboard 展示和容量监控 |
| 文件修改时间 | **建议增加** | `file_mtime TEXT` 用于检测文件被外部修改/覆盖的场景 |

### 3.3 改进后推荐 Schema

```sql
CREATE TABLE IF NOT EXISTS artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  session_id TEXT NOT NULL,             -- 冗余，加速 session 维度查询
  gate TEXT NOT NULL,
  filepath TEXT NOT NULL,               -- 相对于 docs/<subdir>/ 的文件名
  created_at TEXT DEFAULT (datetime('now')),
  file_size INTEGER,                    -- 字节数，可选
  file_mtime TEXT,                      -- 文件最后修改时间，用于变更检测
  deleted INTEGER DEFAULT 0             -- 软删除标记
);
CREATE INDEX IF NOT EXISTS idx_artifacts_run_gate ON artifacts(run_id, gate);
CREATE INDEX IF NOT EXISTS idx_artifacts_session_gate ON artifacts(session_id, gate);
```

**设计理由：**
- `session_id` 冗余：避免每次查询都要 JOIN `pipeline_runs`。Web Dashboard 按 session 维度查询产物是最常见路径
- `deleted` 软删除：产物文件可能被用户或过程清理，标记而非硬删除保留审计信息
- `file_mtime`：当同一 run 的同一 gate 产物被多次更新时，可以检测变化

---

## 4. findSessionGateArtifacts 重构方案评估

### 4.1 方案可行性：可行，但需明确两路径差异

提案描述为"修改 `findSessionGateArtifacts` 改用 DB 查询"。经代码审计，该函数在两个文件中有调用者：

| 文件 | 行号 | 用法 | 重构影响 |
|------|------|------|---------|
| `routes.ts:127` | Dashboard 列表 | `findSessionGateArtifacts(docsDir, g, s.id, db)` | 直接受益 |
| `routes.ts:152` | Gate enforce | `findSessionGateArtifacts(docsDir, gate, sid, db)` | 直接受益 |
| `routes.ts:180` | Web advance | `findSessionGateArtifacts(docsDir, currentGate, sid, db)` | 直接受益 |

**server.ts 不调用此函数** —— server.ts 使用 `findGateArtifacts`（非 session 感知）。这是一个架构不一致点。

### 4.2 推荐重构方案

```
新 findSessionGateArtifacts(docsDir, gate, sessionId, db):
  1. 先查 artifacts 表：SELECT filepath FROM artifacts WHERE session_id = ? AND gate = ?
  2. 若结果非空：返回 DB 结果（精确匹配）
  3. 若结果为空：FALLBACK 到日期匹配逻辑（向后兼容）
```

### 4.3 副作用分析

| 副作用 | 严重度 | 说明 |
|-------|--------|------|
| artifacts 表为空时性能下降 | 低 | 多一次 SQL 查询（~0.1ms），可忽略 |
| artifacts 表与文件系统不一致 | **中** | 若文件已被删除但 DB 仍有记录，返回的文件路径将指向不存在文件 |
| 日期匹配回退在混合场景下的错误 | **中** | 若某 run 有 artifacts 记录但另一个 run 没有，一个走精确匹配一个走日期匹配，可能导致行为不一致 |

### 4.4 建议改进：双阶段回退

```
findSessionGateArtifacts(docsDir, gate, sessionId, db):
  1. 查 artifacts 表是否为空（全局检查 SELECT COUNT(*) FROM artifacts）
  2. 若 artifacts 表有数据：
     a. 精确查询：SELECT filepath FROM artifacts WHERE session_id=? AND gate=?
     b. 验证文件系统存在：过滤掉已删除文件
     c. 返回结果
  3. 若 artifacts 表为空（旧数据无记录）：
     a. 回退日期匹配逻辑
```

这样确保一旦系统开始使用 artifacts 表，所有 session 都走 DB 精确匹配，避免混合场景。

---

## 5. advance_gate 路径修改评估

### 5.1 当前 `advance_gate` 流程

```
advance_gate(gate):
  1. resolveSid → sessionId
  2. 获取活跃 run_id
  3. FSM 校验（不可回退、不可跳 Gates）
  4. 条件检查：findGateArtifacts(cur) 或 checkpoints
  5. 计算 Gate 耗时 duration_seconds
  6. addCheckpoint(sessionId, cur, gate)
  7. updatePipelineGate(sessionId, gate)
  8. updateRunGate(runId, gate)        ← Session Model B
  9. updateRunGateEnteredAt(runId, now) ← TASK-001
```

### 5.2 插入 Artifact 记录的位置

**推荐在步骤 6 之前（条件检查通过后、checkpoint 写入前）插入：**

```
advance_gate(gate):
  ...
  4.5 [NEW] 扫描并记录 artifacts:
     scanGateDir(docsDir, cur) → .md 文件列表
     for each file: INSERT OR IGNORE INTO artifacts(...)
  5. addCheckpoint(...)
  ...
```

**位置选择理由：**
- 条件检查已通过，确保 Gate 的确有产物
- 在 checkpoint 之前写入，保证 artifact 记录和 checkpoint 的一致性
- 使用 `INSERT OR IGNORE` 避免重复插入（配合 UNIQUE 约束）

### 5.3 风险点

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| 文件扫描 I/O 阻塞 | 低 | 延迟增加 ~1-5ms | `readdirSync` 为同步操作，对少于 50 个文件的目录影响微小 |
| 并发写入冲突 | 低 | UNIQUE 约束冲突 | `INSERT OR IGNORE` 已处理 |
| 扫描到非本 session 的文件 | **中** | 记录错误的 artifact 关联 | 必须在扫描后做文件日期匹配过滤，或仅记录"当前 session 在本次 run 中产生的文件" |
| 文件在扫描后被删除 | 极低 | DB 有记录但文件已消失 | 查询时做文件存在性校验 |

### 5.4 文件归属判断问题（核心难点）

**`advance_gate` 中如何判断哪些 .md 文件属于当前 run？**

提案说"扫描 docs/ 下新增的 .md 文件"，但"新增"的定义模糊：

1. 相对于什么基线？上一次 Gate 通过的时间？
2. 文件修改时间 vs 创建时间的区别？
3. 多个 agent 可能同时在同一 Gate 工作，文件可能在 Gate 通过后还在写入

**推荐方案：按文件名日期前缀 + run 的开始时间匹配：**

```
function scanAndRecordArtifacts(db, docsDir, gate, runId, sessionId, runStartedAt):
  subdir = join(docsDir, GATE_DIRS[gate])
  files = readdirSync(subdir).filter(f => f.endsWith('.md'))
  
  for each file:
    // 只记录文件名前缀日期不早于 run 开始时间的文件
    // 作为"本次 run 产生的文件"的启发式判断
    fileDate = parseDate(file.slice(0, 10))
    if fileDate >= runStartedAt.date:
      INSERT OR IGNORE INTO artifacts(run_id, session_id, gate, filepath, file_size, file_mtime)
        VALUES (runId, sessionId, gate, file, stat.size, stat.mtime)
```

**更好的方案（长期）：在 Agent 产出文档时由 Agent 调用新 MCP 工具显式注册：**

这需要新增 `register_artifact` MCP 工具，在 Agent 写完文档后主动调用。但这超出了 REQ-026 范围。

---

## 6. 向后兼容策略评估

### 6.1 提案策略分析

> 旧数据无 artifacts 表记录时回退到日期匹配

**结论：基本安全，但需加强边界处理。**

### 6.2 三阶段兼容矩阵

| 阶段 | artifacts 表 | checkpoint 表 | 行为 |
|------|-------------|--------------|------|
| 阶段 0（升级前） | 不存在 | 有旧数据 | 纯日期匹配 |
| 阶段 1（升级后 首次 run） | 存在但该 run 无记录 | 有历史 checkpoint | 回退日期匹配 |
| 阶段 2（升级后 N 次 run） | 存在且有记录 | 与新记录匹配 | 精确 DB 查询 |

### 6.3 潜在陷阱

| 陷阱 | 说明 | 建议 |
|------|------|------|
| 混合匹配 | 新 run 有 DB 记录，但同名文件恰巧日期匹配到旧 run 的 checkpoint | 用「全局 artifacts 表是否非空」作为分水岭，非空则不走回退 |
| 旧 run 重新激活 | 用户恢复旧 session，session_id 不变但 artifacts 表无记录 | 日期匹配回退可以工作，但无法享受精确关联的好处 |
| checkpoint 记录的日期与实际文件创建日期不一致 | checkpoint 记录的是 Gate 通过时间，不一定是文件创建时间 | 在回退逻辑中接受此偏差（已有问题，非引入） |

### 6.4 推荐兼容策略

```
function findSessionGateArtifacts(docsDir, gate, sessionId, db):
  // 第一步：判断 artifacts 表是否已被填充过
  const hasArtifactsTable = /* 检查表是否存在 */;
  const hasAnyArtifact = hasArtifactsTable && 
    db.prepare('SELECT COUNT(*) as cnt FROM artifacts').get().cnt > 0;

  if (hasAnyArtifact) {
    // 精确路径：DB 查询 + 文件存在性校验
    const rows = db.prepare(
      'SELECT filepath FROM artifacts WHERE session_id=? AND gate=? AND deleted=0'
    ).all(sessionId, gate);
    
    // 过滤已从文件系统删除的记录
    const existingFiles = rows
      .map(r => r.filepath)
      .filter(f => existsSync(join(docsDir, GATE_DIRS[gate], f)));
    
    return existingFiles.slice(0, 5);
  }

  // 回退路径：日期匹配（仅当 artifacts 表完全空时）
  // ... 保持原有日期匹配逻辑 ...
```

---

## 7. 安全与数据一致性评估

### 7.1 安全检查

| 检查项 | 状态 | 说明 |
|-------|------|------|
| SQL 注入 | 通过 | 所有 artifacts 查询使用参数化 `db.prepare().all(runId, gate)` |
| 路径遍历 | 通过 | `filepath` 存储相对于 `docs/<subdir>/` 的文件名，不包含路径分隔符 |
| 文件系统操作 | 通过 | `readdirSync` 限定在 `docs/<subdir>/` 下，不可逃逸 |
| 敏感信息泄露 | 通过 | 产物为公开 .md 文档，不涉及密钥或密码 |

### 7.2 数据一致性

| 一致性场景 | 分析 |
|-----------|------|
| Artifact 记录与 checkpoint 的一致性 | 二者在同一事务内写入即可保证。当前 `db.ts` 使用 WAL 模式，可用 `BEGIN IMMEDIATE` 包裹 |
| 文件删除与 DB 记录不一致 | 读时做文件存在性校验。定期清理（可选）：扫描 artifacts 表，标记已删除文件为 `deleted=1` |
| 重复 Gate 通过 | `INSERT OR IGNORE` + UNIQUE 约束天然防重 |
| 跨 Session artifact 隔离 | 通过 `run_id` 关联，session 间无干扰 |

### 7.3 事务边界建议

当前 `advance_gate` 中的 artifact 写入和 checkpoint 写入应在同一事务内：

```typescript
db.exec('BEGIN IMMEDIATE');
try {
  // 1. 写入 artifacts
  for (const file of scannedFiles) {
    db.prepare('INSERT OR IGNORE INTO artifacts(...)').run(...);
  }
  // 2. 写入 checkpoint
  addCheckpoint(db, cur, gate, sessionId, durationSeconds);
  // 3. 更新 pipeline 状态
  updatePipelineGate(db, sessionId, gate);
  if (runId) {
    updateRunGate(db, runId, gate);
    updateRunGateEnteredAt(db, runId, new Date().toISOString());
  }
  db.exec('COMMIT');
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}
```

**注意：** 当前 `addCheckpoint` 内部使用 `INSERT OR REPLACE` 是幂等安全的，放入事务中不会有额外副作用。

---

## 8. ADR-0005：Artifacts 持久化策略

### ADR-0005 — 使用 SQLite artifacts 表替代纯文件日期匹配

**状态 (Status):** Proposed
**日期 (Date):** 2026-05-11
**决策者 (Deciders):** @后端架构师

---

#### 上下文 (Context)

Jarvis 引擎的产物关联当前通过文件名日期前缀匹配 checkpoint 的 `passed_at` 字段来实现 session 级过滤。该方案存在两个问题：

1. **精度不足**：日期前缀精度仅到天，同一天多个 Task 的产物会互相污染
2. **无法区分 run**：Session Model B 引入后，同一 session 可能有多条 run，但日期匹配无法区分不同 run 的产物
3. **不可迁移**：旧数据无 artifacts 表，不能丢失历史可查询性

#### 决策 (Decision)

引入 `artifacts` 表，实现 run 级别的精确产物关联：

- 新增 `artifacts` 表，以 `(run_id, gate, filepath)` 为唯一约束
- `advance_gate` 通过后扫描对应 Gate 目录，将 .md 文件路径写入 artifacts 表
- `findSessionGateArtifacts` 优先查 artifacts 表，仅在 artifacts 表为空时回退日期匹配
- 读时校验文件系统存在性，标记已删除记录

#### 后果 (Consequences)

**正面影响：**
- 消除同一天多任务产物污染
- 支持按 run 维度的产物追溯和审计
- 为后续 Agent 级产物注册机制奠定基础

**负面影响：**
- `advance_gate` 增加一次同步目录扫描（延迟 +1-5ms）
- 引入新表，数据库维护复杂度上升
- 文件系统清理后需要同步维护 artifacts 表

**缓解措施：**
- 目录扫描仅在 Gate 边界执行（低频操作），性能影响可忽略
- 查询时做文件存在性兜底校验
- 可选：定期后台任务清理死记录

#### 考虑的替代方案 (Alternatives Considered)

**方案 A：纯文件系统时间戳匹配（现状）**

| 维度 | 评分 |
|------|------|
| 实现复杂度 | 低（已完成） |
| 精确度 | 低（天级精度） |
| 多 run 支持 | 无 |
| 延展性 | 差 |

弃用原因：无法满足 run 级隔离需求。

**方案 B：在 checkpoint 表增加 artifact 文件名 JSON 列**

| 维度 | 评分 |
|------|------|
| 实现复杂度 | 中 |
| 精确度 | 高 |
| 查询便利性 | 差（JSON 解析 + 无索引） |
| 数据完整性 | 差（JSON 列无约束） |

弃用原因：JSON 列缺乏数据库层面的约束能力，查询效率差。

**方案 C：独立 artifacts 表（本次选择）**

| 维度 | 评分 |
|------|------|
| 实现复杂度 | 中 |
| 精确度 | 高（UNIQUE 约束防重） |
| 多 run 支持 | 完整 |
| 查询性能 | 高（索引支持） |
| 延展性 | 好（可扩展字段） |

---

## 9. 改进建议汇总

### P0 — 必须修复

| # | 问题 | 建议 |
|---|------|------|
| 1 | 提案描述使用 `better-sqlite3`，实际代码库使用 Node.js 22 内置 `node:sqlite`（`DatabaseSync`） | 修正提案，明确使用 `node:sqlite` 的同步 API |
| 2 | artifacts 表缺少 `(run_id, gate)` 复合索引 | 增加 `CREATE INDEX idx_artifacts_run_gate ON artifacts(run_id, gate)` |
| 3 | `advance_gate` 中文件归属判断逻辑不明确 | 明确归属策略：按文件名日期前缀 + run 开始时间启发式匹配 |

### P1 — 强烈建议

| # | 问题 | 建议 |
|---|------|------|
| 4 | 冗余 `session_id` 列以优化 Web Dashboard 查询 | 在 artifacts 表中增加 `session_id TEXT NOT NULL` |
| 5 | 文件删除后 DB 记录成为死数据 | 增加 `deleted INTEGER DEFAULT 0` 和读时存在性校验 |
| 6 | 混合场景下回退行为不一致 | 以全局 artifacts 表是否非空作为是否走 DB 查询的分水岭 |
| 7 | MCP 工具侧 `findGateArtifacts` 未改造 | 评估是否将 server.ts 中的 `findGateArtifacts` 也替换为 session 感知版本 |

### P2 — 改善建议

| # | 问题 | 建议 |
|---|------|------|
| 8 | 无文件元数据记录 | 增加 `file_size`、`file_mtime` 字段 |
| 9 | 无数据迁移脚本 | 为已有 checkpoint 记录生成对应的 artifacts 记录（一次性回填） |
| 10 | `advance_gate` 中 artifact 写入和 checkpoint 写入不在同一事务 | 包裹在 `BEGIN IMMEDIATE ... COMMIT` 中 |

---

## 10. 风险与迁移路径

### 10.1 风险矩阵

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 文件扫描拾取非本 session 文件 | 中 | 高 | 文件名日期过滤 + run started_at 下限 |
| 日期匹配回退在混合场景下行为不一致 | 中 | 中 | 统一分水岭策略 |
| 并发 `advance_gate` 调用导致事务冲突 | 低 | 低 | WAL 模式 + busy_timeout 已配置 |
| artifacts 表膨胀（长期运行） | 低 | 低 | 可选定期清理：DELETE WHERE deleted=1 |
| 旧版本客户端调用新版本引擎 | 极低 | 低 | 旧客户端不调用 artifacts 相关 API |

### 10.2 迁移路径

**阶段 1：Schema 迁移（仅 DDL，不产生数据）**

```
在 initSchema() 中添加：
  CREATE TABLE IF NOT EXISTS artifacts (...)
  CREATE INDEX IF NOT EXISTS idx_artifacts_run_gate ON artifacts(run_id, gate)
  CREATE INDEX IF NOT EXISTS idx_artifacts_session_gate ON artifacts(session_id, gate)
```

**阶段 2：写入逻辑上线**

- 修改 `advance_gate`（server.ts）和 `POST /api/gate/advance`（routes.ts）
- 二者都在 Gate 通过时扫描并写入 artifacts 表
- 使用 `INSERT OR IGNORE` 确保幂等

**阶段 3：查询逻辑切换**

- 修改 `findSessionGateArtifacts`（gates.ts）
- 先查 artifacts 表，为空时回退日期匹配
- 同时评估是否修改 server.ts 中的 `findGateArtifacts` 调用

**阶段 4：历史数据回填（可选，P2）**

- 编写一次性回填脚本：遍历所有 checkpoint 记录
- 按 checkpoint 日期匹配 docs/ 下同名文件，插入 artifacts 表
- 标注 `backfilled=1` 便于识别回填数据

### 10.3 回滚计划

| 回滚步骤 | 操作 |
|---------|------|
| 1. 恢复代码 | 回退到修改前的 `gates.ts`、`server.ts`、`routes.ts` |
| 2. 保留 artifacts 表 | 不删除表（仅停止写入和查询），数据不丢失 |
| 3. 数据恢复 | 保留的 artifacts 表可使后续再次上线时无需重新扫描 |

---

## 附录 A：技术选型评估矩阵

### A1：产物关联方案

| 维度（权重） | A：文件名日期匹配（现状） | B：artifacts 表（推荐） | C：checkpoint JSON 列 |
|-------------|------------------------|----------------------|---------------------|
| 精确度 (0.3) | 2/5 天级精度 | 5/5 文件级精确 | 4/5 文件级精确但无约束 |
| 查询性能 (0.2) | 3/5 文件系统扫描 | 5/5 索引查询 | 3/5 JSON 解析 |
| 实现复杂度 (0.15) | 5/5 已完成 | 3/5 需新增表+写入+查询 | 4/5 需改表+JSON解析 |
| 数据完整性 (0.15) | 2/5 无约束 | 5/5 UNIQUE 约束 | 2/5 JSON无约束 |
| 延展性 (0.1) | 1/5 无法扩展 | 5/5 可扩展字段+索引 | 3/5 JSON可扩展但查询弱 |
| 多 run 支持 (0.1) | 1/5 不支持 | 5/5 完整支持 | 4/5 需解析多行 |
| **加权总分** | **2.5/5** | **4.7/5** | **3.4/5** |

---

## 附录 B：代码库不一致点记录

以下为评审过程中发现的架构不一致问题，不属于 REQ-026 范围，但建议单独处理：

| # | 不一致点 | 位置 | 建议 |
|---|---------|------|------|
| 1 | server.ts 使用 `findGateArtifacts`（非 session 感知），routes.ts 使用 `findSessionGateArtifacts` | server.ts:422,450,478,543 vs routes.ts:127,152,180 | 统一为 session 感知版本 |
| 2 | Web 端 `POST /api/gate/advance` 不记录 `duration_seconds`，MCP 端 `advance_gate` 记录 | routes.ts:185 vs server.ts:490-496 | 统一行为 |
| 3 | `pipeline_status`（MCP 工具）返回 `all_sessions` 但使用 `findGateArtifacts` 无 session 过滤 | server.ts:435-437 | 明确设计意图 |

---

## 附录 C：受影响的文件清单

| 文件 | 变更类型 | 变更概要 |
|------|---------|---------|
| `src/engine/db.ts` | 修改 | 新增 artifacts 表 DDL + initSchema 迁移 |
| `src/engine/db.ts` | 新增 | artifacts CRUD 函数（insertArtifact, getArtifactsByRun, getArtifactsBySession） |
| `src/engine/gates.ts` | 修改 | 重构 findSessionGateArtifacts |
| `src/engine/gates.ts` | 新增 | scanAndRecordArtifacts 辅助函数 |
| `src/engine/server.ts` | 修改 | advance_gate 中调用 scanAndRecordArtifacts |
| `src/web/routes.ts` | 修改 | POST /api/gate/advance 中调用 scanAndRecordArtifacts |
| `docs/architecture/2026-05-11-artifacts-db-backend-review.md` | 新增 | 本评审文档 |

---

> **评审结论：方案可行，但需修正 3 个 P0 项、4 个 P1 项后方可进入实现阶段。核心风险可控。**
