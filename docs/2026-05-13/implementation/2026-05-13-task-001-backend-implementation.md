# TASK-001 后端实现文档：引擎层流水线注册 + session_join 白名单 + 路由分类 + command 占位文件

## 1. 当前实现目标
在贾维斯 Agent Factory 引擎中注册 5 条新流水线（refactor/hotfix/migrate/evaluate/debug），同步修复 server.ts/routes.ts 中的硬编码白名单，并创建 10 个新 command 占位文件。

## 2. 对应需求 ID / 任务 ID
- REQ-020 / TASK-001

## 3. 输入依据
- 任务文档：编排者分配的 TASK-001 Execution Packet
- 架构评审：docs/2026-05-13/architecture/backend-arch-review.md（风险 #1/#2/#4）
- 现有代码：
  - src/engine/gates.ts（PIPELINE_DEFS, GATE_OPERATIONS, GATE_AGENT_GUIDE, GATE_DIRS, GATE_CHECKS, MAX_RETRY, GATE_ENTRY_CONDITIONS）
  - src/engine/server.ts（session_join 白名单 line 358）
  - src/web/routes.ts（inferPipelineType line 835, inferCategory line 848）
- ADR-001：Gate 命名前缀隔离（R1-R5, H0-H3, M1-M4, E0-E3, D0-D4）

## 4. 变更文件 / 变更范围

| 文件 | 操作 | 变更说明 |
|------|------|---------|
| src/engine/gates.ts | 修改 | PIPELINE_DEFS +5条流水线；GATE_DIRS +22条；GATE_CHECKS +22条；GATE_OPERATIONS +22条；GATE_AGENT_GUIDE +22条；MAX_RETRY +22条；GATE_ENTRY_CONDITIONS +18条 |
| src/engine/server.ts | 修改 | session_join 白名单从4种扩展到9种（line 358-363） |
| src/web/routes.ts | 修改 | inferPipelineType 新增5种返回值（line 840-844）；inferCategory 新增6种分类（line 854-859） |
| tests/gates.test.ts | 修改 | 新增37个TDD测试用例（8组describe），更新原有计数测试 |
| .claude/commands/test-unit.md | 新建 | 单元测试指令占位文件 |
| .claude/commands/test-integration.md | 新建 | 集成测试指令占位文件 |
| .claude/commands/test-e2e.md | 新建 | 端到端测试指令占位文件 |
| .claude/commands/test-perf.md | 新建 | 性能测试指令占位文件 |
| .claude/commands/test-security.md | 新建 | 安全测试指令占位文件 |
| .claude/commands/refactor.md | 新建 | 重构流水线指令占位文件 |
| .claude/commands/hotfix.md | 新建 | 热修复流水线指令占位文件 |
| .claude/commands/migrate.md | 新建 | 迁移流水线指令占位文件 |
| .claude/commands/evaluate.md | 新建 | 评估流水线指令占位文件 |
| .claude/commands/debug.md | 新建 | 调试流水线指令占位文件 |

**未修改文件**：engine/db.ts, web/src/, .claude/agents/, .claude/skills/, .jarvis/, docs/flows/（符合约束）

## 5. 实现说明

### 5.1 PIPELINE_DEFS（5条新流水线）
在现有 full/frontend/backend/lite 基础上，新增：
- `refactor`（重构，5 Gate: R1-R5）
- `hotfix`（紧急热修复，4 Gate: H0-H3）
- `migrate`（框架迁移，4 Gate: M1-M4）
- `evaluate`（技术评估，4 Gate: E0-E3）
- `debug`（调试诊断，5 Gate: D0-D4）

已有4条流水线的 PIPELINE_DEFS 条目完全未修改，仅新增。

### 5.2 GATE_OPERATIONS（22条新矩阵）
每个新 Gate 严格按任务需求设置 allow/deny 矩阵：
- H0/D0/E0/R1/R5/D4 等文档阶段：仅 allow read+write_doc
- R3/H1/D1/D2/E1/M2 等实现阶段：allow read+write_code+spawn_impl
- R2/R4/H2/E2 等测试阶段：allow read+spawn_test
- H3（事后审计）：allow read+review+audit+deploy+write_doc
- D3（交互诊断）：allow read+write_code+spawn_impl+spawn_test
- M3/M4（构建Lint）：allow read+lint+build+fix
- 所有Gate统一 deny deploy（除 H3 外）

### 5.3 GATE_AGENT_GUIDE（22条新指引）
按任务需求设置每个 Gate 的 can_spawn 清单和 note。

### 5.4 MAX_RETRY 特殊值
- H0: 1（审批拒绝不重试）
- H3: Infinity（合规审计不可跳过）
- D3: Infinity（交互式诊断可无限重试）
- M4: 2
- 其他新 Gate: 默认 2

### 5.5 session_join 白名单
server.ts:358 扩展 VALID_PIPELINE_TYPES 数组，从 4 种增加到 9 种，错误消息动态生成。

### 5.6 inferPipelineType / inferCategory
routes.ts 两函数均按架构文档风险 #2 建议扩展，新增 refactor/hotfix/migrate/evaluate/debug 返回值。
inferCategory 新增 test/refactor/hotfix/migrate/evaluate/debug 分类，原有逻辑保留。

## 6. 测试和验证结果

### 6.1 测试文件
文件路径：`tests/gates.test.ts`
测试框架：vitest

新增测试组：
1. **TASK-001: PIPELINE_DEFS 新增 5 条流水线**（8个测试）
   - 5条新流水线存在性、Gate序列正确性、中文名称
   - 已有4条流水线 Gate序列不变

2. **TASK-001: GATE_OPERATIONS 注册 22 个新 Gate**（7个测试）
   - 总数34个（12原有+22新增）
   - H0 deny规则（write_code/spawn_impl/spawn_test/build/deploy）
   - H3 allow规则（deploy/review/audit）
   - D0 deny规则
   - R3 allow/deny规则
   - E1 deny deploy

3. **TASK-001: GATE_AGENT_GUIDE 注册 22 个新 Gate**（5个测试）
   - 所有Gate有GUIDE条目
   - H0 can_spawn为空（人工介入）
   - H1 can_spawn含实现Agent
   - R3 can_spawn含全部8种实现Agent
   - H3 can_spawn含审查/审计/文档Agent

4. **TASK-001: GATE_DIRS 映射**（6个测试）
   - 按流水线类型分组验证目录映射

5. **TASK-001: GATE_CHECKS 检查条件**（1个测试）
   - 所有Gate有非空check字符串

6. **TASK-001: MAX_RETRY 设置**（6个测试）
   - H0=1, H3=Infinity, D3=Infinity, M4=2
   - 其他新Gate默认=2

7. **TASK-001: GATE_ENTRY_CONDITIONS 入口条件**（4个测试）
   - 18条条件存在性
   - R2/H1/D1前置Gate引用正确

### 6.2 运行测试命令
```bash
cd E:/CodeStore/jarvis && npx vitest run tests/gates.test.ts
```

## 7. 数据与接口边界

### 7.1 接口影响
- `getPipelineGates(type)`: 支持 refactor/hotfix/migrate/evaluate/debug 5种新类型
- `getPipelineName(type)`: 返回新流水线中文名称
- `getGateOperations(gate)`: 支持 R1-R5/H0-H3/M1-M4/E0-E3/D0-D4 22个新Gate
- `getGateAgentGuide(gate)`: 同上
- `findGateArtifacts(docsDir, gate)`: 支持新Gate的GATE_DIRS映射
- `findSessionGateArtifacts(docsDir, gate, sessionId, db, runId)`: 同上

### 7.2 数据库影响
无。所有新Gate信息均存储在代码常量中，不涉及数据库Schema变更。

### 7.3 向后兼容性
- 已有4条流水线（full/frontend/backend/lite）的PIPELINE_DEFS未修改
- 已有12个Gate的所有映射表值不变
- FSM逻辑（advance_gate）通用，对新流水线自动生效
- 未知pipeline_type仍然回退到默认流水线(full)

## 8. 风险 / 未解决项

| 风险 | 状态 | 缓解 |
|------|------|------|
| gate_check操作枚举新增 | 未做 | 现有12种操作类型已覆盖所有新Gate需求，暂不新增。若后续发现无法表达，再扩展z.enum() |
| 10个command占位文件未创建 | 待解决 | 因工具权限限制，Write/Bash(create)被禁止。需手动创建（见第9节） |
| 测试未运行验证 | 待解决 | 因Bash被禁止运行npx命令。需手动运行验证 |

## 9. 需要前端配合的点
- Web面板 Commands API (`/api/commands`) 会通过 inferPipelineType/inferCategory 返回新分类，前端需对应展示
- Dashboard 可能需为新流水线类型添加对应的视觉样式/图标

## 10. 推荐的下一步
1. **立即执行**：手动创建10个command占位文件（详见下方）
2. **立即执行**：运行测试验证（`npx vitest run tests/gates.test.ts`）
3. **立即执行**：运行 lint + typecheck（`npm run lint && npm run typecheck`）
4. TASK-002：质量门禁系统（依赖TASK-001的新Gate定义）
5. TASK-003~007：为5个test command编写详细prompt

---

## 附录：10个Command占位文件需手动创建

由于环境权限限制，以下10个文件需手动在 `.claude/commands/` 下创建：

### 1. .claude/commands/test-unit.md
```yaml
---
name: test-unit
description: 单元测试——运行项目单元测试套件，验证函数/方法/类级别的行为正确性
model: inherit
---
<!-- 详细 prompt 由后续 TASK 编写 -->
```

### 2. .claude/commands/test-integration.md
```yaml
---
name: test-integration
description: 集成测试——验证多组件协作（API+DB、Service+Repository）的正确性
model: inherit
---
<!-- 详细 prompt 由后续 TASK 编写 -->
```

### 3. .claude/commands/test-e2e.md
```yaml
---
name: test-e2e
description: 端到端测试——验证完整用户旅程（登录→操作→退出）的正确性
model: inherit
---
<!-- 详细 prompt 由后续 TASK 编写 -->
```

### 4. .claude/commands/test-perf.md
```yaml
---
name: test-perf
description: 性能测试——负载/压力/基准测试，验证系统性能指标
model: inherit
---
<!-- 详细 prompt 由后续 TASK 编写 -->
```

### 5. .claude/commands/test-security.md
```yaml
---
name: test-security
description: 安全测试——OWASP/CVE/SAST/DAST/密钥检测安全审计
model: inherit
---
<!-- 详细 prompt 由后续 TASK 编写 -->
```

### 6. .claude/commands/refactor.md
```yaml
---
name: refactor
description: 重构流水线——定义边界→基线测试→执行重构→行为漂移检测→生成报告
model: inherit
---
<!-- 详细 prompt 由后续 TASK 编写 -->
```

### 7. .claude/commands/hotfix.md
```yaml
---
name: hotfix
description: 紧急热修复——紧急声明→最小化修复→快速验证+回滚→事后审计
model: inherit
---
<!-- 详细 prompt 由后续 TASK 编写 -->
```

### 8. .claude/commands/migrate.md
```yaml
---
name: migrate
description: 框架迁移——验证规则→应用迁移→编译验证→自动修复Lint
model: inherit
---
<!-- 详细 prompt 由后续 TASK 编写 -->
```

### 9. .claude/commands/evaluate.md
```yaml
---
name: evaluate
description: 技术评估——定义标准→生成原型→收集指标→生成报告
model: inherit
---
<!-- 详细 prompt 由后续 TASK 编写 -->
```

### 10. .claude/commands/debug.md
```yaml
---
name: debug
description: 调试诊断——收集信息→复现用例→调试会话→交互诊断→输出报告
model: inherit
---
<!-- 详细 prompt 由后续 TASK 编写 -->
```
