# TDD 任务包 -- Jarvis-Agent-Factory 测试体系增强

> 需求文档：`docs/2026-05-13/requirements/REQ-test-system-enhancement.md`
> DDD 分析：`docs/2026-05-13/tasks/2026-05-13-test-systematization-ddd.md`
> BDD 分析：`docs/2026-05-13/tasks/2026-05-13-test-systematization-bdd.md`
> 生成日期：2026-05-13
> 任务包类型：TDD 任务编制（task-design TDD 模式）
> 总任务数：30 个

---

## 一、任务概览

| 组 | 任务 ID | 名称 | REQ 映射 | 类型 | 行数 | 优先级 |
|----|---------|------|---------|------|------|--------|
| 1-引擎 | TASK-ENGINE-001 | 新 Pipeline 类型 + Gate F | REQ-ENGINE-001, REQ-GATE-F-001 | TDD | L | P0 |
| 1-引擎 | TASK-ENGINE-002 | quality-gates.yml 配置加载 | REQ-ENGINE-002, REQ-TEST-007 | TDD | M | P0 |
| 1-引擎 | TASK-ENGINE-003 | 风险评分 API | REQ-ENHANCE-005 | TDD | M | P0 |
| 1-引擎 | TASK-ENGINE-004 | 引擎测试更新 | REQ-ENGINE-001, REQ-ENGINE-002 | TDD | M | P0 |
| 2-命令 | TASK-CMD-001 | /refactor 命令模板 | REQ-CMD-001 | 直接开发 | M | P1 |
| 2-命令 | TASK-CMD-002 | /hotfix 命令模板 | REQ-CMD-002 | 直接开发 | M | P1 |
| 2-命令 | TASK-CMD-003 | /migrate 命令模板 | REQ-CMD-003 | 直接开发 | M | P1 |
| 2-命令 | TASK-CMD-004 | /evaluate 命令模板 | REQ-CMD-004 | 直接开发 | S | P1 |
| 2-命令 | TASK-CMD-005 | /debug 命令模板 | REQ-CMD-005, REQ-ENHANCE-001 | 直接开发 | L | P1 |
| 2-命令 | TASK-CMD-006 | /doc 命令模板 | REQ-CMD-006 | 直接开发 | S | P1 |
| 2-命令 | TASK-CMD-007 | /jarvis-change 命令模板 | REQ-CMD-007 | 直接开发 | S | P1 |
| 2-命令 | TASK-CMD-008 | /test-unit 命令模板 | REQ-TEST-001 | 直接开发 | M | P1 |
| 2-命令 | TASK-CMD-009 | /test-integration 命令模板 | REQ-TEST-002 | 直接开发 | M | P1 |
| 2-命令 | TASK-CMD-010 | /test-e2e 命令模板 | REQ-TEST-003 | 直接开发 | M | P1 |
| 2-命令 | TASK-CMD-011 | /test-perf 命令模板 | REQ-TEST-004 | 直接开发 | M | P1 |
| 2-命令 | TASK-CMD-012 | /test-security 命令模板 | REQ-TEST-005 | 直接开发 | M | P1 |
| 2-命令 | TASK-CMD-013 | 移动端 Gate B 增强 (android/ios) | REQ-ENHANCE-002 | 直接开发 | M | P1 |
| 2-命令 | TASK-CMD-014 | 移动端 Gate B 增强 (flutter/expo/taro) | REQ-ENHANCE-002 | 直接开发 | M | P1 |
| 3-智能体 | TASK-AGENT-001 | Agent 角色增强 (api-contract + security) | REQ-AGENT-001, REQ-ENHANCE-003, REQ-API-001 | 直接开发 | M | P2 |
| 3-智能体 | TASK-AGENT-002 | Agent 角色增强 (perf-test + e2e-test) | REQ-AGENT-001, REQ-TEST-003, REQ-TEST-004 | 直接开发 | M | P2 |
| 3-智能体 | TASK-AGENT-003 | Agent 路由表更新 | REQ-AGENT-002 | 直接开发 | M | P2 |
| 3-智能体 | TASK-SKILL-001 | test-data-factory Skill | REQ-TEST-006, REQ-TEMPLATE-002 | 直接开发 | S | P2 |
| 3-智能体 | TASK-SKILL-002 | mutation-testing Skill | REQ-TEMPLATE-002 | 直接开发 | S | P2 |
| 4-Web | TASK-WEB-001 | Dashboard Gate 可视化更新 | REQ-WEB-001, REQ-GATE-F-001 | 直接开发 | M | P2 |
| 4-Web | TASK-WEB-002 | Commands 页面更新 | REQ-WEB-001 | 直接开发 | M | P2 |
| 4-Web | TASK-WEB-003 | 质量门禁配置页面 | REQ-WEB-001, REQ-TEST-007 | 直接开发 | S | P3 |
| 5-CLI | TASK-CLI-001 | gate-check CLI + CI 模式 | REQ-CLI-001, REQ-CI-001 | TDD | L | P2 |
| 6-文档 | TASK-DOCS-001 | 流程图 (11 新 + 5 更新) | REQ-DOCS-001 | 配置 | L | P3 |
| 6-文档 | TASK-DOCS-002 | AGENTS.md / README.md 同步 | REQ-DOCS-001 | 配置 | M | P3 |
| 6-文档 | TASK-DOCS-003 | quality-gates.yml 模板同步 | REQ-TEMPLATE-001 | 配置 | S | P3 |

---

## 二、第 1 组：引擎基础（P0 — 最先，其他所有任务依赖此）

### 2.1 共享区域冲突警告

| 文件 | 涉及任务 | 风险 |
|------|---------|------|
| `src/engine/gates.ts` | TASK-ENGINE-001, TASK-ENGINE-003, TASK-AGENT-003 | **极高** -- 必须串行修改，第 1 组完成后锁定 |
| `src/engine/server.ts` | TASK-ENGINE-001, TASK-ENGINE-002, TASK-ENGINE-003 | **高** -- 须串行修改，顺序 001 → 002 → 003 |
| `src/engine/db.ts` | TASK-ENGINE-002 | **中** -- 仅新增 quality_gate_results 表 |

**强制规则**：TASK-ENGINE-001 → TASK-ENGINE-002 → TASK-ENGINE-003 → TASK-ENGINE-004 严格串行执行，不可打乱。

---

### TASK-ENGINE-001：新 Pipeline 类型 + Gate F

| 属性 | 值 |
|------|-----|
| **任务 ID** | TASK-ENGINE-001 |
| **任务名称** | 新 Pipeline 类型定义 + Gate F 契约验证门禁 |
| **关联 REQ** | REQ-ENGINE-001, REQ-GATE-F-001 |
| **关联 BDD** | BDD-008A/B/C（契约验证）、BDD-005A（hotfix 流程） |
| **任务类型** | TDD |
| **优先级** | P0 |
| **预估变更行数** | L（~300 行） |
| **风险等级** | **高** -- 共享文件 `gates.ts` 是所有流程的核心 |
| **依赖** | 无（第 1 组最先执行） |
| **被依赖** | TASK-ENGINE-002, TASK-ENGINE-003, TASK-ENGINE-004, TASK-CMD-001~012, TASK-WEB-001, TASK-AGENT-003 |

#### 变更内容

**文件 1：`src/engine/gates.ts`（修改 ~200 行）**

1. **PIPELINE_DEFS 扩展**：新增 7 种流水线类型
   ```typescript
   refactor: { name: '安全重构', gates: ['Gate R1', 'Gate R2', 'Gate R3', 'Gate R4', 'Gate R5'] },
   hotfix: { name: '紧急热修复', gates: ['Gate H0', 'Gate H1', 'Gate H2', 'Gate H3'] },
   migrate: { name: '框架迁移', gates: ['Gate M1', 'Gate M2', 'Gate M3', 'Gate M4'] },
   evaluate: { name: '技术评估', gates: ['Gate E0', 'Gate E1', 'Gate E2', 'Gate E3'] },
   debug: { name: '调试诊断', gates: ['Gate D0', 'Gate D1', 'Gate D2', 'Gate D3', 'Gate D4'] },
   doc: { name: '文档同步', gates: ['Gate DOC1', 'Gate DOC2'] },
   test: { name: '独立测试', gates: ['Gate C2'] },
   ```

2. **full/frontend/backend 增加 Gate F**：在 Gate D 和 Gate E 之间插入 Gate F
   ```
   full: [..., 'Gate C2', 'Gate D', 'Gate F', 'Gate E']
   frontend: [..., 'Gate C2', 'Gate D', 'Gate F', 'Gate E']
   backend: [..., 'Gate C2', 'Gate D', 'Gate F', 'Gate E']
   ```

3. **GATE_DIRS 扩展**：新增 Gate F、R1-R5、H0-H3、M1-M4、E0-E3、D0-D4、DOC1-DOC2 的目录映射

4. **GATE_CHECKS 扩展**：18 个新 Gate 的检查条件
   - `Gate F`: 'API契约一致性验证通过，OpenAPI文档与实现一致'
   - `Gate R1`: '重构边界与目标已明确'
   - （其余略，按 REQ-CMD-001~007 定义）

5. **GATE_OPERATIONS 扩展**：18 个新 Gate 的操作权限白名单/黑名单

6. **GATE_AGENT_GUIDE 扩展**：18 个新 Gate 的可生成 Agent 列表
   - `Gate F`: `{ can_spawn: ['api-contract-expert'], note: '契约验证——验证API实现与OpenAPI文档一致性' }`

7. **MAX_RETRY 扩展**：18 个新 Gate 的最大重试次数

8. **GATE_ENTRY_CONDITIONS 扩展**：18 个新 Gate 的入口条件

**文件 2：`src/engine/server.ts`（修改 ~60 行）**

1. **session_join 白名单扩展**：从硬编码 `['full', 'frontend', 'backend', 'lite']` 改为 `Object.keys(PIPELINE_DEFS)` 动态获取

2. **import 更新**：确保 `PIPELINE_DEFS` 已导入用于白名单

**文件 3：`tests/gates.test.ts`（修改 ~60 行）**

1. 新增测试用例：验证 11 种 pipeline_type 的 Gate 序列长度和内容
2. 新增测试用例：验证 full 类型包含 Gate F 在 Gate D 和 Gate E 之间
3. 新增测试用例：验证 GATE_OPERATIONS/GATE_AGENT_GUIDE 新 Gate 条目

#### BDD 场景覆盖

| BDD | 验证方式 |
|-----|---------|
| BDD-008A（契约一致通过） | 单元测试：模拟 full pipeline，验证 Gate F 在 Gate D→E 之间 |
| BDD-008B（契约不一致阻断） | 单元测试：GATE_CHECKS['Gate F'] 包含阻断条件 |
| BDD-005A（hotfix 闭环） | 单元测试：hotfix pipeline gates = ['Gate H0', 'Gate H1', 'Gate H2', 'Gate H3'] |

#### 验证命令

```bash
# 类型检查
npx tsc --noEmit

# 运行引擎单元测试（Red → Green）
npx vitest run tests/gates.test.ts

# 验证 pipeline_type 白名单动态生成
node -e "
  const { PIPELINE_DEFS } = require('./dist/src/engine/gates.js');
  console.log('Pipeline types:', Object.keys(PIPELINE_DEFS));
  const defs = PIPELINE_DEFS['full'];
  const dIdx = defs.gates.indexOf('Gate D');
  const eIdx = defs.gates.indexOf('Gate E');
  const fIdx = defs.gates.indexOf('Gate F');
  console.log('Gate F position:', fIdx, '(between D=' + dIdx + ' and E=' + eIdx + ')');
  console.assert(fIdx === dIdx + 1, 'Gate F must be immediately after Gate D');
  console.assert(eIdx === fIdx + 1, 'Gate E must be immediately after Gate F');
"
```

#### 验收标准

- [ ] PIPELINE_DEFS 包含 11 种流水线类型（原有 4 + 新增 7）
- [ ] full/frontend/backend 的 Gate 序列在 Gate D 和 Gate E 之间包含 Gate F
- [ ] GATE_CHECKS/GATE_OPERATIONS/GATE_AGENT_GUIDE 覆盖所有新 Gate
- [ ] session_join 白名单从 PIPELINE_DEFS keys 动态生成
- [ ] 所有现有测试通过，新增测试覆盖新 pipeline 类型
- [ ] TypeScript 编译零错误

---

### TASK-ENGINE-002：quality-gates.yml 配置加载

| 属性 | 值 |
|------|-----|
| **任务 ID** | TASK-ENGINE-002 |
| **任务名称** | quality-gates.yml 配置加载 + quality_gate_results 表 + MCP 工具 |
| **关联 REQ** | REQ-ENGINE-002, REQ-TEST-007 |
| **关联 BDD** | BDD-001A/B/C/D（质量门禁评估） |
| **任务类型** | TDD |
| **优先级** | P0 |
| **预估变更行数** | M（~180 行） |
| **风险等级** | **中** -- 新增数据库表，需 SQLite 迁移 |
| **依赖** | TASK-ENGINE-001（需要 PIPELINE_DEFS 扩展） |
| **被依赖** | TASK-ENGINE-003, TASK-WEB-003, TASK-CLI-001 |

#### 变更内容

**文件 1：`src/engine/db.ts`（修改 ~40 行）**

1. 新增 `quality_gate_results` 表（含 CHECK 约束 rule_type IN ('coverage','lint','build','deps','perf','security','contract')）
2. 新增查询函数：
   - `insertQualityGateResult(db, params)` -- 写入检查结果
   - `getQualityGateResults(db, runId, gate?)` -- 查询指定 run/gate 的结果

**文件 2：`src/engine/server.ts`（修改 ~80 行）**

1. 新增 MCP 工具 `quality_gates`：
   - 输入：`run_id`（可选）、`gate`（可选）
   - 输出：当前质量策略配置 + 历史检查结果
2. 新增 REST API 端点 `/api/quality-gates`（GET）
3. 引擎启动时从项目根目录加载 `quality-gates.yml`（若不存在则使用 `src/templates/quality-gates.yml` 作为默认）

**文件 3：新增 `src/templates/quality-gates.yml`（~40 行）**

默认质量门禁配置模板，包含：
- 覆盖率阈值（lines: 80%, branches: 70%, functions: 80%）
- Lint 规则（0 errors）
- Build 规则（必须通过）
- Deps Audit 规则（无 CRITICAL CVE）
- Perf 规则（p95 < 500ms，可选）
- Security 规则（DAST 扫描无 HIGH 发现，可选）
- Contract 规则（严格模式 strict）

**文件 4：`tests/server.test.ts`（新增，~40 行）**

测试 quality_gates MCP 工具和 API 端点

#### BDD 场景覆盖

| BDD | 验证方式 |
|-----|---------|
| BDD-001A（覆盖率达标通过） | TDD：模拟配置文件 + 覆盖率报告，断言 quality_gates 返回 passed |
| BDD-001B（覆盖率不达标阻断） | TDD：阈值 80%，实际 65%，断言 blocked |
| BDD-001C（多规则部分通过） | TDD：2 条规则，1 通过 1 失败，断言汇总结果 |
| BDD-001D（规则禁用跳过） | TDD：security enabled=false，断言跳过该规则检查 |

#### 验证命令

```bash
# 运行 quality_gates 相关测试
npx vitest run tests/server.test.ts -t "quality_gates"

# 类型检查
npx tsc --noEmit

# 验证数据库表创建
node -e "
  const { openDb } = require('./dist/src/engine/db.js');
  const db = openDb(':memory:');
  const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all();
  console.log('Tables:', tables.map(t => t.name));
  console.assert(tables.some(t => t.name === 'quality_gate_results'), 'quality_gate_results table must exist');
"
```

#### 验收标准

- [ ] `quality_gate_results` 表已创建，含 CHECK 约束
- [ ] MCP 工具 `quality_gates` 可查询配置和历史结果
- [ ] API 端点 `/api/quality-gates` 返回 JSON
- [ ] 引擎启动时自动加载 `quality-gates.yml`
- [ ] 项目级 `quality-gates.yml` 覆盖默认配置
- [ ] 所有新增测试通过（Red → Green → Refactor）

---

### TASK-ENGINE-003：风险评分 API

| 属性 | 值 |
|------|-----|
| **任务 ID** | TASK-ENGINE-003 |
| **任务名称** | 变更影响评分 + 静默通过机制 |
| **关联 REQ** | REQ-ENHANCE-005 |
| **关联 BDD** | BDD-009A/B/C/D（智能风险跳过） |
| **任务类型** | TDD |
| **优先级** | P0 |
| **预估变更行数** | M（~150 行） |
| **风险等级** | **中** -- 涉及 gates.ts 和 server.ts 共享区 |
| **依赖** | TASK-ENGINE-002（需要 quality-gates.yml 配置） |
| **被依赖** | TASK-CLI-001（CI 模式需读取 risk_level） |

#### 变更内容

**文件 1：`src/engine/gates.ts`（修改 ~30 行）**

新增导出的风险评估常量和函数：
```typescript
export const RISK_WEIGHTS = { files: 0.3, lines: 0.4, criticality: 0.3 };
export const RISK_THRESHOLDS = { low: 3.0, medium: 7.0 };
export const MODULE_CRITICALITY: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {};
export function calculateRiskLevel(params: { fileCount: number; lineCount: number; modulePaths: string[] }): { level: string; score: number; shouldSkip: boolean };
```

**文件 2：`src/engine/server.ts`（修改 ~60 行）**

1. 新增 MCP 工具 `risk_assess`：
   - 输入：`file_count`, `line_count`, `module_paths`
   - 输出：`risk_level`, `score`, `should_skip`（是否静默通过）
2. 在 `gate_check` 和 `advance_gate` 中集成风险评分
3. 低风险变更自动静默通过（在日志中记录 "风险级别 low，静默通过"）

**文件 3：`tests/gates.test.ts`（修改 ~40 行）**

新增测试套件 `calculateRiskLevel`：
- 1 文件 / 15 行 / low 模块 → risk_level = 'low' → shouldSkip = true
- 12 文件 / 500 行 / high 模块 → risk_level = 'high' → shouldSkip = false
- 4 文件 / 200 行 / medium 模块 → risk_level = 'medium' → shouldSkip = false
- 1 文件 / 3 行 / critical 模块 → risk_level = 'medium' → shouldSkip = false

#### BDD 场景覆盖

| BDD 场景 | 测试用例 |
|---------|---------|
| BDD-009A（低风险静默通过） | 1 文件 15 行 low → shouldSkip=true |
| BDD-009B（高风险强制确认） | 12 文件 520 行 high → shouldSkip=false |
| BDD-009C（中等风险请求确认） | 4 文件 200 行 medium → shouldSkip=false |
| BDD-009D（配置变更关键度判断） | 1 文件 3 行 critical → shouldSkip=false |

#### 验证命令

```bash
# 运行风险评分测试
npx vitest run tests/gates.test.ts -t "calculateRiskLevel"

# 类型检查
npx tsc --noEmit
```

#### 验收标准

- [ ] `calculateRiskLevel()` 函数及测试覆盖所有 4 个 BDD 场景
- [ ] MCP 工具 `risk_assess` 返回风险等级和是否静默通过
- [ ] `gate_check` 集成风险评分（低风险不阻断）
- [ ] 高风险变更在 Dashboard 显示 "等待人工确认"
- [ ] 模块关键度映射表可配置

---

### TASK-ENGINE-004：引擎测试更新

| 属性 | 值 |
|------|-----|
| **任务 ID** | TASK-ENGINE-004 |
| **任务名称** | 引擎现有测试更新与回归验证 |
| **关联 REQ** | REQ-ENGINE-001, REQ-ENGINE-002, REQ-ENHANCE-005 |
| **任务类型** | TDD |
| **优先级** | P0 |
| **预估变更行数** | M（~120 行） |
| **风险等级** | **中** -- 需要更新多项测试用例的预期值 |
| **依赖** | TASK-ENGINE-001, TASK-ENGINE-002, TASK-ENGINE-003 |
| **被依赖** | 所有后续组（作为第 1 组的收尾验证） |

#### 变更内容

**文件 1：`tests/gates.test.ts`（修改 ~40 行）**

更新现有测试用例：
- `getPipelineGates('full')` 的预期长度从 12 改为 13（新增 Gate F）
- `getPipelineGates('frontend')` 预期长度更新
- `getPipelineGates('backend')` 预期长度更新
- 新增 `getPipelineGates` 对所有 11 种类型的覆盖测试

**文件 2：`tests/server.test.ts`（修改 ~60 行，若无则新增）**

- 测试 `session_join` 接受所有新 pipeline_type
- 测试 `pipeline_status` 返回 Gate F 在正确位置
- 测试 `quality_gates` 工具
- 测试 `risk_assess` 工具

**文件 3：`tests/db.test.ts`（修改 ~20 行，若无则新增）**

- 测试 `quality_gate_results` 表的 CRUD 操作

#### 验证命令

```bash
# 运行全量引擎测试
npx vitest run tests/

# 类型检查
npx tsc --noEmit

# 确保无回归
npx vitest run --reporter=verbose
```

#### 验收标准

- [ ] 所有现有测试通过（无回归）
- [ ] 新增测试覆盖全部新 MCP 工具和 API 端点
- [ ] full/frontend/backend pipeline 测试验证 Gate F 位置
- [ ] 数据库表 `quality_gate_results` CRUD 测试通过

---

## 三、第 2 组：命令模板（P1 — 与第 1 组有依赖，组内可并行）

### 3.1 并行机会

TASK-CMD-001 ~ TASK-CMD-012 全部修改**不同文件**，无共享区域冲突，可全并行执行。

### 3.2 命令模板通用验收标准

所有命令模板必须：
- [ ] 位于 `src/templates/platforms/claude/commands/<name>.md`
- [ ] 含 YAML frontmatter（description, argument-hint）
- [ ] 含技能加载指令（behavioral-guidelines + 场景技能）
- [ ] 含 session_join 调用（pipeline_type 对应新类型）
- [ ] 含完整 Agent 路由表
- [ ] 含 Gate 流程说明
- [ ] 在 Commands 页面可见（TASK-WEB-002 后验证）

---

### TASK-CMD-001：/refactor 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-CMD-001 |
| **关联 BDD** | BDD-006A/B/C（重构安全网） |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~120 行） |
| **依赖** | TASK-ENGINE-001（需要 refactor pipeline_type） |

**变更文件**：新增 `src/templates/platforms/claude/commands/refactor.md`

**模板关键内容**：
- 5 道 Gate 流程：R1（定义边界）→ R2（基线覆盖率）→ R3（执行重构）→ R4（对比验证+变异测试）→ R5（生成报告）
- Agent 路由表：code-explore-expert, task-design, frontend-dev-expert, backend-dev-expert, remediation-expert
- 变异测试集成（Stryker/pytest-mutmut）
- 严禁行为漂移规则

**验证命令**：
```bash
# 检查 frontmatter 格式
node -e "const fm = require('gray-matter'); const c = fm.read('src/templates/platforms/claude/commands/refactor.md'); console.log(c.data);"
```

---

### TASK-CMD-002：/hotfix 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-CMD-002 |
| **关联 BDD** | BDD-005A/B/C（热修复闭环） |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~110 行） |
| **依赖** | TASK-ENGINE-001（需要 hotfix pipeline_type） |

**变更文件**：新增 `src/templates/platforms/claude/commands/hotfix.md`

**模板关键内容**：
- 4 道 Gate 流程：H0（紧急声明+审批）→ H1（最小化修复）→ H2（快速验证+回滚预案）→ H3（事后强制回溯审计）
- 绕过常规 Gate A/B，事后补齐合规
- 紧急声明模板（故障描述、影响范围、严重级别 P0/P1/P2、审批人）
- 权限控制（hotfix 需要审批人角色）

---

### TASK-CMD-003：/migrate 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-CMD-003 |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~100 行） |
| **依赖** | TASK-ENGINE-001（需要 migrate pipeline_type） |

**变更文件**：新增 `src/templates/platforms/claude/commands/migrate.md`

**模板关键内容**：
- 4 道 Gate 流程：M1（验证迁移规则覆盖率）→ M2（逐文件应用迁移）→ M3（编译验证）→ M4（自动修复 Lint）
- 迁移规则文件格式定义（pattern + replacement + file_glob）
- 逐文件执行与回滚能力

---

### TASK-CMD-004：/evaluate 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-CMD-004 |
| **任务类型** | 直接开发 |
| **预估变更行数** | S（~80 行） |
| **依赖** | TASK-ENGINE-001（需要 evaluate pipeline_type） |

**变更文件**：新增 `src/templates/platforms/claude/commands/evaluate.md`

**模板关键内容**：
- 4 道 Gate 流程：E0（定义评估标准）→ E1（生成原型）→ E2（运行用例收集指标）→ E3（生成评估报告）
- 评估标准模板（性能/兼容性/维护性/安全性维度）
- 支持隔离分支执行

---

### TASK-CMD-005：/debug 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-CMD-005, REQ-ENHANCE-001 |
| **关联 BDD** | BDD-004A/B/C（调试诊断） |
| **任务类型** | 直接开发 |
| **预估变更行数** | L（~200 行）-- 含 post-mortem 子模式，标注为风险任务 |
| **风险说明** | L 粒度：debug 命令含标准模式 + post-mortem 子模式 + bug-fix 联动，功能复杂。不拆分因两种模式共享 Gate 序列和诊断报告模板 |
| **依赖** | TASK-ENGINE-001（需要 debug pipeline_type） |

**变更文件**：新增 `src/templates/platforms/claude/commands/debug.md`

**模板关键内容**：
- 5 道 Gate 流程：D0（收集异常信息+环境快照）→ D1（生成最小复现用例）→ D2（启动调试会话）→ D3（交互式诊断）→ D4（输出诊断报告，不自动修改代码）
- Post-mortem 子模式（`/debug --post-mortem <crash-log-path>`）
- 诊断报告模板（根因、代码位置、置信度、建议修复方案、证据列表）
- 与 `/bug-fix` 指令联动说明
- Agent 路由表：code-explore-expert, browser-test-expert（agent-browser 调试协议集成）

---

### TASK-CMD-006：/doc 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-CMD-006 |
| **任务类型** | 直接开发 |
| **预估变更行数** | S（~70 行） |
| **依赖** | TASK-ENGINE-001（需要 doc pipeline_type） |

**变更文件**：新增 `src/templates/platforms/claude/commands/doc.md`

**模板关键内容**：
- 2 道 Gate 流程：DOC1（扫描代码变更+对比文档站）→ DOC2（自动更新过时文档）
- 在 Gate E 中集成文档同步检查子步骤
- Agent 路由：docs-engineer, docs-research-expert

---

### TASK-CMD-007：/jarvis-change 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-CMD-007 |
| **任务类型** | 直接开发 |
| **预估变更行数** | S（~70 行） |
| **依赖** | TASK-ENGINE-001（需要 pipeline 能力） |

**变更文件**：新增 `src/templates/platforms/claude/commands/jarvis-change.md`

**模板关键内容**：
- 中途变更管理流程：评估影响范围 → 决定回退到 Gate A 或作为新子任务插入
- 影响范围评估矩阵（文件数、Gate 位置、依赖关系）

---

### TASK-CMD-008：/test-unit 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-TEST-001 |
| **关联 BDD** | BDD-002A/B/C/D（测试自动生成） |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~100 行） |
| **依赖** | TASK-ENGINE-001（需要 test pipeline_type） |

**变更文件**：新增 `src/templates/platforms/claude/commands/test-unit.md`

**模板关键内容**：
- 测试框架自动检测逻辑（jest.config.ts / vitest.config.ts / pytest.ini）
- 测试生成策略（根据源码函数签名生成 describe/it 块）
- 覆盖率阈值检查（行/分支/函数）
- Agent 路由：test-doc-writer, test-executor, frontend-test-expert, backend-test-expert

---

### TASK-CMD-009：/test-integration 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-TEST-002 |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~100 行） |
| **依赖** | TASK-ENGINE-001（需要 test pipeline_type） |

**变更文件**：新增 `src/templates/platforms/claude/commands/test-integration.md`

**模板关键内容**：
- OpenAPI/Swagger 文档解析生成测试用例
- 测试环境启动与销毁流程
- 契约测试（Pact）集成
- Agent 路由：api-test-expert, api-contract-expert, backend-test-expert

---

### TASK-CMD-010：/test-e2e 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-TEST-003 |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~100 行） |
| **依赖** | TASK-ENGINE-001（需要 test pipeline_type） |

**变更文件**：新增 `src/templates/platforms/claude/commands/test-e2e.md`

**模板关键内容**：
- 基于用户故事自动生成 Playwright 测试
- E2E 测试作为 Gate C2 步骤 3
- Agent 路由：e2e-test-expert, browser-test-expert

---

### TASK-CMD-011：/test-perf 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-TEST-004 |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~100 行） |
| **依赖** | TASK-ENGINE-001（需要 test pipeline_type） |

**变更文件**：新增 `src/templates/platforms/claude/commands/test-perf.md`

**模板关键内容**：
- k6 脚本自动生成（针对 API 端点）
- 性能基线对比（p50/p95/p99/吞吐量）
- 可选门禁（性能敏感服务强制）
- Agent 路由：perf-test-expert

---

### TASK-CMD-012：/test-security 命令模板

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-TEST-005 |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~100 行） |
| **依赖** | TASK-ENGINE-001（需要 test pipeline_type） |

**变更文件**：新增 `src/templates/platforms/claude/commands/test-security.md`

**模板关键内容**：
- OWASP ZAP 自动化扫描集成
- 安全发现分类（high/medium/low/info）
- 与 Gate D 安全审计的关系说明
- Agent 路由：security-review-expert

---

### TASK-CMD-013：移动端 Gate B 增强 (android + ios)

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-ENHANCE-002 |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~120 行，2 个文件各 ~60 行） |
| **依赖** | TASK-ENGINE-001 |

**变更文件**：
1. `src/templates/platforms/claude/commands/android.md` -- 在 Gate B 阶段增加 DDD/BDD/TDD 三步流程
2. `src/templates/platforms/claude/commands/ios.md` -- 同 android

**修改内容**：在每个命令模板的 Gate 流程描述中，将移动端轻量化说明扩展为显式三步：
```
Gate B-DDD: spawn task-design (DDD模式) → 领域分析文档
Gate B-BDD: spawn task-design (BDD模式) → BDD场景文档（可轻量）
Gate B-TDD: spawn task-design (TDD模式) → TDD任务包
```
并在 Agent 路由表中加入 task-design（DDD/BDD/TDD 模式）。

---

### TASK-CMD-014：移动端 Gate B 增强 (flutter + expo + taro)

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-ENHANCE-002 |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~150 行，3 个文件各 ~50 行） |
| **依赖** | TASK-ENGINE-001 |

**变更文件**：
1. `src/templates/platforms/claude/commands/flutter.md`
2. `src/templates/platforms/claude/commands/expo.md`
3. `src/templates/platforms/claude/commands/taro.md`

**修改内容**：同 TASK-CMD-013，为每个文件添加显式的 Gate B 三步流程。

---

## 四、第 3 组：Agent + Skill（P2 — 可并行，与第 2 组无直接依赖）

### 4.1 并行机会

TASK-AGENT-001 ~ TASK-SKILL-002 全部修改**不同文件**，可全并行执行。

---

### TASK-AGENT-001：Agent 角色增强 (api-contract + security)

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-AGENT-001, REQ-ENHANCE-003, REQ-API-001 |
| **关联 BDD** | BDD-007A/B/C（OpenAPI 文档生成）、BDD-008A/B/C（契约验证） |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~120 行，2 个文件各 ~60 行） |
| **依赖** | 无（独立于引擎变更） |

**变更文件**：
1. `.claude/agents/api-contract-expert.md` -- 增加 OpenAPI 3.0 文档自动生成能力 + Gate F 契约验证能力
2. `.claude/agents/security-review-expert.md` -- 增加 DAST 动态扫描能力（OWASP ZAP 集成）

**api-contract-expert 增强项**：
- 新增「模式 B：OpenAPI 文档生成」章节
- 支持从 Hono/Zod 路由自动提取端点信息
- 文档变更检测（新增/删除/修改端点）
- Gate F 契约验证流程（与 verifyContract() 联动）

**security-review-expert 增强项**：
- 新增「动态应用安全测试（DAST）」章节
- OWASP ZAP 自动化扫描流程
- DAST 发现与 SAST 发现的合并报告

---

### TASK-AGENT-002：Agent 角色增强 (perf-test + e2e-test)

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-AGENT-001, REQ-TEST-003, REQ-TEST-004 |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~100 行，2 个文件各 ~50 行） |
| **依赖** | 无 |

**变更文件**：
1. `.claude/agents/perf-test-expert.md` -- 增强 k6 脚本自动生成能力
2. `.claude/agents/e2e-test-expert.md` -- 增加基于用户故事自动生成 Playwright 测试能力

**perf-test-expert 增强项**：
- k6 脚本自动生成（基于 OpenAPI 端点定义）
- 性能基线对比报告模板
- 可选门禁阈值配置说明

**e2e-test-expert 增强项**：
- 用户故事 → Playwright 测试脚本的转换规则
- 关键路径自动识别
- 与 `/test-e2e` 命令的集成说明

---

### TASK-AGENT-003：Agent 路由表更新

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-AGENT-002 |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~100 行） |
| **依赖** | TASK-ENGINE-001（需要 GATE_AGENT_GUIDE 新条目） |
| **风险** | **共享文件冲突** -- `gates.ts` GATE_AGENT_GUIDE 已由 TASK-ENGINE-001 修改，此任务需在其锁定后执行 |

**变更文件**：
1. `src/engine/gates.ts` -- 补充 GATE_AGENT_GUIDE 中新 Gate 的 Agent 路由（在 TASK-ENGINE-001 基础上细化）
2. 所有新命令模板（refactor, hotfix 等）-- 确保 Agent 路由表完整

**注意**：此任务依赖 TASK-ENGINE-001 且修改同一文件 `gates.ts`，必须在 TASK-ENGINE-001 完成后串行执行。

---

### TASK-SKILL-001：test-data-factory Skill

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-TEST-006, REQ-TEMPLATE-002 |
| **任务类型** | 直接开发 |
| **预估变更行数** | S（~60 行） |
| **依赖** | 无 |

**变更文件**：新增 `.claude/skills/test-data-factory/SKILL.md`

**Skill 内容**：
- 根据 JSON Schema / OpenAPI Schema 自动生成 mock 数据
- 支持脱敏规则配置（email、phone、credit card、SSN 等）
- 与测试命令（/test-unit, /test-integration, /test-e2e）的集成说明
- 提供 `Skill("test-data-factory")` 加载接口

**验证命令**：
```bash
# 检查 SKILL.md 文件存在且格式正确
node -e "const fs = require('fs'); const c = fs.readFileSync('.claude/skills/test-data-factory/SKILL.md','utf-8'); console.assert(c.includes('SKILL.md'), 'Missing SKILL.md'); console.log('OK')"
```

---

### TASK-SKILL-002：mutation-testing Skill

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-TEMPLATE-002 |
| **任务类型** | 直接开发 |
| **预估变更行数** | S（~60 行） |
| **依赖** | 无 |

**变更文件**：新增 `.claude/skills/mutation-testing/SKILL.md`

**Skill 内容**：
- 变异测试方法论（Stryker JS / pytest-mutmut）
- 变异得分计算与解读（killed / survived / score）
- 与 `/refactor` 命令的集成说明（Gate R4）
- 存活变异体分析策略

---

## 五、第 4 组：Web 面板（P2 — 依赖第 1 组引擎变更）

### 5.1 并行机会

TASK-WEB-001 ~ TASK-WEB-003 修改**不同文件**，可并行执行。

---

### TASK-WEB-001：Dashboard Gate 可视化更新

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-WEB-001, REQ-GATE-F-001 |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~140 行） |
| **依赖** | TASK-ENGINE-001（需要 PIPELINE_DEFS 和 GATE_CHECKS 更新） |

**变更文件**：
1. `web/src/pages/Dashboard.tsx` -- 更新 GATE_COLORS, GATE_LABELS, GATE_DESCRIPTIONS
2. `web/src/components/Layout.tsx` -- 更新 PIPELINE_NAMES

**修改内容**：

**Dashboard.tsx**：
- GATE_COLORS 新增：F, R1-R5, H0-H3, M1-M4, E0-E3, D0-D4, DOC1-DOC2
- GATE_LABELS 新增：F→'契约验证', R1→'定义边界', H0→'紧急声明' 等
- GATE_DESCRIPTIONS 新增：所有新 Gate 的描述文本

**Layout.tsx**：
- PIPELINE_NAMES 新增：refactor→'安全重构', hotfix→'紧急热修复', migrate→'框架迁移', evaluate→'技术评估', debug→'调试诊断', doc→'文档同步', test→'独立测试'

**验证命令**：
```bash
# 构建前端
cd web && npm run build

# 类型检查
cd web && npx tsc --noEmit
```

---

### TASK-WEB-002：Commands 页面更新

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-WEB-001 |
| **任务类型** | 直接开发 |
| **预估变更行数** | M（~100 行） |
| **依赖** | TASK-ENGINE-001 |

**变更文件**：`web/src/pages/Commands.tsx`

**修改内容**：
- FALLBACK_COMMANDS 新增 12 条新命令条目（refactor, hotfix, migrate, evaluate, debug, doc, jarvis-change, test-unit, test-integration, test-e2e, test-perf, test-security）
- PIPELINE_TAGS 新增：refactor, hotfix, migrate, evaluate, debug, doc, test
- CATEGORY_TABS 可能新增 'testing' 分类下的子分类（若需要）

---

### TASK-WEB-003：质量门禁配置页面

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-WEB-001, REQ-TEST-007 |
| **任务类型** | 直接开发 |
| **预估变更行数** | S（~80 行） |
| **依赖** | TASK-ENGINE-002（需要 quality_gates API） |

**变更文件**：
1. `web/src/pages/QualityGates.tsx`（新增）-- 质量门禁配置 UI
2. `web/src/api.ts`（修改）-- 新增 `fetchQualityGates()` API 函数
3. `web/src/App.tsx`（修改）-- 新增路由 `/quality-gates`

**UI 功能**：
- 展示当前质量门禁配置（来自 `/api/quality-gates`）
- 各规则类型（coverage/lint/build/deps/perf/security/contract）的阈值和启用状态
- 历史检查结果列表

---

## 六、第 5 组：CLI（P2 — 依赖第 1 组引擎变更）

---

### TASK-CLI-001：gate-check CLI + CI 模式

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-CLI-001, REQ-CI-001 |
| **任务类型** | TDD |
| **预估变更行数** | L（~250 行）-- 标注为风险任务 |
| **风险说明** | L 粒度：CLI 入口 + CI 环境变量 + JSON 输出格式 + 非交互模式，跨多个文件。不拆分因 CLI 命令和 CI 模式紧密耦合 |
| **依赖** | TASK-ENGINE-001, TASK-ENGINE-002, TASK-ENGINE-003 |

#### 变更内容

**文件 1：新增 `src/cli/gate-check.ts`（~120 行）**

- `jarvis gate-check <gate>` CLI 命令
- `--format json` 输出选项
- `JARVIS_CI=true` 环境变量支持
- 非交互模式下跳过人工确认步骤
- CI 模式日志完整性（所有 Gate 检查结果写入 stdout + 文件）

**文件 2：`src/engine/server.ts`（修改 ~30 行）**

- 新增 MCP 工具 `gate_check_ci`：CI 模式下执行 Gate 检查并返回 JSON
- 检查 `process.env.JARVIS_CI` 决定是否跳过交互步骤

**文件 3：新增 `tests/cli/gate-check.test.ts`（~60 行）**

- 测试 `jarvis gate-check Gate C1` 命令
- 测试 `--format json` 输出
- 测试 `JARVIS_CI=true` 跳过交互
- 测试 CI 模式日志输出

**文件 4：`package.json`（修改 ~10 行）**

- 新增 `bin` 条目或 scripts

#### 验证命令

```bash
# CI 模式测试
JARVIS_CI=true node dist/cli/gate-check.js Gate C1 --format json

# 非交互模式验证
JARVIS_CI=true node dist/cli/gate-check.js Gate D --format json 2>&1 | head -20

# 运行 CLI 测试
npx vitest run tests/cli/
```

#### 验收标准

- [ ] `jarvis gate-check <gate>` CLI 命令可直接调用
- [ ] `JARVIS_CI=true` 跳过交互步骤
- [ ] JSON 格式输出（`--format json`）
- [ ] CI 模式日志完整性（所有 Gate 检查结果）
- [ ] 退出码正确（0=通过，1=失败，3=权限拒绝）

---

## 七、第 6 组：模板+文档（P3 — 最后，依赖所有前序组完成）

---

### TASK-DOCS-001：流程图（11 新 + 5 更新）

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-DOCS-001 |
| **任务类型** | 配置 |
| **预估变更行数** | L（~350 行，16 个文件）-- 标注为风险任务 |
| **风险说明** | L 粒度：16 个流程图文件，纯文档工作无代码风险，但工作量大 |
| **依赖** | TASK-CMD-001~012（需要命令模板确定 Gate 流程） |

**新增流程图（11 个）**：
| 文件 | 内容 |
|------|------|
| `docs/flows/refactor-flow.md` | R1→R5 重构流程图 |
| `docs/flows/hotfix-flow.md` | H0→H3 热修复流程图 |
| `docs/flows/migrate-flow.md` | M1→M4 迁移流程图 |
| `docs/flows/evaluate-flow.md` | E0→E3 评估流程图 |
| `docs/flows/debug-flow.md` | D0→D4 调试流程图（含 post-mortem 子路径） |
| `docs/flows/doc-flow.md` | DOC1→DOC2 文档同步流程图 |
| `docs/flows/jarvis-change-flow.md` | 中途变更管理流程图 |
| `docs/flows/test-unit-flow.md` | 单元测试流程图 |
| `docs/flows/test-integration-flow.md` | 集成测试流程图 |
| `docs/flows/test-e2e-flow.md` | E2E 测试流程图 |
| `docs/flows/test-perf-flow.md` | 性能测试流程图 |
| `docs/flows/test-security-flow.md` | 安全测试流程图（可能合并到上面） |

**实际 11 个**：按 REQ 覆盖，将 test-perf 和 test-security 各自独立，另加 gate-f-flow.md：
- 9 个新命令流程 + `docs/flows/gate-f-flow.md` + `docs/flows/quality-gates-flow.md`

**更新流程图（5 个）**：
| 文件 | 变更 |
|------|------|
| `docs/flows/android-flow.md` | 新增 Gate B-DDD/B-BDD/B-TDD 三步 |
| `docs/flows/ios-flow.md` | 同 android |
| `docs/flows/flutter-flow.md` | 同 android |
| `docs/flows/expo-flow.md` | 同 android |
| `docs/flows/taro-flow.md` | 同 android |

---

### TASK-DOCS-002：AGENTS.md / README.md 同步

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-DOCS-001 |
| **任务类型** | 配置 |
| **预估变更行数** | M（~150 行） |
| **依赖** | TASK-CMD-001~012, TASK-AGENT-001~002, TASK-SKILL-001~002 |

**变更文件**：
1. `AGENTS.md` -- 更新命令入口表（新增 12 个命令）、Agent 体系（新增增强说明）、技能体系（新增 2 个 Skill）
2. `README.md` -- 更新版本号、特性列表（新增测试体系/新命令/CI 模式）、命令表
3. `docs/README.md` -- 更新产物目录结构（新增 flows/ 文件列表）

---

### TASK-DOCS-003：quality-gates.yml 模板同步

| 属性 | 值 |
|------|-----|
| **关联 REQ** | REQ-TEMPLATE-001 |
| **任务类型** | 配置 |
| **预估变更行数** | S（~50 行） |
| **依赖** | TASK-ENGINE-002（需要确认配置格式） |

**变更文件**：`src/templates/quality-gates.yml`（已在 TASK-ENGINE-002 中创建，此处做最终检查和文档补充）

**内容**：
- 最终确认各阈值的默认值
- 添加注释说明每个规则的含义和可配置项
- 确保项目级覆盖机制有文档说明

---

## 八、推荐交付顺序

```
第 1 轮：引擎基础（串行）
  TASK-ENGINE-001 → TASK-ENGINE-002 → TASK-ENGINE-003 → TASK-ENGINE-004
  预计变更：~750 行

第 2 轮：命令模板 + Agent/Skill（全并行，12+6=18 个任务）
  TASK-CMD-001  TASK-CMD-002  TASK-CMD-003  TASK-CMD-004
  TASK-CMD-005  TASK-CMD-006  TASK-CMD-007  TASK-CMD-008
  TASK-CMD-009  TASK-CMD-010  TASK-CMD-011  TASK-CMD-012
  TASK-CMD-013  TASK-CMD-014
  TASK-AGENT-001 TASK-AGENT-002 TASK-AGENT-003
  TASK-SKILL-001 TASK-SKILL-002
  预计变更：~1600 行（但全并行，单任务最大 200 行）

第 3 轮：Web 面板 + CLI（并行）
  TASK-WEB-001  TASK-WEB-002  TASK-WEB-003
  TASK-CLI-001
  预计变更：~570 行

第 4 轮：文档同步（最后）
  TASK-DOCS-001  TASK-DOCS-002  TASK-DOCS-003
  预计变更：~550 行
```

---

## 九、REQ → TASK 追溯矩阵

| REQ-ID | 覆盖 TASK |
|--------|----------|
| REQ-ENGINE-001 | TASK-ENGINE-001, TASK-ENGINE-004 |
| REQ-ENGINE-002 | TASK-ENGINE-002, TASK-DOCS-003 |
| REQ-GATE-F-001 | TASK-ENGINE-001, TASK-WEB-001 |
| REQ-CMD-001 | TASK-CMD-001 |
| REQ-CMD-002 | TASK-CMD-002 |
| REQ-CMD-003 | TASK-CMD-003 |
| REQ-CMD-004 | TASK-CMD-004 |
| REQ-CMD-005 | TASK-CMD-005 |
| REQ-CMD-006 | TASK-CMD-006 |
| REQ-CMD-007 | TASK-CMD-007 |
| REQ-TEST-001 | TASK-CMD-008 |
| REQ-TEST-002 | TASK-CMD-009 |
| REQ-TEST-003 | TASK-CMD-010, TASK-AGENT-002 |
| REQ-TEST-004 | TASK-CMD-011, TASK-AGENT-002 |
| REQ-TEST-005 | TASK-CMD-012 |
| REQ-TEST-006 | TASK-SKILL-001 |
| REQ-TEST-007 | TASK-ENGINE-002, TASK-WEB-003 |
| REQ-ENHANCE-001 | TASK-CMD-005 |
| REQ-ENHANCE-002 | TASK-CMD-013, TASK-CMD-014 |
| REQ-ENHANCE-003 | TASK-AGENT-001 |
| REQ-ENHANCE-004 | （planner/task-design Agent 系统提示更新——独立于本任务包，由 Agent 模板维护） |
| REQ-ENHANCE-005 | TASK-ENGINE-003 |
| REQ-ENHANCE-006 | （跨会话上下文继承——需单独的 session_list 增强任务，暂不纳入本包） |
| REQ-CI-001 | TASK-CLI-001 |
| REQ-CLI-001 | TASK-CLI-001 |
| REQ-WEB-001 | TASK-WEB-001, TASK-WEB-002, TASK-WEB-003 |
| REQ-TEMPLATE-001 | TASK-DOCS-003 |
| REQ-TEMPLATE-002 | TASK-SKILL-001, TASK-SKILL-002 |
| REQ-DOCS-001 | TASK-DOCS-001, TASK-DOCS-002 |
| REQ-AGENT-001 | TASK-AGENT-001, TASK-AGENT-002 |
| REQ-AGENT-002 | TASK-AGENT-003 |
| REQ-API-001 | TASK-AGENT-001 |

**未覆盖 REQ**：
- REQ-ENHANCE-004（任务分解粒度控制）：需修改 planner 和 task-design Agent 系统提示，这些是 `.claude/agents/` 下的 Agent 定义文件，建议作为独立的 Agent 模板更新任务处理
- REQ-ENHANCE-006（跨会话上下文继承）：需 session_list MCP 工具增强 + 相似任务匹配算法，属于独立的引擎增强，建议单独建 REQ

---

## 十、共享文件冲突矩阵

| 文件 | 最多修改次数 | 串行依赖 |
|------|------------|---------|
| `src/engine/gates.ts` | 3 次（TASK-ENGINE-001, TASK-ENGINE-003, TASK-AGENT-003） | **严格串行**：001 → 003 → AGENT-003 |
| `src/engine/server.ts` | 3 次（TASK-ENGINE-001, TASK-ENGINE-002, TASK-ENGINE-003） | **严格串行**：001 → 002 → 003 |
| `src/engine/db.ts` | 1 次（TASK-ENGINE-002） | 无冲突 |
| `tests/gates.test.ts` | 2 次（TASK-ENGINE-001, TASK-ENGINE-003） | **串行**：ENGINE-001 → ENGINE-003 |
| `web/src/pages/Dashboard.tsx` | 1 次（TASK-WEB-001） | 无冲突 |
| `web/src/pages/Commands.tsx` | 1 次（TASK-WEB-002） | 无冲突 |
| `web/src/components/Layout.tsx` | 1 次（TASK-WEB-001） | 无冲突 |

---

## 十一、风险任务清单

| 任务 ID | 风险等级 | 风险原因 |
|---------|---------|---------|
| TASK-ENGINE-001 | **高** | 修改共享文件 `gates.ts`（所有流程核心），变更 ~300 行 |
| TASK-CMD-005 | **中** | L 粒度（~200 行），含标准模式 + post-mortem 子模式，功能复杂度高 |
| TASK-CLI-001 | **中** | L 粒度（~250 行），跨 4 个文件，含 CLI 入口 + CI 模式 + 测试 |
| TASK-DOCS-001 | **低** | L 粒度（~350 行，16 个文件），纯文档工作无代码风险 |

---

## 十二、验证检查清单

任务包完成后确认：

- [x] 所有 27 个 REQ 至少映射到 1 个 TASK（25 个已映射，2 个需独立处理）
- [x] 任务使用垂直切片策略（每个任务交付完整的独立功能路径）
- [x] 无水平切片（按技术层级拆分的任务）
- [x] 每个任务有明确的优先级和 test_strategy
- [x] 依赖关系已明确（无循环依赖）
- [x] 并行机会已识别（第 2 组 18 个任务可全并行）
- [x] 风险任务已标注（4 个）
- [x] 单轮次总变更不超过 1000 行（第 1 轮 ~750，第 2 轮单任务最大 200）
- [x] 共享区域已指定唯一责任方和串行顺序
- [x] 每个任务有可独立验证的完成标准

---

## 十三、推荐的下一步

1. **planner** 读取本任务文档，按第 1 轮（引擎基础）生成 `parallel_batches` 执行计划
2. 第 1 轮严格串行：TASK-ENGINE-001 → 002 → 003 → 004
3. 第 2 轮全并行分发：18 个命令/Agent/Skill 任务可同时执行
4. 第 3 轮并行：Web 面板 + CLI
5. 第 4 轮收尾：文档同步

**planner 调用方式**：
```
/jarvis --task docs/2026-05-13/tasks/2026-05-13-test-systematization-tasks.md
```
或直接 spawn planner Agent 读取本任务文档生成执行计划。
