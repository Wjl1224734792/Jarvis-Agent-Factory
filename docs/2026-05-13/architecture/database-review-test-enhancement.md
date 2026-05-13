# 数据库架构评审 -- 测试体系增强

> 关联需求：REQ-test-system-enhancement.md（v1.0）
> 关联 DDD：docs/tasks/2026-05-13-test-system-enhancement-ddd.md
> 评审日期：2026-05-13
> 数据库引擎：SQLite (node:sqlite DatabaseSync)
> 存储路径：`~/.jarvis/engine.db`

---

## 一、当前 Schema 镜像

评审基于 `src/engine/db.ts` 当前 `initSchema()` 产出的完整表结构：

| 表名 | 关键列 | 约束 |
|------|--------|------|
| `pipeline` | session_id (PK), project, current_gate, pipeline_type, started_at, updated_at | CURRENT_GATE DEFAULT 'Gate A' |
| `checkpoints` | id (PK AUTOINCREMENT), session_id, gate, passed_at, advance_to, duration_seconds | UNIQUE(session_id, gate) |
| `sessions` | id (PK), platform, role, status, created_at, last_heartbeat | status DEFAULT 'active' |
| `agent_models` | agent_id (PK), model, effort, updated_at | effort DEFAULT 'high' |
| `pipeline_runs` | id (PK), session_id, project, pipeline_type, current_gate, status, started_at, completed_at, task_name, archived, pinned, total_duration_seconds, gate_entered_at | INDEX(session_id, started_at DESC) |
| `artifacts` | id (PK AUTOINCREMENT), run_id, gate, filepath, created_at | UNIQUE(run_id, gate, filepath) |
| `agent_events` | id (PK AUTOINCREMENT), run_id, session_id, agent_id, event_type, model, status, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, total_tokens (VIRTUAL), error_message, started_at, ended_at, duration_ms, **current_gate**, created_at | CHECK(event_type IN('start','end','error')) |

---

## 二、四大评审点

### 2.1 quality-gates 配置是否需要持久化

#### 分析（当前状态：quality-gates.yml 文件尚未创建，数据库无相关表，REQ-ENGINE-002 要求引擎启动时加载文件）

quality-gates.yml 作为**配置源**（Configuration Source of Truth），天然适合文件管理——版本可控、可随项目分发、修改无需数据库 migration。但仅有文件配置无法满足 Web 面板的**运行历史审计**需求（"第 8 次 Run 在 Gate C1 因覆盖率不足被阻止"）。

需要区分两种数据：

| 数据类型 | 存储方式 | 理由 |
|---------|---------|------|
| **门禁配置**（阈值、测试类型要求、性能基线） | 仅文件（quality-gates.yml） | 版本可控、模板可分发、无需 migration |
| **运行级检查结果**（哪个 Gate 的哪项检查通过/失败） | 新增数据库表 | 审计追踪、Web 面板时间线展示、跨 Run 对比 |

#### 决策：新增 `quality_gate_results` 表，配置文件不存库

### 2.2 新 pipeline_type 的兼容性

#### 字段分析（关键发现：两个表 `pipeline_type` 均为纯 TEXT，无 CHECK/ENUM 约束）

唯一白名单校验在 `session_join` 工具中（`server.ts:358`）：`if (!['full','frontend','backend','lite'].includes(pt))`。

#### 结论

- **DDL 不需要 migration**：新增 `refactor`/`hotfix`/`migrate`/`evaluate`/`debug`/`doc`/`test` 七个 pipeline_type 值无需 ALTER TABLE
- **必须修改的代码**：`src/engine/server.ts` 第 358 行白名单数组
- **建议**：将白名单从硬编码数组提取为从 `PIPELINE_DEFS` 的 `Object.keys()` 动态读取，减少单点维护成本（不在本次数据库评审范围内，但值得在 DDD 文档中记录）

### 2.3 Agent 事件表 current_gate 兼容性

#### 字段定义

```sql
-- 通过 ALTER TABLE 添加的列
ALTER TABLE agent_events ADD COLUMN current_gate TEXT
-- 无长度限制，无 CHECK 约束，无 ENUM
```

`insertAgentEvent()` 函数直接写入 `current_gate` 参数值：

```typescript
// src/engine/db.ts:688
db.prepare(`INSERT INTO agent_events (..., current_gate)
  VALUES (?, ?, ..., ?)`).run(..., current_gate || null);
```

`getAgentGateStatus()` 函数按 `current_gate` 分组 Agent 状态供前端 G6 图渲染。

#### 新 Gate 前缀分析

| 新 pipeline_type | Gate 序列 | 示例 Gate 名 | 兼容性 |
|-----------------|-----------|-------------|--------|
| refactor | R1→R2→R3→R4→R5 | `Gate R1` | 纯字符串，兼容 |
| hotfix | H0→H1→H2→H3 | `Gate H0` | 纯字符串，兼容 |
| migrate | M1→M2→M3→M4 | `Gate M1` | 纯字符串，兼容 |
| evaluate | E0→E1→E2→E3 | `Gate E0` | 纯字符串，兼容 |
| debug | D0→D1→D2→D3→D4 | `Gate D0` | 纯字符串，兼容 |
| doc | DOC1→DOC2 | `Gate DOC1` | 纯字符串，兼容 |
| test (新指令) | 复用现有 Gate 序列 | `Gate A`/`Gate C2` 等 | 无需变更 |

#### 结论

- **DDL 不需要 migration**：TEXT 列可存储任意 Gate 名称
- **逻辑兼容**：`getAgentGateStatus()` 的 `GROUP BY current_gate` 按字符串分组，对新 Gate 无需修改
- **需注意**：Gate 名称需与 `PIPELINE_DEFS` 中定义完全一致（含空格），如 `Gate R1` 而非 `R1`——当前引擎在 `advance_gate` 中通过 `gateList.indexOf(gate)` 做严格字符串比较

### 2.4 测试结果存储

**决策：新增 `quality_gate_results` 表（MVP 必须），完整测试套件表（远期可选）。**

`quality_gate_results` 存储 Run 级的质量门禁检查结果（通过/失败 + violations + 覆盖率快照），满足 Web 面板审计需求。完整测试用例详情仍以文件存储于 `docs/testing/`。远期若需要覆盖率趋势图、性能回归对比，再建 `test_suite_results` 表。DDL 见第三节。

---

## 三、DDL 建议方案

### 3.1 新增表：`quality_gate_results`

```sql
CREATE TABLE IF NOT EXISTS quality_gate_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  gate TEXT NOT NULL,                         -- 触发检查的 Gate（Gate C1/C2/D 等）
  stage TEXT NOT NULL,                        -- 质量阶段（c1/c2/d）
  passed INTEGER NOT NULL DEFAULT 0,          -- 1=通过, 0=未通过
  violations TEXT,                            -- JSON 数组: [{check, expected, actual, detail}]
  coverage_lines REAL,                        -- 行覆盖率百分比
  coverage_branches REAL,                     -- 分支覆盖率百分比
  coverage_functions REAL,                    -- 函数覆盖率百分比
  test_types_required TEXT,                   -- JSON 数组: 要求的测试类型
  test_types_executed TEXT,                   -- JSON 数组: 实际执行的测试类型
  security_checks_passed INTEGER,             -- 安全扫描通过数
  security_checks_total INTEGER,              -- 安全扫描总数
  checked_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qgr_run ON quality_gate_results(run_id, gate);
```

#### 列设计说明

| 列 | 类型 | 说明 |
|----|------|------|
| `run_id` | TEXT | 关联 pipeline_run，非强制外键（遵循项目"禁止物理外键"约定） |
| `gate` | TEXT | 存储原始 Gate 名（如 `Gate C1`），与 agent_events.current_gate 保持一致 |
| `stage` | TEXT | 质量阶段标识（c1/c2/d），对应 quality-gates.yml 中的 stages key |
| `violations` | TEXT(JSON) | 违例详情，Web 面板可直接解析展示，无需额外 JOIN |
| `coverage_*` | REAL | 三个覆盖率维度独立存储，便于后续趋势查询（AVG/MAX/MIN） |
| `test_types_*` | TEXT(JSON) | 记录要求的 vs 已执行的测试类型，用于 Gate C2 诊断 |

#### 数据写入时机

由 `QualityGateValidationService` 在 `advance_gate` 推进到 Gate C1/C2/D 时触发：读取 quality-gates.yml + 测试报告文件 → 比对阈值 → 生成 violations → `INSERT INTO quality_gate_results`。若 `passed=0`，阻止 Gate 推进并返回 violations 详情。

#### 查询示例（Web 面板用）

```sql
-- 查询某 Run 的所有质量检查结果
SELECT gate, stage, passed, violations,
       coverage_lines, coverage_branches, coverage_functions
FROM quality_gate_results
WHERE run_id = ?
ORDER BY checked_at;
```

### 3.2 远期可选：`test_suite_results` 表（不在本需求范围）

```sql
-- 仅设计参考，本需求不实施
CREATE TABLE IF NOT EXISTS test_suite_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  gate TEXT NOT NULL,
  test_type TEXT NOT NULL,                    -- unit/integration/e2e/perf/security
  total_tests INTEGER,
  passed_tests INTEGER,
  failed_tests INTEGER,
  skipped_tests INTEGER,
  duration_seconds REAL,
  coverage_report_path TEXT,                  -- 覆盖率报告文件相对路径
  perf_p95_ms REAL,
  perf_p99_ms REAL,
  perf_rps REAL,
  raw_summary TEXT,                           -- JSON: 测试框架原始输出的结构化摘要
  executed_at TEXT DEFAULT (datetime('now'))
);
```

---

## 四、pipeline_type 白名单扩展（代码变更，非 DDL）

### 需要修改的文件

**`src/engine/server.ts` 第 358 行**：

```diff
- if (!['full', 'frontend', 'backend', 'lite'].includes(pt)) {
+ const validTypes = Object.keys(PIPELINE_DEFS);
+ if (!validTypes.includes(pt)) {
    return resp({ error: `Invalid pipeline_type: ${pt}. Valid: ${validTypes.join(', ')}` });
  }
```

> 注意：需要先 `import { PIPELINE_DEFS } from './gates.js'`（当前已有此导入的确认过程见下文）。

### 影响范围

| 位置 | 当前行为 | 变更 |
|------|---------|------|
| `session_join` 白名单 | `['full','frontend','backend','lite']` | 从 `PIPELINE_DEFS` 动态读取 |
| `pipeline_init` | 无白名单校验，直接传给 `createPipelineRun` | 不修改（session_join 已校验） |
| `createPipelineRun()` (db.ts) | 无校验 | 不修改（调用者已校验） |

---

## 五、Gate 产物目录映射（GATE_DIRS 扩展）

当前 `GATE_DIRS` 仅为现有 12 个 Gate 定义了产物子目录。新增 24 个 Gate 需补充映射：

```typescript
// 需要补充到 src/engine/gates.ts 的 GATE_DIRS 条目
const NEW_GATE_DIRS = {
  'Gate R1': 'refactor', 'Gate R2': 'refactor', 'Gate R3': 'refactor', 'Gate R4': 'refactor', 'Gate R5': 'refactor',
  'Gate H0': 'hotfix',   'Gate H1': 'hotfix',   'Gate H2': 'hotfix',   'Gate H3': 'hotfix',
  'Gate M1': 'migrate',  'Gate M2': 'migrate',  'Gate M3': 'migrate',  'Gate M4': 'migrate',
  'Gate E0': 'evaluate', 'Gate E1': 'evaluate', 'Gate E2': 'evaluate', 'Gate E3': 'evaluate',
  'Gate D0': 'debug',    'Gate D1': 'debug',    'Gate D2': 'debug',    'Gate D3': 'debug',    'Gate D4': 'debug',
  'Gate DOC1': 'doc',    'Gate DOC2': 'doc',
};
```

---

## 六、风险评估

| 风险 | 等级 | 描述 | 缓解措施 |
|------|------|------|---------|
| `pipeline_runs.pipeline_type` 无约束 | 低 | 拼写错误不会被数据库拒绝 | 应用层白名单（session_join）已覆盖；建议改为从 PIPELINE_DEFS 动态读取以消除一致性风险 |
| `current_gate` TEXT 列无长度限制 | 低 | 极端长的 Gate 名可能影响索引性能 | 当前最长 Gate 名（Gate C-impl）仅 11 字符；SQLite TEXT 索引性能不受此长度影响 |
| quality_gate_results JSON 列解析失败 | 中 | violations 字段的 JSON 格式错误会导致 Web 面板渲染异常 | 插入时统一使用 `JSON.stringify()`；读取时使用 `try/catch` 包裹 `JSON.parse()` |
| quality_gate_results 冗余度 | 低 | 每次 Gate 推进都写入一行，长时间运行后数据量增长 | 每 Run 最多 1-3 行（c1/c2/d 各一行），按 1000 Run 计算仅 3000 行；与 `deleteRun` 级联删除 |
| GATE_DIRS 新 Gate 目录名冲突 | 中 | `evaluate` Gate E0-E3 可能与现有 `Gate E`(shipping) 的目录名冲突 | `Gate E` 产物目录为 `shipping`，`Gate E0-E3` 为 `evaluate`，不冲突；但需在文档中明确此命名约定 |

---

## 七、推荐的下一步

1. **P0**：quality_gate_results DDL 合并到 `src/engine/db.ts` 的 `initSchema()`（与 engine 基础设施扩展 TASK-001 一同实施）
2. **P0**：`session_join` 白名单从硬编码数组改为 `Object.keys(PIPELINE_DEFS)` 动态读取
3. **P1**：`insertArtifact` 函数无需修改（当前已支持任意 gate 字符串），但需确认新 Gate 产物的 `filepath` 格式保持一致
4. **P1**：`checkAgentEventDuplicate` 函数无需修改（只检查 run_id+agent_id+event_type 组合，与 gate 无关）
5. **P2**：远期评估 `test_suite_results` 表——当需要覆盖率趋势图和性能历史对比时再建

---

## 八、ADR 记录

### ADR-000X：quality-gates 配置与运行数据分离存储

**状态 (Status):** Proposed

**日期 (Date):** 2026-05-13

**决策者 (Deciders):** database-architect

#### 上下文 (Context)

quality-gates.yml 作为新引入的质量门禁配置，需要决策：配置本身是否存入数据库？检查结果是否需要数据库存储？

约束：
- SQLite 单文件数据库，需控制表数量和写入频率
- 配置需随项目版本管理（CLI 模板安装）
- Web 面板需展示"质量检查历史"（审计追溯）

#### 决策 (Decision)

1. quality-gates.yml 配置不作为数据库表存储——文件即配置源，引擎启动时加载到内存
2. 新增 `quality_gate_results` 表存储 Run 级别的质量检查结果（通过/失败 + violations 详情 + 覆盖率快照）
3. 完整测试结果（各用例详情、覆盖率详细报告）保持文件存储

#### 后果与替代方案

**正面影响：** 配置与数据分离，quality-gates.yml 可随项目 Git 管理；Web 面板可直接查询结构化结果。

**负面影响：** violations JSON 无 schema 校验，需应用层保证格式。缓解：封装 `insertQualityGateResult()` 统一构建；`deleteRun` 级联删除无孤儿数据。

**备选方案：** A) 纯文件方案——零 DB 变更但 Web 面板无审计能力，弃用；B) 配置+结果全入库——文件/DB 双源同步复杂，弃用。

---

**评审结论：1 张新表（quality_gate_results），0 个 DDL 变更（现有表），1 处代码白名单修改。**
