# 后端架构评审：贾维斯测试体系化升级

> 评审日期: 2026-05-13
> 评审范围: REQ-001 ~ REQ-021, NFR-01 ~ NFR-05
> 评审依据: `src/engine/gates.ts`, `src/engine/server.ts`, `src/engine/db.ts`, `src/web/routes.ts`
> 评审人: backend-architect

---

## 执行确认 (Execution Acknowledgement)

- 我本次设计的后端架构域: 引擎流水线扩展、Gate 权限矩阵、数据库 Schema、CLI 路由、质量门禁系统
- 对应需求 ID / 任务 ID: REQ-020 / TASK-001 (引擎层), REQ-007 / TASK-002 (质量门禁), REQ-008~013 (新指令)
- 候选架构模式 / 技术方案: 复用现有 PIPELINE_DEFS 模式扩展；Gate 命名前缀隔离避免冲突；SQLite TEXT 存 JSON 避免新依赖
- 我不会修改: 任何生产代码、前端代码、Web 面板 UI
- 我预计输出的文件 / 路径: `docs/2026-05-13/architecture/backend-arch-review.md`
- 若发现架构冲突，我将回退给编排者: 发现 4 处代码硬编码需同步修改（白名单、枚举、分类函数）

---

## 1. 现有架构基线

### 1.1 引擎核心 (`src/engine/gates.ts`)

| 维度 | 现有值 |
|------|--------|
| 流水线类型 | 4 条: full, frontend, backend, lite |
| Gate 总数 | 12 个: Gate A, B-DDD, B-BDD, B-TDD, B1, C, C-impl, C1, C1.5, C2, D, E |
| 操作类型枚举 | 12 种: read, write_doc, write_code, sweep_arch, spawn_impl, spawn_test, lint, build, preview, review, audit, deploy, fix |
| GATE_OPERATIONS | 12 条 allow/deny 条目 |
| GATE_AGENT_GUIDE | 12 条 Agent 可生成指引 |
| GATE_DIRS | 12 条 docs/ 子目录映射 |
| GATE_CHECKS | 12 条检查条件 |
| MAX_RETRY | 12 条最大重试 |
| GATE_ENTRY_CONDITIONS | 11 条入口条件（Gate A 无前置） |

### 1.2 引擎 FSM (`src/engine/server.ts` — `advance_gate`)

```
FSM 硬约束:
  - ti <= ci: 拒绝回退（"Cannot move backward"）
  - ti > ci + 1: 拒绝跳跃（"Cannot skip gates"）
  - 产物目录扫描 + artifacts 表写入
  - 最后 Gate 推进时自动完成 run
```

FSM 逻辑通用：基于 `gateList` 索引，不硬编码 Gate 名称。新流水线只要在 `PIPELINE_DEFS` 中注册 Gate 序列，FSM 自动生效。

### 1.3 数据库 Schema (`src/engine/db.ts`)

| 表 | 关键列 | 说明 |
|----|--------|------|
| pipeline | session_id, current_gate, pipeline_type | 会话级流水线快照 |
| checkpoints | session_id, gate, passed_at, duration_seconds | Gate 通过记录（UNIQUE(session_id, gate)） |
| pipeline_runs | id, session_id, pipeline_type, current_gate, status, gate_entered_at, task_name, archived, pinned | 每次 /jarvis 调用的独立运行 |
| artifacts | run_id, gate, filepath | 产物归属记录 |
| agent_events | run_id, agent_id, event_type, model, tokens, current_gate | Agent 执行事件 |

**关键观察**: 所有表均无物理外键（符合项目规范），pipeline_type 字段无 CHECK 约束，新流水线类型可直接写入。

---

## 2. 风险清单与建议

### 风险 #1 (严重): `session_join` 的 pipeline_type 白名单未扩展

**位置**: `src/engine/server.ts:358`

```typescript
// 当前硬编码
if (!['full', 'frontend', 'backend', 'lite'].includes(pt)) {
  return resp({ error: `Invalid pipeline_type: ${pt}. Valid: full, frontend, backend, lite` });
}
```

**影响**: 5 条新流水线 (refactor/hotfix/migrate/evaluate/debug) 在 `session_join` 时会被拒绝，所有新指令无法初始化会话。

**建议**:
```typescript
const VALID_PIPELINE_TYPES = [
  'full', 'frontend', 'backend', 'lite',
  'refactor', 'hotfix', 'migrate', 'evaluate', 'debug',
];
if (!VALID_PIPELINE_TYPES.includes(pt)) { ... }
```

**验证方式**: TASK-001 的 TDD 测试应在 `session_join` 层增加 `pipeline_type=refactor` 的集成测试。

---

### 风险 #2 (严重): `inferPipelineType` 和 `inferCategory` 函数未覆盖新指令

**位置**: `src/web/routes.ts:835-855`

```typescript
// 当前 inferPipelineType 仅识别 4 种
function inferPipelineType(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes('frontend')) return 'frontend';
  if (lower.includes('backend')) return 'backend';
  if (lower.includes('jarvis-lite') || lower.includes('lite')) return 'lite';
  return 'full';
}

// 当前 inferCategory 不覆盖新指令分类
function inferCategory(name: string): string {
  if (/test|explore|bug/.test(name)) return 'testing';
  if (/review/.test(name)) return 'review';
  if (/architect/.test(name)) return 'architecture';
  if (/^task-/.test(name)) return 'task';
  if (/android|ios|flutter|expo|taro/.test(name)) return 'platform';
  return 'development';
}
```

**影响**: Web 面板 Commands API (`/api/commands`) 对所有新指令返回 `pipelineType: 'full'` 和 `category: 'development'`，导致 Dashboard 分类显示错误。

**建议**:

`inferPipelineType` 应增加规则:
```typescript
if (lower.includes('refactor')) return 'refactor';
if (lower.includes('hotfix')) return 'hotfix';
if (lower.includes('migrate')) return 'migrate';
if (lower.includes('evaluate')) return 'evaluate';
if (lower.includes('debug')) return 'debug';
```

`inferCategory` 应增加:
```typescript
if (/^test-/.test(name)) return 'test';
if (/refactor/.test(name)) return 'refactor';
if (/hotfix/.test(name)) return 'hotfix';
if (/migrate/.test(name)) return 'migrate';
if (/evaluate/.test(name)) return 'evaluate';
if (/^debug/.test(name)) return 'debug';
// 原有规则保留...
```

---

### 风险 #3 (高): `gate_check` 操作类型枚举未覆盖新流水线需求

**位置**: `src/engine/server.ts:691-696`

```typescript
operation: z.enum([
  'read', 'write_doc', 'write_code', 'sweep_arch',
  'spawn_impl', 'spawn_test', 'lint', 'build', 'preview',
  'review', 'audit', 'deploy', 'fix',
])
```

**分析**: 新流水线可能需要的操作类型:

| 流水线 | 潜在新操作 | 需求来源 |
|--------|-----------|---------|
| debug | `interactive` (交互式调试) | REQ-012, Gate D2/D3 |
| hotfix | `emergency_bypass` (紧急绕过) | REQ-009, Gate H0 |
| evaluate | `sandbox_exec` (沙箱执行) | REQ-011, Gate E1 |
| test-security | `scan_security` (DAST 扫描) | REQ-005 |
| refactor | `mutate_test` (突变测试) | REQ-008, Gate R4 |
| all | `gate_bypass` (CI 模式跳过人工确认) | REQ-017 |

**建议**:
1. 最小化原则：仅当前 **确实有 Gate 需要** 的操作才新增到枚举。不是每个想到的操作都要加。
2. TASK-001 实现时，对照每个新 Gate 的 `GATE_OPERATIONS` 矩阵，如果发现需要用现有 12 种操作类型无法表达的，再扩展枚举。
3. 预估需新增 3-4 个: `sandbox_exec` (evaluate), `interact` (debug), `scan_security` (test-security), `emergency_bypass` (hotfix)。
4. `gate_bypass` (CI 模式) 不应新增操作类型——它应该通过环境变量 `JARVIS_CI=true` + 引擎逻辑跳过人工确认（TASK-018 的设计方向），不需要一个操作种类。

---

### 风险 #4 (高): GATE_DIRS 对 22 个新 Gate 缺少目录映射

**位置**: `src/engine/gates.ts:54`

**影响**: `findGateArtifacts`, `findSessionGateArtifacts`, `advance_gate` 产物扫描均依赖 `GATE_DIRS[gate]` 返回的 `subdir`。如果返回 `undefined`，产物扫描跳过，Gate 条件验证失效。

**建议映射方案**:

| Gate 范围 | 流水线 | 建议 docs/ 子目录 |
|-----------|--------|------------------|
| R1-R5 | refactor | `refactoring` |
| H0-H3 | hotfix | `hotfix` |
| M1-M4 | migrate | `migration` |
| E0-E3 | evaluate | `evaluation` |
| D0-D4 | debug | `debug` |

**注意**: 这些新目录与现有的 `docs/` 子目录（requirements/tasks/plans/architecture/implementation/testing/review/shipping）不冲突。

**增强**: `GATE_DIRS` 取值如果不存在，`findGateArtifacts` 应返回 `[]` 而非 `undefined`，避免调用方空指针。当前代码已做此防护（`if (!subdir) return []`），但需确认新 Gate 确实有映射。

---

### 风险 #5 (中): Gate 命名前缀 "E" 与现有 "Gate E" 存在语义混淆风险

| 流水线 | Gate 名 | 含义 |
|--------|---------|------|
| full/frontend/backend/lite | **Gate E** | 发布阶段（安全审计+上线检查+回滚预案） |
| evaluate | **E0, E1, E2, E3** | 评估阶段（定义标准→原型→验证→报告） |

**分析**: 引擎层面——`Gate E` 和 `E0` 是不同的字符串，FSM 按流水线类型独立管理 Gate 序列，不会冲突。但代码维护者可能混淆。

**建议**: 在 `PIPELINE_DEFS` 注释中明确标注：
```typescript
evaluate: {
  name: '技术评估',
  gates: ['E0', 'E1', 'E2', 'E3'],  // 注意：E0-E3 ≠ Gate E（发布阶段），属于不同流水线
},
```

---

### 风险 #6 (中): GATE_OPERATIONS 矩阵的 deny 规则遗漏风险

22 个新 Gate，每个需要独立的 allow/deny 矩阵。历史经验表明，allow 容易写全，deny 容易遗漏——遗漏的 deny 意味着该 Gate 获得了不应有的能力。

**关键安全检查点**（按安全敏感度排序）:

| 必须 deny 的操作 | 需要 block 的 Gate |
|-----------------|-------------------|
| `deploy` | R1-R5, M1-M4, E0-E3, D0-D4, H0 |
| `write_code` | E0 (仅定义标准), D0 (仅收集信息), H0 (仅审批) |
| `spawn_impl` | H0 (仅审批), D0 (仅收集), M3/M4 (构建/Lint 阶段) |
| `spawn_test` | M1 (规则验证阶段), E0 (标准定义阶段) |

**建议**: TASK-001 的 TDD 测试必须覆盖每个新 Gate 的 **关键 deny 规则**，特别是：
- `getGateOperations_H0_denies_spawn_impl`（已列入 TASK-001 测试）
- `getGateOperations_H0_denies_write_code`
- `getGateOperations_D0_denies_write_code`
- `getGateOperations_E1_denies_deploy`
- 为每个新 Gate 写 `getGateOperations_{gate}_denies_deploy` 的泛化测试

---

### 风险 #7 (中): 数据库 `checkpoints` 表新增 `violations` 字段的迁移方案

**需求**: TASK-002 需要在 `checkpoints` 表中增加 `violations` JSON 字段记录阻断原因。

**当前 Schema**:
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

**建议方案**:
```sql
-- SQLite 不支持 JSON 类型，使用 TEXT 列存 JSON 字符串
ALTER TABLE checkpoints ADD COLUMN violations TEXT;
-- qualityProfileSource 记录配置来源
ALTER TABLE checkpoints ADD COLUMN quality_profile_source TEXT;
```

**兼容性**: `ALTER TABLE ADD COLUMN` 在 SQLite 中是低成本操作，不影响已有数据。已有行的新列为 NULL。无需重建表。

**回滚**: 如果 migration 需要回滚，SQLite 不支持 `ALTER TABLE DROP COLUMN`（3.35 之后支持，但不保证），建议：
1. 记录迁移前的 schema 快照
2. 回滚时重建表（先备份数据到临时表，DROP 原表，CREATE 原 schema，INSERT 回数据）

---

### 风险 #8 (中): 新流水线的 MAX_RETRY 配置合理性

部分新 Gate 有特殊的重试语义：

| Gate | 建议 MAX_RETRY | 理由 |
|------|---------------|------|
| H0 (紧急审批) | 1 | 审批拒绝不应自动重试，需人工重新发起 |
| H3 (事后审计) | 0 或 Infinity | 合规审计不可跳过、不可失败重试（强制完成） |
| D3 (交互式调试) | Infinity | 调试本身是交互式的，不应有次数限制 |
| M4 (自动 Lint 修复) | 2 | 需求明确"自动循环修复最多 2 轮" |
| E2 (运行用例) | 2 | 用例失败可重试，但不应无限循环 |
| R3 (执行重构) | 2 | 重构失败可重试修正，但不应无限循环 |

**建议**: 在 TASK-001 实现时，`MAX_RETRY` 的 H0 设为 1，H3 设为 Infinity，D3 设为 Infinity，M4 设为 2。其余按需求文档中的限制设置。

---

### 风险 #9 (低): 性能影响——Gate 总数从 12 增加到 34+

**分析**: 引擎性能瓶颈不在 Gate 数量，而在每次 `pipeline_status` 调用时的 I/O 操作（`findSessionGateArtifacts` 每 Gate 扫描一次文件系统）。

- 每条流水线只使用自己的 Gate 序列（5-12 个），不是全部 34 个
- `pipeline_status` 只遍历当前会话的流水线的 Gate，O(n) 中 n 无变化（full 仍然是 12，refactor 是 5）
- `findSessionGateArtifacts` 优先查 `artifacts` 表（SQL 索引查询），仅在无 runId 时回退到文件系统扫描

**结论**: 无性能退化。新流水线的 Gate 序列更短（4-5 个），反而更快。

**但需注意**: `getGateOperations` 和 `getGateAgentGuide` 现在是 O(1) 的字典查找。随着键值对从 12 增加到 34+，内存占用约增加 2-5 KB，可忽略。

---

### 风险 #10 (低): 新流水线的 GATE_ENTRY_CONDITIONS 依赖链设计

现有流水线的入口条件形成严格线性依赖：
```
Gate A → Gate B-DDD → Gate B-BDD → Gate B-TDD → Gate B1 → Gate C → Gate C-impl → Gate C1 → Gate C1.5 → Gate C2 → Gate D → Gate E
```

新流水线的入口条件需要独立定义：

| 入口 Gate | 建议条件 |
|-----------|---------|
| R2 | R1 重构边界文档已产出 |
| R3 | R2 基线覆盖率报告已产出 |
| R4 | R3 重构代码已提交 |
| R5 | R4 覆盖率对比通过 |
| H1 | H0 审批人已确认 |
| H2 | H1 最小化修复已提交 |
| H3 | H2 快速验证通过且已部署 |
| M2 | M1 规则覆盖率验证通过 |
| M3 | M2 迁移已执行 |
| M4 | M3 编译构建通过 |
| E1 | E0 评估标准已定义 |
| E2 | E1 原型已生成 |
| E3 | E2 用例运行完毕 |
| D1 | D0 异常信息已收集 |
| D2 | D1 复现用例已生成 |
| D3 | D2 调试会话已启动 |
| D4 | D3 诊断完成 |

**注意**: GATE_ENTRY_CONDITIONS 当前仅在代码中作为文档化约束存在，引擎 FSM 不强制检查这些条件（只检查产物目录是否有文件）。这是设计如此——条件由编排者（human-in-the-loop）判定，而非引擎自动阻断。

---

## 3. 架构方案验证

### 3.1 原型验证：FSM 对 5 条新流水线的兼容性

**验证方法**: 纯逻辑推导（无需运行原型），因为 FSM 是通用的索引驱动逻辑。

**推导过程**:

以 refactor 流水线为例：
```
PIPELINE_DEFS.refactor.gates = ['R1', 'R2', 'R3', 'R4', 'R5']

session_join(pipeline_type='refactor') →
  1. initPipeline(db, sid, root, 'refactor')  → current_gate = 'R1'
  2. createPipelineRun(...) → Gate A = 'R1'

advance_gate('R2') →
  1. ci = gateList.indexOf('R1') = 0, ti = gateList.indexOf('R2') = 1
  2. ti (1) > ci (0) ✓ 不是回退
  3. ti (1) == ci + 1 (1) ✓ 不是跳跃
  4. 扫描 R1 产物 → 写入 artifacts 表
  5. addCheckpoint('R1', 'R2') → updatePipelineGate('R2')

advance_gate('R4') [试图从 R1 跳跃到 R4] →
  1. ci = 0, ti = 3
  2. ti (3) > ci + 1 (1) → "FSM blocked: Cannot skip gates. Next: R2"
```

**验证结论**: FSM 的拒绝回退/跳跃硬约束对所有新流水线自动生效，无需修改引擎核心逻辑。✅

### 3.2 原型验证：Gate 权限矩阵的操作类型覆盖

**分析**: 以 `/debug` 流水线为例，推导每个 Gate 需要的操作权限：

| Gate | 需要 allow 的操作 | 需要 deny 的操作 |
|------|------------------|-----------------|
| D0 | read | write_code, spawn_impl, spawn_test, build, deploy |
| D1 | read, write_doc | spawn_impl, spawn_test, build, deploy |
| D2 | read, write_code (插入日志/断点), spawn_impl | deploy |
| D3 | read, write_code, spawn_impl (交互式工具) | deploy |
| D4 | read, write_doc | write_code, spawn_impl, deploy |

**缺口发现**: D2/D3 阶段 Agent 需要通过工具发送"继续执行/查看变量/求值表达式"指令。当前 12 种操作类型中没有 `interact` 或等效操作。建议新增 `interact` 操作类型，或在 `spawn_impl` 中涵盖交互式调试能力。

### 3.3 原型验证：与现有 12 个 Gate 的互操作性

**结论**: 完全隔离。新流水线的 Gate 序列不与现有流水线的 Gate 共享。原因：
- 每个 `pipeline_run` 有独立的 `pipeline_type`
- `sessionGates()` 根据 `pipeline_type` 返回对应的 `gateList`
- FSM 操作只在当前流水线的 `gateList` 内索引

**唯一交互点**: `session_join` 的 `pipeline_type` 参数。如果用户在一个已存在的 session 中切换 pipeline_type，当前代码不支持（`initPipeline` 只在首次创建时写入，已有 session 复用原有 pipeline_type）。这是合理的设计——一个 session 不应切换流水线类型。

---

## 4. 数据库迁移方案

### 4.1 TASK-002: checkpoints 表扩展

```sql
-- 新增 violations 列（存储 JSON 字符串）
ALTER TABLE checkpoints ADD COLUMN violations TEXT;

-- 新增 quality_profile_source 列
ALTER TABLE checkpoints ADD COLUMN quality_profile_source TEXT;
```

**迁移代码位置**: `src/engine/db.ts` 的 `initSchema()` 函数，遵循现有 try/catch 模式：
```typescript
try { db.exec("ALTER TABLE checkpoints ADD COLUMN violations TEXT"); } catch {}
try { db.exec("ALTER TABLE checkpoints ADD COLUMN quality_profile_source TEXT"); } catch {}
```

### 4.2 回滚方案

如果需要回滚 TASK-002 的 schema 变更：
1. 备份 checkpoints 表数据到临时表
2. 删除 checkpoints 表
3. 重建 checkpoints 表（原始 schema，不含 violations/quality_profile_source）
4. 插入备份数据（跳过新增列）

```sql
BEGIN;
CREATE TABLE checkpoints_backup AS SELECT id, session_id, gate, passed_at, advance_to, duration_seconds FROM checkpoints;
DROP TABLE checkpoints;
CREATE TABLE checkpoints (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, gate TEXT NOT NULL, passed_at TEXT NOT NULL, advance_to TEXT, duration_seconds INTEGER, UNIQUE(session_id, gate));
INSERT INTO checkpoints (id, session_id, gate, passed_at, advance_to, duration_seconds) SELECT id, session_id, gate, passed_at, advance_to, duration_seconds FROM checkpoints_backup;
DROP TABLE checkpoints_backup;
COMMIT;
```

---

## 5. 架构决策记录 (ADR)

### ADR-001: 使用 Gate 命名前缀隔离避免流水线间 Gate 冲突

**状态**: Proposed

**上下文**: 需要新增 5 条流水线，每条 4-5 个 Gate。现有 12 个 Gate 使用 "Gate X" 格式。如果新 Gate 也使用 "Gate F/G/H..." 格式，会和未来流水线扩展冲突。

**决策**: 为每条新流水线使用功能前缀命名 Gate:
- refactor: R1-R5
- hotfix: H0-H3
- migrate: M1-M4
- evaluate: E0-E3
- debug: D0-D4

**后果**:
- 正面: 命名空间隔离，代码可读性高，`GATE_OPERATIONS[gate]` 查找仍然是 O(1)
- 负面影响: "E0-E3" 可能与现有 "Gate E" 语义混淆（已通过注释标注缓解）
- 缓解: 在 `PIPELINE_DEFS` 添加注释说明命名规则

**考虑的替代方案**:
- 方案 A: 继续使用 "Gate X" 格式（Gate F/G/H...）— 弃用原因: 无法从名称推断所属流水线，且与现有 Gate 序列难以区分
- 方案 B: 使用 `pipeline:gate` 复合键（如 `refactor:R1`）— 弃用原因: 需要修改所有 gate 字符串比较逻辑，改动面过大

---

### ADR-002: SQLite TEXT 列存储 JSON violations 而非引入新表

**状态**: Proposed

**上下文**: TASK-002 需要在 checkpoints 中记录质量门禁违反详情（violations[]）。可选方案: (A) 新增 violations 表关联 checkpoints，(B) 使用 TEXT 列存 JSON，(C) 使用 SQLite JSON1 扩展。

**决策**: 使用 TEXT 列存储 JSON 字符串。

**后果**:
- 正面: 零新依赖，迁移成本低（一个 ALTER TABLE），已有查询无需 JOIN
- 负面影响: 无法在 SQL 层面对 violations 内容做结构化查询（如"查询所有因覆盖率阻断的 checkpoint"）
- 缓解: 质量门禁的统计分析在应用层完成（`src/engine/quality-gate.ts`），不需要 SQL 级查询

**考虑的替代方案**:
- 方案 A: 新增 `gate_violations` 表 — 弃用原因: 增加 JOIN 复杂度，violations 本质上是一次性写入+一次性读取的附属数据，不需要独立表
- 方案 C: SQLite JSON1 扩展 — 弃用原因: 依赖编译时特性，跨平台兼容性不确定（Windows/Linux/macOS 的 SQLite 编译选项可能不同）

---

## 6. 修改点汇总

### 6.1 引擎层必须修改的文件

| 文件 | 修改内容 | 风险 |
|------|---------|------|
| `src/engine/gates.ts` | PIPELINE_DEFS 新增 5 条流水线；GATE_OPERATIONS 新增 22 条；GATE_AGENT_GUIDE 新增 22 条；GATE_DIRS 新增 22 条；GATE_CHECKS 新增 22 条；MAX_RETRY 新增 22 条；GATE_ENTRY_CONDITIONS 新增 18 条 | 高 |
| `src/engine/server.ts` | `session_join` 白名单扩展（行 358）；`gate_check` 操作枚举扩展（行 691） | 高 |
| `src/engine/db.ts` | checkpoints 表新增 violations + quality_profile_source 列（TASK-002） | 中 |
| `src/web/routes.ts` | `inferPipelineType` 扩展（行 835）；`inferCategory` 扩展（行 848） | 中 |

### 6.2 新增文件

| 文件 | 来源任务 |
|------|---------|
| `src/engine/quality-gate.ts` | TASK-002 |
| `.jarvis/quality-gates.yml` | TASK-002 |
| `.claude/commands/test-unit.md` | TASK-003 |
| `.claude/commands/test-integration.md` | TASK-004 |
| `.claude/commands/test-e2e.md` | TASK-005 |
| `.claude/commands/test-perf.md` | TASK-006 |
| `.claude/commands/test-security.md` | TASK-007 |
| `.claude/commands/refactor.md` | TASK-009 |
| `.claude/commands/hotfix.md` | TASK-010 |
| `.claude/commands/migrate.md` | TASK-011 |
| `.claude/commands/evaluate.md` | TASK-012 |
| `.claude/commands/debug.md` | TASK-013 |
| `.claude/commands/jarvis-change.md` | TASK-017 |
| `.claude/commands/doc.md` | TASK-019 |
| `.claude/skills/test-data-factory/SKILL.md` | TASK-008 |
| `.claude/skills/perf-testing/SKILL.md` | TASK-006 |
| `.claude/skills/security-testing/SKILL.md` | TASK-007 |
| `.claude/skills/refactoring/SKILL.md` | TASK-009 |
| `.claude/skills/debugging-deep/SKILL.md` | TASK-013 |

---

## 7. 质量门禁系统评审 (REQ-007 / TASK-002)

### 7.1 50% 硬约束的安全性分析

需求规定：项目自定义阈值不可低于默认值的 50%（防止恶意绕过）。

**场景分析**:

| 默认阈值 | 50% 允许下限 | 合法场景 | 潜在问题 |
|---------|-------------|---------|---------|
| 覆盖率 80% | 40% | 遗留项目逐步提升覆盖率 | 40% 的门槛对真正的遗留系统仍然可能过高 |
| 通过率 100% | 50% | 不稳定测试允许部分失败 | 50% 意味着半数测试可失败，失去门禁意义 |
| 高危漏洞 0 | 0 | 安全不可妥协 | 合理——不允许任何高危漏洞 |
| Lint 错误 0 | 0 | 代码质量基线 | 合理——不应允许 Lint 错误 |

**建议**: 50% 硬约束在覆盖率维度上合理（防止设为 0% 绕过），但在通过率维度上过于宽松（50% 失去门禁意义）。建议：
1. 通过率下限提升到 80%（不允许低于 80%）
2. 覆盖率下限保持 50%
3. 安全/Lint 的下限固定为 0（不允许非零值）

### 7.2 配置加载的降级路径

```
尝试加载 .jarvis/quality-gates.yml
  ├─ 存在且合法 → QualityProfile (source=PROJECT)
  ├─ 存在但 YAML 语法错误 → 回退 DEFAULT (source=FALLBACK) + 记录错误日志
  ├─ 阈值低于 50% → 拒绝项目值，回退 DEFAULT (source=FALLBACK)
  └─ 不存在 → QualityProfile (source=DEFAULT)
```

当前设计合理。建议增加：FALLBACK 时向编排者发出警告消息（在 `pipeline_guide` 响应中追加 `quality_profile_warning` 字段）。

---

## 8. 安全性评审

### 8.1 新指令的权限边界

| 指令 | 可信度 | 安全关注点 |
|------|--------|-----------|
| `/hotfix` | 高信任 | H0 审批链完整性；H2 回滚预案必须包含完整步骤（不能只是"回滚到上一个版本"的敷衍文本）；H3 强制回溯不可绕过 |
| `/debug` | 高信任 | D2/D3 附加进程时需确认目标进程是开发/测试环境，不应附加到生产进程 |
| `/evaluate` | 中信任 | E1 沙箱隔离（独立分支/git worktree），防止原型代码污染主工作区 |
| `/refactor` | 中信任 | R4 行为漂移检测是核心安全网，断言 hash 算法需防碰撞 |
| `/test-security` | 中信任 | DAST 扫描目标必须是运行中的应用——需确保扫描目标是开发/测试环境 |

### 8.2 quality-gates.yml 配置安全

- 配置文件放在 `.jarvis/` 目录下（项目级配置目录）
- 不应包含密钥/Token（纯质量阈值配置）
- YAML 解析失败不应抛出异常阻断引擎（已设计 FALLBACK 路径）

---

## 9. 可观测性影响

### 9.1 新事件需求

当前 PubSub 事件类型 4 种，新流水线产生的 Gate 推进事件自动使用 `gate:advanced` 类型——不需要新增事件类型。

但以下场景建议新增事件：

| 事件类型 | 触发场景 | 消费方 |
|---------|---------|--------|
| `quality:gate_failed` | 质量门禁阻断 | WebPanel (告警提示) |
| `hotfix:emergency` | H0 紧急声明创建 | WebPanel (紧急标识) |
| `debug:session_started` | D2 调试会话启动 | WebPanel (状态灯) |

**建议**: 最小化原则——先在 WebPanel 层通过解析 `gate:advanced` 事件的 gate 名称推断特殊状态，不新增事件类型。若前端需要独立处理逻辑，再考虑新增。

### 9.2 日志增强

- 质量门禁阻断时记录完整 violations[] 到日志
- YAML 解析失败记录完整错误栈
- hotfix H0 审批记录（审批人、时间、渠道）写入 `checkpoints` 或独立日志

---

## 10. 最终风险矩阵

| 风险编号 | 严重度 | 概率 | 影响范围 | 发现阶段 | 缓解措施 |
|---------|--------|------|---------|---------|---------|
| #1 session_join 白名单 | 严重 | 100% | 所有新流水线不可用 | 实现前 | 扩展白名单数组 |
| #2 inferPipelineType/inferCategory | 严重 | 100% | Web 面板分类错误 | 实现前 | 增加新流水线/分类规则 |
| #3 gate_check 操作枚举 | 高 | 60% | 部分新 Gate 操作被误拒 | 实现中 | 对照 GATE_OPERATIONS 逐 Gate 检查 |
| #4 GATE_DIRS 缺失 | 高 | 80% | 产物扫描失效 | 实现前 | 为 22 个新 Gate 补充映射 |
| #5 E/E0 命名混淆 | 中 | 30% | 代码维护出错 | 长期 | 注释标注 |
| #6 deny 规则遗漏 | 中 | 40% | 安全漏洞 | 实现中 | TDD 逐 Gate 测试 deny |
| #7 DB 迁移回滚 | 中 | 20% | 数据丢失 | 部署时 | 备份+回滚脚本 |
| #8 MAX_RETRY 配置 | 中 | 30% | 死循环或过早终止 | 实现中 | 按需求设定，D3/H3 特殊处理 |
| #9 性能退化 | 低 | 10% | 无实质影响 | — | 无 |
| #10 GATE_ENTRY_CONDITIONS | 低 | 20% | 文档不一致 | — | 手动审查 |

---

## 11. 评审结论

### 可以推进，但必须满足以下前置条件：

1. **P0 阻塞**: `session_join` 白名单（风险 #1）和 `inferPipelineType`/`inferCategory`（风险 #2）必须在 TASK-001 中同步修改。这两个问题是 100% 必现的阻塞性 bug。

2. **P1 强制**: `GATE_DIRS`（风险 #4）和 `gate_check` 操作枚举（风险 #3）必须在 TASK-001 实现时覆盖。否则产物扫描失效、部分 Gate 操作被误拒。

3. **TDD 保障**: TASK-001 的 17 个 TDD 测试用例必须全部通过后，才能进入 TASK-002。特别注意 `existing_pipelines_unchanged` 兼容性测试必须保留现有 4 条流水线的 Gate 序列不变。

4. **架构模式批准**: ADR-001（Gate 命名前缀隔离）和 ADR-002（TEXT 列存 JSON violations）的方案获得认可。

### 不推荐的变更：

- **不建议**在 TASK-001 中同时修改 `GATE_OPERATIONS` 的操作类型枚举。当前 12 种操作类型可以覆盖大部分新 Gate 的需求，仅在明确发现操作无法表达时再扩展。
- **不建议**为 violations 创建独立数据库表。TEXT 列存 JSON 在查询需求简单时是最简方案。

---

## 12. 给编排者的建议

1. **串行顺序**: TASK-001（引擎注册）和 TASK-002（质量门禁）必须严格串行。TASK-002 的 `GATE_CHECKS` 追加修改依赖 TASK-001 的新 Gate 定义。

2. **同步修改提醒**: TASK-001 的实现 Agent 必须同时修改 4 个文件（`gates.ts`, `server.ts`, `routes.ts`, `db.ts`），不是只改 `gates.ts`。任务文档中的"实现范围"只列了 `gates.ts` 的修改——这是不完整的。需要明确告知实现 Agent。

3. **Web 面板适配**: TASK-020（Web 面板）的 `inferPipelineType` 和 `inferCategory` 修改与 TASK-001 的 `gates.ts` 扩展不在同一文件，可以并行，但实现 Agent 必须知道新增了哪些流水线类型。

4. **测试覆盖**: TASK-001 的集成测试（非仅单元测试）应至少包含一次完整的 `session_join → advance_gate → pipeline_status` 调用链，使用一个新的流水线类型（如 refactor）验证端到端流程。
