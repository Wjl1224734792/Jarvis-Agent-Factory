# 2026-05-11 — artifacts 表架构评审

**评审类型**：数据库架构评审  
**评审者**：database-specialist  
**评审对象**：新增 `artifacts` 表 + 关联查询/写入逻辑  
**关联需求**：建立 artifact 文件到 pipeline_run 的精确关联，替代「文件名日期前缀匹配」方式  

---

## 1. 背景与目标

### 1.1 现状问题

当前 artifact 查找方式由 `src/engine/gates.ts` 中的两个函数实现：

| 函数 | 策略 | 缺陷 |
|------|------|------|
| `findGateArtifacts(docsDir, gate)` | 扫描 `docs/<gate-dir>/` 下的 `.md` 文件，返回前 5 个 | 无会话/运行隔离——不同 session 的文件混在一起 |
| `findSessionGateArtifacts(docsDir, gate, sessionId, db)` | 扫描文件系统后，用 checkpoint 日期匹配文件名前缀（`passed_at.slice(0, 10)` 匹配 `filename.slice(0, 10)`） | 日期前缀匹配**脆弱**——同一天不同 run 的文件会被错误关联；文件名格式无强制约束 |

**核心痛点**：日期前缀匹配依赖命名约定（`YYYY-MM-DD-xxx.md`），但这不是强制格式。如果文件名不遵循此约定，或同一天有多个 run，匹配结果不可靠。

### 1.2 目标

用数据库精确记录「哪个文件属于哪个 run 的哪个 Gate」，替代文件系统扫描 + 日期猜测的启发式方法。

### 1.3 现有表结构概览（来自 `src/engine/db.ts`）

| 表名 | 主键 | 关键列 | 唯一约束 |
|------|------|--------|---------|
| `pipeline` | `session_id` (TEXT) | project, current_gate, pipeline_type, started_at, updated_at | PK |
| `checkpoints` | `id` (INTEGER AUTOINCREMENT) | session_id, gate, passed_at, advance_to, duration_seconds | `UNIQUE(session_id, gate)` |
| `sessions` | `id` (TEXT) | platform, role, status, created_at, last_heartbeat | PK |
| `agent_models` | `agent_id` (TEXT) | model, effort, updated_at | PK |
| `pipeline_runs` | `id` (TEXT, `"run_<timestamp>"`) | session_id, project, pipeline_type, current_gate, status, started_at, completed_at, task_name, archived, pinned, gate_entered_at, total_duration_seconds | PK |

索引：
- `idx_pipeline_runs_session` ON `pipeline_runs(session_id, started_at DESC)`

---

## 2. 建议方案评审

### 2.1 建议 SQL

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

### 2.2 字段评审

| 字段 | 类型 | 评审 | 结论 |
|------|------|------|------|
| `id` | INTEGER AUTOINCREMENT | 作为内部行标识符，不对外暴露。符合 SQLite 最佳实践。 | **通过** |
| `run_id` | TEXT NOT NULL | 引用 `pipeline_runs.id`（TEXT，格式 `"run_<timestamp>"`）。类型一致。无物理外键（符合项目规范）。 | **通过** |
| `gate` | TEXT NOT NULL | Gate 名称，如 `"Gate A"`、`"Gate B"`。与 `GATES` 数组中的值一致。 | **通过** |
| `filepath` | TEXT NOT NULL | 需明确格式约定——建议使用**相对路径**（相对于 `docs/` 根目录），如 `"requirements/REQ-001.md"`，而非绝对路径。这确保了跨环境可移植性（不同机器上 `~/.jarvis/` 路径不同）。 | **通过（需明确路径格式约定）** |
| `created_at` | TEXT | ISO 8601 datetime 文本，如 `"2026-05-11T10:30:00"`。与 `pipeline.started_at` 和 `checkpoints.passed_at` 格式一致。注意 `datetime('now')` 返回 UTC 时间。 | **通过** |
| `UNIQUE(run_id, gate, filepath)` | 约束 | 语义明确——同一 run 同一 gate 下不能有重复的文件路径。 | **通过** |

### 2.3 与现有表概念的关联

```
sessions (1) ──────────── (N) pipeline_runs (1) ──────────── (N) artifacts
                │                                      │
                │                                      ├── run_id
                │                                      ├── gate
                │                                      └── filepath
                │
                └── (N) checkpoints (session_id, gate)
```

**关键洞察**：`checkpoints` 使用 `session_id` 为主关联轴，而 `artifacts` 使用 `run_id` 为主关联轴。这是**正确的设计决策**：
- checkpoints 是 session 级别事件（"这个会话通过了这个 Gate"）
- artifacts 是 run 级别产出（"这次运行在这个 Gate 产生了这个文件"）

一个 session 可以有多个 run，每个 run 产生不同的 artifacts。`run_id` 粒度更精细。

---

## 3. 索引策略评审

### 3.1 隐式索引分析

`UNIQUE(run_id, gate, filepath)` 在 SQLite 中会创建一个隐式的复合 B-tree 索引，列顺序为 `(run_id, gate, filepath)`。

### 3.2 目标查询覆盖分析

对于声明的查询 `SELECT filepath FROM artifacts WHERE run_id = ? AND gate = ?`：

| 分析维度 | 结果 | 说明 |
|---------|------|------|
| 是否使用索引 | **是** | `(run_id, gate)` 是索引的最左前缀 |
| 是否覆盖索引 | **是** | `filepath` 在索引中，SQLite 可以做 index-only scan，无需回表 |
| 索引扫描类型 | **Index Seek** | 精确匹配两个前缀列，非全扫描 |
| 预期选择率 | 低 | 每个 run+gate 组合通常产生少量 artifact（估计 1~20 个文件） |

**结论：当前 UNIQUE 约束的隐式索引已完美覆盖目标查询，无需额外索引。**

### 3.3 其他潜在查询的索引评估

| 查询模式 | 当前索引覆盖？ | 建议 |
|---------|--------------|------|
| `WHERE run_id = ? AND gate = ?` | 是（覆盖索引） | 无需额外索引 |
| `WHERE run_id = ?` | 是（最左前缀） | 无需额外索引 |
| `WHERE run_id = ? ORDER BY created_at DESC` | 否（created_at 不在索引中） | 如需此查询，考虑创建 `(run_id, created_at)` 索引 |
| `WHERE filepath = ?` | 否（filepath 不是最左前缀） | 如需反向查找（"这个文件属于哪个 run"），考虑创建 `(filepath)` 单列索引 |
| `WHERE gate = ?` | 否（gate 不是最左前缀） | 按 Gate 聚合 artifact 统计不是核心需求，暂不需要 |

### 3.4 索引写入成本

新增一行需要维护一个复合索引（UNIQUE 约束）。写入开销可忽略——每次 Gate advance 写入 1~20 行，远低于 SQLite 的索引维护阈值。

---

## 4. 与 checkpoints 表的冗余/冲突评估

### 4.1 当前 checkpoints 表结构

```sql
CREATE TABLE checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    gate TEXT NOT NULL,
    passed_at TEXT NOT NULL,
    advance_to TEXT,
    duration_seconds INTEGER,
    UNIQUE(session_id, gate)
);
```

**当前 codebase 中不存在 `artifact_count` 或 `artifacts_json` 字段**——`src/engine/db.ts` 定义的 checkpoints 表只有上述 6 个业务列。

### 4.2 角色分工

| 维度 | checkpoints | artifacts（建议新增） |
|------|------------|----------------------|
| **记录什么** | Gate 通行事件（何时通过、推进到哪） | Gate 产出文件（什么文件、属于哪个 run） |
| **粒度** | session + gate | run + gate + filepath |
| **查询用途** | Gate 进度判断（`passed_at` 非空即通过） | 文件追溯（"这个 Run 产出了哪些文件"） |
| **写入时机** | Gate advance 时写入一条记录 | Gate advance 时扫描目录写入 N 条记录 |

**两者是互补关系，不存在冗余或冲突。** checkpoints 回答"哪个 Gate 通过了"，artifacts 回答"这次的产出文件有哪些"。

### 4.3 如果未来考虑将 artifacts_json 加入 checkpoints

**不推荐**。原因：
1. JSON 字段无法用 SQL 高效查询（无法 WHERE filepath = ? 反向查找）
2. JSON 解析增加应用层开销
3. 正规化的 artifacts 表更灵活——可按 run_id/gate/filepath 三维查询

---

## 5. 并发安全性评估（better-sqlite3 同步模式）

### 5.1 better-sqlite3 特性

- **同步 API**：所有数据库操作在主线程上顺序执行，不存在真正的并发写入
- **WAL 模式**：已通过 `PRAGMA journal_mode=WAL` 启用，允许读写并发（但写操作仍是串行的）

### 5.2 UNIQUE 约束安全性

在同步模式下，UNIQUE 约束违规是确定性的：
- 如果两次 gate advance 尝试写入相同的 `(run_id, gate, filepath)` 组合，第二次会收到 `SQLITE_CONSTRAINT` 错误
- 不存在竞态条件——不存在"A 写了一半 B 插入了同样数据"的场景

### 5.3 建议写入方式

**必须使用 `INSERT OR IGNORE`** 而非裸 `INSERT`：

```sql
-- 推荐
INSERT OR IGNORE INTO artifacts (run_id, gate, filepath) VALUES (?, ?, ?);

-- 不推荐（会在重复时抛出异常）
INSERT INTO artifacts (run_id, gate, filepath) VALUES (?, ?, ?);
```

理由：
1. Gate advance 可能被重试（流水线重试机制，Gate C-impl 最多 3 次重试）
2. `INSERT OR IGNORE` 确保幂等性——重复扫描同一目录不会报错
3. 与现有代码风格一致（`INSERT OR REPLACE` 已在多处使用，如 `initPipeline`、`addCheckpoint`）

### 5.4 关于 INSERT OR REPLACE vs INSERT OR IGNORE

对于 artifacts 表，`INSERT OR IGNORE` 优于 `INSERT OR REPLACE`：
- files 是不可变的——同一个文件路径在同一个 run+gate 下只应存在一次
- `REPLACE` 会删除旧行并插入新行（触发 AUTOINCREMENT id 增长），无必要
- `IGNORE` 语义更清晰——"如果已存在就跳过"

---

## 6. 数据迁移方案

### 6.1 迁移策略：共存 + 渐进切换

```
阶段 1（部署）    → 创建 artifacts 表（空表）
阶段 2（新 Run）  → Gate advance 时同时写 artifacts 表 + 创建 checkpoint
阶段 3（查询）    → 优先查 artifacts 表，回退到文件系统扫描
阶段 4（稳定后）  → 旧 Run 自然到期，文件系统扫描仅用于向后兼容
```

### 6.2 具体实施步骤

#### Step 1: DDL 迁移（零停机）

```sql
CREATE TABLE IF NOT EXISTS artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    gate TEXT NOT NULL,
    filepath TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(run_id, gate, filepath)
);
CREATE INDEX IF NOT EXISTS idx_artifacts_run_gate ON artifacts(run_id, gate);
```

> 注意：DDL 中的显式 `CREATE INDEX` 是可选的（UNIQUE 约束已创建隐式索引），但显式创建能确保索引存在且便于后续维护时识别。实际执行时 `IF NOT EXISTS` 会跳过已存在的索引。

#### Step 2: 写入逻辑改造

Gate advance 时，在 `addCheckpoint()` 调用之后：

```typescript
// 伪代码——具体实现由 backend-data-expert 完成
function writeGateArtifacts(db: DatabaseSync, runId: string, gate: string, docsDir: string) {
  const gateDir = GATE_DIRS[gate];
  if (!gateDir) return;
  
  const dir = join(docsDir, gateDir);
  if (!existsSync(dir)) return;
  
  const files = readdirSync(dir).filter(f => f.endsWith('.md'));
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO artifacts (run_id, gate, filepath) VALUES (?, ?, ?)'
  );
  
  for (const file of files) {
    stmt.run(runId, gate, `${gateDir}/${file}`);
  }
}
```

#### Step 3: 查询逻辑改造（混合查找）

```typescript
function findRunArtifacts(db: DatabaseSync, runId: string, gate: string, docsDir: string): string[] {
  // 优先查 artifacts 表
  const dbResults = db.prepare(
    'SELECT filepath FROM artifacts WHERE run_id = ? AND gate = ?'
  ).all(runId, gate);
  
  if (dbResults.length > 0) {
    return dbResults.map(r => r.filepath);
  }
  
  // 回退到文件系统扫描（旧 Run 兼容）
  return findGateArtifacts(docsDir, gate);
}
```

### 6.3 回滚方案

```sql
-- 方案 A：删除 artifacts 表（数据可重建）
DROP TABLE IF EXISTS artifacts;
DROP INDEX IF EXISTS idx_artifacts_run_gate;

-- 方案 B：仅回退查询逻辑（表保留）
-- 将查询逻辑改回纯文件系统扫描，artifacts 表不删除但也不再读取
```

### 6.4 数据校验步骤

1. 手动触发一个 Run，在 Gate advance 后查询 `SELECT COUNT(*) FROM artifacts WHERE run_id = ?`
2. 验证 artifact 数量与 `docs/<gate-dir>/` 下的 `.md` 文件数量一致
3. 通过 Web 面板打开对应 Run 的文档抽屉，确认展示的 artifact 列表正确

### 6.5 停机窗口估算

**零停机**——DDL 语句使用 `IF NOT EXISTS`，对已有表无影响。写入逻辑改造不涉及表结构变更。查询逻辑改为混合查找，旧 Run 走文件系统扫描不受影响。

---

## 7. ADR：使用正规化 artifacts 表替代 JSON 嵌入式 artifact 记录

### ADR-000X — 使用正规化 artifacts 表替代 JSON 嵌入式 artifact 记录

**状态 (Status):** Proposed

**日期 (Date):** 2026-05-11

**决策者 (Deciders):** database-specialist

### 上下文 (Context)

Jarvis Agent Factory 当前通过文件系统扫描 + 日期前缀匹配来关联 artifact 文件到 pipeline run。这种启发式方法在以下场景下不可靠：
- 同一天产生多个 Run
- 文件名不遵循 `YYYY-MM-DD-xxx.md` 命名约定
- 跨会话的 artifact 污染

需要建立精确的 artifact-to-run 关联。存在两种方案：在 checkpoints 表中添加 `artifacts_json` 字段（非正规化 JSON），或创建独立的正规化 `artifacts` 表。

### 决策 (Decision)

采用**正规化 artifacts 表**：

- 表名：`artifacts`
- 关联轴：`run_id`（非 `session_id`）——artifact 是 run 级别的产出
- 唯一约束：`UNIQUE(run_id, gate, filepath)` ——每个文件的归属唯一
- 写入策略：`INSERT OR IGNORE` ——确保幂等性
- 查询策略：先查 artifacts 表，失败回退文件系统扫描（向后兼容旧 Run）

### 后果 (Consequences)

#### 正面影响

- **精确关联**：artifact-to-run 关系由数据库保证，不再依赖文件名约定
- **可查询**：支持按 run_id/gate/filepath 三维查询，可反向查找（"这个文件属于哪个 Run"）
- **可扩展**：未来可加 `file_size`、`content_hash`、`tags` 等列，无需改表结构
- **数据完整性**：UNIQUE 约束防止重复记录
- **零停机迁移**：表创建和查询逻辑改造均无需中断服务

#### 负面影响

- **Session 级查询需 JOIN**：查询某 session 的所有 artifacts 需要通过 `pipeline_runs` 表 JOIN（`WHERE pipeline_runs.session_id = ?`）。SQLite 中单次 JOIN 性能可接受（数十毫秒级）。
- **新增写入开销**：每次 Gate advance 增加 N 次 INSERT（N = Gate 目录下的 .md 文件数），通常 N < 50，影响可忽略。
- **旧 Run 无数据**：已归档的旧 Run 不会回填 artifacts 记录，需通过查询层兼容处理。

#### 缓解措施

- 查询层实现混合查找：DB 优先，文件系统兜底
- 写入使用 `INSERT OR IGNORE` 确保幂等
- 不强制回填旧数据——旧 Run 自然归档后消失

### 考虑的替代方案 (Alternatives Considered)

#### 方案 A：在 checkpoints 表中添加 artifacts_json TEXT 列

- **优点**：不增加新表，查询一次获取所有信息
- **缺点**：JSON 不可查询（无法 WHERE filepath = ?），需 JSON 解析开销，违反第一范式
- **弃用原因**：不满足精确关联和可查询两个核心需求

#### 方案 B：仅改进文件名格式强制约束

- **优点**：零 schema 变更
- **缺点**：约束无法在数据库层强制执行，依赖应用层纪律，仍有同天多 Run 冲突
- **弃用原因**：治标不治本，启发式方法固有缺陷

---

## 8. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| artifacts 表与 checkpoints 表数据不一致（Gate advance 写入了 checkpoint 但 artifact 扫描失败） | 低 | 中 — Gate 被认为通过但 artifact 不可追溯 | Gate advance 事务化：先写 artifacts，全部成功后再写 checkpoint（或包装在同一事务中） |
| `docs/` 目录下非 .md 文件未被记录 | 中 | 低 — 当前只关注 .md 文件，未来可能需要扩展 | 如需记录其他类型，只需调整文件过滤条件 |
| 旧 Run artifact 缺失导致混合查找回退到文件系统扫描（不精确） | 确定 | 低 — 仅影响旧 Run，新 Run 不受影响 | 文档化此为已知限制，鼓励用户关注新 Run |
| `filepath` 存储绝对路径导致跨环境不可移植 | 低 | 高 — 数据在 A 机器写入、B 机器读取时路径不匹配 | 强制使用相对于 `docs/` 根目录的相对路径 |
| 大量 Run 累积导致 artifacts 表膨胀 | 低 | 低 — 每个 Run 约 10~50 条记录，1000 Run = 5 万行，SQLite 轻松应对 | 必要时按 Run 归档时级联清理 artifacts（应用层实现） |

---

## 9. 建议改进点（汇总）

### 9.1 必须（Blocker）

1. **明确 filepath 路径格式约定**：必须使用相对于 `docs/` 根目录的相对路径（如 `"requirements/REQ-001.md"`），禁止绝对路径。写入 artifacts 的代码中必须做路径规范化。

### 9.2 强烈建议（Should）

2. **Gate advance 写入顺序**：先 `INSERT OR IGNORE` artifacts，全部成功后再写入 checkpoints。如果 artifact 扫描失败，不应通过 Gate（artifact 缺失 = 条件不满足）。
3. **查询层混合查找**：`findSessionGateArtifacts` 改为先查 artifacts 表（通过 JOIN pipeline_runs），失败才回退到文件系统日期匹配。
4. **INSERT OR IGNORE**：使用 `INSERT OR IGNORE` 而非裸 `INSERT`，确保幂等性。

### 9.3 建议（Could）

5. **考虑添加 run 删除时的级联清理**：当 `deleteRun()` 被调用时，同步删除该 run 的 artifacts 记录。当前 `deleteRun` 只删除 `pipeline_runs` 记录，如果 artifacts 表存在，建议同步清理。
6. **create_at 索引**：如果未来需要"最近产生的 artifact"查询，添加 `CREATE INDEX idx_artifacts_created ON artifacts(created_at DESC)`。
7. **考虑添加 content_hash 列**：如果需要检测文件内容是否变更（而非仅检测文件名），可添加 `content_hash TEXT` 列存储 SHA-256。

### 9.4 不推荐

8. **不建议添加 session_id 冗余列**：保持正规化——通过 `run_id → pipeline_runs → session_id` 的 JOIN 获取 session 关联。SQLite 中的简单 JOIN 成本极低，冗余列带来的维护复杂度（需保证 `artifacts.session_id === pipeline_runs.session_id`）高于收益。

---

## 10. 完整建议 DDL

```sql
-- 新增 artifacts 表
CREATE TABLE IF NOT EXISTS artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,           -- 关联 pipeline_runs.id (TEXT PK)
    gate TEXT NOT NULL,             -- Gate 名称，如 "Gate C"
    filepath TEXT NOT NULL,         -- 相对于 docs/ 根目录的路径，如 "requirements/REQ-001.md"
    created_at TEXT DEFAULT (datetime('now')),  -- ISO 8601 UTC 时间
    UNIQUE(run_id, gate, filepath)  -- 同一 run+gate 下同一文件只能有一条记录
);

-- 显式索引（可选，UNIQUE 约束已创建隐式索引，此处用于文档化和 IDE 可发现性）
CREATE INDEX IF NOT EXISTS idx_artifacts_run_gate ON artifacts(run_id, gate);
```

### 写入规范（伪代码）

```typescript
/**
 * 扫描 Gate 目录，将 .md 文件写入 artifacts 表
 * @param db - 数据库实例
 * @param runId - pipeline_run ID
 * @param gate - Gate 名称
 * @param docsDir - docs/ 目录绝对路径
 */
function syncGateArtifacts(db: DatabaseSync, runId: string, gate: string, docsDir: string): number {
  const subdir = GATE_DIRS[gate];
  if (!subdir) return 0;

  const dir = join(docsDir, subdir);
  if (!existsSync(dir)) return 0;

  const files = readdirSync(dir).filter(f => f.endsWith('.md'));
  const insert = db.prepare(
    'INSERT OR IGNORE INTO artifacts (run_id, gate, filepath) VALUES (?, ?, ?)'
  );

  let count = 0;
  for (const file of files) {
    const relPath = `${subdir}/${file}`; // 相对路径
    const result = insert.run(runId, gate, relPath);
    count += result.changes;
  }
  return count;
}
```

---

## 11. 推荐的下一步

1. **本评审通过后**，由 `backend-data-expert` 执行 DDL 迁移（`src/engine/db.ts` 的 `initSchema` 函数中添加 artifacts 表创建语句）
2. **改造 Gate advance 逻辑**：在 `addCheckpoint` 调用前写入 artifacts（参考第 10 节的 `syncGateArtifacts`）
3. **改造 artifact 查询逻辑**：`findSessionGateArtifacts` 和 `findGateArtifacts` 改为混合查找
4. **更新 `deleteRun`**：在删除 pipeline_run 时同步清理关联 artifacts
5. **验证**：通过 Web 面板或 MCP 工具调用触发一次完整流水线，确认 artifact 展示正确

---

## 12. 关联的 Plan Patch

此评审可能涉及以下 Schema 变更，具体 patch 由编排者 审批后下发：

| 变更项 | 类型 | 涉及文件 |
|--------|------|---------|
| 新增 artifacts 表 | DDL（Schema 新增） | `src/engine/db.ts` |
| Gate advance 时写入 artifacts | 逻辑改造 | `src/engine/server.ts` |
| Artifact 查询混合查找 | 逻辑改造 | `src/engine/gates.ts`, `src/web/routes.ts` |
| deleteRun 级联清理 | 逻辑改造 | `src/engine/db.ts` |
