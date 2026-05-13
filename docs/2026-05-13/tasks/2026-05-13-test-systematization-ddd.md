# DDD 领域驱动分析 -- Jarvis-Agent-Factory 测试体系增强

> 需求文档：`docs/2026-05-13/requirements/REQ-test-system-enhancement.md`
> 分析日期：2026-05-13
> 分析范围：全系统（既存系统 + 测试体系增强需求 + 新增指令 + Gate F 契约验证 + CI/CD）
> 数据库引擎：SQLite (node:sqlite DatabaseSync)
> 存储路径：`~/.jarvis/engine.db`

---

## 一、领域上下文 (Bounded Contexts) 总览

```
+------------------+  +------------------+  +------------------+  +------------------+
| Pipeline Context |  |  Agent Context   |  | Command Context  |  |  Template Context|
| (流水线编排)      |  | (智能体管理)      |  | (指令调度)       |  | (模板管理)       |
+--------+---------+  +--------+---------+  +--------+---------+  +--------+---------+
         |                     |                     |                     |
         +---------------------+---------------------+---------------------+
                                   |
         +---------------------+---------------------+---------------------+
         |                     |                     |                     |
+--------v---------+  +--------v---------+  +--------v---------+  +--------v---------+
|QualityGate Ctx   |  |  Test Exec Ctx   |  |  Review Ctx      |  |Contract Ctx      |
|(质量门禁)         |  | (测试执行)        |  | (代码审查)        |  |(契约验证)         |
+------------------+  +------------------+  +------------------+  +------------------+
         |
+--------v---------+  +------------------+  +------------------+
|Debug Session Ctx |  |Refactor & Migrate|  |  Archive Ctx     |
|(调试诊断)         |  |(重构 & 迁移)      |  | (归档追溯)        |
+------------------+  +------------------+  +------------------+
```

---

## 二、上下文详细分析

---

### 2.1 Pipeline Context（流水线编排上下文）

**职责**：管理软件开发流水线的全生命周期 -- 创建运行、推进 Gate、记录检查点、发布领域事件。是整个系统的编排核心。

**现有实现**：`src/engine/gates.ts` + `src/engine/db.ts` + `src/engine/server.ts`

#### 聚合根 1：PipelineRun（流水线运行）

| 属性 | 值 |
|------|-----|
| **数据表** | `pipeline_runs` |
| **主键** | `id` (UUID: `run_<ts>_<random>`) |
| **生命周期** | active → completed / aborted → archived |

**实体**：

| 实体 | 数据表 | 职责 | 不变条件 |
|------|--------|------|---------|
| Checkpoint（检查点） | `checkpoints` | 记录每个 Gate 通过的时间和去向 | 同一 (session_id, gate) 唯一；passed_at 在 created_at 之后 |
| Artifact（产物） | `artifacts` | 每个 Gate 产出的文档文件路径记录 | 同一 (run_id, gate, filepath) 唯一 |
| AgentEvent（Agent 事件） | `agent_events` | 记录 Agent spawn/end/error 的时间和 Token 消耗 | event_type 必须是 'start'/'end'/'error'；run_id 必须属于当前 session |

**值对象**：

| 值对象 | 字段 | 不变条件 |
|--------|------|---------|
| `GateCondition` | `check: string` | Gate 通过的文字描述，用于 gate_enforce 展示 |
| `GateOperation` | `allow: string[]`, `deny: string[]` | 每个 Gate 允许的操作白名单/黑名单 |
| `PipelineType` | 类型字面量：`'full' \| 'frontend' \| 'backend' \| 'lite' \| 'refactor' \| 'hotfix' \| 'migrate' \| 'evaluate' \| 'debug' \| 'doc' \| 'test'` | 必须存在于 PIPELINE_DEFS 中；`session_join` 白名单校验 |
| `GateSequence` | `gates: string[]` | 不可变的有序 Gate 列表，按 pipeline_type 映射 |
| `RetryPolicy` | `maxRetry: number`, `backoffDelays: number[]` | 每个 Gate 的最大重试次数 |

**聚合行为**：

| 行为 | 描述 | 路由建议 |
|------|------|---------|
| `advanceGate()` | 验证当前 Gate 条件 → 记录 checkpoint → 推进到下一个 Gate → 扫描产物文件 → 发布 GateAdvanced 事件 | →TDD |
| `createRun()` | 创建新 PipelineRun，关联 session、project、pipeline_type | →TDD |
| `completeRun()` | 设置 status='completed'，计算 total_duration_seconds | →TDD |
| `abortRun()` | 设置 status='aborted'，保留已完成的 checkpoint 数据 | →TDD |
| `archiveRun()` | 标记 archived=1，保留所有数据供审计 | →TDD |
| `enforceGate()` | 查询当前 Gate 的 artifacts 和 checkpoints，判断是否满足条件 | →TDD |

#### 聚合根 2：Session（会话）

| 属性 | 值 |
|------|-----|
| **数据表** | `sessions` + `pipeline` |
| **主键** | `id` (session UUID) |
| **生命周期** | active → inactive（2小时无活动） |

**实体**：

| 实体 | 数据表 | 职责 |
|------|--------|------|
| Pipeline（流水线快照） | `pipeline` | 记录 session 级别的当前 Gate 和项目路径 |

**值对象**：

| 值对象 | 字段 | 不变条件 |
|--------|------|---------|
| `SessionPlatform` | 字面量：`'claude' \| 'other'` | 仅 claude 平台有 commands/skills 特性 |
| `SessionStatus` | 字面量：`'active' \| 'inactive'` | 由 last_heartbeat 超时判定 |

**聚合行为**：

| 行为 | 描述 | 路由建议 |
|------|------|---------|
| `joinSession()` | 创建或恢复会话，自动创建 PipelineRun | →TDD |
| `leaveSession()` | 移除会话并清理（版本 A：session_leave 物理删除；版本 B：仅标记 inactive） | →TDD |
| `touchSession()` | 更新 last_heartbeat，标记 active | →TDD |
| `markStale()` | 定时检查：last_heartbeat < cutoff → 标记 inactive | →TDD |
| `resumeSession()` | 将 inactive 会话恢复为 active | →TDD |
| `migrateSession()` | MCP 重连时：旧 sessionId → 新 sessionId 的 pipeline/checkpoints 迁移 | →TDD |

#### 领域服务

| 服务 | 职责 | 当前实现 |
|------|------|---------|
| **GateEnforcementService** | 验证 Gate 条件：检查 artifacts 或 checkpoints 是否存在，决定是否允许推进 | `server.ts` gate_enforce 工具 + `routes.ts` /api/gate/:gate/enforce |
| **PipelineAdvanceService** | 协调 Gate 推进的全流程：计算耗时 → 记录 checkpoint → 更新 Gate → 扫描产物 → 发布事件 | `server.ts` advance_gate 工具 + `routes.ts` /api/gate/advance |
| **SessionCleanupService** | 定时清理过期会话：标记 stale → 超时标记 inactive | `server.ts` setInterval(markStaleSessions, 300s) |

#### 领域事件

| 事件 | 触发时机 | 载荷 |
|------|---------|------|
| `gate:advanced` | Gate 推进成功 | `{ sessionId, runId, gate, previousGate }` |
| `session:changed` | 会话创建/离开/恢复/删除 | `{ sessionId, action }` |
| `run:changed` | Run 创建/归档/置顶/重命名/删除 | `{ runId, sessionId, action }` |
| `agent:event` | Agent start/end/error 事件写入成功 | `{ runId, sessionId, agentId, eventType }` |

---

### 2.2 Agent Context（智能体管理上下文）

**职责**：智能体的注册、发现、配置、路由。支持三层配置覆盖（模板默认 → 全局用户 → 项目级）。

**现有实现**：`src/engine/agent-registry.ts` + `src/engine/agent-fs.ts`

#### 聚合根：Agent（智能体）

| 属性 | 值 |
|------|-----|
| **存储** | `.md` 文件（模板） + `agent_models` 表（运行配置） |
| **来源** | 三层：template（`src/templates/platforms/claude/agents/`） → global（`~/.claude/agents/`） → project（`<project>/.claude/agents/`） |

**值对象**：

| 值对象 | 字段 | 不变条件 |
|--------|------|---------|
| `AgentModelConfig` | `model: string`, `effort: 'low'\|'medium'\|'high'\|'xhigh'\|'max'` | model 必须是 AVAILABLE_MODELS 中的值；effort 必须是 EFFORTS 枚举值 |
| `AgentCapability` | `icon: string`, `category: string`, `role: string` | 从文件名和内容自动推断，不可手动设置 |
| `AgentSource` | 字面量：`'template' \| 'global' \| 'project'` | 来源层级越高优先级越高（project > global > template） |
| `AgentFileMap` | `Record<string, { base: string, type: 'md' }>` | agent_id → 安装基准路径的映射 |

**聚合行为**：

| 行为 | 描述 | 路由建议 |
|------|------|---------|
| `registerAgent()` | 扫描模板目录 → 解析 .md frontmatter → 合并三层配置 → 生成 AgentItem[] | →TDD |
| `setAgentModel()` | 更新 agent_models 表 → 同步写入 .md frontmatter | →TDD |
| `getAgentsByCategory()` | 按领域分类（编排/测试/审查/架构/浏览器/移动端/支撑/实现）筛选 | →TDD |
| `scanProjectAgents()` | 扫描所有已激活项目的 `.claude/agents/` 目录 | →TDD |

#### 领域服务

| 服务 | 职责 | 当前实现 |
|------|------|---------|
| **AgentRegistryService** | 动态扫描模板目录 + 全局/项目配置 → 合并去重 → 返回完整 Agent 列表 | `agent-registry.ts` getAgentList() |
| **AgentRoutingService** | 根据 task_type / gate 映射可生成的 Agent 列表 | `gates.ts` GATE_AGENT_GUIDE → getGateAgentGuide() |
| **AgentFileSyncService** | 将 Agent 配置同步回 .md 文件 frontmatter | `agent-fs.ts` syncAgentFile() |

---

### 2.3 Command Context（指令上下文）

**职责**：管理 slash 命令的定义、参数、路由、分类。命令是外部交互的入口，内部映射到 pipeline_type + Gate 序列。

**现有实现**：`src/engine/gates.ts` PIPELINE_DEFS + `src/templates/platforms/claude/commands/*.md` + `src/web/routes.ts` /api/commands

#### 聚合根：Command（指令）

| 属性 | 值 |
|------|-----|
| **存储** | `.md` 文件（`<project>/.claude/commands/` 或 `src/templates/platforms/claude/commands/`） |
| **分类** | development / testing / review / architecture / task / platform |

**值对象**：

| 值对象 | 字段 | 不变条件 |
|--------|------|---------|
| `CommandArgument` | `argumentHint: string` | frontmatter `argument-hint` 字段 |
| `CommandRoute` | `pipelineType: string`, `category: string` | pipelineType 必须映射到 PIPELINE_DEFS；category 从文件名推断 |
| `CommandFrontmatter` | `description`, `argument-hint`, `model`, `effort` | YAML frontmatter 格式 |

**聚合行为**：

| 行为 | 描述 | 路由建议 |
|------|------|---------|
| `dispatchCommand()` | 解析命令名 → 查找 pipeline_type → 映射 Gate 序列 → 初始化为 PipelineRun | →BDD |
| `listCommands()` | 扫描 commands 目录 → 解析 frontmatter → 按分类排序 | →TDD |

---

### 2.4 QualityGate Context（质量门禁上下文）

**职责**：管理质量门禁配置、执行质量检查、记录检查结果。支持全局默认 + 项目级两层覆盖。

**现有实现**：`GATE_CHECKS` 硬编码定义（`gates.ts` 第 56-66 行），无配置文件、无持久化检查结果。

**新需求来源**：`REQ-TEST-007` + `REQ-ENGINE-002`

#### 聚合根：QualityPolicy（质量策略）

| 属性 | 值 |
|------|-----|
| **存储** | `quality-gates.yml` 文件（配置主源） + `quality_gate_results` 表（运行审计） |
| **层叠** | 全局默认（`src/templates/quality-gates.yml`） → 项目级覆盖（`<project>/quality-gates.yml`） |

**实体**：

| 实体 | 数据表（新增） | 职责 |
|------|---------------|------|
| `QualityCheckResult` | `quality_gate_results` | 记录每次 Gate 质量检查的通过/失败状态、检查时间、失败原因 |

**值对象**：

| 值对象 | 字段 | 不变条件 |
|--------|------|---------|
| `CoverageThreshold` | `lines: number`, `branches: number`, `functions: number` | 0-100 之间；lines >= branches |
| `PerformanceBaseline` | `p95_latency_ms: number`, `p99_latency_ms: number`, `throughput_rps: number` | 非负数 |
| `QualityRule` | `type: 'coverage'\|'lint'\|'build'\|'deps'\|'perf'\|'security'\|'contract'`, `threshold: number`, `enabled: boolean` | type 必须是预定义集合 |
| `RiskLevel` | 字面量：`'low' \| 'medium' \| 'high' \| 'critical'` | 基于文件数、行数、模块关键度计算 |

**聚合行为**：

| 行为 | 描述 | 路由建议 |
|------|------|---------|
| `loadQualityPolicy()` | 加载 quality-gates.yml → 解析为 QualityRule[] → 覆盖全局默认 | →TDD |
| `evaluateGate()` | 读取当前 Gate 的质量策略 → 逐项检查 → 记录 QualityCheckResult → 返回通过/失败 | →BDD |
| `calculateRiskLevel()` | 基于变更幅度（文件数/行数）+ 模块关键度 → 返回 risk_level | →TDD |
| `shouldSkipConfirmation()` | 低风险变更自动静默通过，高风险强制等待人工确认 | →BDD |

#### 领域服务

| 服务 | 职责 |
|------|------|
| **QualityGateService** | 加载配置 → 执行质量检查 → 记录结果 → 返回审计追踪 |
| **RiskAssessmentService** | 变更影响评分：文件数 × 行数 × 模块权重 = risk_level |

**领域事件**：

| 事件 | 触发时机 | 载荷 |
|------|---------|------|
| `quality:check_failed` | 质量检查未通过 | `{ runId, gate, ruleType, threshold, actual }` |
| `quality:check_passed` | 质量检查通过 | `{ runId, gate, ruleType }` |

---

### 2.5 Test Execution Context（测试执行上下文）

**职责**：测试用例生成、测试执行、覆盖率收集、测试报告生成。支持单元/集成/E2E/性能/安全五种测试类型。

**新需求来源**：`REQ-TEST-001` ~ `REQ-TEST-006`

#### 聚合根：TestSuite（测试套件）

| 属性 | 值 |
|------|-----|
| **生命周期** | created → running → completed / failed |

**实体**：

| 实体 | 职责 | 不变条件 |
|------|------|---------|
| `TestCase` | 单个测试用例描述（名称、步骤、预期结果） | 必须关联一个 TestSuite |
| `TestResult` | 单次测试执行的结果（通过/失败/跳过，耗时，错误信息） | result 必须是 'pass'/'fail'/'skip'/'error' |
| `TestReport` | 汇总测试结果：总数、通过数、失败数、覆盖率 | failed + passed + skipped = total |

**值对象**：

| 值对象 | 字段 | 不变条件 |
|--------|------|---------|
| `TestType` | 字面量：`'unit' \| 'integration' \| 'e2e' \| 'perf' \| 'security' \| 'mutation'` | 每个 /test-xxx 命令对应一种类型 |
| `CoverageReport` | `lines: { total, covered, pct }`, `branches: { total, covered, pct }`, `functions: { total, covered, pct }` | pct = (covered / total) × 100 |
| `PerformanceReport` | `p50_ms`, `p95_ms`, `p99_ms`, `rps`, `errors: number` | 性能基线对比结果 |
| `SecurityFinding` | `severity: 'high'\|'medium'\|'low'\|'info'`, `type: string`, `endpoint: string`, `evidence: string` | severity 必须是枚举值 |
| `MutationScore` | `killed: number`, `survived: number`, `score: number` | score = killed / (killed + survived) × 100 |

**聚合行为**：

| 行为 | 描述 | 路由建议 |
|------|------|---------|
| `generateTests()` | 分析源码 → 识别测试框架 → 生成测试代码 → 运行 → 报告 | →BDD |
| `executeTestSuite()` | 运行所有测试 → 收集结果 → 对比覆盖率阈值 → 不达标退回修复 | →TDD |
| `runMutationTests()` | Stryker/pytest-mutmut 变异测试 → 对比覆盖率基线 → 验证行为不变 | →TDD |
| `runDASTScan()` | OWASP ZAP 自动化扫描 → 收集安全发现 → 生成安全报告 | →TDD |

#### 领域服务

| 服务 | 职责 |
|------|------|
| **TestGenerationService** | 分析源码类型 → 选择合适的测试框架 → 生成测试骨架代码 |
| **TestExecutionService** | 运行测试命令 → 解析 JUnit/Jest/Pytest 结果 → 生成统一 TestReport |
| **CoverageAnalysisService** | 解析覆盖率报告（lcov/cobertura） → 对比基线 → 判定是否达标 |
| **TestDataGenerationService** | 根据 schema（JSON Schema / OpenAPI Schema）生成 mock 数据 → 应用脱敏规则 |

**领域事件**：

| 事件 | 触发时机 | 载荷 |
|------|---------|------|
| `test:suite_started` | 测试套件开始执行 | `{ runId, testType, totalCases }` |
| `test:completed` | 单个或全部测试完成 | `{ runId, testType, passed, failed, skipped, coverage }` |
| `test:coverage_failed` | 覆盖率不达标 | `{ runId, testType, threshold, actual }` |

---

### 2.6 Review Context（代码审查上下文）

**职责**：代码审查、安全审计、性能审计。在 Gate D 阶段执行，由多个审查 Agent 并行处理。

**现有实现**：`GATE_AGENT_GUIDE['Gate D']` 定义的可生成 Agent 列表

**新需求来源**：REQ-TEST-005（DAST 安全审计增强）+ REQ-ENHANCE-003（API 文档一致性检查）

#### 聚合根：ReviewSession（审查会话）

| 属性 | 值 |
|------|-----|
| **关联** | 关联到 PipelineRun（run_id） |
| **审查维度** | 领域审查 + 安全审计 + 性能审计 + QA 综合签核 |

**实体**：

| 实体 | 职责 |
|------|------|
| `ReviewFinding` | 单个审查发现（严重程度、文件路径、行号、描述、建议） |
| `ReviewCheckpoint` | 审查阶段通过/失败的记录点 |

**值对象**：

| 值对象 | 字段 | 不变条件 |
|--------|------|---------|
| `SecurityScanResult` | `cve_count: number`, `critical_count: number`, `dast_findings: SecurityFinding[]` | 包含静态扫描 + DAST 动态扫描 |
| `PerformanceAuditResult` | `findings: PerformanceFinding[]`, `score: number` | score 0-100 |

**聚合行为**：

| 行为 | 描述 | 路由建议 |
|------|------|---------|
| `runCodeReview()` | 并行调度 4 个审查 Agent → 收集 Finding → QA 综合签核 | →BDD |
| `runSecurityAudit()` | CVE 扫描 + DAST 动态扫描 → 汇总安全报告 | →TDD |
| `runPerformanceAudit()` | 性能基线对比 → 识别退化 → 标注瓶颈 | →TDD |

---

### 2.7 Debug Session Context（调试诊断上下文）

**职责**：运行时调试诊断，包括在线调试和事后崩溃分析（post-mortem）。不自动修改代码。

**新需求来源**：`REQ-CMD-005` + `REQ-ENHANCE-001`（bug-fix 联动）

#### 聚合根：DebugSession（调试会话）

| 属性 | 值 |
|------|-----|
| **生命周期** | 收集信息 → 诊断 → 生成报告（不修改代码） |
| **模式** | `standard`: 在线调试，`post-mortem`: 崩溃事后分析 |

**实体**：

| 实体 | 职责 |
|------|------|
| `CrashSnapshot` | 崩溃时的环境快照（堆栈跟踪、崩溃日志、core dump 摘要、运行时状态） |
| `DiagnosticReport` | 诊断报告（根因分析、代码位置、建议修复方案） |
| `ReproductionCase` | 最小复现用例（用于重现 bug 的最小化代码/步骤） |

**值对象**：

| 值对象 | 字段 | 不变条件 |
|--------|------|---------|
| `StackTrace` | `frames: StackFrame[]`, `exception_type: string`, `message: string` | 已解析的堆栈帧列表 |
| `RootCauseAnalysis` | `suspected_file: string`, `suspected_line: number`, `confidence: number`, `evidence: string[]` | confidence 0-1 |
| `DebugEvidence` | `runtime_logs: string[]`, `variable_snapshots: Record<string, any>`, `breakpoint_hits: BreakpointResult[]` | 运行时证据，用于 bug-fix 步骤 3 |

**聚合行为**：

| 行为 | 描述 | 路由建议 |
|------|------|---------|
| `startDebugSession()` | Gate D0：收集异常信息 + 环境快照 → D1：生成最小复现用例 → D2：启动调试会话 | →BDD |
| `diagnoseBug()` | D3：交互式诊断（设置断点 → 捕获状态 → 推断根因） | →BDD |
| `generateDiagnosticReport()` | D4：生成诊断报告（不自动修改代码） | →TDD |
| `analyzePostMortem()` | 解析堆栈跟踪 + 崩溃日志 → 定位代码位置 → 推断可能根因 | →TDD |
| `collectRuntimeEvidence()` | 为 bug-fix 步骤 3 收集运行时证据（调用调试工具获取实际状态） | →TDD |

#### 领域服务

| 服务 | 职责 |
|------|------|
| **DebugSessionService** | 管理调试会话生命周期：D0→D4 全流程 |
| **PostMortemAnalysisService** | 离线分析：解析 core dump/崩溃日志/堆栈 → 定位根因 |
| **RuntimeEvidenceService** | 为 bug-fix Agent 收集运行时证据（agent-browser 调试协议集成） |

---

### 2.8 Refactor & Migration Context（重构与迁移上下文）

**职责**：安全重构（行为不变验证）+ 框架迁移（逐文件应用规则）。

**新需求来源**：`REQ-CMD-001` (/refactor) + `REQ-CMD-003` (/migrate)

#### 聚合根：RefactorRun / MigrationRun

**RefactorRun**：

| 属性 | 值 |
|------|-----|
| **Gate 序列** | R1（定义边界）→ R2（基线覆盖率）→ R3（执行重构）→ R4（对比验证）→ R5（报告） |

**值对象**：

| 值对象 | 字段 | 不变条件 |
|--------|------|---------|
| `RefactorBoundary` | `target_files: string[]`, `target_modules: string[]`, `refactor_type: 'extract'\|'rename'\|'reorganize'\|'simplify'` | 必须明确定义边界，严禁行为漂移 |
| `CoverageBaseline` | `before: CoverageReport`, `after: CoverageReport`, `drift: boolean` | after.pct >= before.pct 且 drift=false |

**MigrationRun**：

| 属性 | 值 |
|------|-----|
| **Gate 序列** | M1（迁移规则验证）→ M2（逐文件应用）→ M3（编译验证）→ M4（Lint 修复） |

**值对象**：

| 值对象 | 字段 | 不变条件 |
|--------|------|---------|
| `MigrationRule` | `pattern: string`, `replacement: string`, `file_glob: string` | 支持正则表达式 + glob 文件匹配 |

---

### 2.9 Contract Verification Context（契约验证上下文）

**职责**：API 契约验证（Gate F）。跨服务 API 契约一致性检查，集成 Pact 或类似工具。

**新需求来源**：`REQ-GATE-F-001` + `REQ-ENHANCE-003` + `REQ-API-001`

#### 聚合根：Contract（API 契约）

| 属性 | 值 |
|------|-----|
| **存储格式** | OpenAPI 3.0 / Swagger 文档 |
| **验证方式** | 契约测试（Pact）+ OpenAPI 文档一致性对比 |

**实体**：

| 实体 | 职责 |
|------|------|
| `ContractCheck` | 单次契约检查（提供方 vs 消费方接口对比） |
| `ContractDiscrepancy` | 契约不一致记录（字段、类型、端点差异） |

**聚合行为**：

| 行为 | 描述 | 路由建议 |
|------|------|---------|
| `verifyContract()` | 对比 API 实现与 OpenAPI 文档 → 记录差异 → 返回结果 | →TDD |
| `generateOpenAPIDoc()` | 从代码自动生成 OpenAPI 3.0 文档 | →BDD |
| `validateDocConsistency()` | Gate E 发布时验证 API 文档与实现一致性 | →TDD |

#### 领域服务

| 服务 | 职责 |
|------|------|
| **ContractVerificationService** | Gate F 执行契约验证：运行 Pact 测试 + OpenAPI 一致性对比 |
| **OpenAPIGenerationService** | 从后端代码生成 OpenAPI 文档，支持自动更新 |

---

### 2.10 Template Context（模板上下文）

**职责**：管理 Agent 模板、Command 模板、Skill 模板、QualityGate 模板的存储和分发。

**现有实现**：`src/templates/platforms/claude/` 目录（agents/commands/skills/settings.json）

**新需求来源**：`REQ-TEMPLATE-001` + `REQ-TEMPLATE-002`

#### 聚合根：Template（模板）

**值对象**：

| 值对象 | 字段 | 不变条件 |
|--------|------|---------|
| `TemplateType` | 字面量：`'agent' \| 'command' \| 'skill' \| 'quality_gate'` | 每种类型有独立的目录结构 |
| `PlatformTarget` | 字面量：`'claude'` | 当前仅支持 claude 平台（TASK-009） |

---

## 三、跨上下文交互（Context Map）

```
  Command Context ──(dispatch)──> Pipeline Context
                                      │
                           (enforce)  │  (advance)
                                      v
                              QualityGate Context ──(check_fail)──> Pipeline Context
                                      │
                                      v
                              Test Execution Context ──(test_completed)──> Pipeline Context
                                      │
                                      v
                              Contract Verification Context (Gate F)
                                      │
                                      v
                              Review Context (Gate D)
                                      │
                                      v
                              Debug Session Context
```

**上下文映射关系**：

| 上游上下文 | 下游上下文 | 关系类型 | 交互方式 |
|-----------|-----------|---------|---------|
| Command | Pipeline | 客户-供应商 | `/jarvis` 命令 → `pipeline_init` → `createPipelineRun` |
| Pipeline | QualityGate | 遵奉者 | `advance_gate` 前调用 `enforceGate` 验证 |
| Pipeline | Test Execution | 客户-供应商 | Gate C2 触发测试 Agent 生成 |
| Pipeline | Review | 客户-供应商 | Gate D 触发审查 Agent 生成 |
| Pipeline | Contract Verification | 客户-供应商 | Gate F 触发契约验证 |
| Pipeline | Debug Session | 客户-供应商 | `/debug` 命令触发诊断流程 |
| Test Execution | Agent | 客户-供应商 | 测试 Agent 由 Agent Registry 动态加载 |
| Agent | Template | 遵奉者 | Agent 定义源于模板文件 |

---

## 四、领域服务完整清单

| 服务 | 所属上下文 | 职责 | 路由建议 |
|------|-----------|------|---------|
| **GateEnforcementService** | Pipeline | 验证 Gate 条件，决定是否允许推进 | →TDD |
| **PipelineAdvanceService** | Pipeline | 协调 Gate 推进全流程（checkpoint + 产物扫描 + 事件发布） | →TDD |
| **SessionCleanupService** | Pipeline | 定时清理过期会话 | →TDD |
| **AgentRegistryService** | Agent | 扫描 + 合并三层 Agent 配置 | →TDD |
| **AgentRoutingService** | Agent | 根据 Gate 返回可生成的 Agent 列表 | →TDD |
| **AgentFileSyncService** | Agent | 将 Agent 配置同步回 .md 文件 | →TDD |
| **QualityGateService** | QualityGate | 加载质量策略 → 执行检查 → 记录结果 | →BDD |
| **RiskAssessmentService** | QualityGate | 变更影响评分：决定静默通过或强制确认 | →TDD |
| **TestGenerationService** | Test Execution | 识别测试框架 → 生成测试代码 | →BDD |
| **TestExecutionService** | Test Execution | 运行测试 → 解析结果 → 生成统一报告 | →TDD |
| **CoverageAnalysisService** | Test Execution | 覆盖率解析 + 基线对比 | →TDD |
| **TestDataGenerationService** | Test Execution | 根据 Schema 生成 mock 数据 + 脱敏 | →TDD |
| **ContractVerificationService** | Contract | Pact 测试 + OpenAPI 一致性对比 | →TDD |
| **OpenAPIGenerationService** | Contract | 从代码生成 OpenAPI 文档 | →BDD |
| **DebugSessionService** | Debug Session | 调试会话 D0→D4 全流程管理 | →BDD |
| **PostMortemAnalysisService** | Debug Session | 崩溃事后分析（堆栈 + 日志 → 根因） | →TDD |
| **RuntimeEvidenceService** | Debug Session | 为 bug-fix 收集运行时证据 | →TDD |

---

## 五、领域事件完整清单

| 事件 | 类型 | 所属上下文 | 载荷 | 消费者 |
|------|------|-----------|------|--------|
| `gate:advanced` | PubSub | Pipeline | `{ sessionId, runId, gate, previousGate }` | Web SSE 广播 |
| `session:changed` | PubSub | Pipeline | `{ sessionId, action }` | Web SSE 广播 |
| `run:changed` | PubSub | Pipeline | `{ runId, sessionId, action }` | Web SSE 广播 |
| `agent:event` | PubSub | Pipeline | `{ runId, sessionId, agentId, eventType }` | Web SSE 广播 |
| `test:suite_started` | 新事件 | Test Execution | `{ runId, testType, totalCases }` | Web Dashboard + 审计日志 |
| `test:completed` | 新事件 | Test Execution | `{ runId, testType, passed, failed, skipped, coverage }` | QualityGate 覆盖率检查 |
| `test:coverage_failed` | 新事件 | Test Execution | `{ runId, testType, threshold, actual }` | Remediation Agent |
| `quality:check_failed` | 新事件 | QualityGate | `{ runId, gate, ruleType, threshold, actual }` | Gate D 审查 Agent |
| `quality:check_passed` | 新事件 | QualityGate | `{ runId, gate, ruleType }` | Web Dashboard 时间线 |
| `contract:verified` | 新事件 | Contract | `{ runId, provider, consumer, result }` | Gate F 验证 |
| `review:submitted` | 新事件 | Review | `{ runId, reviewType, findings }` | Gate D → E 推进 |
| `debug:report_generated` | 新事件 | Debug Session | `{ runId, output: DiagnosticReport }` | bug-fix Agent 联动 |
| `migration:file_applied` | 新事件 | Migration | `{ runId, file, rule, result }` | 迁移进度追踪 |

---

## 六、聚合行为 →BDD / →TDD 路由表

### 6.1 →BDD（高业务价值 / 需验收）

| 聚合行为 | 所属上下文 | 理由 |
|---------|-----------|------|
| `dispatchCommand()` | Command | 命令分发涉及多聚合交互，需用户验收行为正确 |
| `evaluateGate()` | QualityGate | 质量门禁通过/失败直接影响交付质量，需 BDD 场景验证 |
| `shouldSkipConfirmation()` | QualityGate | 静默通过的边界条件需 BDD 验收（什么情况下跳过、什么情况下强制确认） |
| `generateTests()` | Test Execution | 测试生成质量直接决定测试价值，需 BDD 验证生成策略 |
| `runCodeReview()` | Review | 多维审查（领域+安全+性能）的通过/失败需 BDD 描述 |
| `startDebugSession()` | Debug Session | 调试流程的用户体验需 BDD 验证 |
| `diagnoseBug()` | Debug Session | 诊断准确性需 BDD 验收 |
| `generateOpenAPIDoc()` | Contract | API 文档生成的完整性和正确性需 BDD 验证 |
| `runMutationTests()` | Refactor | 变异测试的有效性需 BDD 验收（确保能检测到行为漂移） |

### 6.2 →TDD（纯技术逻辑 / 高风险接口 / 幂等性）

| 聚合行为 | 所属上下文 | 理由 |
|---------|-----------|------|
| `advanceGate()` | Pipeline | FSM 状态转换，必须严格验证顺序和约束 |
| `createRun()` / `completeRun()` / `abortRun()` | Pipeline | 核心基础设施，数据一致性必须保证 |
| `enforceGate()` | Pipeline | 硬约束逻辑，边界条件多 |
| `joinSession()` / `leaveSession()` | Pipeline | 会话管理涉及持久化和事件发布，需幂等性保障 |
| `registerAgent()` | Agent | 动态扫描 + 合并去重逻辑，边界条件多 |
| `setAgentModel()` | Agent | 配置写入涉及文件同步，需验证原子性 |
| `executeTestSuite()` | Test Execution | 测试执行器涉及进程管理和结果解析 |
| `runDASTScan()` | Test Execution | OWASP ZAP 自动化扫描涉及工具集成 |
| `verifyContract()` | Contract | 契约验证涉及外部工具 + 字段级对比 |
| `validateDocConsistency()` | Contract | API 文档与实现一致性需精确对比 |
| `generateDiagnosticReport()` | Debug Session | 诊断报告生成的准确性需测试覆盖 |
| `analyzePostMortem()` | Debug Session | 堆栈解析的准确性需测试覆盖 |
| `calculateRiskLevel()` | QualityGate | 风险评估算法需测试验证 |
| `loadQualityPolicy()` | QualityGate | YAML 解析 + 配置合并逻辑 |

---

## 七、架构约束与红线

### 7.1 数据一致性

| 约束 | 来源 | 影响 |
|------|------|------|
| 禁止物理外键 | CLAUDE.md 通用编程规范 2.8 | SQLite 仅通过应用层保证引用完整性 |
| `pipeline_type` 白名单校验 | server.ts session_join | 新增类型必须同步更新白名单，或改为从 PIPELINE_DEFS keys 动态读取 |
| `agent_events.event_type` CHECK 约束 | db.ts initSchema | 只接受 'start'/'end'/'error' |
| artifacts `UNIQUE(run_id, gate, filepath)` | db.ts initSchema | 同一 Gate 对同一文件的产物仅记录一次 |

### 7.2 共享区域冲突

| 文件 | 状态 | 风险 |
|------|------|------|
| `src/engine/gates.ts` | **单一修改者**（所有 pipeline_type/Gate/Operation 定义） | 极高 -- 必须在第 1 轮全部完成并锁定。后续任务只读 |
| `src/engine/server.ts` | **多修改者**（白名单 + quality_gates 工具 + CI 模式） | 高 -- 须串行修改 |
| `src/engine/db.ts` | **扩展**（新增 quality_gate_results 表） | 中 -- 仅 ADD COLUMN / CREATE TABLE IF NOT EXISTS |

### 7.3 平台约束

| 约束 | 值 |
|------|-----|
| 仅支持 claude 平台 | TASK-009 决策 |
| 数据库 | SQLite (node:sqlite)，`~/.jarvis/engine.db` |
| MCP 传输 | Stdio + HTTP/SSE (StreamableHTTP) |
| 前端框架 | React 19 + Antd 6 |
| 后端框架 | Hono + @hono/node-server |

---

## 八、新增数据库实体设计概要

### 8.1 quality_gate_results（质量门禁检查结果）

```sql
CREATE TABLE IF NOT EXISTS quality_gate_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  gate TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('coverage','lint','build','deps','perf','security','contract')),
  passed INTEGER NOT NULL DEFAULT 0,
  threshold TEXT,
  actual TEXT,
  checked_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_qgr_run ON quality_gate_results(run_id, gate);
```

### 8.2 pipeline_type 白名单扩展

当前 `session_join` 白名单：`['full', 'frontend', 'backend', 'lite']`
扩展后：增加 `'refactor', 'hotfix', 'migrate', 'evaluate', 'debug', 'doc', 'test'`

**建议**：从 `Object.keys(PIPELINE_DEFS)` 动态生成白名单，消除手动维护负担。

---

## 九、推荐交付顺序

| 阶段 | 上下文 | 交付物 |
|------|--------|--------|
| 第 1 轮 | Pipeline + QualityGate | PIPELINE_DEFS 扩展、quality-gates.yml 配置、quality_gate_results 表 |
| 第 2 轮 | Command + Template | 7 新指令模板、移动端 Gate B 增强、Agent 路由表更新 |
| 第 3 轮 | Test Execution + Agent + Web | 5 测试指令、Agent 增强、Web Dashboard 适配、Gate F |
| 第 4 轮 | Skill + CLI/CI + Docs | test-data-factory/mutation-testing Skill、CI 模式、文档同步 |

---

## 十、需求追溯矩阵

| REQ-ID | 影响上下文 | DDD 标记 |
|--------|-----------|---------|
| REQ-TEST-001 | Test Execution | 新增 TestSuite 聚合根 |
| REQ-TEST-002 | Test Execution + Contract | 新增集成测试 Agent，扩展 api-contract-expert |
| REQ-TEST-003 | Test Execution | 增强 e2e-test-expert |
| REQ-TEST-004 | Test Execution | 增强 perf-test-expert |
| REQ-TEST-005 | Review + Test Execution | 扩展 security-review-expert (DAST) |
| REQ-TEST-006 | Test Execution | 新增 test-data-factory Skill |
| REQ-TEST-007 | QualityGate | 新增 QualityPolicy 聚合根 |
| REQ-CMD-001 | Refactor & Migration | 新增 RefactorRun 聚合根 |
| REQ-CMD-002 | Pipeline | 新增 hotfix pipeline_type |
| REQ-CMD-003 | Refactor & Migration | 新增 MigrationRun 聚合根 |
| REQ-CMD-004 | Pipeline | 新增 evaluate pipeline_type |
| REQ-CMD-005 | Debug Session | 新增 DebugSession 聚合根 |
| REQ-CMD-006 | Template | 新增 doc pipeline_type |
| REQ-CMD-007 | Pipeline + Command | 新增 jarvis-change 指令 |
| REQ-ENHANCE-001 | Debug Session + Test Execution | /bug-fix 与 /debug 联动 |
| REQ-ENHANCE-002 | Command | 移动端 Gate B 三步流程 |
| REQ-ENHANCE-003 | Contract | OpenAPI 文档自动生成与维护 |
| REQ-ENHANCE-004 | Pipeline | 任务分解粒度控制（planner/task-design） |
| REQ-ENHANCE-005 | QualityGate | 变更影响评分 + 静默通过机制 |
| REQ-ENHANCE-006 | Pipeline | 跨会话上下文继承 |
| REQ-ENGINE-001 | Pipeline | 新 Gate 定义（PIPELINE_DEFS/GATE_CHECKS/GATE_AGENT_GUIDE/GATE_OPERATIONS） |
| REQ-ENGINE-002 | QualityGate | quality-gates.yml 配置加载 |
| REQ-GATE-F-001 | Contract + Pipeline | Gate F 联调与契约验证 |
| REQ-CI-001 | Pipeline + CLI | CI 模式 gate-check CLI |
| REQ-WEB-001 | UI（非 DDD 范围） | Web 面板适配 |
| REQ-TEMPLATE-001 | Template | 11 新命令模板 + 5 移动端更新 |
| REQ-TEMPLATE-002 | Template | test-data-factory + mutation-testing Skill |
| REQ-DOCS-001 | 文档（非 DDD 范围） | 流程图 + README 同步 |
| REQ-AGENT-001 | Agent | 4 个 Agent 增强（contract/security/perf/e2e） |
| REQ-AGENT-002 | Agent | Agent 路由表更新 |
| REQ-CLI-001 | CLI（非 DDD 范围） | gate-check CLI + CI 环境变量 |
| REQ-API-001 | Contract | OpenAPI/Swagger 文档维护流程 |

---

## 十一、领域边界总结

| 上下文 | 核心聚合根 | 新增/扩展 | 复杂性 |
|--------|-----------|----------|--------|
| Pipeline | PipelineRun, Session | 扩展 PIPELINE_DEFS（4→11种），新增白名单 | 中 |
| Agent | Agent | 4 个 Agent 增强，路由表更新 | 低 |
| Command | Command | 7 新指令 + 5 移动端增强 | 中 |
| QualityGate | QualityPolicy | **新增上下文**：quality-gates.yml + quality_gate_results 表 | 高 |
| Test Execution | TestSuite | **新增上下文**：5 种测试类型 + 测试数据管理 | 高 |
| Review | ReviewSession | DAST 增强 | 低 |
| Debug Session | DebugSession | **新增上下文**：标准调试 + post-mortem 分析 | 高 |
| Refactor & Migration | RefactorRun, MigrationRun | **新增上下文**：安全重构 + 框架迁移 | 中 |
| Contract | Contract | **新增 Gate F**：契约验证 + OpenAPI 文档生成 | 中 |
| Template | Template | 模板文件新增（11 命令 + 5 移动端 + 2 Skill） | 低 |
