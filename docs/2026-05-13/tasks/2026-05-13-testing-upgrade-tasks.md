# TDD 任务包: 贾维斯测试体系化升级 & 新指令流程 & 全平台 Gate 适配

> 需求文档: `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md`
> DDD 分析: `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-ddd.md`
> BDD 场景: `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-bdd.md`
> 日期: 2026-05-13
> 版本: v1.0
> 策略: 垂直切片优先 + 风险优先

---

## 1. 需求盘点

### P0（必须现在就做 — 基础设施）

| REQ | 描述 | 聚合根 | 理由 |
|-----|------|--------|------|
| REQ-020 | 引擎与 CLI 更新 | PipelineDefinition | 所有其他 REQ 的依赖基础 |
| REQ-007 | 质量门禁配置文件 | QualityGate | 被 REQ-001~006 依赖 |

### P1（应该现在做 — 核心测试体系 + 新流程）

| REQ | 描述 | 聚合根 |
|-----|------|--------|
| REQ-001 | /test-unit 指令 | TestExecutionPipeline |
| REQ-002 | /test-integration 指令 | TestExecutionPipeline |
| REQ-003 | /test-e2e 指令 | TestExecutionPipeline |
| REQ-004 | /test-perf 指令 | TestExecutionPipeline |
| REQ-005 | /test-security 指令 | TestExecutionPipeline |
| REQ-006 | 测试数据管理 Skill | TestExecutionPipeline |
| REQ-008 | /refactor 指令 | CommandFlow (RefactorSession) |
| REQ-009 | /hotfix 指令 | CommandFlow (HotfixSession) |
| REQ-010 | /migrate 指令 | CommandFlow |
| REQ-011 | /evaluate 指令 | CommandFlow |
| REQ-012 | /debug 指令 | CommandFlow (DebugSession) |
| REQ-013 | /bug-fix 增强 | CommandFlow |
| REQ-021 | Skills 库扩展 (5 个新 Skill) | 跨聚合 |

### P2（可以稍后做 — 平台适配 + 优化）

| REQ | 描述 | 聚合根 |
|-----|------|--------|
| REQ-014 | 全平台 Gate B 补齐 | PlatformCommand |
| REQ-015 | API 文档维护增强 | KnowledgeBase |
| REQ-016 | 流水线深度优化 | CommandFlow |
| REQ-017 | CI/CD 流程整合 | PipelineDefinition |
| REQ-018 | 知识库/文档自动化 | KnowledgeBase |
| REQ-019 | Web 面板同步适配 | WebPanel |
| NFR-01 | 流程图同步更新 | 全部 |

---

## 2. 任务总览

| TASK-ID | REQ | 策略 | 聚合根 | 优先级 | 粒度 | 依赖 | 共享区域 |
|---------|-----|------|--------|--------|------|------|---------|
| TASK-001 | REQ-020 | TDD | PipelineDefinition | P0 | M | 无 | `src/engine/gates.ts` |
| TASK-002 | REQ-007 | TDD | QualityGate | P0 | M | TASK-001 | `src/engine/gates.ts`, `.jarvis/quality-gates.yml` |
| TASK-003 | REQ-001, REQ-007 | 非TDD | TestExecutionPipeline | P1 | M | TASK-002 | `.claude/commands/test-unit.md` |
| TASK-004 | REQ-002 | 非TDD | TestExecutionPipeline | P1 | M | TASK-001 | `.claude/commands/test-integration.md` |
| TASK-005 | REQ-003 | 非TDD | TestExecutionPipeline | P1 | M | TASK-001 | `.claude/commands/test-e2e.md` |
| TASK-006 | REQ-004, REQ-021 | 非TDD | TestExecutionPipeline | P1 | M | TASK-001 | `.claude/commands/test-perf.md`, `.claude/skills/perf-testing/` |
| TASK-007 | REQ-005, REQ-021 | 非TDD | TestExecutionPipeline | P1 | M | TASK-001 | `.claude/commands/test-security.md`, `.claude/skills/security-testing/` |
| TASK-008 | REQ-006, REQ-021 | 非TDD | TestExecutionPipeline | P1 | M | TASK-001 | `.claude/skills/test-data-factory/` |
| TASK-009 | REQ-008, REQ-021 | TDD | RefactorSession | P1 | L | TASK-001 | `.claude/commands/refactor.md`, `.claude/skills/refactoring/` |
| TASK-010 | REQ-009 | TDD | HotfixSession | P1 | M | TASK-001 | `.claude/commands/hotfix.md` |
| TASK-011 | REQ-010 | 非TDD | CommandFlow | P1 | M | TASK-001 | `.claude/commands/migrate.md` |
| TASK-012 | REQ-011 | 非TDD | CommandFlow | P1 | M | TASK-001 | `.claude/commands/evaluate.md` |
| TASK-013 | REQ-012, REQ-021 | TDD | DebugSession | P1 | L | TASK-001 | `.claude/commands/debug.md`, `.claude/skills/debugging-deep/` |
| TASK-014 | REQ-013 | 非TDD | CommandFlow | P1 | S | TASK-001 | `.claude/commands/bug-fix.md` |
| TASK-015 | REQ-014 | 非TDD | PlatformCommand | P2 | L | TASK-001 | `.claude/commands/android.md`, `ios.md`, `flutter.md`, `expo.md`, `taro.md` |
| TASK-016 | REQ-015 | 非TDD | KnowledgeBase | P2 | S | TASK-001 | `.claude/agents/api-contract-expert.md` |
| TASK-017 | REQ-016 | TDD | CommandFlow | P2 | M | TASK-001 | `.claude/agents/planner.md`, `.claude/commands/jarvis-change.md` |
| TASK-018 | REQ-017 | TDD | PipelineDefinition | P2 | M | TASK-001 | `src/engine/server.ts` |
| TASK-019 | REQ-018 | 非TDD | KnowledgeBase | P2 | M | TASK-001 | `.claude/commands/doc.md` |
| TASK-020 | REQ-019 | manual_only | WebPanel | P2 | L | TASK-001 | `src/web/routes.ts`, `src/web/views/pipeline.html`, `src/web/views/agents.html` |
| TASK-021 | NFR-01 | 非TDD | 全部 | P2 | L | TASK-003~019 | `docs/flows/*.md` (新增 10+ 文件) |

---

## 3. 每个 TASK 详情

---

### TASK-001: 引擎层流水线注册 (REQ-020)

- **REQ**: REQ-020
- **策略**: TDD
- **聚合根**: PipelineDefinition
- **优先级**: P0
- **预估变更行数**: ~180 行 (M)
- **风险等级**: **高** — `src/engine/gates.ts` 是核心共享文件，被所有后续任务依赖；FSM 硬约束变更
- **依赖**: 无
- **blockedBy**: []
- **阻塞**: TASK-002~TASK-021
- **共享区域**: `src/engine/gates.ts` (唯一写入方)

**实现范围**:

1. 在 `PIPELINE_DEFS` 中注册 5 条新流水线:
   ```
   refactor:  R1 → R2 → R3 → R4 → R5
   hotfix:    H0 → H1 → H2 → H3
   migrate:   M1 → M2 → M3 → M4
   evaluate:  E0 → E1 → E2 → E3
   debug:     D0 → D1 → D2 → D3 → D4
   ```

2. 在 `GATE_OPERATIONS` 中注册 22 个新 Gate 的操作权限矩阵（每个新 Gate 独立 allow/deny）

3. 在 `GATE_AGENT_GUIDE` 中注册新 Gate 的可生成 Agent 清单与指引

4. 在 `GATE_DIRS` 中注册新 Gate 的产物目录映射

5. 在 `GATE_CHECKS` 中注册新 Gate 的检查条件描述

6. 在 `MAX_RETRY` 中设置新 Gate 的最大重试次数

7. 在 `GATE_ENTRY_CONDITIONS` 中为新 Gate 添加入口条件

**TDD 测试用例 (RED 阶段)**:

| 测试方法 | 验证内容 |
|---------|---------|
| `getPipelineGates_refactor_returns5gates` | `getPipelineGates('refactor')` 返回 [R1,R2,R3,R4,R5] |
| `getPipelineGates_hotfix_returns4gates` | `getPipelineGates('hotfix')` 返回 [H0,H1,H2,H3] |
| `getPipelineGates_migrate_returns4gates` | `getPipelineGates('migrate')` 返回 [M1,M2,M3,M4] |
| `getPipelineGates_evaluate_returns4gates` | `getPipelineGates('evaluate')` 返回 [E0,E1,E2,E3] |
| `getPipelineGates_debug_returns5gates` | `getPipelineGates('debug')` 返回 [D0,D1,D2,D3,D4] |
| `getGateOperations_R1_allows_write_code` | Gate R1 的 `allow` 包含 `write_code` |
| `getGateOperations_R1_denies_deploy` | Gate R1 的 `deny` 包含 `deploy` |
| `getGateOperations_H0_allows_read_write_doc` | Gate H0 仅允许 `read`/`write_doc` |
| `getGateOperations_H0_denies_spawn_impl` | Gate H0 不允许 `spawn_impl` |
| `getGateOperations_H2_allows_deploy` | Gate H2 允许 `deploy` |
| `getGateOperations_M3_allows_build` | Gate M3 允许 `build` |
| `getGateOperations_E1_allows_spawn_impl` | Gate E1 允许 `spawn_impl` |
| `getGateOperations_D0_allows_read` | Gate D0 允许 `read` |
| `getGateAgentGuide_R1_can_spawn` | Gate R1 可生成 task-design / planner |
| `getGateAgentGuide_D2_can_spawn` | Gate D2 可生成调试相关 Agent |
| `existing_pipelines_unchanged` | `getPipelineGates('full')` 仍返回 12 个 Gate（NFR-03 兼容性） |
| `unknownPipeline_fallsBackToDefault` | `getPipelineGates('unknown')` 返回 full 流水线 |

**验收标准**:
- [ ] 5 条新流水线在 `PIPELINE_DEFS` 中正确注册
- [ ] 22 个新 Gate 的 `GATE_OPERATIONS` 矩阵完整
- [ ] `GATE_AGENT_GUIDE` 新 Gate 指引完整
- [ ] `GATE_DIRS` / `GATE_CHECKS` / `MAX_RETRY` / `GATE_ENTRY_CONDITIONS` 对新增 Gate 均有条目
- [ ] 已有 4 条流水线 (full/frontend/backend/lite) 行为不变 (NFR-03)
- [ ] 引擎 FSM 拒绝回退/跳跃的硬约束对新 Gate 同样生效 (NFR-04)
- [ ] 新增 .md 命令文件路径: `.claude/commands/test-unit.md`, `test-integration.md`, `test-e2e.md`, `test-perf.md`, `test-security.md`, `refactor.md`, `hotfix.md`, `migrate.md`, `evaluate.md`, `debug.md`（仅占位 frontmatter，完整 prompt 由后续 TASK 编写）

**实现 Agent**: `backend-architect` + `task-tdd`

**特别注意**:
- 这是**串行瓶颈**：所有后续 TASK 依赖此 TASK 完成
- 必须 TDD：先在 `gates.test.ts` 中写所有 RED 测试，再修改 gates.ts
- 新增 command .md 文件仅需最小 frontmatter (name/description/model)，详细 prompt 由后续 TASK 编写

---

### TASK-002: 质量门禁配置与引擎逻辑 (REQ-007)

- **REQ**: REQ-007
- **策略**: TDD
- **聚合根**: QualityGate
- **优先级**: P0
- **预估变更行数**: ~220 行 (L)
- **风险等级**: **高** — 涉及引擎核心文件 `gates.ts` (追加) + 引擎数据库 checkpoint schema 扩展；被 REQ-001~006 依赖
- **依赖**: TASK-001 (需要新 Gate 定义存在)
- **blockedBy**: [TASK-001]
- **阻塞**: TASK-003 (test-unit 需消费质量配置)
- **共享区域**: `src/engine/gates.ts` (在 TASK-001 基础上追加 GATE_CHECKS 细化), `.jarvis/quality-gates.yml` (新建，唯一写入方), `src/engine/db.ts` (checkpoints 表扩展)

**实现范围**:

1. 创建 `.jarvis/quality-gates.yml` 模板文件（包含默认阈值: 覆盖率≥80%, 单元测试通过率100%, 高危漏洞=0, Lint错误=0）

2. 引擎侧配置加载逻辑（新增文件 `src/engine/quality-gate.ts`）:
   - 读取并解析 YAML → QualityProfile 值对象
   - 校验项目自定义值不低于默认值 50%（恶意绕过防护）
   - YAML 解析失败时回退默认值并记录 FALLBACK
   - 文件缺失时使用内置 DEFAULT profile

3. `GATE_CHECKS` 细化: 更新 Gate C2/D 的 check 字段，引用 quality-gates.yml 具体阈值

4. 门禁判定服务 `QualityGateEvaluationService`:
   - 逐条件比对实际值 vs 阈值
   - on_violation=block → 阻断 + 记录 violations[]
   - on_violation=warn → 警告但不阻断
   - 多个 block 条件失败时全部收集后一次性报告

5. 数据库扩展: `checkpoints` 表增加 `violations` JSON 字段记录阻断原因

6. 引擎 checkpoints 记录 qualityProfileSource (DEFAULT/PROJECT/FALLBACK)

**TDD 测试用例 (RED 阶段)**:

| 测试方法 | 验证内容 |
|---------|---------|
| `loadConfig_validYaml_returnsProfile` | 合法 YAML 解析为 QualityProfile |
| `loadConfig_missingFile_returnsDefault` | 文件缺失时回退默认值（覆盖率≥80%） |
| `loadConfig_invalidYaml_fallbackDefault` | YAML 语法错误时回退默认值 + 记录错误 |
| `loadConfig_below50Percent_rejected` | 项目阈值 30% < 80%*50%，拒绝并回退默认 |
| `evaluate_lineCoverage_PASS_aboveThreshold` | 87% ≥ 80% → PASS |
| `evaluate_lineCoverage_BLOCK_belowThreshold` | 62% < 80% → BLOCK |
| `evaluate_lineCoverage_PASS_atThreshold` | 80% ≥ 80% → PASS (临界值) |
| `evaluate_securityHighVulns_BLOCK` | highVulns=2 > 0 → 强制 BLOCK |
| `evaluate_securityMediumVulns_WARN` | mediumVulns=3 > 0, on_violation=warn → WARN |
| `evaluate_compositeFailure_allReported` | 多个条件失败时 violations[] 包含全部 |
| `evaluate_allPass_returnsEmptyViolations` | 全通过时 violations=[] |
| `checkpoint_records_qualityProfileSource` | checkpoint 写入时 qualityProfileSource 正确 |

**验收标准**:
- [ ] `.jarvis/quality-gates.yml` 模板文件包含完整默认阈值
- [ ] 引擎在 Gate C2/D 读取配置并执行门禁判定
- [ ] 不达标时自动阻断并提示具体缺口 (含 violations[] 详情)
- [ ] 项目自定义阈值不可低于默认值 50%
- [ ] 配置异常时回退默认值且不阻塞流水线
- [ ] checkpoints 表记录 qualityProfileSource 和 violations

**实现 Agent**: `task-ddd` + `task-tdd`

**特别注意**:
- GATE_CHECKS 追加修改与 TASK-001 的 gates.ts 改动叠加，需在 TASK-001 完成后进行
- YAML 解析可使用 Node.js 内置（无需额外依赖）或使用 `js-yaml`
- 50% 硬约束需要明确文档化

---

### TASK-003: `/test-unit` 单元测试指令 (REQ-001)

- **REQ**: REQ-001, REQ-007
- **策略**: 非TDD（prompt 工程文件，通过集成验证）
- **聚合根**: TestExecutionPipeline
- **优先级**: P1
- **预估变更行数**: ~150 行 (M)
- **风险等级**: 中 — 测试框架自动检测逻辑复杂，需覆盖 Jest/Vitest/Mocha/Pytest
- **依赖**: TASK-002 (QualityGate 配置加载可用)
- **blockedBy**: [TASK-002]
- **阻塞**: TASK-009 (refactor 的 R2/R4 覆盖率对比依赖 /test-unit)
- **共享区域**: `.claude/commands/test-unit.md` (唯一写入方)

**实现范围**:

1. 编写 `.claude/commands/test-unit.md` 完整 prompt（仿 `backend.md` 模板风格）:
   - 自动检测项目测试框架 (Jest/Vitest/Mocha/Pytest)
   - 为新增/修改模块生成单元测试用例
   - 执行测试套件并生成覆盖率报告
   - 将覆盖率报告落盘到 `docs/testing/`

2. 集成 QualityGate: 读取 quality-gates.yml 阈值，覆盖率不达标时输出结构化阻断提示

3. Gate C2 流程集成: 在指令中包含 Gate C2 覆盖率报告检查步骤

4. 引擎会话注册: `pipeline_type: "full"`，在 Gate C2 阶段执行

**验收标准**:
- [ ] `/test-unit` 指令可被 Claude Code 识别并独立执行
- [ ] 自动检测项目测试框架（至少 Jest/Vitest）
- [ ] 覆盖率报告自动生成到 `docs/testing/` 目录
- [ ] 覆盖率 ≥ 80% 通过，< 80% 阻断并提示缺口详情
- [ ] 通过率 100% 要求明示
- [ ] prompt 遵循现有 command 模板风格 (NFR-02)

**实现 Agent**: `task-design` (prompt 工程)

**测试用例**: 非 TDD 任务，通过 `/test-unit` 指令在真实项目上执行验证

---

### TASK-004: `/test-integration` 集成测试指令 (REQ-002)

- **REQ**: REQ-002
- **策略**: 非TDD
- **聚合根**: TestExecutionPipeline
- **优先级**: P1
- **预估变更行数**: ~150 行 (M)
- **风险等级**: 中 — OpenAPI 解析和契约测试集成复杂
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/commands/test-integration.md` (唯一写入方)

**实现范围**:

1. 编写 `.claude/commands/test-integration.md` 完整 prompt
2. OpenAPI/Swagger spec 自动发现与解析
3. 基于 API 契约生成集成测试用例
4. ContractVerificationService: API 实现与契约一致性验证
5. 支持 Pact 契约测试集成（标注支持，非强制）
6. 测试报告包含请求/响应快照
7. `/backend` 流程集成说明（在 Gate C2 中插入集成测试步骤）

**验收标准**:
- [ ] `/test-integration` 指令可独立执行
- [ ] 自动解析 OpenAPI spec 生成测试用例
- [ ] 测试报告包含请求/响应快照
- [ ] prompt 包含 Pact 契约测试集成指引
- [ ] 与 `/backend` 流程 Gate C2 步骤对齐

**实现 Agent**: `task-design`

---

### TASK-005: `/test-e2e` 端到端测试指令 (REQ-003)

- **REQ**: REQ-003
- **策略**: 非TDD
- **聚合根**: TestExecutionPipeline
- **优先级**: P1
- **预估变更行数**: ~150 行 (M)
- **风险等级**: 中 — E2E 测试环境启动和 Playwright/Cypress 集成
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/commands/test-e2e.md` (唯一写入方)

**实现范围**:

1. 编写 `.claude/commands/test-e2e.md` 完整 prompt
2. 基于用户故事/关键路径自动生成 Playwright/Cypress 测试脚本
3. Gate C3（E2E 验证门禁）定义：在 Gate D 后、Gate E 前
4. 与 `/browser-test` 关系说明：互补策略，`/browser-test` 用于已有测试文档的浏览器手动测试，`/test-e2e` 用于自动生成和执行 E2E 脚本
5. 核心流程无回归保证

**验收标准**:
- [ ] `/test-e2e` 指令可独立执行
- [ ] 自动识别关键路径并生成测试脚本
- [ ] 与 `/browser-test` 互补而非重叠
- [ ] Gate C3 在指令中的定位清晰

**实现 Agent**: `task-design`

---

### TASK-006: `/test-perf` 性能测试指令 + perf-testing Skill (REQ-004, REQ-021)

- **REQ**: REQ-004, REQ-021 (perf-testing skill)
- **策略**: 非TDD
- **聚合根**: TestExecutionPipeline
- **优先级**: P1
- **预估变更行数**: ~200 行 (M) — 命令文件 ~100行 + SKILL.md ~100行
- **风险等级**: 中 — k6/Artillery 脚本生成和基线对比逻辑
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/commands/test-perf.md` + `.claude/skills/perf-testing/` (两个文件均为唯一写入方，互不冲突)

**实现范围**:

1. 编写 `.claude/commands/test-perf.md` 完整 prompt:
   - 支持 k6/Artillery 脚本生成与执行
   - API 端点或关键页面的基础负载测试
   - 对比基线并生成趋势报告
   - 可选门禁说明（性能敏感服务建议强制）

2. 创建 `.claude/skills/perf-testing/SKILL.md`:
   - 性能测试方法论 (负载模型、基线建立、趋势分析)
   - k6/Artillery 脚本模板
   - 报告模板 (吞吐量、延迟 p50/p95/p99、错误率)

**验收标准**:
- [ ] `/test-perf` 指令可独立执行
- [ ] `perf-testing` Skill 可被加载
- [ ] 报告包含吞吐量、延迟、错误率对比
- [ ] SKILL.md 含完整 frontmatter (name/description/model/effort)

**实现 Agent**: `task-design`

---

### TASK-007: `/test-security` 安全测试指令 + security-testing Skill (REQ-005, REQ-021)

- **REQ**: REQ-005, REQ-021 (security-testing skill)
- **策略**: 非TDD
- **聚合根**: TestExecutionPipeline
- **优先级**: P1
- **预估变更行数**: ~200 行 (M)
- **风险等级**: 中 — OWASP ZAP 集成和 DAST 动态扫描
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/commands/test-security.md` + `.claude/skills/security-testing/` (唯一写入方)

**实现范围**:

1. 编写 `.claude/commands/test-security.md` 完整 prompt:
   - 集成 OWASP ZAP 或类似自动化工具
   - 对运行中应用进行快速 DAST 扫描
   - 检测注入、XSS、CSRF 等运行时漏洞
   - 报告包含 OWASP Top 10 覆盖情况
   - 高危漏洞必须修复后方可推进

2. 创建 `.claude/skills/security-testing/SKILL.md`:
   - DAST 方法论 (OWASP ZAP 自动化模式)
   - 安全漏洞严重级别分类 (CRITICAL/HIGH/MEDIUM/LOW)
   - 扫描配置与报告模板

**验收标准**:
- [ ] `/test-security` 指令可独立执行
- [ ] `security-testing` Skill 可被加载
- [ ] 报告包含 OWASP Top 10 覆盖情况
- [ ] 高危漏洞必须修复后方可推进

**实现 Agent**: `task-design`

---

### TASK-008: `test-data-factory` Skill (REQ-006, REQ-021)

- **REQ**: REQ-006, REQ-021 (test-data-factory skill)
- **策略**: 非TDD
- **聚合根**: TestExecutionPipeline
- **优先级**: P1
- **预估变更行数**: ~120 行 (M)
- **风险等级**: 低 — 纯 Skill 文件，无引擎逻辑
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/skills/test-data-factory/SKILL.md` (唯一写入方)

**实现范围**:

1. 创建 `.claude/skills/test-data-factory/SKILL.md`:
   - 根据 JSON Schema / OpenAPI Schema 自动生成 mock 数据
   - 支持脱敏规则配置 (邮箱、手机号、身份证、密钥等)
   - 生成数据可重复（seed 机制）、安全
   - 集成到所有测试指令中（通过 Skill 加载机制）

2. 数据生成策略:
   - 合法数据生成（边界值: 空字符串、最大长度、Unicode）
   - 非法数据生成（注入攻击 payload、类型错误）
   - 脱敏规则：`mask_email`、`mask_phone`、`mask_idcard`、`redact_key`

**验收标准**:
- [ ] `test-data-factory` Skill 可被所有测试 Agent 加载
- [ ] 生成数据可重复 (seed)、安全 (脱敏)
- [ ] 支持 JSON Schema 和 OpenAPI Schema 输入
- [ ] SKILL.md 含完整 frontmatter

**实现 Agent**: `task-design`

---

### TASK-009: `/refactor` 重构指令 + refactoring Skill (REQ-008, REQ-021)

- **REQ**: REQ-008, REQ-021 (refactoring skill)
- **策略**: TDD — 行为漂移检测是高风险核心逻辑
- **聚合根**: RefactorSession (CommandFlow 子聚合)
- **优先级**: P1
- **预估变更行数**: ~280 行 (L)
- **风险等级**: **高** — 涉及覆盖率对比算法、突变测试集成；行为漂移判定直接影响代码质量安全
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/commands/refactor.md` + `.claude/skills/refactoring/SKILL.md` (唯一写入方)

**实现范围**:

1. 编写 `.claude/commands/refactor.md` 完整 prompt:
   - Gate 序列: R1 (定义重构边界与目标) → R2 (基线测试/覆盖率/突变测试) → R3 (执行重构) → R4 (对比覆盖率/断言/突变评分) → R5 (生成重构报告)
   - R2/R4 覆盖率对比差异 ≤ 阈值（默认 0%）
   - 突变测试集成说明 (Stryker/MutPy 工具检测)
   - 重构边界定义（仅重构内部实现，保持对外接口不变）

2. 创建 `.claude/skills/refactoring/SKILL.md`:
   - 重构安全网方法论 (红-绿-重构 + 突变测试)
   - 行为漂移检测策略 (覆盖率对比、断言快照 hash、突变评分对比)
   - 常见重构模式 (提取函数、消除 switch、简化条件、移除重复)

**TDD 测试用例 (RED 阶段)** — `RefactorSafetyNetService` 核心逻辑:

| 测试方法 | 验证内容 |
|---------|---------|
| `compare_coverage_identical_PASS` | R2 基线=92%, R4 重构后=92% → DRIFT_NOT_DETECTED |
| `compare_coverage_improved_PASS` | R2 基线=88%, R4 重构后=90% → DRIFT_NOT_DETECTED |
| `compare_coverage_regression_FAIL` | R2 基线=90%, R4 重构后=82% → DRIFT_DETECTED |
| `compare_lineCoverage_minus8Percent_FAIL` | lineCoverage 下降 8% → DRIFT_DETECTED |
| `compare_branchCoverage_minus14Percent_FAIL` | branchCoverage 下降 14% → 差异报告标记 |
| `compare_functionCoverage_minus5Percent_FAIL` | functionCoverage 下降 5% → DRIFT_DETECTED |
| `compare_newModule_zeroCoverage_FAIL` | 重构边界内新增模块 `retry-policy.ts` 0% 覆盖 → DRIFT_DETECTED_ZERO_COVERAGE_NEW_MODULE |
| `compare_assertionHash_mismatch_FAIL` | 关键断言快照 hash 不匹配 → DRIFT_DETECTED |
| `compare_mutationScore_improved_PASS` | mutationScore 75→78 (+3) → DRIFT_NOT_DETECTED |
| `compare_mutationScore_regression_FAIL` | mutationScore 75→65 (-10) → DRIFT_DETECTED |

**验收标准**:
- [ ] `/refactor` 指令可独立执行
- [ ] R1 重构边界定义阶段完整
- [ ] R2/R4 覆盖率对比逻辑正确（差异 ≤ 0% 通过）
- [ ] 行为漂移 > 0% 时阻断 R5
- [ ] 重构报告自动生成
- [ ] `refactoring` Skill 可被加载
- [ ] 红-绿-重构阶段的测试全部通过

**实现 Agent**: `task-ddd` + `task-tdd`

**特别注意**:
- 突变测试工具集成 (Stryker/MutPy) 标注为可选配置，实际执行由 Agent 按项目语言动态检测
- 行为漂移检测的断言快照 hash 算法需在 Skill 中明确定义

---

### TASK-010: `/hotfix` 热修复指令 (REQ-009)

- **REQ**: REQ-009
- **策略**: TDD — 审批链合规逻辑 + 事后强制回溯是硬约束
- **聚合根**: HotfixSession (CommandFlow 子聚合)
- **优先级**: P1
- **预估变更行数**: ~180 行 (M)
- **风险等级**: **高** — 涉及人工确认审批、绕过常规 Gate、合规审计链路
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/commands/hotfix.md` (唯一写入方)

**实现范围**:

1. 编写 `.claude/commands/hotfix.md` 完整 prompt:
   - Gate 序列: H0 (紧急声明 + 指定审批人 + 人工确认) → H1 (最小化修复，仅修复根因不重构) → H2 (快速验证 + 自动回滚预案) → H3 (事后强制回溯到 Gate E 完整审计和根因分析)
   - H0 审批支持 CLI/Webhook 人工确认渠道
   - 引擎记录完整紧急链路供合规审计

**TDD 测试用例 (RED 阶段)** — `HotfixApprovalService`:

| 测试方法 | 验证内容 |
|---------|---------|
| `create_emergency_declaration_critical` | 创建 severity=CRITICAL 紧急声明，记录 declaredBy/impactScope/declaredAt |
| `approval_approved_advances_to_H1` | 审批人确认 → HotfixApproved 事件 → 推进 H1 |
| `approval_rejected_blocks_advance` | 审批人拒绝 → FlowState stuckReason="HotfixRejected" |
| `approval_timeout_blocks_and_logs` | 30分钟超时 → ApprovalRecord=TIMEOUT → 引擎阻断 |
| `H3_cannot_be_skipped` | H3 阶段必须执行（合规审计硬约束），不可跳过 |
| `H2_rollback_plan_required` | H2 阶段必须产出回滚预案步骤 |
| `audit_trail_complete` | H0→H1→H2→H3 完整时间戳链路记录 |
| `H1_minimal_fix_only` | H1 阶段仅修复根因，禁止重构其他代码 |

**验收标准**:
- [ ] `/hotfix` 指令可独立执行
- [ ] H0 阶段支持 CLI/Webhook 人工确认
- [ ] 拒接/超时阻断推进并记录合规证据
- [ ] H3 不可跳过（合规审计硬约束）
- [ ] 引擎记录完整紧急链路（声明+审批+修复+回溯）
- [ ] H2 包含自动回滚预案

**实现 Agent**: `task-ddd` + `task-tdd`

---

### TASK-011: `/migrate` 迁移指令 (REQ-010)

- **REQ**: REQ-010
- **策略**: 非TDD
- **聚合根**: CommandFlow
- **优先级**: P1
- **预估变更行数**: ~130 行 (M)
- **风险等级**: 中 — 迁移规则执行和自动循环修复
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/commands/migrate.md` (唯一写入方)

**实现范围**:

1. 编写 `.claude/commands/migrate.md` 完整 prompt:
   - Gate 序列: M1 (验证迁移规则覆盖) → M2 (逐文件执行迁移) → M3 (编译/构建验证) → M4 (自动修复 Lint 错误)
   - 支持用户提供迁移脚本或规则文件
   - M3/M4 自动循环修复（最多 2 轮）

**验收标准**:
- [ ] `/migrate` 指令可独立执行
- [ ] 支持用户提供迁移脚本或规则文件
- [ ] M3/M4 自动循环修复流程完整 (≤2 轮)
- [ ] 失败文件记录与展示

**实现 Agent**: `task-design`

---

### TASK-012: `/evaluate` 评估指令 (REQ-011)

- **REQ**: REQ-011
- **策略**: 非TDD
- **聚合根**: CommandFlow
- **优先级**: P1
- **预估变更行数**: ~180 行 (M)
- **风险等级**: 中 — 隔离沙箱/分支执行、非破坏性保证
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/commands/evaluate.md` (唯一写入方)

**实现范围**:

1. 编写 `.claude/commands/evaluate.md` 完整 prompt:
   - Gate 序列: E0 (定义评估标准/用例/权重/成功标准) → E1 (隔离沙箱/独立分支生成快速原型) → E2 (运行用例收集指标) → E3 (生成评估报告)
   - 非破坏性保证 (不影响主工作区)
   - E0 校验不完整时拒绝推进（评估标准不完整提示）
   - 评估报告模板: 结论 + 关键差异 + 风险评估 + 建议
   - 平局结论处理 (无显著差异时的条件建议)

**验收标准**:
- [ ] `/evaluate` 指令可独立执行
- [ ] 运行在隔离的沙箱或独立分支上
- [ ] 非破坏性（不影响主工作区）
- [ ] 评估报告含结论 + 建议
- [ ] E0 不完整时拒绝推进并给出结构化提示

**实现 Agent**: `task-design`

**特别注意**: E0 阶段的 BDD 场景已在 `2026-05-13-testing-upgrade-bdd.md` 场景 5 中定义，实现时直接引用

---

### TASK-013: `/debug` 调试指令 + debugging-deep Skill (REQ-012, REQ-021)

- **REQ**: REQ-012, REQ-021 (debugging-deep skill)
- **策略**: TDD — 交互式调试协议 + Post-mortem 解析算法
- **聚合根**: DebugSession (CommandFlow 子聚合)
- **优先级**: P1
- **预估变更行数**: ~280 行 (L)
- **风险等级**: **高** — 涉及运行时进程附加、断点协议、core dump 解析
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/commands/debug.md` + `.claude/skills/debugging-deep/SKILL.md` (唯一写入方)

**实现范围**:

1. 编写 `.claude/commands/debug.md` 完整 prompt:
   - Gate 序列: D0 (收集日志/报错/环境快照) → D1 (自动生成最小复现用例) → D2 (插入智能日志/断点，启动调试会话) → D3 (交互式诊断: 继续执行/查看变量/求值表达式) → D4 (输出诊断报告: 根因+代码位置+建议修复方案，不自动修改代码)
   - Post-mortem 模式: 自动解析 core dump/崩溃日志/堆栈跟踪
   - 集成 `browser-use`/`agent-browser` 通过标准协议附加进程

2. 创建 `.claude/skills/debugging-deep/SKILL.md`:
   - 深度调试方法论 (交互式 + Post-mortem)
   - 最小复现用例构造策略
   - 断点管理协议
   - 崩溃转储分析技巧 (堆栈重构、线程状态、内存快照)

**TDD 测试用例 (RED 阶段)** — `PostMortemAnalysisService`:

| 测试方法 | 验证内容 |
|---------|---------|
| `parse_stack_trace_extracts_file_and_line` | 从堆栈中解析出 `src/services/payment.ts:142` |
| `parse_stack_trace_root_cause_identified` | 识别最可能的根因帧（排除框架层） |
| `generate_minimal_reproduction` | 从异常描述生成可执行的复现脚本 |
| `postmortem_crash_dump_analysis` | 从 core dump 解析内存快照和线程状态 |
| `diagnostic_report_not_auto_fix` | D4 报告包含修复建议但不自动修改代码 |

**验收标准**:
- [ ] `/debug` 指令可独立执行
- [ ] D3 阶段支持交互式断点调试
- [ ] 诊断报告与修复方案分离
- [ ] Post-mortem 模式支持离线分析
- [ ] `debugging-deep` Skill 可被加载

**实现 Agent**: `task-ddd` + `task-tdd`

---

### TASK-014: `/bug-fix` 增强 — 显式诊断 Gate (REQ-013)

- **REQ**: REQ-013
- **策略**: 非TDD（修改已有 prompt 文件）
- **聚合根**: CommandFlow
- **优先级**: P1
- **预估变更行数**: ~80 行 (S)
- **风险等级**: 低 — 修改已有文件，增量改动
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/commands/bug-fix.md` (唯一写入方)

**实现范围**:

1. 在 `.claude/commands/bug-fix.md` 中增加显式诊断 Gate:
   - 在现有步骤 1 (收集 Bug 信息) 和步骤 2 (浏览器复现) 之后增加步骤 1.5 "显式诊断阶段"
   - 复现后强制要求 Agent 调用调试工具获取运行时证据
   - 生成诊断报告后再进入修复流程
   - 选项: 若已有 `/debug` 指令可用，可先调用 `/debug` 再自动进入修复

2. 与 TASK-013 (`/debug`) 的协作说明:
   - 如果 `/debug` 指令已部署，`/bug-fix` 的诊断阶段可委托给 `/debug` 指令的 D0-D4 流程

**验收标准**:
- [ ] `/bug-fix` 流程包含显式诊断阶段
- [ ] 修复前必须有运行时证据支撑
- [ ] 不改变现有 bug-fix 指令的其他行为 (NFR-03)

**实现 Agent**: `task-design`

---

### TASK-015: 全平台移动端 Gate B 三分析补齐 (REQ-014)

- **REQ**: REQ-014
- **策略**: 非TDD（prompt 模板补全）
- **聚合根**: PlatformCommand
- **优先级**: P2
- **预估变更行数**: ~280 行 (L)
- **风险等级**: 中 — 修改 5 个平台 command 文件，需与 `/frontend`/`/backend` 对齐
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: 5 个独立 .md 文件，彼此无冲突

**实现范围**:

为以下 5 个平台 command 文件补齐 Gate B 三分析章节:
| 文件 | 当前状态 | 补齐内容 |
|------|---------|---------|
| `.claude/commands/android.md` | 提及 Gate B 序列但缺少详细流程 | Gate B-DDD: Android 领域模型产出模板 + Agent 路由 (task-ddd) / Gate B-BDD: 平台特定 BDD 场景模板 / Gate B-TDD: 平台特定 TDD 任务包模板 |
| `.claude/commands/ios.md` | 同上 | 同上 (iOS 平台) |
| `.claude/commands/flutter.md` | 同上 | 同上 (Flutter 平台) |
| `.claude/commands/expo.md` | 同上 | 同上 (Expo/React Native 平台) |
| `.claude/commands/taro.md` | 同上 | 同上 (Taro 跨端平台) |

每个平台的补齐章节包含:
1. **Gate B-DDD**: spawn task-design (DDD 模式) 的明确指令，产出平台特定的领域模型（聚合根/实体/值对象/领域服务），移动端任务可轻量化（单轮 DDD 分析）
2. **Gate B-BDD**: 高业务价值聚合行为的 Gherkin 场景编写指引，纯技术逻辑时可跳过
3. **Gate B-TDD**: 产出 TDD 任务包，每个 TASK 映射 REQ + 场景
4. Agent 路由表更新: 明确 task-design 在 Gate B 各子阶段的使用

**验收标准**:
- [ ] 5 个平台 command 文件均包含 Gate B 三分析
- [ ] 流程与 `/frontend`/`/backend` 对齐
- [ ] 移动端轻量化说明保留
- [ ] 不影响已有平台 Agent 行为 (NFR-03)
- [ ] 每个文件保持独立，不引入跨平台依赖

**实现 Agent**: `task-design` (可并行 spawn 5 个 task-design Agent 各负责一个平台)

**并行建议**: 5 个平台文件互不冲突，可完全并行编写

---

### TASK-016: API 文档维护增强 (REQ-015)

- **REQ**: REQ-015
- **策略**: 非TDD（修改已有 Agent 模板）
- **聚合根**: KnowledgeBase
- **优先级**: P2
- **预估变更行数**: ~60 行 (S)
- **风险等级**: 低 — 增量修改已有 agent 文件
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/agents/api-contract-expert.md` (唯一写入方)

**实现范围**:

在 `.claude/agents/api-contract-expert.md` 中增强:
1. OpenAPI/Swagger 自动生成职责（当前已部分覆盖）
2. 从代码注解/装饰器自动生成 OpenAPI spec 的详细指引（补充常见框架列表的生成命令）
3. 从 OpenAPI spec 生成 API 文档页面的指引
4. Gate E 发布阶段检查 API 文档与代码一致性的职责说明
5. 新增 `一致性状态` 输出字段

**验收标准**:
- [ ] `api-contract-expert` 支持 OpenAPI 生成与校验
- [ ] Gate E 中检查 API 文档一致性的职责明确
- [ ] 不改变已有行为模式

**实现 Agent**: `task-design`

---

### TASK-017: 流水线深度优化 + `/jarvis-change` 指令 (REQ-016)

- **REQ**: REQ-016
- **策略**: TDD — 风险评估模型和变更影响评估
- **聚合根**: CommandFlow
- **优先级**: P2
- **预估变更行数**: ~250 行 (L)
- **风险等级**: 中 — 涉及 planner Agent 模板修改 + 新指令定义 + 引擎配置
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/agents/planner.md` (修改), `.claude/commands/jarvis-change.md` (新建)

**实现范围**:

1. **动态粒度策略**: 修改 `.claude/agents/planner.md`，增加系统提示: 根据项目规模自动限制最大子任务数 (≤ 5)

2. **`/jarvis-change` 指令**: 创建 `.claude/commands/jarvis-change.md`:
   - 评估影响范围 (scope, affectedModules)
   - 决定回退或插入策略
   - 生成回滚计划 (rollbackPlan)

3. **风险评估模型**: 引擎阈值配置:
   - 小范围变更 (≤50 行) → 自动降低确认级别
   - 复杂风险操作 (支付/认证/数据迁移) → 强制人工确认
   - 在 `RiskAssessmentService` 中实现自动风险评级

**TDD 测试用例 (RED 阶段)**:

| 测试方法 | 验证内容 |
|---------|---------|
| `risk_assessment_small_change_low_risk` | ≤50 行变更 → 低风险，自动降级确认 |
| `risk_assessment_payment_change_high_risk` | 支付相关变更 → 高风险，强制人工确认 |
| `risk_assessment_auth_change_high_risk` | 认证相关变更 → 高风险 |
| `risk_assessment_data_migration_high_risk` | 数据迁移 → 高风险 |
| `change_impact_scope_evaluation` | 变更影响范围正确计算 affectedModules |
| `change_rollback_plan_generated` | /jarvis-change 产出回滚计划 |

**验收标准**:
- [ ] planner Agent 模板包含动态粒度说明
- [ ] `/jarvis-change` 指令工作流完整
- [ ] 风险评估模型在引擎中有对应阈值配置
- [ ] 跨会话上下文继承在 planner 中说明

**实现 Agent**: `task-ddd` + `task-tdd`

---

### TASK-018: CI/CD 流程整合 — Gate CLI 导出 + CI 模式 (REQ-017)

- **REQ**: REQ-017
- **策略**: TDD — Gate CLI 命令封装和 CI 模式适配逻辑
- **聚合根**: PipelineDefinition
- **优先级**: P2
- **预估变更行数**: ~180 行 (M)
- **风险等级**: **高** — 涉及引擎 server.ts 修改 (MCP 工具扩展) + CLI 入口
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `src/engine/server.ts` (与 TASK-001 的 MCP 工具定义文件同一文件，但由于 TASK-001 仅修改 gates.ts，不冲突)

**实现范围**:

1. **`jarvis gate-check <Gate>` CLI 命令**: 封装 gate_enforce 逻辑为独立 CLI 入口
   - 每个 Gate 可被 CI 脚本独立调用
   - 返回标准退出码 (0=通过, 1=阻断)
   - 输出 JSON 格式结果

2. **CI 模式环境变量**: `JARVIS_CI=true`
   - 跳过所有人工确认步骤 (H0 审批等)
   - 保留完整日志但不阻塞等待人工输入

3. **JUnit/xUnit 格式测试报告输出**: CI 模式下的报告格式转换
   - 从引擎 checkpoints 提取测试结果
   - 转换为 JUnit XML 格式

**TDD 测试用例 (RED 阶段)**:

| 测试方法 | 验证内容 |
|---------|---------|
| `gate_check_C2_artifacts_exist_returns_pass` | 产物存在时 `gate-check C2` 返回 0 + JSON |
| `gate_check_C2_no_artifacts_returns_block` | 无产物时返回 1 + 阻断原因 |
| `ci_mode_skips_human_confirmation` | JARVIS_CI=true 时 H0 审批自动跳过 |
| `ci_mode_outputs_junit_format` | CI 模式输出合法 JUnit XML |
| `junit_conversion_correct_test_count` | 测试结果正确转换为 JUnit 的 testcase 元素 |
| `junit_conversion_failure_based_on_violations` | violations 正确映射为 JUnit failure 元素 |

**验收标准**:
- [ ] `jarvis gate-check <Gate>` CLI 命令可被 CI 脚本调用
- [ ] CI 模式保留完整日志但不阻塞等待人工输入
- [ ] CI 模式输出 JUnit/xUnit 格式测试报告
- [ ] 标准退出码正确 (0=通过, 1=阻断)

**实现 Agent**: `task-tdd`

---

### TASK-019: `/doc` 文档自动化指令 (REQ-018)

- **REQ**: REQ-018
- **策略**: 非TDD
- **聚合根**: KnowledgeBase
- **优先级**: P2
- **预估变更行数**: ~150 行 (M)
- **风险等级**: 中 — 涉及 Gate E 文档同步检查
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `.claude/commands/doc.md` (新建)

**实现范围**:

1. 创建 `.claude/commands/doc.md`:
   - `/doc` 指令用于更新所有自动生成文档
   - Gate E 文档同步检查子步骤
   - `docs-engineer` Agent 增强说明 (自动对比代码变更与文档站)

2. Gate E 增强: 文档同步检查不通过时阻断发布

3. docs-engineer Agent 职责增强 (`.claude/agents/docs-engineer.md`)

**验收标准**:
- [ ] `/doc` 指令可独立执行
- [ ] Gate E 文档同步检查不通过时阻断发布
- [ ] docs-engineer 支持对比代码变更与文档站

**实现 Agent**: `task-design`

---

### TASK-020: Web 面板同步适配 (REQ-019)

- **REQ**: REQ-019
- **策略**: manual_only (UI 适配，需人工验证)
- **聚合根**: WebPanel
- **优先级**: P2
- **预估变更行数**: ~220 行 (L)
- **风险等级**: **高** — 修改 3 个 Web 文件；UI 变更需视觉验证
- **依赖**: TASK-001
- **blockedBy**: [TASK-001]
- **共享区域**: `src/web/routes.ts` + `src/web/views/pipeline.html` + `src/web/views/agents.html` (均为唯一写入方)

**实现范围**:

1. **`src/web/routes.ts`**:
   - `/api/commands` 接口的 `inferCategory` 函数更新: 支持识别新指令类型 (test/refactor/hotfix/migrate/evaluate/debug/doc)
   - `inferPipelineType` 函数更新: 支持识别新 pipeline 类型

2. **`src/web/views/pipeline.html`** (Dashboard):
   - 侧边栏导航增加新入口（如需要）
   - 新 Gate 序列在流水线视图中的可视化（新 Gate 图标/颜色）
   - 新 pipeline 类型筛选/展示
   - 平台筛选更新

3. **`src/web/views/agents.html`** (Agents 页面):
   - Agent 列表更新（新增的 agent 如需要）
   - 分类统计更新

**验收标准**:
- [ ] Web 面板 Dashboard 显示所有新增指令的流程状态
- [ ] Commands API 正确分类新指令
- [ ] 新 Gate 序列在流水线视图中有对应可视化
- [ ] Agent 页面更新 agent 列表
- [ ] SSE 实时同步对新流程类型正常工作

**实现 Agent**: `frontend-dev-expert` + `frontend-ui-expert`

**验证方式**: 启动 Web 面板后人工检查:
1. Dashboard 页面是否显示新 pipeline 类型
2. Commands API 返回是否包含所有新指令
3. 流水线视图是否渲染新 Gate 图标
4. Agent 页面是否显示完整 agent 列表

---

### TASK-021: 流程图文档同步更新 (NFR-01)

- **REQ**: NFR-01
- **策略**: 非TDD (文档工程)
- **聚合根**: 全部
- **优先级**: P2
- **预估变更行数**: ~350 行 (L)
- **风险等级**: 低
- **依赖**: TASK-003~019 (需要知道各指令的最终 Gate 序列)
- **blockedBy**: [TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013]
- **共享区域**: `docs/flows/` 目录 (新增 10+ 文件，每个独立)

**实现范围**:

新增以下流程图文档 (每个 ~30-50 行):

| 文件 | 对应指令 | 流程图内容 |
|------|---------|-----------|
| `docs/flows/test-unit.md` | REQ-001 | /test-unit Gate 序列 + 覆盖率门禁判断 |
| `docs/flows/test-integration.md` | REQ-002 | /test-integration OpenAPI 解析 → 测试生成 → 执行 → 报告 |
| `docs/flows/test-e2e.md` | REQ-003 | /test-e2e 关键路径识别 → 脚本生成 → 执行 |
| `docs/flows/test-perf.md` | REQ-004 | /test-perf k6/Artillery 脚本生成 → 负载测试 → 基线对比 |
| `docs/flows/test-security.md` | REQ-005 | /test-security OWASP ZAP 扫描 → 漏洞报告 |
| `docs/flows/refactor.md` | REQ-008 | R1→R2→R3→R4→R5 五阶段 + 行为漂移判断分支 |
| `docs/flows/hotfix.md` | REQ-009 | H0→H1→H2→H3 四阶段 + 审批判断分支 |
| `docs/flows/migrate.md` | REQ-010 | M1→M2→M3→M4 + M3/M4 循环 |
| `docs/flows/evaluate.md` | REQ-011 | E0→E1→E2→E3 + E0 校验判断分支 |
| `docs/flows/debug.md` | REQ-012 | D0→D1→D2→D3→D4 + 交互式/post-mortem 模式选择 |

同时检查现有流程图是否需要更新 (如 `docs/flows/bug-fix.md` 因 REQ-013 增强)

**验收标准**:
- [ ] 10 个新流程图文件完整
- [ ] 每个流程图覆盖对应指令的完整 Gate 序列
- [ ] 流程图风格与现有 `docs/flows/*.md` 一致
- [ ] 现有流程图必要时更新 (如 bug-fix.md)

**实现 Agent**: `task-design` (可 spawn 多个并行编写)

**并行建议**: 10 个文件互不冲突，可完全并行编写

---

## 4. DDD 分类

以下 TASK 标记为 DDD 模式（需先建模后实现）:

| TASK | 聚合根 | 理由 |
|------|--------|------|
| TASK-002 | QualityGate | 复杂业务规则 (阈值校验/合并/降级/FALLBACK)、不变条件 (50% 硬约束) |
| TASK-009 | RefactorSession | 复杂状态机 (R1→R5)、行为漂移检测算法、突变测试集成 |
| TASK-010 | HotfixSession | 审批链合规规则、状态转换复杂 (H0 人工确认→H1→H2→H3 强制回溯) |
| TASK-013 | DebugSession | 新聚合根、交互式协议设计、Post-mortem 解析算法 |

---

## 5. TDD 与 非TDD / manual_only 分类

### TDD 策略 (Red → Green → Refactor)

| TASK | 聚合根 | 核心测试对象 |
|------|--------|------------|
| TASK-001 | PipelineDefinition | 5 条新流水线 Gate 序列 + FSM 硬约束兼容性 |
| TASK-002 | QualityGate | QualityGateEvaluationService 门禁判定逻辑 (边界阈值/50%约束/降级/复合失败) |
| TASK-009 | RefactorSession | RefactorSafetyNetService 行为漂移检测 (覆盖率对比/断言hash/突变评分/零覆盖新模块) |
| TASK-010 | HotfixSession | HotfixApprovalService 审批链 (通过/拒绝/超时/H3不可跳过) |
| TASK-013 | DebugSession | PostMortemAnalysisService (堆栈解析/复现脚本生成) |
| TASK-017 | CommandFlow | RiskAssessmentService (变更风险评估/自动降级确认) |
| TASK-018 | PipelineDefinition | GateCliExportService + CiModeAdapterService (JUnit转换/CI模式跳过) |

### 非TDD (直接实现 — prompt/配置文件)

| TASK | 文件类型 |
|------|---------|
| TASK-003 | .claude/commands/test-unit.md |
| TASK-004 | .claude/commands/test-integration.md |
| TASK-005 | .claude/commands/test-e2e.md |
| TASK-006 | .claude/commands/test-perf.md + .claude/skills/perf-testing/SKILL.md |
| TASK-007 | .claude/commands/test-security.md + .claude/skills/security-testing/SKILL.md |
| TASK-008 | .claude/skills/test-data-factory/SKILL.md |
| TASK-011 | .claude/commands/migrate.md |
| TASK-012 | .claude/commands/evaluate.md |
| TASK-014 | .claude/commands/bug-fix.md |
| TASK-015 | 5 个平台 .claude/commands/*.md |
| TASK-016 | .claude/agents/api-contract-expert.md |
| TASK-019 | .claude/commands/doc.md |
| TASK-021 | 10+ docs/flows/*.md |

### manual_only (人工验证)

| TASK | 验证方式 |
|------|---------|
| TASK-020 | Web 面板 UI 人工视觉验证: 新 pipeline 类型在 Dashboard 显示、新 Gate 图标渲染、Commands API 返回正确 |

---

## 6. 风险任务汇总

| TASK | 风险等级 | 风险原因 | 缓解措施 |
|------|---------|---------|---------|
| TASK-001 | **高** | `gates.ts` 是核心共享文件 + 所有后续依赖 | TDD 先写测试，逐条验证 FSM；兼容性测试覆盖已有 4 条流水线 |
| TASK-002 | **高** | 引擎 checkpoint schema 变更 + 质量门禁判定逻辑 | TDD；默认阈值充分保守；FALLBACK 路径确保降级不阻塞 |
| TASK-009 | **高** | 行为漂移检测直接影响重构安全；突变测试集成 | TDD；断言 hash 算法明确定义；突变工具选择标注为可选 |
| TASK-010 | **高** | 审批链合规 + 绕过常规 Gate + H3 不可跳过硬约束 | TDD；审批超时阈值可配置；完整审计链路记录 |
| TASK-013 | **高** | 交互式调试协议 + Post-mortem 解析精度 | TDD；Post-mortem 解析算法分层测试；协议与 browser-use 对齐 |
| TASK-018 | **高** | 引擎 server.ts 修改 + CLI 入口 | TDD；JUnit 格式校验；CI 模式集成测试 |
| TASK-020 | **高** | Web 视图文件修改 + UI 视觉验证 | 增量修改；保留手动验证步骤 |

---

## 7. 文件所有权和共享路径

### 共享区域冲突检查

| 文件 | 写入方 | 冲突状态 |
|------|--------|---------|
| `src/engine/gates.ts` | TASK-001, TASK-002 (追加) | **串行**: TASK-002 必须在 TASK-001 完成后执行 |
| `src/engine/db.ts` | TASK-002 (checkpoints schema 扩展) | 唯一写入方，无冲突 |
| `src/engine/server.ts` | TASK-018 (MCP 工具扩展) | 唯一写入方，无冲突 |
| `src/web/routes.ts` | TASK-020 | 唯一写入方，无冲突 |
| `src/web/views/pipeline.html` | TASK-020 | 唯一写入方，无冲突 |
| `src/web/views/agents.html` | TASK-020 | 唯一写入方，无冲突 |
| `.jarvis/quality-gates.yml` | TASK-002 | 唯一写入方，无冲突 |
| `.claude/agents/planner.md` | TASK-017 | 唯一写入方，无冲突 |
| `.claude/agents/api-contract-expert.md` | TASK-016 | 唯一写入方，无冲突 |
| `.claude/commands/bug-fix.md` | TASK-014 | 唯一写入方，无冲突 |

**独立文件 (无冲突，可完全并行)**:
- 10 个新建命令 .md 文件
- 5 个新建 Skill 目录
- 10+ 个新建 flow 文档
- 5 个平台命令文件 (各独立)

### 需要串行化的唯一原因

`src/engine/gates.ts` 是唯一的跨任务共享区域: TASK-001 写入完整内容 → TASK-002 在此基础上追加质量门禁检查条件。没有其他文件需要跨任务串行。

---

## 8. 并行批次建议

### Batch 0: 引擎基础设施 (串行，不可并行)
```
TASK-001 (引擎流水线注册) → TASK-002 (质量门禁配置)
```
理由: gates.ts 是唯一共享区域；TASK-002 需要 TASK-001 的新 Gate 定义才能注册质量门禁条件。

预估变更: ~400 行
预估耗时: 2 个串行任务

---

### Batch 1: 测试体系并行 (8 个任务，全部并行)
```
TASK-003 /test-unit
TASK-004 /test-integration
TASK-005 /test-e2e
TASK-006 /test-perf + perf-testing skill
TASK-007 /test-security + security-testing skill
TASK-008 test-data-factory skill
TASK-009 /refactor + refactoring skill  ← 注意：TDD，独立文件
TASK-010 /hotfix                        ← 注意：TDD，独立文件
```
理由: 全部创建独立的 .md 文件和 Skill 目录，零共享区域冲突。仅 Batch 0 完成后即可全部并行启动。

预估变更: ~1,500 行
预估耗时: 1 个并行轮次

---

### Batch 2: 剩余流程指令并行 (5 个任务，全部并行)
```
TASK-011 /migrate
TASK-012 /evaluate
TASK-013 /debug + debugging-deep skill  ← TDD
TASK-014 /bug-fix 增强
TASK-017 流水线深度优化 + /jarvis-change ← TDD (修改 planner.md)
```
理由: 同 Batch 1，全部创建独立文件，零共享区域冲突。

预估变更: ~1,000 行
预估耗时: 1 个并行轮次

---

### Batch 3: 平台适配与工具链并行 (7 个任务，全部并行)
```
TASK-015 全平台 Gate B (5 平台 × 并行)
TASK-016 API 文档增强
TASK-018 CI/CD gate CLI              ← TDD (修改 server.ts)
TASK-019 /doc 指令
TASK-020 Web 面板                    ← manual_only
TASK-021 流程图同步                  ← 注意: 依赖 Batch 1/2 完成
```
理由:
- TASK-015 的 5 个文件可以各自并行（无跨平台依赖）
- TASK-018 修改 server.ts，与 TASK-020 修改 routes.ts 无冲突（不同文件）
- TASK-020 修改 web/views/ 文件，与 TASK-018 修改 server.ts 无冲突
- **TASK-021 需要 Batch 1/2 的指令 Gate 序列确定后才能编写流程图**，可部分尽早开始（对已完成的指令）

预估变更: ~1,500 行
预估耗时: 1 个并行轮次

---

### 并行可视化

```
Batch 0 (串行):
  [TASK-001] ──→ [TASK-002]

Batch 1 (并行，Batch 0 完成后启动):
  [TASK-003] [TASK-004] [TASK-005] [TASK-006] [TASK-007] [TASK-008] [TASK-009] [TASK-010]

Batch 2 (并行，Batch 0 完成后启动 → 可与 Batch 1 重叠):
  [TASK-011] [TASK-012] [TASK-013] [TASK-014] [TASK-017]

Batch 3 (并行，Batch 0 完成后启动 → 可与 Batch 1/2 重叠):
  [TASK-015×5] [TASK-016] [TASK-018] [TASK-019] [TASK-020] [TASK-021]
```

**关键观察**: Batch 1、2、3 可以完全重叠执行——只依赖 Batch 0 完成。唯一的例外是 TASK-021（流程图）依赖 Batch 1/2 中各指令的具体内容。

**总预估变更**: ~5,000 行 (21 个任务)

**理论最优执行时间**: 2 个串行轮次 + 1 个并行轮次 = 3 个时间单位

---

## 9. 推荐交付顺序

按 DDD 分析推荐的 4 层推进策略:

### 第 1 轮: 引擎层稳固 (P0, ~400 行)
```
TASK-001 引擎流水线注册 (REQ-020)
TASK-002 质量门禁引擎 (REQ-007)
```
**验证点**: 引擎 FSM 正确处理所有新 Gate；quality-gates.yml 加载/校验/门禁判定全部通过 TDD

### 第 2 轮: 测试体系 + 核心指令 (P1, ~2,500 行)
```
TASK-003~008 测试指令 + Skills (REQ-001~006, 021)
TASK-009 /refactor (REQ-008)
TASK-010 /hotfix (REQ-009)
TASK-011~013 其他新指令 (REQ-010~012)
TASK-014 /bug-fix 增强 (REQ-013)
```
**验证点**: 所有测试指令和核心流程指令可被 Claude Code 识别并执行

### 第 3 轮: 平台补齐 + 面板适配 (P2, ~1,500 行)
```
TASK-015 全平台 Gate B (REQ-014)
TASK-016 API 文档增强 (REQ-015)
TASK-017 流水线深度优化 (REQ-016)
TASK-018 CI/CD Gate CLI (REQ-017)
TASK-019 /doc 指令 (REQ-018)
TASK-020 Web 面板 (REQ-019)
TASK-021 流程图同步 (NFR-01)
```
**验证点**: 全平台 command 文件对齐；Web 面板可视化正确；CI 集成可用

---

## 10. REQ 追踪矩阵

| REQ | 覆盖 TASK | 覆盖状态 |
|-----|----------|---------|
| REQ-001 | TASK-003 | ✅ |
| REQ-002 | TASK-004 | ✅ |
| REQ-003 | TASK-005 | ✅ |
| REQ-004 | TASK-006 | ✅ |
| REQ-005 | TASK-007 | ✅ |
| REQ-006 | TASK-008 | ✅ |
| REQ-007 | TASK-002, TASK-003 | ✅ |
| REQ-008 | TASK-009 | ✅ |
| REQ-009 | TASK-010 | ✅ |
| REQ-010 | TASK-011 | ✅ |
| REQ-011 | TASK-012 | ✅ |
| REQ-012 | TASK-013 | ✅ |
| REQ-013 | TASK-014 | ✅ |
| REQ-014 | TASK-015 | ✅ |
| REQ-015 | TASK-016 | ✅ |
| REQ-016 | TASK-017 | ✅ |
| REQ-017 | TASK-018 | ✅ |
| REQ-018 | TASK-019 | ✅ |
| REQ-019 | TASK-020 | ✅ |
| REQ-020 | TASK-001 | ✅ |
| REQ-021 | TASK-006, TASK-007, TASK-008, TASK-009, TASK-013 | ✅ |
| NFR-01 | TASK-021 | ✅ |
| NFR-02 | 所有 command .md 任务 (TASK-003~019) | ✅ |
| NFR-03 | TASK-001 (兼容性测试), TASK-014 (不改变已有行为), TASK-015 (不影响已有 Agent) | ✅ |
| NFR-04 | TASK-001 (FSM 硬约束) | ✅ |
| NFR-05 | 依赖 `/jarvis` 全流程验证 | ✅ |

**覆盖率**: 21/21 REQ + 5/5 NFR = 100%

---

## 11. 推荐的下一步

1. **立即执行**: TASK-001 (引擎流水线注册) — 所有任务的串行瓶颈
2. **紧随其后**: TASK-002 (质量门禁) — 测试体系的基础设施
3. **并行启动**: Batch 1/2/3 的全部任务 (TASK-003~021)
4. **关注风险**: TASK-001/002/009/010/013/018/020 标记为高风险，需重点审查
5. **验证方式**: 所有 TDD 任务必须 Red→Green→Refactor 循环；所有非TDD 任务通过 `/jarvis` 流程验证

---

> **生成信息**: 由 task-design (TDD 模式) 在 2026-05-13 生成
> **输入**: REQ 需求文档 + DDD 领域分析 + BDD 场景文档
> **状态**: 待 planner 读取并制定执行计划
