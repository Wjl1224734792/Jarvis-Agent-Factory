# Database Architecture Review -- Jarvis-Agent-Factory 测试体系增强

> 评审日期：2026-05-13 | 评审人：database-architect | 版本：v1.0
> 需求文档：`docs/2026-05-13/requirements/REQ-test-system-enhancement.md`
> DDD 分析：`docs/2026-05-13/tasks/2026-05-13-test-systematization-ddd.md`
> 评审范围：`src/engine/db.ts` 全部表结构 + Schema 变更建议 + 索引策略 + 迁移方案

---

## 执行确认（Execution Acknowledgement）

- **数据库/表范围**：SQLite (`~/.jarvis/engine.db`) 中全部 7 张现有表 + 拟新增 3 张表
- **对应需求/Task ID**：REQ-test-system-enhancement（含 30+ 需求 ID）+ DDD 分析文档
- **当前数据量**：本地开发单用户，单表行数 < 10万；增长预估：多会话并发后 pipeline_runs 和 agent_events 可能达到万级
- **不会修改的内容**：不执行任何 DDL/DML（本报告仅输出建议方案）；不修改业务代码或 API 路由；不修改 `gates.ts` 中现有逻辑
- **已读取的上游文档**：
  - `docs/2026-05-13/requirements/REQ-test-system-enhancement.md`
  - `docs/2026-05-13/tasks/2026-05-13-test-systematization-ddd.md`
  - `src/engine/db.ts`（完整源码）
  - `src/engine/gates.ts`（第 1-80 行）
  - `src/engine/server.ts`（session_join 白名单）
  - `AGENTS.md`（项目约束）
- **冲突回退机制**：若后续发现 DDL 建议与实现冲突，以 DDD 分析文档中第 7.2 节"共享区域冲突"表格中的执行顺序为准

我已理解并遵守 behavioral-guidelines 各项准则。

---

## 一、当前 Schema 分析

### 1.1 表清单与状态

| 表名 | 主键 | 行数规模 | 写入频率 | 读取频率 | 现状评估 |
|------|------|---------|---------|---------|---------|
| `pipeline` | `session_id` | 会话数 | 低（会话创建/更新） | 中 | 稳定，暂无需变更 |
| `pipeline_runs` | `id` (UUID) | 10-100/会话 | 中（每次 /jarvis 调用 1 行） | 高（Dashboard 首页） | 需新增字段 |
| `checkpoints` | `id` (自增) | ~12/run | 中（每 Gate 1 行） | 中（Gate 强制检查） | 稳定，暂无需变更 |
| `artifacts` | `id` (自增) | 10-50/run | 高（每 Gate 产物） | 高（产物列表） | 稳定，暂无需变更 |
| `agent_events` | `id` (自增) | 10-100/run | 高（每个 Agent spawn/end） | 高（Dashboard G6 图） | 稳定，暂无需变更 |
| `sessions` | `id` (UUID) | 50-500 | 低（会话创建/心跳） | 中 | 稳定，暂无需变更 |
| `agent_models` | `agent_id` | ~54 | 低（按需配置） | 中（Agent 列表） | 稳定，暂无需变更 |

### 1.2 现有索引审计

| 索引名 | 列 | 用途 | 有效性评估 |
|--------|-----|------|-----------|
| `idx_pipeline_runs_session` | `(session_id, started_at DESC)` | Dashboard 首页按会话查询 runs | 有效，覆盖 `getActiveRun` 和 `getSessionRuns` |
| `idx_agent_events_run` | `(run_id, agent_id, event_type)` | Agent 事件去重 + 事件列表查询 | 有效，覆盖 `checkAgentEventDuplicate` 和 `getAgentEvents` |
| `idx_agent_events_lookup` | `(run_id, agent_id, event_type, started_at)` | Agent 事件查找 | 有效，但与前一个索引部分重叠 |

**发现**：`idx_agent_events_run` 和 `idx_agent_events_lookup` 存在 3 列重叠（run_id, agent_id, event_type）。SQLite 查询优化器通常选择最匹配的索引，该冗余**暂可保留**（写入开销可接受），待数据量增长后重新评估。

### 1.3 现有字段评估

| 表 | 字段 | 类型 | 评估 |
|-----|------|------|------|
| `pipeline_runs.pipeline_type` | TEXT | 当前仅 `full/frontend/backend/lite`，需扩展为 11 种类型 |
| `pipeline_runs.total_duration_seconds` | INTEGER | 已通过 `completeRun()`/`abortRun()` 自动计算，正常 |
| `pipeline_runs.archived` | INTEGER DEFAULT 0 | 归档标记，正常 |
| `pipeline_runs.pinned` | INTEGER DEFAULT 0 | 置顶标记，正常 |
| `agent_events.total_tokens` | VIRTUAL GENERATED | 虚拟列，自动计算，无存储开销，设计良好 |

### 1.4 当前架构优点

1. **Session Model B 设计良好**：每次 `/jarvis` 调用独立 `pipeline_run`，支持多轮并行，隔离性好
2. **迁移方案稳健**：`initSchema()` 使用 `ALTER TABLE ... ADD COLUMN` + `try/catch` 模式，向后兼容
3. **WAL 模式 + busy_timeout**：已配置 `PRAGMA journal_mode=WAL` 和 `busy_timeout=5000`，并发写入友好
4. **VIRTUAL 列妙用**：`total_tokens` 作为虚拟列无存储开销，利用 SQLite 计算能力

### 1.5 当前架构问题

| 问题 | 严重度 | 描述 |
|------|--------|------|
| `pipeline_type` 硬编码白名单 | 中 | `server.ts:358` 硬编码 `['full', 'frontend', 'backend', 'lite']`，新增类型必须手动同步两处（数据库 + 白名单） |
| 缺少外键应用层校验 | 低 | 项目规范禁止物理外键，但代码中未对 `agent_events.run_id` 做应用层存在性校验 |
| `agent_events` 索引冗余 | 低 | 两个索引前三列重叠，写入时双重维护 |
| 无数据库版本号机制 | 中 | 依赖 `try/catch ALTER TABLE` 模式，缺少 `schema_version` 表记录迁移历史 |

---

## 二、新需求引发的 Schema 变更评估

### 2.1 变更影响总览

```
                           ┌──────────────────────────────────┐
                           │      quality_gate_results        │
                           │  (新增表，质量门禁审计追踪)       │
                           └────────────┬─────────────────────┘
                                        │ run_id
                           ┌────────────▼─────────────────────┐
   pipeline_runs          │          test_reports             │
  (现有表 + 风险字段)──────┤  (新增表，测试执行结果)           │
                           └────────────┬─────────────────────┘
                                        │ run_id
                           ┌────────────▼─────────────────────┐
                           │        debug_sessions            │
                           │  (新增表，调试诊断会话)           │
                           └──────────────────────────────────┘
```

### 2.2 逐需求评估

---

#### REQ-TEST-007 + REQ-ENGINE-002：质量门禁结果存储

**需求**：记录每次 Gate 质量检查的通过/失败状态，供审计和 Dashboard 展示。

**评估结论**：**建议新增 `quality_gate_results` 表。**

**不建议与 `checkpoints` 表合并**，理由：
- `checkpoints` 记录的是 Gate 级通过（{session_id, gate} 唯一），一个 Gate 可包含多条质量检查（coverage/lint/build/security/contract 等）
- `checkpoints.passed_at` 语义是"Gate 通过时间"，而 `quality_gate_results.check_at` 是"单条规则检查时间"
- 合并会破坏 `checkpoints` 的单一职责：Gate 推进状态 vs. 质量审计追踪

**推荐 DDL**（修正 DDD 分析中的物理外键，改为应用层软关联）：

```sql
CREATE TABLE IF NOT EXISTS quality_gate_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  gate TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('coverage','lint','build','deps','perf','security','contract')),
  passed INTEGER NOT NULL DEFAULT 0,
  threshold TEXT,
  actual_value TEXT,
  checked_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_qgr_run_gate ON quality_gate_results(run_id, gate);
CREATE INDEX IF NOT EXISTS idx_qgr_run_rule ON quality_gate_results(run_id, rule_type);
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `run_id` | TEXT NOT NULL | 关联 `pipeline_runs.id`（应用层软关联，禁止物理外键） |
| `gate` | TEXT NOT NULL | 所属 Gate，如 `'Gate C1'`、`'Gate C2'`、`'Gate D'` |
| `rule_type` | TEXT NOT NULL | 质量规则类型，CHECK 约束限值 |
| `passed` | INTEGER NOT NULL | 0=未通过，1=通过 |
| `threshold` | TEXT | 阈值（JSON 字符串或简单数值），如 `'{"lines":80,"branches":70}'` |
| `actual_value` | TEXT | 实际值，如 `'{"lines":85,"branches":72}'` |
| `checked_at` | TEXT | 检查时间，ISO 8601 |

**查询模式预测**：

```sql
-- 最常见的查询：某 run 某 Gate 的质量检查结果
SELECT * FROM quality_gate_results WHERE run_id=? AND gate=? ORDER BY checked_at DESC;
-- 覆盖率: idx_qgr_run_gate

-- 质量趋势：某 run 的所有未通过检查
SELECT * FROM quality_gate_results WHERE run_id=? AND passed=0;
-- 覆盖率: idx_qgr_run_gate (前导列 run_id)

-- 跨 run 聚合（Dashboard 统计）
SELECT rule_type, COUNT(*), SUM(passed) FROM quality_gate_results WHERE run_id IN (...) GROUP BY rule_type;
-- 覆盖率: idx_qgr_run_rule (前导列 run_id)
```

---

#### REQ-ENHANCE-005：风险评分存储

**需求**：基于变更幅度（文件数/行数/模块关键度）计算风险等级，低风险静默通过，高风险强制确认。

**评估结论**：**不建议独立建表，建议作为 `pipeline_runs` 的扩展字段。**

理由：
- 风险评分是 pipeline run 的**固有属性**（一次 run 对应一个风险评分），非 1:N 关系
- 风险评分在 Gate A 或 B 阶段即可确定，随 run 整个生命周期不变
- 独立建表会增加 JOIN 开销，且数据量极小

**推荐 DDL**：

```sql
-- risk_level: 'low' | 'medium' | 'high' | 'critical'
ALTER TABLE pipeline_runs ADD COLUMN risk_level TEXT;

-- 风险详情（JSON 字符串，便于扩展）
ALTER TABLE pipeline_runs ADD COLUMN risk_detail TEXT;

-- 跳过的确认次数（累计）
ALTER TABLE pipeline_runs ADD COLUMN skipped_confirmations INTEGER DEFAULT 0;
```

**`risk_detail` JSON 结构建议**（存储在 TEXT 列中）：

```json
{
  "file_count": 12,
  "line_count": 450,
  "module_criticality": "high",
  "affected_modules": ["src/engine/gates.ts", "src/engine/server.ts"],
  "calculated_at": "2026-05-13T10:30:00Z",
  "formula": "file_count * line_count_factor * criticality_weight"
}
```

**注意**：SQLite 对 JSON 有内置支持（`json_extract`、`json_type`），但考虑到本项目不需要按 JSON 内部字段做 SQL 查询（风险评分仅用于应用层显示和逻辑判断），存储为 TEXT 列即可，无需 JSON 类型。

---

#### REQ-TEST-001~005：测试报告存储

**需求**：测试套件执行结果的持久化存储，供 Gate C2 质量检查和 Dashboard 展示。

**评估结论**：**建议新增 `test_reports` 表（轻量设计）。**

理由：
- 测试报告需要按 `run_id` + `test_type` 查询（"这个 run 的单元测试通过了吗？"），文件存储无法高效查询
- Gate C2 强制执行时需要读取最近的测试结果判断是否达标
- Dashboard 需要汇总展示（通过/失败/跳过/覆盖率）

**推荐 DDL**：

```sql
CREATE TABLE IF NOT EXISTS test_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK(test_type IN ('unit','integration','e2e','perf','security','mutation')),
  total INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  coverage_pct REAL,
  duration_ms INTEGER,
  report_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(run_id, test_type)
);
CREATE INDEX IF NOT EXISTS idx_test_reports_run ON test_reports(run_id);
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `run_id` | TEXT NOT NULL | 关联 `pipeline_runs.id`（应用层软关联） |
| `test_type` | TEXT NOT NULL | 测试类型，CHECK 约束限值 |
| `total/passed/failed/skipped` | INTEGER | 测试计数（`passed + failed + skipped = total` 由应用层保证） |
| `coverage_pct` | REAL | 覆盖率百分比（行覆盖率为主，可选） |
| `duration_ms` | INTEGER | 测试执行耗时（毫秒） |
| `report_path` | TEXT | 详细报告文件路径（可选，指向 `docs/.../testing/` 下的文件） |
| `created_at` | TEXT | 创建时间 |
| **UNIQUE(run_id, test_type)** | | 同一 run 同一测试类型仅保留最新一次结果 |

**关于 `UNIQUE(run_id, test_type)` 的考量**：
- 如果同一 run 内允许重跑测试（重试机制），改为普通索引，保留多行历史。
- 当前选用 UNIQUE，因为 `createPipelineRun` 创建的 run 内测试通常只跑一次。如需支持重试，移除 UNIQUE 约束即可。

---

#### REQ-CMD-005：调试会话存储

**需求**：记录调试诊断会话的信息、诊断报告路径、事后分析结果。

**评估结论**：**建议新增 `debug_sessions` 表。**

理由：
- 调试会话有独立的生命周期（D0→D4 Gate 序列），不直接等同于 pipeline_run
- post-mortem 模式需要存储崩溃快照路径、分析结果路径
- 与 `/bug-fix` 联动时需要查询历史调试记录

**推荐 DDL**：

```sql
CREATE TABLE IF NOT EXISTS debug_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  debug_mode TEXT NOT NULL CHECK(debug_mode IN ('standard', 'post-mortem')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'aborted')),
  exception_type TEXT,
  exception_message TEXT,
  snapshot_path TEXT,
  repro_case_path TEXT,
  diagnostic_report_path TEXT,
  suspected_file TEXT,
  suspected_line INTEGER,
  confidence REAL,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_run ON debug_sessions(run_id);
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `run_id` | TEXT NOT NULL | 关联 `pipeline_runs.id`（应用层软关联） |
| `debug_mode` | TEXT NOT NULL | `'standard'`（在线调试）或 `'post-mortem'`（事后分析） |
| `status` | TEXT NOT NULL | 会话状态：`active / completed / aborted` |
| `exception_type` | TEXT | 异常类型（如 `TypeError`、`SQLITE_BUSY`） |
| `exception_message` | TEXT | 异常消息原文 |
| `snapshot_path` | TEXT | 环境快照文件路径（D0 阶段收集） |
| `repro_case_path` | TEXT | 最小复现用例文件路径（D1 阶段生成） |
| `diagnostic_report_path` | TEXT | 诊断报告文件路径（D4 阶段生成） |
| `suspected_file` | TEXT | 疑似问题文件路径（根因分析结果） |
| `suspected_line` | INTEGER | 疑似问题行号 |
| `confidence` | REAL | 根因分析置信度（0.0 - 1.0） |
| `started_at` | TEXT | 调试开始时间 |
| `completed_at` | TEXT | 调试完成时间 |

---

### 2.3 不建议建表的决策记录

| 提议 | 决定 | 理由 |
|------|------|------|
| `risk_assessments` 独立表 | 拒绝，合并到 `pipeline_runs` | 1:1 关系，独立表增加无谓 JOIN |
| `test_cases` 独立表 | 拒绝 | 单个测试用例数量大、结构复杂、纯文本适合文件存储；存储路径在 `test_reports.report_path` |
| `contract_checks` 独立表 | 拒绝，复用 `quality_gate_results` | Gate F 的契约检查本质是质量规则的一种（rule_type='contract'），无需额外表 |
| `review_sessions` 独立表 | 拒绝 | 审查通过 artifacts + checkpoints 已可追踪，暂无独立持久化需求 |
| `crash_data` 独立表 | 拒绝，合并到 `debug_sessions` | 崩溃数据是调试会话的属性，非独立实体 |
| `migration_run` 独立表 | 拒绝 | 复用 `pipeline_runs.pipeline_type='migrate'`，迁移的逐文件结果通过 artifacts 存储 |

---

### 2.4 Pipeline Type 白名单扩展

**现状**：`server.ts:358` 硬编码白名单 `['full', 'frontend', 'backend', 'lite']`。

**新增类型**（来自 REQ-ENGINE-001 + REQ-CMD-001~007）：
- `refactor` — 重构指令
- `hotfix` — 紧急热修复
- `migrate` — 框架迁移
- `evaluate` — 技术评估
- `debug` — 调试诊断
- `doc` — 文档同步
- `test` — 独立测试指令（映射 `/test-unit`、`/test-integration` 等）

**推荐方案**：将白名单改为从 `PIPELINE_DEFS` 动态生成。

```typescript
// 替换 server.ts:358 的硬编码
// 旧: if (!['full', 'frontend', 'backend', 'lite'].includes(pt))
// 新:
const VALID_PIPELINE_TYPES = Object.keys(PIPELINE_DEFS);
if (!VALID_PIPELINE_TYPES.includes(pt)) {
  return resp({ error: `Invalid pipeline_type: ${pt}. Valid: ${VALID_PIPELINE_TYPES.join(', ')}` });
}
```

**优势**：
- 新增 `pipeline_type` 时只需修改 `gates.ts` 的 `PIPELINE_DEFS`，不再两处同步
- 消除手动维护白名单的遗漏风险

---

### 2.5 schema_version 表（新增建议）

当前 `initSchema()` 依赖 `ALTER TABLE ... ADD COLUMN` 的 `try/catch` 模式做迁移检测。数据量不大但缺乏可审计性。

**推荐新增**（优先级 P3，非阻塞）：

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now')),
  description TEXT
);
```

启动时检查 `schema_version` 表，记录每次迁移。当下一个任务实施时可供选择。

---

## 三、索引策略汇总

### 3.1 完整索引矩阵

| 表 | 索引名 | 列 | 类型 | 用途 | 选择性 | 写入成本 |
|-----|--------|-----|------|------|--------|---------|
| `pipeline_runs` | `idx_pipeline_runs_session` | `(session_id, started_at DESC)` | 复合 | Dashboard 按会话查询 | 高 | 低 |
| `agent_events` | `idx_agent_events_run` | `(run_id, agent_id, event_type)` | 复合 | 事件去重 + 列表 | 高 | 中 |
| `agent_events` | `idx_agent_events_lookup` | `(run_id, agent_id, event_type, started_at)` | 复合 | 事件查找 | 高 | 中 |
| `quality_gate_results` | `idx_qgr_run_gate` | `(run_id, gate)` | 复合 | 按 run+gate 查询 | 高 | 低 |
| `quality_gate_results` | `idx_qgr_run_rule` | `(run_id, rule_type)` | 覆盖 | 质量趋势聚合 | 中 | 低 |
| `test_reports` | `idx_test_reports_run` | `(run_id)` | 单列 | 按 run 查询所有测试 | 高 | 低 |
| `debug_sessions` | `idx_debug_sessions_run` | `(run_id)` | 单列 | 按 run 查询调试会话 | 高 | 低 |

### 3.2 索引选择率分析

| 索引 | 基数估算 | 选择率 | 判定 |
|------|---------|--------|------|
| `idx_qgr_run_gate` | run_id (1000) x gate (~12) = 12000 | ~1/12000 唯一值 | 高选择性，值得建 |
| `idx_qgr_run_rule` | run_id x rule_type (7) | ~1/7000 | 高选择性，值得建 |
| `idx_test_reports_run` | run_id x test_type (6) | ~1/6000 | 高选择性，值得建 |
| `idx_debug_sessions_run` | run_id (几乎 1:1) | ~1/1 | 极高选择性，值得建 |

### 3.3 不建议建的索引

| 提议 | 理由 |
|------|------|
| `quality_gate_results(gate)` 单列索引 | 查询总是带 `run_id`，复合索引已覆盖前导列 `run_id`，单列无用 |
| `test_reports(test_type)` 单列索引 | 查询总是带 `run_id`，单列索引无额外价值 |
| `pipeline_runs(risk_level)` 单列索引 | 风险级别仅 4 个枚举值（low/medium/high/critical），选择率极低，索引无效 |
| `agent_events(session_id)` 单列索引 | 所有 agent_events 查询都带 `run_id`，`session_id` 非查询入口 |

---

## 四、物理存储估算

### 4.1 新增表空间估算

| 表 | 单行大小 | 预估年行数 | 年增长 | 备注 |
|-----|---------|-----------|--------|------|
| `quality_gate_results` | ~200 B | 7 rule_types x 12 gates x 1000 runs = ~84,000 | ~17 MB | 每次 Gate 检查 7 条规则 |
| `test_reports` | ~150 B | 6 test_types x 1000 runs = ~6,000 | ~1 MB | 每 run 最多 6 种测试类型 |
| `debug_sessions` | ~300 B | ~100 | ~30 KB | 仅异常场景触发 |
| **合计** | | | **< 20 MB/年** | 对于本地 SQLite 完全可接受 |

### 4.2 宽松删除策略

当前 `deleteRun()` 和 `deleteSession()` 使用 `BEGIN/COMMIT` 事务 + 级联手动删除。新增表后需同步更新级联删除逻辑（见第五节迁移步骤）。

---

## 五、数据迁移方案

### 5.1 迁移策略：原地增量迁移

本项目数据库为本地 SQLite（`~/.jarvis/engine.db`），单用户、单实例。采用 `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN` 的**零停机增量迁移**模式（与现有 `initSchema()` 风格一致）。

### 5.2 迁移步骤

```
步骤 1: schema_version 记录（如已实施）
  → INSERT INTO schema_version (version, description) VALUES (2, '新增 quality_gate_results/test_reports/debug_sessions 表，pipeline_runs 增加风险字段')

步骤 2: pipeline_runs 新增字段
  → ALTER TABLE pipeline_runs ADD COLUMN risk_level TEXT;
  → ALTER TABLE pipeline_runs ADD COLUMN risk_detail TEXT;
  → ALTER TABLE pipeline_runs ADD COLUMN skipped_confirmations INTEGER DEFAULT 0;

步骤 3: 创建 quality_gate_results 表
  → CREATE TABLE IF NOT EXISTS quality_gate_results (...);
  → CREATE INDEX IF NOT EXISTS idx_qgr_run_gate ...;
  → CREATE INDEX IF NOT EXISTS idx_qgr_run_rule ...;

步骤 4: 创建 test_reports 表
  → CREATE TABLE IF NOT EXISTS test_reports (...);
  → CREATE INDEX IF NOT EXISTS idx_test_reports_run ...;

步骤 5: 创建 debug_sessions 表
  → CREATE TABLE IF NOT EXISTS debug_sessions (...);
  → CREATE INDEX IF NOT EXISTS idx_debug_sessions_run ...;

步骤 6: 更新级联删除逻辑
  → deleteRun() 增加: DELETE FROM quality_gate_results WHERE run_id=?
  → deleteRun() 增加: DELETE FROM test_reports WHERE run_id=?
  → deleteRun() 增加: DELETE FROM debug_sessions WHERE run_id=?
  → deleteSession() 增加对应的级联删除

步骤 7: 更新 session_join 白名单
  → server.ts 改为 Object.keys(PIPELINE_DEFS) 动态生成
```

### 5.3 回滚方案

| 步骤 | 回滚操作 | 影响 |
|------|---------|------|
| 步骤 1 | `DELETE FROM schema_version WHERE version=2` | 无数据丢失 |
| 步骤 2 | 无法回滚（SQLite 不支持 `ALTER TABLE DROP COLUMN`） | 新字段为 NULL/0，不影响现有查询，可接受 |
| 步骤 3-5 | `DROP TABLE IF EXISTS quality_gate_results/test_reports/debug_sessions` | 丢弃新增数据（迁移后未使用则无损） |
| 步骤 6-7 | `git revert` 代码变更 | 不影响数据库结构 |

**注意**：SQLite 3.35.0+ 支持 `ALTER TABLE DROP COLUMN`，但需确认 Node.js 绑定的 SQLite 版本。为安全起见，回滚策略不依赖 DROP COLUMN。

### 5.4 数据校验步骤

迁移完成后执行以下校验：

```
-- 校验 1: 新表存在
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('quality_gate_results','test_reports','debug_sessions');
-- 预期: 3 行

-- 校验 2: 新字段存在
SELECT sql FROM sqlite_master WHERE type='table' AND name='pipeline_runs';
-- 预期: 含 risk_level, risk_detail, skipped_confirmations 列

-- 校验 3: 索引存在
SELECT name FROM sqlite_master WHERE type='index' AND name IN ('idx_qgr_run_gate','idx_qgr_run_rule','idx_test_reports_run','idx_debug_sessions_run');
-- 预期: 4 行

-- 校验 4: 旧数据未受损
SELECT COUNT(*) FROM pipeline_runs;
SELECT COUNT(*) FROM agent_events;
SELECT COUNT(*) FROM sessions;
-- 预期: 与迁移前行数一致

-- 校验 5: 级联删除完整性（可选的完整性测试）
-- 创建临时 run → 插入各表测试数据 → deleteRun → 验证全部删除
```

### 5.5 停机窗口估算

- **开发环境**（本地 SQLite）：零停机。`initSchema()` 在引擎启动时自动迁移，耗时 < 100ms（CREATE TABLE IF NOT EXISTS + ALTER TABLE 均为瞬时操作）。
- **无生产部署**：本项目数据库为本地本地存储，无共享数据库实例，无停机概念。

---

## 六、ADR 格式决策记录

### ADR-0001：风险评分存储为 pipeline_runs 列而非独立表

**状态 (Status):** Proposed

**日期 (Date):** 2026-05-13

**决策者 (Deciders):** @database-architect

#### 上下文 (Context)

REQ-ENHANCE-005 引入了变更影响评分模型，需要存储风险等级（low/medium/high/critical）及评分详情（文件数、行数、模块关键度）。风险评分是每次 pipeline run 的固有属性，一个 run 对应一个风险评分。

#### 决策 (Decision)

风险评分作为 `pipeline_runs` 表的扩展列存储：
- `risk_level TEXT` — 风险等级枚举值
- `risk_detail TEXT` — 风险详情 JSON
- `skipped_confirmations INTEGER DEFAULT 0` — 跳过的确认次数

不使用独立表 `risk_assessments`。

#### 后果 (Consequences)

**正面影响**：
- 无需 JOIN 即可在 Dashboard 展示风险等级
- 减少写入开销（少一张表、少一次 INSERT）
- 与现有 `pipeline_runs` 查询模式统一

**负面影响**：
- `risk_detail` 存储 JSON 文本，无法高效查询 JSON 内部字段。但当前无此需求
- 如果未来需要风险评分历史（多次变更的风险变化），需重新评估

**缓解措施**：
- 如需历史记录，届时新增 `risk_assessment_log` 表（append-only），不修改现有架构

#### 考虑的替代方案

**方案 A：独立 risk_assessments 表**
- 优点：支持风险评分历史
- 缺点：当前为 1:1 关系，增加无谓 JOIN；增加维护成本
- 弃用原因：过度设计，YAGNI

---

### ADR-0002：quality_gate_results 不合并到 checkpoints

**状态 (Status):** Proposed

**日期 (Date):** 2026-05-13

**决策者 (Deciders):** @database-architect

#### 上下文 (Context)

Gate 质量检查（覆盖率是否达标、lint 是否通过、依赖是否安全）需要在数据库中持久化记录，用于审计和 Dashboard 展示。现有 `checkpoints` 表记录 Gate 级通过状态，一个 Gate 可能包含多条质量规则检查。

#### 决策 (Decision)

新增独立的 `quality_gate_results` 表，每行记录一条质量规则的检查结果。`checkpoints` 表保持职责不变（Gate 级通过/时间和去向）。

#### 后果 (Consequences)

**正面影响**：
- 单一职责：`checkpoints` 管 Gate 推进，`quality_gate_results` 管质量审计
- 支持按 `rule_type` 聚合查询（"最近 10 个 run 的覆盖率检查通过率"）
- 每个 Gate 可记录多条质量检查，与 `GATE_CHECKS` 定义对齐

**负面影响**：
- 增加一张表，级联删除需同步维护
- 查询某 Gate 的完整状态需 JOIN 两张表（`checkpoints` + `quality_gate_results`）

**缓解措施**：
- 应用层封装 `getGateStatus(runId, gate)` 函数，内部处理 JOIN，对外透明

#### 考虑的替代方案

**方案 A：合并到 checkpoints 表**
- 优点：减少表数量
- 缺点：`checkpoints` 的 `UNIQUE(session_id, gate)` 约束只能记录一行，无法容纳多条质量检查；需将多个检查结果序列化为 JSON 存入单列，丧失查询能力
- 弃用原因：破坏数据范式，查询能力退化

**方案 B：仅文件存储（不建表）**
- 优点：零 Schema 变更
- 缺点：无法高效查询"某 run 是否通过了覆盖率检查"，Gate 强制执行需解析文件
- 弃用原因：质量门禁强制执行是核心流程，查询性能不可妥协

---

## 七、db.ts 变更建议（完整 diff 草案）

以下为 `initSchema()` 函数末尾应追加的代码（行 243 之后），保持与现有迁移模式一致：

```typescript
  // ---- 质量门禁检查结果表 ----
  db.exec(`
    CREATE TABLE IF NOT EXISTS quality_gate_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      gate TEXT NOT NULL,
      rule_type TEXT NOT NULL CHECK(rule_type IN ('coverage','lint','build','deps','perf','security','contract')),
      passed INTEGER NOT NULL DEFAULT 0,
      threshold TEXT,
      actual_value TEXT,
      checked_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_qgr_run_gate ON quality_gate_results(run_id, gate);
    CREATE INDEX IF NOT EXISTS idx_qgr_run_rule ON quality_gate_results(run_id, rule_type);
  `);

  // ---- 测试报告表 ----
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      test_type TEXT NOT NULL CHECK(test_type IN ('unit','integration','e2e','perf','security','mutation')),
      total INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      coverage_pct REAL,
      duration_ms INTEGER,
      report_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(run_id, test_type)
    );
    CREATE INDEX IF NOT EXISTS idx_test_reports_run ON test_reports(run_id);
  `);

  // ---- 调试会话表 ----
  db.exec(`
    CREATE TABLE IF NOT EXISTS debug_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      debug_mode TEXT NOT NULL CHECK(debug_mode IN ('standard', 'post-mortem')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'aborted')),
      exception_type TEXT,
      exception_message TEXT,
      snapshot_path TEXT,
      repro_case_path TEXT,
      diagnostic_report_path TEXT,
      suspected_file TEXT,
      suspected_line INTEGER,
      confidence REAL,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_debug_sessions_run ON debug_sessions(run_id);
  `);

  // ---- pipeline_runs 风险评分字段 ----
  try { db.exec("ALTER TABLE pipeline_runs ADD COLUMN risk_level TEXT"); } catch {}
  try { db.exec("ALTER TABLE pipeline_runs ADD COLUMN risk_detail TEXT"); } catch {}
  try { db.exec("ALTER TABLE pipeline_runs ADD COLUMN skipped_confirmations INTEGER DEFAULT 0"); } catch {}
```

### deleteRun() 级联删除更新

在 `deleteRun()` 函数的事务内（第 519 行之后）追加：

```typescript
    // 级联删除质量门禁结果
    db.prepare('DELETE FROM quality_gate_results WHERE run_id=?').run(runId);
    // 级联删除测试报告
    db.prepare('DELETE FROM test_reports WHERE run_id=?').run(runId);
    // 级联删除调试会话
    db.prepare('DELETE FROM debug_sessions WHERE run_id=?').run(runId);
```

### deleteSession() 级联删除更新

在 `deleteSession()` 函数的事务内（第 554 行之后）追加：

```typescript
      db.prepare('DELETE FROM quality_gate_results WHERE run_id=?').run(r.id);
      db.prepare('DELETE FROM test_reports WHERE run_id=?').run(r.id);
      db.prepare('DELETE FROM debug_sessions WHERE run_id=?').run(r.id);
```

---

## 八、server.ts session_join 白名单变更建议

**文件**：`src/engine/server.ts`，第 358 行

**变更前**：
```typescript
if (!['full', 'frontend', 'backend', 'lite'].includes(pt)) {
  return resp({ error: `Invalid pipeline_type: ${pt}. Valid: full, frontend, backend, lite` });
}
```

**变更后**：
```typescript
// 从 PIPELINE_DEFS 动态生成白名单，消除手动同步维护负担
const VALID_PIPELINE_TYPES = Object.keys(PIPELINE_DEFS);
if (!VALID_PIPELINE_TYPES.includes(pt)) {
  return resp({ error: `Invalid pipeline_type: ${pt}. Valid: ${VALID_PIPELINE_TYPES.join(', ')}` });
}
```

**注意**：此变更需确保 `server.ts` 文件顶部已导入 `PIPELINE_DEFS`（当前 `gates.ts` 已通过其他导入引入，需确认）。

---

## 九、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| SQLite 并发写入瓶颈（WAL 模式下多 Agent 同时写 agent_events） | 低 | 中 | WAL 模式已启用，busy_timeout=5000ms；单用户场景下并发写入不超过 10 个 Agent |
| `risk_detail` JSON 字段未来需要内部查询 | 低 | 低 | 届时只需新增列或将关键字段提升为独立列，无需改表结构 |
| `test_reports` UNIQUE(run_id, test_type) 阻止重跑记录 | 中 | 低 | 如需支持重试历史，移除 UNIQUE 约束即可（向下兼容，旧数据不受影响） |
| session_join 动态白名单引入未知 pipeline_type | 低 | 中 | `PIPELINE_DEFS` 在 `gates.ts` 中由代码审查保证正确性；前端命令名与 pipeline_type 映射由 `.md` 文件 frontmatter 管理 |
| 级联删除遗漏新表 | 中 | 低 | 增加单元测试覆盖 `deleteRun()` 和 `deleteSession()` 的级联删除完整性 |
| 旧版本 CLI 使用新数据库（新增 CHECK 约束可能失败） | 低 | 低 | CHECK 约束仅阻止无效数据写入，不阻止读取；旧 CLI 读取新数据库不会崩溃 |

---

## 十、推荐的下一步

### 第 1 轮（P0，阻塞性）—— 引擎基础

1. **`gates.ts`**：扩展 `PIPELINE_DEFS`（增加 refactor/hotfix/migrate/evaluate/debug/doc/test 类型 + Gate F 入 full/frontend 序列）
2. **`db.ts`**：新增 3 张表 + pipeline_runs 风险字段（按本报告第七节 diff 执行）
3. **`server.ts`**：session_join 白名单改为动态（按本报告第八节执行）
4. **单元测试**：`deleteRun()` / `deleteSession()` 级联删除覆盖新表

### 第 2 轮（P1）—— 质量门禁集成

5. **`quality-gates.yml`** 模板创建 + `QualityGateService` 实现（读取配置 → 写入 `quality_gate_results`）
6. **`RiskAssessmentService`** 实现（变更幅度计算 → 写入 `pipeline_runs.risk_level`）
7. **API 端点** `/api/quality-gates` 查询质量门禁配置和结果

### 第 3 轮（P2）—— 测试与调试

8. **`TestExecutionService`** 实现（运行测试 → 写入 `test_reports`）
9. **`DebugSessionService`** 实现（D0→D4 流程 → 写入 `debug_sessions`）
10. **Web Dashboard** 适配新数据（质量门禁结果展示、测试报告卡片、调试会话列表）

---

## 十一、关联 Plan Patch

本报告涉及以下**共享区域变更**，需提交 plan patch 供编排者审批：

| 文件 | 变更类型 | 描述 |
|------|---------|------|
| `src/engine/db.ts` | Schema 扩展 | 新增 3 张表 + 3 列 + 4 索引；更新 `deleteRun()`/`deleteSession()` 级联删除 |
| `src/engine/server.ts` | 白名单改造 | session_join 白名单从硬编码改为 `Object.keys(PIPELINE_DEFS)` 动态生成 |
| `src/engine/gates.ts` | Pipeline 扩展 | （不属本报告范围，但此处列出以明确依赖顺序）扩展 PIPELINE_DEFS 至 11 种类型 + Gate F |

---

## 附录 A：完整表结构 ER 视图（逻辑层，无物理外键）

```
sessions (id) ──< pipeline_runs (session_id) ──< quality_gate_results (run_id)
                    │                                    │
                    │                                    └── test_reports (run_id)
                    │
                    ├──< artifacts (run_id)
                    │
                    ├──< agent_events (run_id, session_id)
                    │
                    └──< debug_sessions (run_id)

sessions (id) ──< pipeline (session_id)
sessions (id) ──< checkpoints (session_id)

agent_models (agent_id) —— (独立表，不关联 run/session)
```

**图例**：`──<` 表示"1 对多"（应用层软关联，通过 TEXT 列引用，无物理外键约束）

---

## 附录 B：CHECK 约束汇总

| 表 | 列 | CHECK 约束 | 说明 |
|-----|------|-----------|------|
| `agent_events` | `event_type` | `IN ('start', 'end', 'error')` | Agent 生命周期三态 |
| `agent_events` | `status` | `IN ('success', 'error') OR IS NULL` | start 事件 status 为 NULL |
| `quality_gate_results` | `rule_type` | `IN ('coverage','lint','build','deps','perf','security','contract')` | 7 种质量规则 |
| `test_reports` | `test_type` | `IN ('unit','integration','e2e','perf','security','mutation')` | 6 种测试类型 |
| `debug_sessions` | `debug_mode` | `IN ('standard', 'post-mortem')` | 2 种调试模式 |
| `debug_sessions` | `status` | `IN ('active', 'completed', 'aborted')` | 调试会话状态三态 |

所有 CHECK 约束在 SQLite 层面执行，无效数据在 INSERT 时被拒绝，由应用层负责捕获错误并反馈。

---

> **文档结束**。本报告建议的 DDL 变更**不得直接执行**，需经编排者审批后，由 `backend-data-expert` Agent 在对应的 implementation task 中实施。
