# 后端引擎架构变更评审报告

> 评审对象：Jarvis-Agent-Factory 测试体系增强与指令流程补齐（REQ-ENGINE-001 ~ REQ-ENHANCE-006）
> 评审日期：2026-05-13
> 评审者：后端架构师
> 相关文档：`docs/2026-05-13/requirements/REQ-test-system-enhancement.md`、`docs/2026-05-13/tasks/2026-05-13-test-systematization-ddd.md`、`docs/2026-05-13/tasks/2026-05-13-test-systematization-tasks.md`

---

## Execution Acknowledgement

- 我本次设计的后端架构域：PIPELINE_DEFS 扩展、GATE 映射表扩展、session_join 白名单、quality-gates.yml 配置系统、风险评分服务、数据库变更、CI/CD 模式、Gate F 插入
- 对应需求 ID / 任务 ID：REQ-ENGINE-001、REQ-ENGINE-002、REQ-GATE-F-001、REQ-ENHANCE-005、REQ-CI-001
- 候选架构模式 / 技术方案：扁平 PIPELINE_DEFS vs 分层命名空间、硬编码白名单 vs 动态白名单、独立 risk 表 vs pipeline_runs 扩展列
- 我不会修改：任何生产代码、前端文件、Agent 模板文件、命令模板文件
- 我预计输出的文件 / 路径：`docs/2026-05-13/architecture/backend-architecture-review.md`
- 我会编写的原型范围：不编写代码原型，仅做架构评估与决策建议
- 若发现架构冲突，我将回退给编排者：涉及 `gates.ts` / `server.ts` / `db.ts` 共享区域的修改顺序冲突

我已理解并遵守 behavioral-guidelines 各项准则。

---

## 一、架构目标与约束

### 1.1 变更目标

| 目标 | 描述 | 关联需求 |
|------|------|---------|
| G1 | 新增 7 种独立指令的 Pipeline 类型（refactor / hotfix / migrate / evaluate / debug / doc / test） | REQ-ENGINE-001 |
| G2 | 在 full/frontend/backend 流水线中插入 Gate F（契约验证） | REQ-GATE-F-001 |
| G3 | 统一质量门禁配置系统（quality-gates.yml + API + MCP 工具） | REQ-ENGINE-002 / REQ-TEST-007 |
| G4 | 变更风险评分与静默通过机制 | REQ-ENHANCE-005 |
| G5 | CI/CD 模式支持（JARVIS_CI=true + gate-check CLI） | REQ-CI-001 / REQ-CLI-001 |

### 1.2 架构约束

| 约束 | 来源 | 影响 |
|------|------|------|
| 禁止物理外键 | CLAUDE.md 2.8 | SQLite 仅通过应用层保证引用完整性 |
| 单一平台 claude | TASK-009 | 不考虑多平台扩展 |
| SQLite (node:sqlite) | 现有实现 | 不支持并发 DDL、CHECK 不可 ALTER ADD |
| Hono + MCP SDK | 现有技术栈 | 新 MCP 工具/API 沿用 Hono |
| `gates.ts` 为共享核心 | DDD 分析 | 必须串行修改，第 1 组完成后锁定 |

---

## 二、PIPELINE_DEFS 扩展设计

### 2.1 当前状态

```typescript
// 现有 4 种类型
export const PIPELINE_DEFS = {
  full:     { name: '全流程', gates: [12 gates] },
  frontend: { name: '前端开发', gates: [12 gates] },
  backend:  { name: '后端开发', gates: [11 gates] },
  lite:     { name: '轻量编排', gates: [12 gates], allow_jump: true },
};
```

### 2.2 推荐方案：扁平结构 + 命名空间前缀

**决策**：维持扁平 `PIPELINE_DEFS` 结构，但所有新 Gate 使用独立前缀避免混淆。

```
扩展后类型（4 → 11）：

  full      全流程     [13 gates: A→...→D→F→E]  +Gate F
  frontend  前端开发    [13 gates: A→...→D→F→E]  +Gate F
  backend   后端开发    [12 gates: A→...→D→F→E]  +Gate F
  lite      轻量编排    [12 gates: 不变]          allow_jump

  refactor  安全重构    [R1, R2, R3, R4, R5]
  hotfix    紧急热修复  [H0, H1, H2, H3]
  migrate   框架迁移    [M1, M2, M3, M4]
  evaluate  技术评估    [E0, E1, E2, E3]
  debug     调试诊断    [D0, D1, D2, D3, D4]
  doc       文档同步    [DOC1, DOC2]
  test      独立测试    [Gate C2]（单 Gate，复用现有）
```

### 2.3 Gate 命名冲突分析

**风险识别**：新 Gate 使用的前缀（`E0`/`E1`/`D0`/`D1`）与现有 Gate（`Gate E`/`Gate D`）在字符串层面无冲突——`'Gate E' !== 'Gate E0'`。但存在**认知混淆风险**：开发者阅读 `GATE_CHECKS['Gate E0']` 时可能误以为是 `Gate E` 的子 Gate。

**缓解措施**：
1. 全限定命名：内部 Gate 名称使用 `<Pipeline前缀>-<序号>` 格式，例如 `Gate Eval-0` / `Gate Dbg-0`
2. 或保持建议方案：使用 `Gate E0` / `Gate D0`，但在所有注释中明确标注所属 pipeline

**最终推荐**：采用需求定义中的命名方案（`Gate R1` ~ `Gate D4`），但每个 Gate 在所有映射表中的 note/描述字段明确写出所属 pipeline 名称。理由：简化与需求/命令模板的对齐成本，且实际冲突风险极低——`GATE_CHECKS`、`GATE_OPERATIONS` 等映射表是内部实现细节，consumer 通过 `getPipelineGates(type)` 获取的序列天然隔离。

### 2.4 Gate F 插入影响评估

```
插入前 full 序列（12）：A → B-DDD → B-BDD → B-TDD → B1 → C → C-impl → C1 → C1.5 → C2 → D → E
插入后 full 序列（13）：A → B-DDD → B-BDD → B-TDD → B1 → C → C-impl → C1 → C1.5 → C2 → D → F → E
```

| 影响维度 | 评估 | 风险 |
|---------|------|------|
| **advance_gate FSM** | Gate D → Gate F 的索引差为 1，符合 `ti === ci + 1` 约束 | 无风险 |
| **GATE_ENTRY_CONDITIONS** | Gate F 入口条件需新增（依赖 Gate D），Gate E 入口条件需从"Gate D 审查通过"改为"Gate F 契约验证通过" | 低风险 |
| **已有已完成会话** | 已完成（status=completed）的 run 不受影响——它们不会再次调用 advance_gate | 无风险 |
| **进行中会话（Gate D）** | 当前停在 Gate D 的会话，其 gateList 会从 12 变为 13。advance_gate 使用 `sessionGates()` 动态获取序列，Gate D 的 index 不变（仍为 10），下一个 Gate 变为 Gate F（index 11） | 无风险 |
| **进行中会话（Gate E）** | 理论上不可达——Gate E 是终点，到达即完成/归档 | 无风险 |
| **checkpoint 数据** | 历史 checkpoints 表中 `advance_to` 字段记录的旧目标 Gate 名称不变。新查询使用 `sessionGates()` 获取序列，不受影响 | 无风险 |
| **GATE_CHECKS['Gate E']** | Gate E 的检查条件当前为 "安全审计+上线检查清单+回滚预案就绪"，需补充 "API文档一致性已验证" | 低风险 |
| **Web Dashboard** | Gate Timeline 颜色/标签映射需新增 `F: '#...' / '契约验证'` | 前端层，非引擎风险 |

**结论**：Gate F 插入对现有 FSM 逻辑**零破坏**。Sessions 在 Gate D 处会自然看到下一个 Gate 为 F。唯一需要关注的是 `GATE_ENTRY_CONDITIONS` 中 Gate E 的条件更新。

---

## 三、GATE_CHECKS / GATE_OPERATIONS / GATE_AGENT_GUIDE 表扩展

### 3.1 设计原则

**原则 1：复用现有 Agent**
新指令不应引入新 Agent 类型，而是通过 GATE_AGENT_GUIDE 将现有 Agent 路由到新 Gate。当前 Agent 体系（~20 个）已覆盖实现/测试/审查/探索/架构全链路。

**原则 2：最小权限**
参考现有 GATE_OPERATIONS 的 "deny 列表 > allow 列表" 模式，新 Gate 默认 deny write_code/spawn_impl/build/deploy，仅开放其阶段所需的操作。

### 3.2 推荐映射方案

#### GATE_CHECKS（18 个新 Gate）

```typescript
// refactor pipeline
'Gate R1': { check: '重构边界与目标已明确，目标文件/模块清单已产出' },
'Gate R2': { check: '现有测试全部通过，基线覆盖率报告已生成' },
'Gate R3': { check: '重构执行完成，代码变更已提交' },
'Gate R4': { check: '覆盖率未下降，变异测试得分 ≥ 80%，行为无漂移' },
'Gate R5': { check: '重构报告已产出（含边界/变更清单/覆盖率对比/变异得分）' },

// hotfix pipeline
'Gate H0': { check: '紧急声明已提交（故障描述/影响范围/严重级别/审批人）' },
'Gate H1': { check: '最小化修复已实施，仅修改故障相关代码' },
'Gate H2': { check: '快速验证通过，回滚预案已就绪（可一键回退）' },
'Gate H3': { check: '事后强制回溯审计完成（根因/修复/预防措施/合规补齐）' },

// migrate pipeline
'Gate M1': { check: '迁移规则已定义，规则覆盖率验证通过' },
'Gate M2': { check: '逐文件迁移已执行，所有目标文件已处理' },
'Gate M3': { check: '编译/构建验证通过，零编译错误' },
'Gate M4': { check: 'Lint 自动修复完成，零新增 Lint 错误' },

// evaluate pipeline
'Gate E0': { check: '评估标准已定义（性能/兼容性/维护性/安全性维度）' },
'Gate E1': { check: '原型已生成，位于隔离分支/沙箱' },
'Gate E2': { check: '评估用例已执行，指标数据已收集' },
'Gate E3': { check: '评估报告已产出（含各维度评分与建议）' },

// debug pipeline
'Gate D0': { check: '异常信息已收集（堆栈/日志/环境快照）' },
'Gate D1': { check: '最小复现用例已生成' },
'Gate D2': { check: '调试会话已启动（断点/变量监视就绪）' },
'Gate D3': { check: '交互式诊断已完成，根因已定位' },
'Gate D4': { check: '诊断报告已产出（根因/代码位置/置信度/建议修复方案）' },

// doc pipeline
'Gate DOC1': { check: '代码变更已扫描，过时文档列表已产出' },
'Gate DOC2': { check: '过时文档已更新，文档与代码一致性已验证' },

// Gate F（契约验证）
'Gate F': { check: 'API契约一致性验证通过，OpenAPI文档与实现一致' },
```

#### GATE_OPERATIONS（18 个新 Gate）

```typescript
// refactor pipeline — 只读+文档+架构，R3 才允许写代码
'Gate R1': { allow: ['read','write_doc'], deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
'Gate R2': { allow: ['read','spawn_test'],    deny: ['write_code','spawn_impl','build','deploy'] },
'Gate R3': { allow: ['read','write_code','fix'], deny: ['spawn_impl','build','deploy'] },
'Gate R4': { allow: ['read','spawn_test','fix'], deny: ['spawn_impl','build','deploy'] },
'Gate R5': { allow: ['read','write_doc'],      deny: ['write_code','spawn_impl','build','deploy'] },

// hotfix pipeline — H1 允许最小化写代码，全流程事后补齐合规
'Gate H0': { allow: ['read','write_doc'],            deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
'Gate H1': { allow: ['read','write_code','fix'],       deny: ['spawn_impl','spawn_test','build','deploy'] },
'Gate H2': { allow: ['read','spawn_test','fix'],       deny: ['spawn_impl','build','deploy'] },
'Gate H3': { allow: ['read','review','audit','write_doc'], deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },

// migrate pipeline — 全流程允许 write_code（逐文件迁移）
'Gate M1': { allow: ['read','write_doc'],      deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
'Gate M2': { allow: ['read','write_code','fix'], deny: ['spawn_test','deploy'] },
'Gate M3': { allow: ['read','lint','build','fix'], deny: ['write_code','spawn_impl','spawn_test','deploy'] },
'Gate M4': { allow: ['read','lint','fix'],       deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },

// evaluate pipeline — 全流程只读+文档，E1 允许隔离沙箱写代码
'Gate E0': { allow: ['read','write_doc'], deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
'Gate E1': { allow: ['read','write_code'],  deny: ['spawn_impl','spawn_test','build','deploy'] },
'Gate E2': { allow: ['read','spawn_test'],  deny: ['write_code','spawn_impl','build','deploy'] },
'Gate E3': { allow: ['read','write_doc'],   deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },

// debug pipeline — 只读+诊断，不修改代码
'Gate D0': { allow: ['read'],              deny: ['write_code','write_doc','spawn_impl','spawn_test','build','deploy'] },
'Gate D1': { allow: ['read','write_doc'],  deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
'Gate D2': { allow: ['read'],              deny: ['write_code','write_doc','spawn_impl','spawn_test','build','deploy'] },
'Gate D3': { allow: ['read'],              deny: ['write_code','write_doc','spawn_impl','spawn_test','build','deploy'] },
'Gate D4': { allow: ['read','write_doc'],  deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },

// doc pipeline
'Gate DOC1': { allow: ['read'],              deny: ['write_code','write_doc','spawn_impl','spawn_test','build','deploy'] },
'Gate DOC2': { allow: ['read','write_doc'],  deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },

// Gate F（契约验证）
'Gate F': { allow: ['read','audit'], deny: ['write_code','spawn_impl','spawn_test','build','deploy'] },
```

#### GATE_AGENT_GUIDE（18 个新 Gate）

```typescript
// refactor pipeline
'Gate R1': { can_spawn: ['code-explore-expert', 'task-design'], note: '定义重构边界——探索代码结构，确定目标范围' },
'Gate R2': { can_spawn: ['frontend-test-expert', 'backend-test-expert', 'test-executor'], note: '运行现有测试，生成覆盖率基线' },
'Gate R3': { can_spawn: ['frontend-dev-expert', 'backend-dev-expert'], note: '执行重构——仅限目标范围内代码变更' },
'Gate R4': { can_spawn: ['test-executor', 'frontend-test-expert', 'backend-test-expert', 'remediation-expert'], note: '对比覆盖率+变异测试——验证行为不变' },
'Gate R5': { can_spawn: ['remediation-expert'], note: '生成重构报告——汇总变更/覆盖率/变异得分' },

// hotfix pipeline
'Gate H0': { can_spawn: [], note: '紧急声明——需人工审批，不自动生成Agent' },
'Gate H1': { can_spawn: ['frontend-dev-expert', 'backend-dev-expert'], note: '最小化修复——仅修改故障相关代码' },
'Gate H2': { can_spawn: ['frontend-test-expert', 'backend-test-expert', 'test-executor'], note: '快速验证——运行相关测试确保修复有效' },
'Gate H3': { can_spawn: ['security-review-expert', 'qa-review-expert'], note: '事后审计——根因分析+合规补齐' },

// migrate pipeline
'Gate M1': { can_spawn: ['code-explore-expert'], note: '验证迁移规则覆盖率' },
'Gate M2': { can_spawn: ['frontend-dev-expert', 'backend-dev-expert'], note: '逐文件应用迁移规则' },
'Gate M3': { can_spawn: [], note: '编译验证——无Agent生成，纯构建检查' },
'Gate M4': { can_spawn: [], note: 'Lint自动修复——无Agent生成，纯工具检查' },

// evaluate pipeline
'Gate E0': { can_spawn: ['code-explore-expert'], note: '定义评估标准——分析待评估技术栈' },
'Gate E1': { can_spawn: ['frontend-dev-expert', 'backend-dev-expert', 'frontend-architect', 'backend-architect'], note: '生成原型——在隔离分支实现' },
'Gate E2': { can_spawn: ['frontend-test-expert', 'backend-test-expert', 'perf-test-expert'], note: '运行评估用例——收集性能/兼容性/安全性指标' },
'Gate E3': { can_spawn: ['frontend-architect', 'backend-architect'], note: '生成评估报告——各维度评分与推荐' },

// debug pipeline
'Gate D0': { can_spawn: ['code-explore-expert'], note: '收集异常信息+环境快照' },
'Gate D1': { can_spawn: ['code-explore-expert'], note: '生成最小复现用例' },
'Gate D2': { can_spawn: ['browser-test-expert', 'browser-use-expert'], note: '启动调试会话——agent-browser调试协议' },
'Gate D3': { can_spawn: ['code-explore-expert'], note: '交互式诊断——断点/变量监视/状态捕获' },
'Gate D4': { can_spawn: [], note: '输出诊断报告——不修改代码' },

// doc pipeline
'Gate DOC1': { can_spawn: ['code-explore-expert', 'docs-engineer'], note: '扫描代码变更+对比文档站' },
'Gate DOC2': { can_spawn: ['docs-engineer'], note: '自动更新过时文档' },

// Gate F（契约验证）
'Gate F': { can_spawn: ['api-contract-expert'], note: '契约验证——验证API实现与OpenAPI文档一致性' },
```

### 3.3 是否所有新指令都需要独立的 pipeline_type？

| 指令 | 推荐 pipeline_type | 理由 |
|------|-------------------|------|
| /refactor | `refactor`（独立） | 5 道 Gate 专用流程，与 full 完全不兼容 |
| /hotfix | `hotfix`（独立） | 绕过 Gate A/B，事后审计，权限模型不同 |
| /migrate | `migrate`（独立） | 4 道 Gate 逐文件迁移，与 full 不同 |
| /evaluate | `evaluate`（独立） | 4 道 Gate 评估流程，隔离沙箱 |
| /debug | `debug`（独立） | 5 道 Gate 诊断流程，不修改代码 |
| /doc | `doc`（独立） | 2 道 Gate 文档同步 |
| /jarvis-change | **复用现有类型** | 中途变更——在已有 run 内插入子任务，不创建新 pipeline_type。内置于编排者逻辑 |
| /test-unit | `test`（共享） | 所有 5 个测试指令共用 `test` pipeline_type，因为它们的 Gate 序列完全一致（仅 Gate C2） |
| /test-integration | `test`（共享） | 同上 |
| /test-e2e | `test`（共享） | 同上 |
| /test-perf | `test`（共享） | 同上 |
| /test-security | `test`（共享） | 同上 |

**结论**：需要 7 个新 pipeline_type（refactor/hotfix/migrate/evaluate/debug/doc/test），而非 12 个。/jarvis-change 不创建新 pipeline，5 个测试指令共用 `test` 类型。

---

## 四、session_join 白名单扩展

### 4.1 当前实现

```typescript
// server.ts 第 358 行
if (!['full', 'frontend', 'backend', 'lite'].includes(pt)) {
  return resp({ error: `Invalid pipeline_type: ${pt}. Valid: full, frontend, backend, lite` });
}
```

### 4.2 问题分析

硬编码白名单存在以下风险：
1. 新增 pipeline_type 时容易遗漏（sync 问题）
2. 错误消息需要手动更新
3. 白名单与实际 PIPELINE_DEFS 可能不一致

### 4.3 推荐方案：动态白名单

```typescript
// 替换硬编码为动态生成
const VALID_PIPELINE_TYPES = Object.keys(PIPELINE_DEFS);

if (!VALID_PIPELINE_TYPES.includes(pt)) {
  return resp({
    error: `Invalid pipeline_type: ${pt}. Valid: ${VALID_PIPELINE_TYPES.join(', ')}`
  });
}
```

### 4.4 安全考量

| 风险 | 评估 | 缓解 |
|------|------|------|
| 注入攻击 | `pt` 值来自 MCP 工具参数，zod 已做 string 校验，且仅用于内存查找 | 低风险 |
| 意外暴露内部类型 | `Object.keys(PIPELINE_DEFS)` 会暴露所有已注册类型（包括 test 等内部类型） | test 是公开指令类型，可接受 |
| 动态加载恶意类型 | PIPELINE_DEFS 是编译时静态对象，不可运行时注入 | 零风险 |

### 4.5 同步变更点

需同步更新 `initPipeline` 函数的 JSDoc 类型注解（`db.ts` 第 256 行）：

```typescript
// 旧：
/** @param {'full'|'frontend'|'backend'} pipelineType */

// 新：
/** @param {string} pipelineType — 由 session_join 白名单保证有效性 */
```

---

## 五、质量门禁配置加载

### 5.1 配置层级设计

```
优先级（高→低）：
  1. <project>/quality-gates.yml         —— 项目级覆盖（最高优先级）
  2. <project>/.claude/quality-gates.yml —— 备选项目路径（兼容 .claude 目录结构）
  3. src/templates/quality-gates.yml     —— 全局默认（随包发布）
```

### 5.2 加载时机

| 时机 | 行为 |
|------|------|
| 引擎启动 | 加载全局默认配置到内存（`src/templates/quality-gates.yml`） |
| `session_join` | 检查项目级文件，若存在则合并覆盖 |
| Gate C1/C2/D/F 推进前 | 强制读取当前配置，逐项检查 |

### 5.3 配置文件格式

```yaml
# quality-gates.yml
version: 1

gates:
  Gate C1:
    rules:
      - type: lint
        enabled: true
        threshold: 0          # 0 errors
        severity: block       # block | warn
      - type: build
        enabled: true
        severity: block
      - type: deps
        enabled: true
        threshold: high       # 无 CRITICAL 或 HIGH 级别 CVE
        severity: block

  Gate C2:
    rules:
      - type: coverage
        enabled: true
        lines: 80
        branches: 70
        functions: 80
        severity: block
      - type: perf
        enabled: false        # 默认关闭，性能敏感项目开启
        p95_latency_ms: 500
        p99_latency_ms: 1000
        throughput_rps: 100
        severity: warn
      - type: security
        enabled: false
        dast_threshold: medium  # DAST 扫描无 medium 及以上发现
        severity: warn

  Gate F:
    rules:
      - type: contract
        enabled: true
        mode: strict          # strict | lenient
        severity: block

  Gate D:
    rules:
      - type: review
        enabled: true
        min_approvals: 1
        severity: block
      - type: security
        enabled: true
        cve_threshold: high   # 无 CRITICAL CVE
        severity: block

  Gate E:
    rules:
      - type: docs
        enabled: true
        check_api_consistency: true
        severity: block
```

### 5.4 API 端点设计

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/api/quality-gates` | 获取当前合并后的质量门禁配置 |
| `GET` | `/api/quality-gates?project=<path>` | 获取指定项目的配置（管理用） |
| `GET` | `/api/quality-gates/results?run_id=<id>` | 获取指定 run 的历史检查结果 |
| `GET` | `/api/quality-gates/results?run_id=<id>&gate=<gate>` | 获取指定 run 特定 Gate 的结果 |

### 5.5 MCP 工具设计

```typescript
server.tool('quality_gates',
  '查询质量门禁配置与历史检查结果',
  {
    run_id: z.string().optional().describe('流水线 run ID，传入时返回该 run 的历史检查结果'),
    gate: z.string().optional().describe('Gate 名称，传入时仅返回该 Gate 的配置与结果'),
  },
  async ({ run_id, gate }) => {
    // 1. 加载当前配置（全局默认 + 项目级覆盖的合并结果）
    // 2. 若传入 run_id，查询 quality_gate_results 表
    // 3. 返回 { config: QualityRule[], results: QualityCheckResult[] }
  }
);
```

### 5.6 存储决策：`quality_gate_results` 表

**推荐**：新建独立表，而非复用 artifacts 表。

| 方案 | 优点 | 缺点 |
|------|------|------|
| 新建 `quality_gate_results` | 结构匹配（rule_type/passed/threshold/actual），查询高效 | 增加一张表 |
| 复用 `artifacts` | 不新增表 | fieldpath 存结构化数据违反语义，查询需要 JSON 解析 |
| 复用 `checkpoints` | 不新增表 | checkpoints 语义是"通过->推进"，质量检查是细粒度的通过/失败，不匹配 |

**决策**：新建 `quality_gate_results` 表（Schema 见第七节）。

---

## 六、风险评分服务

### 6.1 算法设计

```typescript
/**
 * 风险评分算法
 *
 * score = (normalizedFileCount * 0.3) + (normalizedLineCount * 0.4) + (maxCriticality * 0.3)
 *
 * 其中：
 * - normalizedFileCount: min(fileCount / 20, 1.0) * 10
 * - normalizedLineCount:  min(lineCount / 500, 1.0) * 10
 * - maxCriticality:       max(mapCriticality(modulePaths)) * 10
 *
 * 模块关键度映射：
 *   low → 0.2      (文档/配置/测试)
 *   medium → 0.5   (业务逻辑/工具函数)
 *   high → 0.8     (认证/授权/支付/数据)
 *   critical → 1.0 (引擎核心/数据库Schema/安全模块)
 */
export function calculateRiskLevel(params: {
  fileCount: number;
  lineCount: number;
  modulePaths: string[];
}): { level: 'low' | 'medium' | 'high' | 'critical'; score: number; shouldSkip: boolean } {
  const normFiles = Math.min(params.fileCount / 20, 1.0) * 10;
  const normLines = Math.min(params.lineCount / 500, 1.0) * 10;
  const maxCrit = Math.max(...params.modulePaths.map(mapCriticality), 0.2) * 10;

  const score = normFiles * 0.3 + normLines * 0.4 + maxCrit * 0.3;

  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score <= 3.0) level = 'low';
  else if (score <= 7.0) level = 'medium';
  else if (score <= 9.0) level = 'high';
  else level = 'critical';

  return {
    level,
    score: Math.round(score * 100) / 100,
    shouldSkip: level === 'low',  // 仅低风险静默通过
  };
}
```

### 6.2 存储决策

**推荐**：扩展 `pipeline_runs` 表，而非新建 `risk_assessments` 表。

```sql
ALTER TABLE pipeline_runs ADD COLUMN risk_level TEXT;    -- 'low'|'medium'|'high'|'critical'
ALTER TABLE pipeline_runs ADD COLUMN risk_score REAL;    -- 0.0 ~ 10.0
ALTER TABLE pipeline_runs ADD COLUMN risk_checked_at TEXT; -- ISO timestamp
```

**理由**：
1. 风险评分与 pipeline run 是 1:1 关系，每次 run 最多评估一次（在 Gate C 推进时）
2. 存储在 run 记录中简化查询——Dashboard 展示 run 列表时无需 JOIN
3. `risk_level` 决定后续 Gate 的静默通过行为，是 run 的固有属性
4. CHECK 约束？SQLite 不支持 `ALTER TABLE ADD CONSTRAINT`，应用层校验即可

### 6.3 MCP 工具设计

```typescript
server.tool('risk_assess',
  '评估变更风险等级，决定是否需要人工确认',
  {
    file_count: z.number().int().min(1).describe('变更涉及的文件数'),
    line_count: z.number().int().min(1).describe('变更总行数'),
    module_paths: z.array(z.string()).describe('变更涉及的文件路径列表'),
    run_id: z.string().optional().describe('关联的流水线 run ID，传入时自动持久化评估结果'),
  },
  async ({ file_count, line_count, module_paths, run_id }) => {
    // 计算风险评分 → 持久化（如果 run_id） → 返回结果
  }
);
```

### 6.4 模块关键度映射表

```typescript
export const MODULE_CRITICALITY_PATTERNS: Array<{ pattern: RegExp; criticality: number }> = [
  // critical: 引擎核心/安全/数据库
  { pattern: /src\/engine\/(gates|server|db|agent-registry)\.ts$/, criticality: 1.0 },
  { pattern: /src\/engine\/.*\.ts$/, criticality: 0.8 },
  // high: 认证/授权/数据
  { pattern: /auth|login|permission|token|encrypt|secret/i, criticality: 0.8 },
  { pattern: /schema|migration|database|db\.ts$/i, criticality: 0.8 },
  // medium: 业务逻辑
  { pattern: /src\/(?!engine\/)/, criticality: 0.5 },
  // low: 文档/配置/测试
  { pattern: /docs\/|\.test\.|\.spec\.|\.yml$|\.yaml$|\.json$/, criticality: 0.2 },
  // default
  { pattern: /.*/, criticality: 0.3 },
];
```

---

## 七、数据库变更评估

### 7.1 现有表结构（无需变更）

| 表 | 状态 | 理由 |
|----|------|------|
| `pipeline` | 不变 | pipeline_type 为 TEXT，接受任意字符串 |
| `checkpoints` | 不变 | gate 为 TEXT，接受新 Gate 名称 |
| `sessions` | 不变 | 无 pipeline_type 依赖 |
| `agent_models` | 不变 | 无变更 |
| `agent_events` | 不变 | 无变更 |
| `artifacts` | 不变 | gate 为 TEXT，接受新 Gate 名称 |

### 7.2 新表：`quality_gate_results`

```sql
CREATE TABLE IF NOT EXISTS quality_gate_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  gate TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('coverage','lint','build','deps','perf','security','contract')),
  passed INTEGER NOT NULL DEFAULT 0,
  threshold TEXT,          -- 阈值配置（JSON 字符串或裸值）
  actual TEXT,             -- 实际值（JSON 字符串或裸值）
  message TEXT,            -- 失败原因或通过说明
  checked_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qgr_run ON quality_gate_results(run_id, gate);
CREATE INDEX IF NOT EXISTS idx_qgr_run_rule ON quality_gate_results(run_id, gate, rule_type);
```

### 7.3 扩展现有表：`pipeline_runs`

```sql
-- 风险评分列（ALTER TABLE，SQLite try/catch 模式）
ALTER TABLE pipeline_runs ADD COLUMN risk_level TEXT;     -- 'low'|'medium'|'high'|'critical'
ALTER TABLE pipeline_runs ADD COLUMN risk_score REAL;     -- 0.0 ~ 10.0
ALTER TABLE pipeline_runs ADD COLUMN risk_checked_at TEXT; -- ISO 时间戳
```

### 7.4 数据迁移策略

| 场景 | 策略 |
|------|------|
| 新安装（无旧数据库） | `initSchema` 自动创建所有表 |
| 已有数据库 | `ALTER TABLE ... ADD COLUMN` 用 try/catch（现有 db.ts 模式），不存在则静默跳过 |
| 已有 `pipeline_runs` 行 | 新列默认 NULL，历史 run 不评估风险 |
| 数据库回滚 | 无 DROP COLUMN，新增列可保留；SQLite 不支持 DROP COLUMN（3.35 之前），故无回滚方案——向前兼容即可 |

---

## 八、CI/CD 模式

### 8.1 `JARVIS_CI=true` 影响行为

| 行为 | 交互模式 | CI 模式 |
|------|---------|--------|
| `gate_check` | 返回允许/禁止 + 指引 | 返回 JSON，退出码 0/1 |
| `advance_gate` | 推进 + 事件广播 | 推进 + JSON 输出 + 退出码 |
| 风险静默通过 | 日志记录 "低风险，静默通过" | 日志 + JSON status 字段 |
| 高风险确认 | 等待人工输入 | 返回 `requires_confirmation: true` + 退出码 3 |
| 日志 | stdout 混合输出 | stdout 为纯 JSON，stderr 为日志 |
| SSE 广播 | 实时推送 | 禁用（CI 无 Web 面板） |

### 8.2 CLI 命令设计

```
jarvis gate-check <gate> [options]

Options:
  --format json         JSON 格式输出（CI 模式默认启用）
  --run-id <id>         指定 pipeline run ID
  --session-id <id>     指定 session ID
  --output <path>       结果写入文件

环境变量：
  JARVIS_CI=true        启用 CI 模式（非交互）

退出码：
  0  通过
  1  未通过
  2  错误（系统级）
  3  需要人工确认（CI 模式下高风险变更）
```

### 8.3 架构建议

CI 模式不适合修改现有 MCP 工具行为（MCP 工具设计用于 Agent 交互）。推荐新增独立的 CLI 入口：

```
src/cli/gate-check.ts → gateCheckCommand()
  ├── 读取环境变量 JARVIS_CI
  ├── 调用现有的 getGateOperations / GATE_CHECKS / calculateRiskLevel
  ├── 格式化输出（JSON / text）
  └── process.exit(code)
```

不与 MCP 工具共用函数体，而是复用 gates.ts 中导出的纯函数。这符合单一职责原则。

---

## 九、架构决策记录（ADR）

### ADR-0001：PIPELINE_DEFS 采用扁平结构

**状态**：Proposed

**上下文**：
当前 PIPELINE_DEFS 包含 4 种流水线类型，新需求扩展至 11 种。需要决定是否保持扁平结构还是引入分层命名空间。

**决策**：保持扁平 `Record<string, PipelineDef>` 结构。新 Gate 使用独立前缀（R1-R5, H0-H3, M1-M4, E0-E3, D0-D4, DOC1-DOC2）避免字符串冲突。

**后果**：
- 正面：最小化重构成本，consumer 代码（getPipelineGates / sessionGates）无需修改
- 正面：GATE_CHECKS / GATE_OPERATIONS 等映射表统一用 gate 名作为 key
- 负面：认知混淆风险——`Gate D` 与 `Gate D0` 容易误读，需注释标注所属 pipeline

**考虑的替代方案**：
- 分层结构 `{ development: { full, frontend, backend }, maintenance: { refactor, hotfix }, ... }`：组织更好但 consumer 需重构，且 GATE_CHECKS 等全局映射表需要双层 key

---

### ADR-0002：session_join 白名单动态生成

**状态**：Proposed

**上下文**：
当前 `session_join` 使用硬编码白名单 `['full', 'frontend', 'backend', 'lite']`。新增 7 种 pipeline_type 后需更新此白名单。硬编码存在遗忘风险。

**决策**：将白名单改为 `Object.keys(PIPELINE_DEFS)` 动态生成。

**后果**：
- 正面：新增 pipeline_type 自动生效，消除手动同步错误
- 正面：错误消息自动包含所有有效类型
- 负面：`Object.keys()` 在 V8 中顺序为插入顺序（ES2015 规范），但本场景不依赖顺序
- 安全性：PIPELINE_DEFS 是编译时静态常量，不可运行时注入

**考虑的替代方案**：
- 导出 `VALID_PIPELINE_TYPES` 常量：仍需手动同步，不解决根本问题

---

### ADR-0003：风险评分存储于 pipeline_runs 扩展列

**状态**：Proposed

**上下文**：
需要存储风险评分结果以支持静默通过决策和 Dashboard 展示。

**决策**：扩展 `pipeline_runs` 表，新增 `risk_level`、`risk_score`、`risk_checked_at` 三列。

**后果**：
- 正面：风险评分与 run 是 1:1 关系，存储在同一条记录中简化查询
- 正面：Dashboard 展示 run 列表时无需额外 JOIN
- 负面：`pipeline_runs` 列数持续增长（当前已有 10+ 列），未来可能需要垂直拆分
- SQLite 不支持 `ALTER TABLE ADD COLUMN IF NOT EXISTS`，使用 try/catch 模式

**考虑的替代方案**：
- 独立 `risk_assessments` 表：隔离性好但增加 JOIN 成本，且历史追溯价值有限（每次 run 最多评估一次）

---

### ADR-0004：Gate F 插入 full/frontend/backend 序列

**状态**：Proposed

**上下文**：
需要在 Gate D（审查）与 Gate E（发布）之间插入 Gate F（契约验证），使全流程 Gate 数从 12 增至 13。

**决策**：直接修改 PIPELINE_DEFS 中 full/frontend/backend 的 gates 数组，在 `Gate D` 之后、`Gate E` 之前插入 `Gate F`。GATE_ENTRY_CONDITIONS 中 Gate E 的条件从"Gate D 审查通过"改为"Gate F 契约验证通过"。

**后果**：
- 正面：advance_gate FSM 的索引校验逻辑无需改动
- 正面：进行中会话（停在 Gate D）会自然看到下一个 Gate 为 F
- 负面：Gate E 的通过条件描述需更新，后续 Gate 的语义有轻微变化
- 已有测试中 `getPipelineGates('full')` 的 `.toHaveLength(12)` 断言需更新为 `.toHaveLength(13)`

**考虑的替代方案**：
- Gate F 作为 Gate E 的子步骤：不改变序列长度，但会破坏 FSM 的步进逻辑和契约验证的独立性

---

### ADR-0005：独立测试指令共用 test pipeline_type

**状态**：Proposed

**上下文**：
五个测试指令（/test-unit、/test-integration、/test-e2e、/test-perf、/test-security）需要 pipeline_type 来注册 session 和执行 Gate 检查。

**决策**：全部共用 `test` pipeline_type，Gate 序列为 `['Gate C2']`。不同测试类型通过命令模板的 Agent 路由和技能加载区分，而非通过 pipeline_type。

**后果**：
- 正面：避免创建 5 个仅 Gate 名称不同的 pipeline_type
- 正面：Dashboard 中统一显示为"独立测试"
- 负面：单 Gate pipeline 在 advance_gate 时会立即完成（到达 last gate），这是预期行为

---

## 十、原型验证结果

根据 source-driven-development 准则，以下是基于现有代码逻辑的原型验证。

### 10.1 Gate F 插入 FSM 验证

**验证场景**：模拟 full pipeline 在 Gate D 处推进至 Gate F。

```
Before:
  gates: [A, B-DDD, B-BDD, B-TDD, B1, C, C-impl, C1, C1.5, C2, D, E]
  cur='Gate D', ci=10, gate='Gate E', ti=11
  ti === ci + 1 → true → FSM 允许推进

After (Gate F inserted):
  gates: [A, B-DDD, B-BDD, B-TDD, B1, C, C-impl, C1, C1.5, C2, D, F, E]
  cur='Gate D', ci=10, gate='Gate F', ti=11
  ti === ci + 1 → true → FSM 允许推进

  cur='Gate F', ci=11, gate='Gate E', ti=12
  ti === ci + 1 → true → FSM 允许推进
```

**结论**：FSM 逻辑完全兼容，无需修改 `advance_gate` 函数。

### 10.2 session_join 白名单动态生成验证

```javascript
// 验证脚本（node -e 执行）
const PIPELINE_DEFS = {
  full: {}, frontend: {}, backend: {}, lite: {},
  refactor: {}, hotfix: {}, migrate: {}, evaluate: {},
  debug: {}, doc: {}, test: {},
};
const whitelist = Object.keys(PIPELINE_DEFS);
console.assert(whitelist.includes('refactor'), 'refactor should be in whitelist');
console.assert(whitelist.includes('hotfix'), 'hotfix should be in whitelist');
console.assert(whitelist.length === 11, 'should have 11 types');
console.log('Dynamic whitelist validation: PASSED');
// 输出：Dynamic whitelist validation: PASSED
```

### 10.3 新 Gate 命名唯一性验证

```javascript
// 所有 Gate 名称在全局映射表中必须唯一
const allGates = [
  // full pipeline
  'Gate A','Gate B-DDD','Gate B-BDD','Gate B-TDD','Gate B1',
  'Gate C','Gate C-impl','Gate C1','Gate C1.5','Gate C2',
  'Gate D','Gate F','Gate E',
  // refactor
  'Gate R1','Gate R2','Gate R3','Gate R4','Gate R5',
  // hotfix
  'Gate H0','Gate H1','Gate H2','Gate H3',
  // migrate
  'Gate M1','Gate M2','Gate M3','Gate M4',
  // evaluate
  'Gate E0','Gate E1','Gate E2','Gate E3',
  // debug
  'Gate D0','Gate D1','Gate D2','Gate D3','Gate D4',
  // doc
  'Gate DOC1','Gate DOC2',
];
const unique = new Set(allGates);
console.assert(unique.size === allGates.length,
  `Duplicate gate names: expected ${allGates.length}, got ${unique.size}`);
// 验证通过：所有 Gate 名称唯一
```

### 10.4 risk_level 算法边界验证

| 输入 | 期望 | 推算 |
|------|------|------|
| 1 file, 15 lines, low module | level=low, shouldSkip=true | normFiles=0.5, normLines=0.3, maxCrit=2.0 → score=0.15+0.12+0.6=**0.87** → low |
| 12 files, 500 lines, high module | level=high | normFiles=6.0, normLines=4.0, maxCrit=8.0 → score=1.8+1.6+2.4=**5.8** → medium（注意：期望 high） |
| 4 files, 200 lines, medium module | level=medium | normFiles=2.0, normLines=4.0, maxCrit=5.0 → score=0.6+1.6+1.5=**3.7** → medium |

**发现**：第二个测试用例（12 files, 500 lines, high module）的风险等级为 medium 而非期望的 high。需要调整阈值或权重。

**修正建议**：

```typescript
// 调整归一化上限，使高风险变更更容易触发
const normFiles = Math.min(params.fileCount / 10, 1.0) * 10; // 20 → 10
const normLines = Math.min(params.lineCount / 300, 1.0) * 10; // 500 → 300
// 验证：12 files → min(12/10, 1.0)*10=10, 500 lines → min(500/300, 1.0)*10=10, maxCrit=8.0
// score = 10*0.3 + 10*0.4 + 8.0*0.3 = 3+4+2.4 = 9.4 → high ✓
```

建议在 TASK-ENGINE-003 实现时调整参数，并通过 BDD 场景驱动参数校准。

---

## 十一、风险与迁移路径

### 11.1 风险矩阵

| 风险 | 严重程度 | 概率 | 缓解措施 |
|------|---------|------|---------|
| `gates.ts` 多任务串行冲突 | **高** | 中 | 严格按 TASK-ENGINE-001 → 003 → AGENT-003 顺序执行，完成后锁定 |
| Gate F 插入导致已有 Dashboard 展示异常 | **中** | 低 | 前端 GATE_COLORS/LABELS 需同步更新（TASK-WEB-001） |
| 风险评分阈值误判（false positive/negative） | **中** | 高 | 通过 BDD 场景驱动参数校准，提供可配置的 MODULE_CRITICALITY_PATTERNS |
| `quality-gates.yml` 解析失败导致引擎阻塞 | **中** | 低 | try/catch 包裹 YAML 解析，失败时使用默认配置并记录 warning |
| SQLite 并发 DDL（多实例同时 ALTER TABLE） | **低** | 极低 | try/catch 包裹 DDL，重复执行静默忽略 |
| 新 pipeline_type 在旧版 Web 面板显示异常 | **低** | 中 | Web 面板从 PIPELINE_DEFS 动态获取 pipeline_type 列表，天然兼容 |

### 11.2 迁移路径

```
阶段 0（当前状态）：
  4 pipeline_type, 12 Gate full 序列, 硬编码白名单

阶段 1（TASK-ENGINE-001 完成）：
  + PIPELINE_DEFS 扩展至 11 类型
  + full/frontend/backend 包含 Gate F
  + session_join 动态白名单
  + GATE_CHECKS/OPERATIONS/AGENT_GUIDE/DIRS/MAX_RETRY/ENTRY_CONDITIONS 全部扩展
  → 立即生效，无需数据迁移

阶段 2（TASK-ENGINE-002 完成）：
  + quality_gate_results 表
  + quality-gates.yml 配置系统
  + quality_gates MCP 工具
  + /api/quality-gates 端点
  → SQLite ALTER TABLE，新安装自动创建

阶段 3（TASK-ENGINE-003 完成）：
  + pipeline_runs 新增 risk_level/risk_score/risk_checked_at 列
  + risk_assess MCP 工具
  + MODULE_CRITICALITY_PATTERNS 映射表
  + gate_check 集成风险评分
  → SQLite ALTER TABLE，历史 run 保持 NULL

阶段 4（TASK-CLI-001 完成）：
  + gate-check CLI
  + JARVIS_CI 环境变量支持
  + 非交互模式 JSON 输出
  → 无数据库变更

回滚方案：
  - PIPELINE_DEFS 回退到 4 类型，删除 7 个新条目 + Gate F
  - session_join 白名单恢复硬编码
  - quality_gate_results 表保留但不查询（不删除避免数据丢失）
  - pipeline_runs 新列保留但不使用
```

### 11.3 文件锁策略

```
第 1 轮（严格串行，不可并行）：
  TASK-ENGINE-001 → gates.ts (+~200 行) + server.ts (+~60 行) + tests
  TASK-ENGINE-002 → db.ts (+~40 行) + server.ts (+~80 行) + tests
  TASK-ENGINE-003 → gates.ts (+~30 行) + server.ts (+~60 行) + tests
  TASK-ENGINE-004 → tests（回归验证）

  串行顺序：001 → 002 → 003 → 004
  理由：server.ts 被 001/002/003 同时修改，gates.ts 被 001/003 同时修改

第 2 轮（全并行）：
  14 个命令模板（独立文件，零冲突）
  4 个 Agent/Skill 模板（独立文件，零冲突）

第 3 轮（并行，依赖第 1 轮）：
  TASK-WEB-001/002/003（前端文件，依赖引擎 API 就绪）
  TASK-CLI-001（CLI 文件，依赖 gates.ts 导出函数）
```

---

## 十二、总结与建议

### 架构评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 扩展性 | 8/10 | PIPELINE_DEFS 扁平结构可容纳更多类型，但 11 个类型后继续增长需考虑分组 |
| 一致性 | 9/10 | 新 Gate 的 GATE_CHECKS/OPERATIONS/AGENT_GUIDE 与现有模式完全一致 |
| 兼容性 | 9/10 | Gate F 插入对 FSM 零破坏，动态白名单消除手动同步 |
| 安全性 | 8/10 | 白名单动态化降低了注入风险，但需确认 zod 校验在前 |
| 运维 | 7/10 | quality-gates.yml 两层配置覆盖增加了配置管理复杂度 |
| 性能 | 10/10 | 所有变更均为内存查找或单表单行查询，零性能影响 |

### 关键建议

1. **PIPELINE_DEFS 扩展**：采用建议的扁平结构 + 独立前缀方案，11 种类型合理
2. **session_join 白名单**：强制使用 `Object.keys(PIPELINE_DEFS)` 动态生成，消除维护负担
3. **Gate F 插入**：零风险，FSM 完全兼容，仅需更新测试断言
4. **风险评分参数**：在 TASK-ENGINE-003 实现时通过 BDD 场景校准（见 10.4 节发现）
5. **数据库变更**：`quality_gate_results` 新表 + `pipeline_runs` 扩展列，SQLite try/catch 模式保证向前兼容
6. **CI 模式**：独立 CLI 入口，不与 MCP 工具耦合，复用 gates.ts 纯函数
7. **执行顺序**：严格遵守 TASK-ENGINE-001 → 002 → 003 → 004 串行顺序，不可打乱

### 需要编排者决策的问题

1. **test pipeline_type 的 session_join 行为**：5 个测试指令共用 `test` 类型，session_join 时传入 `pipeline_type: 'test'` 后，Gate 序列只有 `['Gate C2']`。这符合设计意图吗？还是需要每个测试指令有独立的单 Gate 序列？
2. **`/jarvis-change` 的 pipeline_type**：建议不创建独立的 pipeline_type，而是在已有 run 内通过编排者逻辑实现中途变更。需要确认这符合产品预期。
3. **`risk_level` 阈值校准**：原型验证发现推荐的参数（fileCount/20, lineCount/500）可能使中度风险难以达到 `high` 级别。建议在 TASK-ENGINE-003 实现时附带参数校准文档。
