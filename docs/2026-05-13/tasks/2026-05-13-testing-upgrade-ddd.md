# 贾维斯测试体系化升级 & 新指令流程 & 全平台 Gate 适配 — DDD 领域分析

> 需求文档: `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md`
> 版本: v1.0
> 日期: 2026-05-13
> 分析方法: DDD 战术设计

---

## 1. 领域概述

本需求涉及贾维斯 Agent Factory 的三大领域升级:

| 领域 | 范围 | 核心REQ |
|------|------|---------|
| **测试体系** | 单元/集成/E2E/性能/安全测试指令 + 测试数据工厂 + 统一质量门禁配置 | REQ-001~007 |
| **新指令流程** | 重构/热修复/迁移/评估/调试 五条新指令 + bug-fix 增强 | REQ-008~013 |
| **全平台适配** | 移动端 Gate B 补齐 + API 文档维护 + 流水线深度优化 + CI/CD + 文档自动化 + Web 面板同步 + 引擎CLI更新 + Skills扩展 | REQ-014~021 |

---

## 2. 聚合根列表

### 2.1 TestExecutionPipeline（测试执行流水线）

**REQ 映射**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007

**职责**:
- 管理所有测试类型（单元/集成/E2E/性能/安全）的执行生命周期
- 协调测试数据工厂生成 mock 数据
- 按 quality-gates.yml 配置的阈值判定通过/不通过
- 生成结构化测试报告并落盘到 `docs/testing/`

**边界**:
- 不关心具体业务代码变更内容，只关心测试覆盖和质量指标
- 不直接写代码，通过 spawn test Agent 执行
- 测试框架检测、测试生成策略委托给子实体

**不变条件**:
- 任一测试类型失败 → 整体流水线不可推进到下一 Gate
- 覆盖率低于阈值 → 必须退回 Gate C-impl 修复
- 高危安全漏洞 → 阻断发布，无论其他指标

---

### 2.2 QualityGate（质量门禁）

**REQ 映射**: REQ-007（主）, REQ-001~006（消费方）

**职责**:
- 维护 `quality-gates.yml` 配置文件的读取、校验、合并（项目级覆盖默认值）
- 在各 Gate 处执行门禁检查：C2（测试）、D（审查/安全）
- 不达标时生成具体缺口报告，阻断流水线推进
- 提供阈值配置的默认值和可覆盖项清单

**边界**:
- 不执行具体测试，只消费 TestExecutionPipeline 产出的报告
- 不定义 Gate 序列（Gate 序列由 PipelineDefinition 管理）
- 配置文件格式固定，不兼容其他 CI 工具格式

**不变条件**:
- 默认阈值必须是一个合法值（如覆盖率 >= 80%），不可为空
- 项目自定义值不可低于默认值的 50%（防止恶意绕过）
- 质量门禁判定结果必须在引擎 checkpoints 表中记录

---

### 2.3 CommandFlow（指令工作流）

**REQ 映射**: REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-016

**职责**:
- 定义每条指令的 Gate 序列和 Gate 间转移规则
- 管理指令级别的 Agent 路由（哪些 Gate 可 spawn 哪些 Agent）
- 处理中途变更评估（/jarvis-change 指令影响范围分析）
- 跨会话上下文继承

**边界**:
- 不管理流水线的引擎级 FSM 约束（那是 PipelineDefinition 的职责）
- 不直接执行代码，通过 spawn Agent 代理
- 不同指令的 Gate 序列独立，互不干扰

**子类型**（按指令）:
| 指令 | Gate 序列 | 特殊约束 |
|------|----------|---------|
| `/refactor` | R1→R2→R3→R4→R5 | 覆盖率对比差异 ≤ 阈值，R2/R4 必须一致 |
| `/hotfix` | H0→H1→H2→H3 | H0 人工确认，H3 事后强制回溯 Gate E |
| `/migrate` | M1→M2→M3→M4 | M3 编译验证，M4 自动循环修复 |
| `/evaluate` | E0→E1→E2→E3 | 隔离沙箱/独立分支，非破坏性 |
| `/debug` | D0→D1→D2→D3→D4 | D2/D3 交互式，支持 post-mortem |
| `/bug-fix`（增强） | 原有 + 显式诊断 Gate | 修复前必须有运行时证据 |
| `/jarvis-change` | 评估→决策→回退或插入 | 小范围变更自动降低确认级别 |

**不变条件**:
- 任一指令的 Gate 序列不可与现有流水线 Gate 命名冲突
- `/hotfix` 的 H3 不可跳过（合规审计强制）
- `/refactor` 行为漂移 > 0% 时必须阻断

---

### 2.4 PipelineDefinition（流水线定义）

**REQ 映射**: REQ-020（主）, 被所有其他 REQ 依赖

**职责**:
- 注册所有流水线类型（full/frontend/backend/lite + refactor/hotfix/migrate/evaluate/debug）
- 管理每个 Gate 的操作权限（allow/deny 矩阵）
- 管理每个 Gate 可生成的 Agent 清单
- 提供引擎 FSM 的 Gate 转移规则

**边界**:
- 不关心具体业务逻辑（那是各 Agent 的职责）
- 不管理 session/run 状态（那是 DB 实体职责）
- Gate 序列变更必须向后兼容已有流水线

**现有流水线**（代码事实源 `src/engine/gates.ts`）:
```typescript
PIPELINE_DEFS = {
  full,     // 13 道闸门
  frontend, // 同 full
  backend,  // 跳过 C1.5
  lite,     // 支持 Gate 入口跳转
}
```

**新增流水线**:

| 流水线 | 新 Gate 序列 | 需要新增的 Gate 操作权限 |
|--------|-------------|-----------------------|
| refactor | R1→R2→R3→R4→R5 | read/write_code/spawn_test/spawn_impl/review |
| hotfix | H0→H1→H2→H3 | read/write_code/spawn_test/deploy |
| migrate | M1→M2→M3→M4 | read/write_code/lint/build/fix |
| evaluate | E0→E1→E2→E3 | read/write_code/spawn_impl（隔离沙箱） |
| debug | D0→D1→D2→D3→D4 | read/write_code/spawn_test+交互式工具 |

**不变条件**:
- FSM 拒绝回退/跳跃的硬约束对所有 Gate 生效（NFR-04）
- 已有流水线行为不变（NFR-03）
- 每个 Gate 必须有明确的 allow/deny 矩阵

---

### 2.5 PlatformCommand（平台指令适配）

**REQ 映射**: REQ-014

**职责**:
- 管理各平台（Android/iOS/Flutter/Expo/Taro）的 Gate B 三分析流程定义
- 产出平台特定的 DDD 领域模型 / BDD 场景 / TDD 任务包
- 协调平台 Agent 路由（ui/state/dev expert）

**边界**:
- 不改变引擎级 Gate 定义，仅补齐 prompt 模板中的分析步骤
- 每个平台的 DDD/BDD/TDD 产出独立，不跨平台共享
- 移动端任务可轻量化（单轮 DDD 分析），不需完整三阶段

**当前状态**（代码事实源）:
| 平台 | command 文件 | Gate B-DDD | Gate B-BDD | Gate B-TDD | Agent 列表 |
|------|-------------|-----------|-----------|-----------|-----------|
| Android | `.claude/commands/android.md` | 缺失详细流程 | 缺失详细流程 | 缺失详细流程 | android-dev/ui/state-expert |
| iOS | `.claude/commands/ios.md` | 缺失详细流程 | 缺失详细流程 | 缺失详细流程 | ios-dev/ui/state-expert |
| Flutter | `.claude/commands/flutter.md` | 缺失详细流程 | 缺失详细流程 | 缺失详细流程 | flutter-dev/ui/state-expert |
| Expo | `.claude/commands/expo.md` | 缺失详细流程 | 缺失详细流程 | 缺失详细流程 | react-native-dev/ui/state-expert |
| Taro | `.claude/commands/taro.md` | 缺失详细流程 | 缺失详细流程 | 缺失详细流程 | taro-dev/ui/state-expert |

> 注：所有 5 个平台的 command 文件已在 prompt 中提到 Gate A→B-DDD→B-BDD→B-TDD→... 序列，也标注了"移动端任务可轻量化"，但缺少具体的 DDD 产出模板、BDD 场景模板、TDD 任务包模板。对齐目标是补充类似 `backend.md` 和 `frontend.md` 已有的详细 Gate B 章节。

**不变条件**:
- 补齐后流程与 `/frontend`、`/backend` 对齐
- 不影响已有平台 Agent 的行为

---

### 2.6 KnowledgeBase（知识库）

**REQ 映射**: REQ-015, REQ-018

**职责**:
- 管理 API 文档（OpenAPI/Swagger）的自动生成与校验
- 管理项目文档的自动生成与同步
- Gate E 发布阶段检查文档一致性

**边界**:
- 不替代人工编写设计文档
- API 文档一致性检查在 Gate E 阶段执行

**不变条件**:
- 文档与代码不一致时阻断发布

---

### 2.7 WebPanel（Web 面板）

**REQ 映射**: REQ-019

**职责**:
- 展示所有指令流程的状态（Dashboard）
- 管理指令列表（Commands 页面）
- 管理流程归档（Archive 页面）
- 管理 Agent 列表（Agents 页面）
- 可视化 Gate 序列和工作流

**边界**:
- 不改变引擎逻辑，仅做 UI 适配
- 不存储流程状态（由 engine db 管理）
- 通过 SSE 实时同步

**现有组件**（代码事实源）:
- `src/web/routes.ts` — API 路由（含 SSE 广播）
- `src/web/views/agents.html` — Agent 列表页
- `src/web/views/pipeline.html` — 流水线 Dashboard 页

---

## 3. 实体列表

### 3.1 TestExecutionPipeline 内

| 实体 | 描述 | 关键属性 |
|------|------|---------|
| **TestCase** | 单个测试用例 | testType, framework, targetModule, coverageTarget, status |
| **TestSuite** | 测试套件（一组关联用例） | testCases[], executionOrder, setupScript, teardownScript |
| **TestReport** | 测试执行报告 | suiteId, passedCount, failedCount, skippedCount, duration, artifacts |
| **CoverageReport** | 覆盖率报告 | lineCoverage, branchCoverage, functionCoverage, uncoveredLines[], threshold |
| **PerformanceBaseline** | 性能基线 | endpoint, avgLatency, p95Latency, p99Latency, throughput, errorRate, timestamp |
| **SecurityScanResult** | 安全扫描结果 | vulnCount, severity, owaspCategories[], cveIds[], remediationSteps |

### 3.2 QualityGate 内

| 实体 | 描述 | 关键属性 |
|------|------|---------|
| **GateCondition** | 门禁条件 | gateName, testType, threshold, comparisonOp, onViolation |
| **GateCheckpoint** | 门禁检查点记录 | gate, sessionId, passedAt, evidence, violations[] |
| **QualityProfile** | 质量配置文件实例 | source（default/project）, thresholds{}, overrides{} |

### 3.3 CommandFlow 内

| 实体 | 描述 | 关键属性 |
|------|------|---------|
| **Gate** | 单个闸门 | gateName, allowedOps[], denyOps[], maxRetry, entryConditions |
| **FlowState** | 流状态 | currentGate, completedGates[], retryCount, stuckReason |
| **ChangeRequest** | 变更请求（/jarvis-change） | scope, affectedModules, rollbackPlan, decision |

### 3.4 PipelineDefinition 内

| 实体 | 描述 | 关键属性 |
|------|------|---------|
| **PipelineType** | 流水线类型 | typeId, gateSequence[], allowJump, targetPlatform |
| **AgentRoute** | Agent 路由规则 | gate, canSpawn[], preferredModel, maxParallel |

### 3.5 DebugSession 内（/debug 指令）

| 实体 | 描述 | 关键属性 |
|------|------|---------|
| **ReproductionScript** | 最小复现脚本 | steps[], expectedBehavior, actualBehavior, envSnapshot |
| **DebugBreakpoint** | 调试断点 | file, line, condition, hitCount, variables[] |
| **DiagnosticReport** | 诊断报告 | rootCause, codeLocation, suggestedFix, evidenceLinks[] |
| **CrashDump** | 崩溃转储分析（post-mortem） | stackTrace[], coreDumpPath, memorySnapshot, threadStates[] |

### 3.6 RefactorSession 内（/refactor 指令）

| 实体 | 描述 | 关键属性 |
|------|------|---------|
| **RefactorBoundary** | 重构边界定义 | targetFiles[], exclusionList[], refactorGoal |
| **CoverageBaseline** | 基线覆盖率快照 | snapshotAt, coverage{}, mutationScore |
| **MutationTestResult** | 突变测试结果 | killedMutants, survivedMutants, mutationScore, equivalentMutants |

### 3.7 HotfixSession 内（/hotfix 指令）

| 实体 | 描述 | 关键属性 |
|------|------|---------|
| **EmergencyDeclaration** | 紧急声明 | severity, impactScope, declaredBy, declaredAt |
| **ApprovalRecord** | 审批记录 | approver, approvedAt, channel（CLI/Webhook） |
| **RollbackPlan** | 回滚预案 | rollbackSteps[], verificationSteps[], estimatedRollbackTime |

### 3.8 KnowledgeBase 内

| 实体 | 描述 | 关键属性 |
|------|------|---------|
| **ApiDoc** | API 文档 | openapiVersion, endpoints[], schemas[], consistencyStatus |
| **DocSyncCheck** | 文档同步检查结果 | docFile, sourceFiles[], lastSyncAt, staleDays, driftFlags[] |

### 3.9 WebPanel 内

| 实体 | 描述 | 关键属性 |
|------|------|---------|
| **DashboardView** | 仪表盘视图 | activeSessions[], pipelineStatuses[], recentActivity |
| **CommandEntry** | 指令条目 | commandName, gateSequence[], flowType, icon |

---

## 4. 值对象列表

| 值对象 | 所属聚合 | 不可变属性 | 用途 |
|--------|---------|-----------|------|
| **CoverageThreshold** | TestExecutionPipeline | minLine, minBranch, minFunction | 覆盖率阈值判定 |
| **PerformanceBaseline** | TestExecutionPipeline | avgLatency, p95, p99, throughput, errorRate | 性能基线对比 |
| **GateCondition** | QualityGate | gate, testType, threshold, op | 门禁条件建模 |
| **TestFramework** | TestExecutionPipeline | name（Jest/Vitest/Mocha/Pytest）, version, configFile | 测试框架检测 |
| **SecuritySeverity** | TestExecutionPipeline | level（CRITICAL/HIGH/MEDIUM/LOW）, cwe | 安全漏洞严重级别 |
| **PipelineTypeCode** | PipelineDefinition | typeId（full/frontend/backend/lite/refactor/hotfix/...） | 流水线类型标识 |
| **GateName** | PipelineDefinition | name（Gate A, Gate B-DDD, R1, H0, ...） | 闸门标识 |
| **OperationType** | PipelineDefinition | op（read/write_doc/write_code/spawn_impl/spawn_test/...） | 操作类型标识 |
| **AgentType** | PipelineDefinition | type（task-design/planner/frontend-dev-expert/...） | Agent 类型标识 |
| **PlatformCode** | PlatformCommand | code（android/ios/flutter/expo/taro） | 平台标识 |
| **MutationScore** | RefactorSession | killed, survived, total, score | 突变测试评分 |
| **DebugMode** | DebugSession | mode（interactive/postmortem/remote） | 调试模式 |
| **ApprovalChannel** | HotfixSession | channel（CLI/Webhook/Manual） | 审批渠道 |

---

## 5. 领域服务列表

| 领域服务 | 所属聚合 | 职责 | REQ 映射 |
|---------|---------|------|---------|
| **TestGenerationService** | TestExecutionPipeline | 根据模块代码自动检测测试框架并生成测试模板 | REQ-001, 002, 003 |
| **CoverageAnalysisService** | TestExecutionPipeline | 解析覆盖率报告，对比阈值，生成缺口清单 | REQ-001, 007 |
| **ContractVerificationService** | TestExecutionPipeline | 解析 OpenAPI spec，验证 API 实现与契约一致性 | REQ-002, 015 |
| **SecurityScanService** | TestExecutionPipeline | 集成 OWASP ZAP 执行 DAST，生成 OWASP Top 10 覆盖报告 | REQ-005 |
| **PerformanceTestService** | TestExecutionPipeline | 生成 k6/Artillery 脚本，执行负载测试，对比基线 | REQ-004 |
| **TestDataFactoryService** | TestExecutionPipeline | 根据 JSON Schema / OpenAPI Schema 生成 mock 数据，应用脱敏规则 | REQ-006 |
| **QualityGateEvaluationService** | QualityGate | 读取 quality-gates.yml，在各 Gate 处评估门禁条件，生成阻断/通过决策 | REQ-007 |
| **RefactorSafetyNetService** | RefactorSession | 管理 R2/R4 覆盖率对比，集成突变测试，检测行为漂移 | REQ-008 |
| **HotfixApprovalService** | HotfixSession | 管理紧急声明审批链，验证审批人权限，记录审批轨迹 | REQ-009 |
| **MigrationExecutionService** | CommandFlow | 逐文件执行迁移规则，编译验证 + 自动 Lint 修复循环 | REQ-010 |
| **EvaluationOrchestrationService** | CommandFlow | 在隔离沙箱/分支上运行评估用例，收集指标，生成评估报告 | REQ-011 |
| **InteractiveDebugService** | DebugSession | 管理断点生命周期，抓取运行时变量，生成诊断报告 | REQ-012 |
| **PostMortemAnalysisService** | DebugSession | 自动解析 core dump/崩溃日志/堆栈跟踪，推断根因 | REQ-012 |
| **DiagnosticEvidenceService** | CommandFlow | 在 bug-fix 流程中强制收集运行时证据，产出显式诊断报告 | REQ-013 |
| **PlatformGateAlignmentService** | PlatformCommand | 为各平台补齐 Gate B 三分析模板，产出平台特定领域模型 | REQ-014 |
| **ApiDocSyncService** | KnowledgeBase | 从代码注解生成 OpenAPI spec，检查文档与代码一致性 | REQ-015 |
| **ChangeImpactAssessmentService** | CommandFlow | 评估中途变更的影响范围，决定回退或插入策略 | REQ-016 |
| **RiskAssessmentService** | CommandFlow | 根据变更范围自动评估风险等级，调整人工确认级别 | REQ-016 |
| **GateCliExportService** | PipelineDefinition | 将每个 Gate 封装为独立 CLI 命令（jarvis gate-check <Gate>） | REQ-017 |
| **CiModeAdapterService** | PipelineDefinition | CI 模式下跳过人工确认，输出 JUnit/xUnit 格式报告 | REQ-017 |
| **DocAutoGenerationService** | KnowledgeBase | 对比代码变更与文档站，自动生成/更新文档 | REQ-018 |

---

## 6. 领域事件列表

| 领域事件 | 触发条件 | 消费方 | 用途 |
|---------|---------|--------|------|
| **TestSuiteCompleted** | 任一测试套件执行完毕 | QualityGate, WebPanel | 触发门禁检查，更新 Dashboard |
| **CoverageThresholdNotMet** | 覆盖率低于阈值 | QualityGate, CommandFlow | 阻断流水线，退回 Gate C-impl |
| **SecurityVulnerabilityFound** | DAST 发现高危漏洞 | QualityGate, WebPanel | 阻断发布，告警通知 |
| **PerformanceRegressionDetected** | 性能对比基线下降 | QualityGate, CommandFlow | 阻断或警告（取决于配置） |
| **QualityGateFailed** | 任一质量门禁不通过 | CommandFlow, WebPanel | 阻断推进，展示缺口详情 |
| **RefactorDriftDetected** | 重构后覆盖率/断言出现差异 | RefactorSession | 阻断 R5，生成差异报告 |
| **HotfixApproved** | H0 审批人确认 | HotfixSession | 推进到 H1 |
| **HotfixDeployed** | H2 快速验证通过且部署 | HotfixSession, KnowledgeBase | 触发 H3 事后审计 |
| **MigrationRuleFailed** | 迁移规则在某文件执行失败 | CommandFlow | 记录失败文件，触发 M4 修复 |
| **DebugSessionStarted** | D0 阶段收集到异常信息 | DebugSession | 通知相关 Agent 准备工具 |
| **DiagnosticReportGenerated** | D4 诊断报告产出 | CommandFlow（bug-fix）, WebPanel | 供修复 Agent 参考 |
| **BugFixDiagnosisComplete** | bug-fix 显式诊断阶段完成 | CommandFlow | 进入修复阶段 |
| **ChangeRequestEvaluated** | /jarvis-change 影响评估完成 | CommandFlow | 决定回退或插入策略 |
| **DocOutOfSync** | Gate E 文档一致性检查不通过 | KnowledgeBase | 阻断发布，提示更新文档 |
| **PipelineAdvanced** | Gate 推进成功 | WebPanel（SSE）, PipelineDefinition | 更新 Dashboard 视图 |
| **AgentSpawned** | spawn Agent 操作完成 | WebPanel（SSE）, PipelineDefinition | 记录 Agent 事件 |

> 已有引擎事件（`src/engine/pubsub.ts`）: `session:changed`, `run:changed`, `gate:advanced`, `agent:event` — 新增领域事件需要在现有 PubSub 机制上扩展。

---

## 7. 路由建议（聚合行为 → BDD 或 → TDD）

### 7.1 →BDD（高业务价值，需验收场景）

| 聚合行为 | 路由理由 | BDD 场景关键词 |
|---------|---------|--------------|
| `/hotfix` H0 紧急审批 | 审批链合规，涉及人工决策 + 安全 | Given 生产 P0 故障, When 发起热修复, Then 需审批人确认 |
| `/refactor` 行为漂移检测 | 重构质量直接关系产品正确性，需验收 | Given 重构前后, When 对比覆盖率, Then 差异 ≤ 0% |
| `/bug-fix` 诊断→修复闭环 | 诊断证据完整性是修复质量的关键前提 | Given 异常信息, When 执行诊断, Then 生成根因报告 |
| QualityGate 阻断决策 | 质量门禁的阻断/放行策略直接影响交付质量 | Given 测试报告, When 对比阈值, Then 阻断或放行 |
| `/evaluate` 评估报告生成 | 评估结论影响后续技术选型 | Given 评估用例, When 运行原型, Then 产出结论+建议 |

### 7.2 →TDD（纯技术逻辑）

| 聚合行为 | 路由理由 |
|---------|---------|
| `TestGenerationService` 自动生成测试模板 | 纯代码生成逻辑，红→绿→重构 |
| `CoverageAnalysisService` 覆盖率计算 | 数学计算逻辑 |
| `ContractVerificationService` API 契约校验 | 契约断言，适合 TDD |
| `SecurityScanService` ZAP 集成 | 工具集成逻辑 |
| `PerformanceTestService` k6 脚本生成与执行 | 性能脚本生成 + 对比算法 |
| `GateCliExportService` Gate CLI 封装 | CLI 参数解析 + 引擎调用 |
| `CiModeAdapterService` CI 模式适配 | 环境变量检测 + 输出格式转换 |
| `RefactorSafetyNetService` 突变测试集成 | Stryker/MutPy 集成逻辑 |
| `InteractiveDebugService` 断点管理 | 工具协议实现 |
| `PostMortemAnalysisService` 崩溃分析 | 解析算法 |
| `PlatformGateAlignmentService` 模板对齐 | prompt 工程，无复杂业务规则 |
| `TestDataFactoryService` Mock 数据生成 | Schema 解析 + 数据生成算法 |

---

## 8. 聚合交互图

```
                          ┌─────────────────────┐
                          │   PipelineDefinition │  ← 引擎层（REQ-020）
                          │  (PIPELINE_DEFS)     │
                          │  (GATE_OPERATIONS)   │
                          │  (GATE_AGENT_GUIDE)  │
                          └──────┬──────────────┘
                                 │ 注册流水线类型 + Gate 权限
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   CommandFlow   │   │  QualityGate    │   │  PlatformCmd    │
│  (REQ-008~013)  │   │  (REQ-007)      │   │  (REQ-014)      │
│                 │   │                 │   │                 │
│ /refactor       │   │ quality-gates   │   │ android/ios/    │
│ /hotfix         │   │ .yml 配置       │   │ flutter/expo/   │
│ /migrate        │   │ 门禁判定        │   │ taro Gate B     │
│ /evaluate       │   │ 阻断决策        │   │ 三分析补齐      │
│ /debug          │   └───────┬─────────┘   └─────────────────┘
│ /bug-fix(增强)  │           │
│ /jarvis-change  │           │ 消费测试报告做门禁判定
└────────┬────────┘           │
         │                    │
         │ spawn Agent        │
         ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TestExecutionPipeline (REQ-001~006)            │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │/test-unit│  │/test-    │  │/test-e2e │  │/test-perf│        │
│  │          │  │integration│ │          │  │          │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │              │              │              │              │
│       │     ┌────────┴────────┐     │              │              │
│       │     │ /test-security  │     │              │              │
│       │     └────────┬────────┘     │              │              │
│       │              │              │              │              │
│       └──────────────┼──────────────┼──────────────┘              │
│                      │              │                             │
│                      ▼              ▼                             │
│              ┌──────────────────────────┐                         │
│              │  TestDataFactory (REQ-006)│                         │
│              │  生成 mock / 脱敏数据     │                         │
│              └──────────────────────────┘                         │
│                                                                  │
│  产出: TestReport / CoverageReport / SecurityScanResult /        │
│        PerformanceBaseline                                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ 测试报告交付
                               ▼
                      ┌─────────────────┐
                      │   KnowledgeBase │  ← REQ-015 (API文档), REQ-018 (文档自动化)
                      │                 │
                      │  ApiDoc         │
                      │  DocSyncCheck   │
                      └────────┬────────┘
                               │
                               │ 发布阶段的文档一致性检查
                               ▼
                      ┌─────────────────┐
                      │    WebPanel     │  ← REQ-019
                      │                 │
                      │  Dashboard      │  ← SSE 实时同步
                      │  Commands       │
                      │  Archive        │
                      │  Agents         │
                      └─────────────────┘
```

**交互关键路径**:

1. **PipelineDefinition → CommandFlow**: 流水线类型注册后，CommandFlow 按类型加载 Gate 序列
2. **CommandFlow → TestExecutionPipeline**: 指令在 Gate C2 触发测试执行，spawn 测试 Agent
3. **TestExecutionPipeline → QualityGate**: 测试报告产出后，QualityGate 读取报告做门禁判定
4. **QualityGate → CommandFlow**: 门禁不通过时，CommandFlow 阻断流转或退回前一 Gate
5. **KnowledgeBase ↔ CommandFlow**: 发布阶段检查文档一致性，不一致阻断
6. **WebPanel → 全部聚合**: 通过 SSE（`gate:advanced` / `agent:event` / `session:changed`）实时展示

---

## 9. 文件所有权映射（关键共享区域）

### 9.1 引擎核心文件（高冲突风险）

| 文件 | 涉及 REQ | 写入方 | 风险 |
|------|---------|--------|------|
| `src/engine/gates.ts` | REQ-020, 007, 008~013 | PipelineDefinition + QualityGate + CommandFlow | **极高** — 多条流水线 Gate 定义集中在同一文件 |
| `src/engine/agent-registry.ts` | REQ-020, 021 | PipelineDefinition | 中 |
| `src/engine/db.ts` | REQ-020, 007 | PipelineDefinition + QualityGate | 高 — checkpoint 表 schema 变更 |

### 9.2 指令定义文件

| 文件 | 涉及 REQ | 写入方 |
|------|---------|--------|
| `.claude/commands/` 目录（新增 8-10 个文件） | REQ-008~013 | CommandFlow |
| `.claude/commands/android.md` | REQ-014 | PlatformCommand |
| `.claude/commands/ios.md` | REQ-014 | PlatformCommand |
| `.claude/commands/flutter.md` | REQ-014 | PlatformCommand |
| `.claude/commands/expo.md` | REQ-014 | PlatformCommand |
| `.claude/commands/taro.md` | REQ-014 | PlatformCommand |
| `.claude/commands/bug-fix.md` | REQ-013 | CommandFlow |

### 9.3 Web 面板

| 文件 | 涉及 REQ | 写入方 |
|------|---------|--------|
| `src/web/routes.ts` | REQ-019 | WebPanel |
| `src/web/views/pipeline.html` | REQ-019 | WebPanel |
| `src/web/views/agents.html` | REQ-019 | WebPanel |

### 9.4 Skills 文件

| 文件/目录 | 涉及 REQ | 写入方 |
|-----------|---------|--------|
| `.claude/skills/test-data-factory/` | REQ-006, 021 | TestExecutionPipeline |
| `.claude/skills/perf-testing/` | REQ-004, 021 | TestExecutionPipeline |
| `.claude/skills/security-testing/` | REQ-005, 021 | TestExecutionPipeline |
| `.claude/skills/refactoring/` | REQ-008, 021 | CommandFlow |
| `.claude/skills/debugging-deep/` | REQ-012, 021 | DebugSession |

### 9.5 配置文件

| 文件 | 涉及 REQ | 写入方 |
|------|---------|--------|
| `.jarvis/quality-gates.yml`（新增） | REQ-007 | QualityGate |

### 9.6 文档与流程图

| 目录 | 涉及 REQ | 写入方 |
|------|---------|--------|
| `docs/flows/`（新增 5+ 文件） | NFR-01, REQ-008~012 | CommandFlow |
| `docs/testing/` | REQ-001~005 | TestExecutionPipeline |

---

## 10. 循环依赖风险检查

| 潜在风险 | 风险等级 | 缓解措施 |
|---------|---------|---------|
| CommandFlow ↔ PipelineDefinition 双向依赖 | 中 | CommandFlow 只读 PipelineDefinition 的 Gate 定义，不写入 |
| TestExecutionPipeline ↔ QualityGate 双向依赖 | 中 | TestExecutionPipeline 产出报告后触发事件，QualityGate 只消费事件，不回调 |
| CommandFlow ↔ DebugSession 包含关系 | 低 | DebugSession 是 CommandFlow 子类型，天然单向 |
| KnowledgeBase ↔ TestExecutionPipeline | 低 | KnowledgeBase 仅在 Gate E 读取测试产物，时序上已有隔离 |
| PlatformCommand ↔ PipelineDefinition | 低 | PlatformCommand 只消费已有 Gate 序列，不写入 |

---

## 11. 版本兼容性约束

| 约束 | 来源 | 说明 |
|------|------|------|
| NFR-03: 已有指令行为不变 | 需求文档 | `/jarvis`, `/frontend`, `/backend`, `/jarvis-lite` 等现有指令不改变行为 |
| NFR-04: FSM 硬约束一致 | 需求文档 | 新 Gate 同样遵守拒绝回退/跳跃规则 |
| 引擎 API 向后兼容 | 代码事实 | `gate_check`, `advance_gate`, `gate_enforce` 等 MCP 工具接口不变 |
| Agent 注册格式不变 | 代码事实 | 新 Agent 遵循 `.md` frontmatter 格式 |

---

## 12. 推荐分配策略

按聚合边界和文件所有权，建议以下 Agent 分配:

| 聚合 | 推荐 Agent 加载 | 复杂度 | 策略 |
|------|----------------|--------|------|
| TestExecutionPipeline | `task-tdd` | 高 | TDD 模式，先写测试再实现 |
| QualityGate | `task-ddd` + `task-tdd` | 中 | DDD 建模配置格式 + TDD 门禁判定逻辑 |
| CommandFlow（5 条新指令） | `task-ddd` + `task-tdd` | 高 | DDD 建模新 Gate 序列 + TDD 关键安全逻辑 |
| PipelineDefinition | `task-tdd` | 中 | 纯注册逻辑，TDD 确保 FSM 正确 |
| PlatformCommand | 直接开发 | 中 | prompt 模板补全，无核心业务逻辑 |
| KnowledgeBase | `task-tdd` | 中 | TDD API 文档生成/校验逻辑 |
| WebPanel | 直接开发 | 中 | UI 适配，手动验证 |
| RefreshSession/DebugSession/HotfixSession | `task-ddd` + `task-tdd` | 高 | DDD 建模新聚合 + TDD 安全关键逻辑 |

---

## 13. 总结

本次需求覆盖 **21 个 REQ + 5 个 NFR**，涉及 **7 个聚合根**、**30+ 实体**、**14 个值对象**、**21 个领域服务**、**16 个领域事件**。

**推荐推进策略**:
1. **先稳固引擎层**（PipelineDefinition） — 所有其他聚合依赖
2. **再构建测试体系**（TestExecutionPipeline + QualityGate） — 新质量体系的基础设施
3. **然后注册新指令**（CommandFlow + 子聚合） — 使用已有的测试和门禁体系
4. **最后平台补齐和面板适配**（PlatformCommand + WebPanel + KnowledgeBase） — 锦上添花
