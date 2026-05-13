# TASK-002: 质量门禁配置与引擎逻辑 — 后端实现文档

> 实现日期: 2026-05-13
> 对应需求 ID: REQ-007 / 场景 1+4
> 对应任务 ID: TASK-002
> TDD 策略: Red → Green → Refactor

---

## 1. 当前实现目标

创建质量门禁配置系统（quality-gates.yml + quality-gate.ts + 门禁判定服务 + DB 扩展），使引擎在 Gate C2/D 处自动执行门禁判定。

## 2. 对应需求 ID / 任务 ID

- **REQ-007**: quality-gates.yml 质量门禁系统
- **TASK-002**: 质量门禁配置与引擎逻辑
- **BDD 场景**: 场景 1（/test-unit 覆盖率门禁）、场景 4（quality-gates.yml 质量门禁阻断）
- **架构评审**: 风险 #7（数据库 checkpoints 迁移方案）

## 3. 输入依据

- `docs/2026-05-13/architecture/backend-arch-review.md` — 风险 #7 + ADR-002（TEXT 列存 JSON）
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-bdd.md` — 场景 1/4 的 Gherkin 验收标准
- `src/engine/gates.ts` — TASK-001 的 GATE_CHECKS 结构
- `src/engine/db.ts` — checkpoints 表现有结构
- 任务分配的 in_scope 清单

## 4. 变更文件 / 变更范围

### 4.1 新建文件

| 文件 | 说明 |
|------|------|
| `.jarvis/quality-gates.yml` | 质量门禁 YAML 配置模板（含 default + strict 两个 profile） |
| `src/engine/quality-gate.ts` | 核心实现：配置加载/解析/校验 + 门禁判定逻辑 |
| `tests/quality-gate.test.ts` | 12 个 TDD 单元测试 |

### 4.2 修改文件

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| `src/engine/gates.ts` | Gate C2/D 的 GATE_CHECKS 文字细化，引用 quality-gates.yml 阈值 | ~2 行 |
| `src/engine/db.ts` | checkpoints 表新增 `violations` TEXT + `quality_profile_source` TEXT 列；`addCheckpoint()` 函数签名扩展 | ~14 行 |

### 4.3 未修改的禁止路径（确认合规）

- `src/engine/server.ts` — 未修改（TASK-001 的变更已存在）
- `src/web/routes.ts` — 未修改（TASK-001 的变更已存在）
- `web/src/` — 未涉及
- `.claude/commands/` — 未涉及
- `.claude/skills/` — 未涉及
- `.claude/agents/` — 未涉及

## 5. 实现说明

### 5.1 quality-gates.yml 模板（`.jarvis/quality-gates.yml`）

```yaml
version: "1.0"
profiles:
  default:
    unit_test_coverage: 80
    unit_test_pass_rate: 100
    integration_test_pass_rate: 100
    e2e_test_pass_rate: 100
    lint_errors: 0
    type_errors: 0
    security_critical: 0
    security_high: 2
    performance_regression_pct: 10
  strict:
    unit_test_coverage: 90
    security_critical: 0
    security_high: 0
```

注意：`.jarvis/` 目录在 `.gitignore` 中已排除，此文件作为项目本地配置模板使用。

### 5.2 QualityProfile 值对象（`src/engine/quality-gate.ts`）

定义了 6 个核心类型：

| 类型 | 说明 |
|------|------|
| `QualityThreshold` | 9 个质量指标阈值的数值结构 |
| `QualityProfileSource` | 配置来源：`'DEFAULT'` / `'PROJECT'` / `'FALLBACK'` |
| `QualityProfile` | 质量档案：含 source、profileName、thresholds、parseError? |
| `Violation` | 单个违反项：metric、actual、threshold、operator、severity、message |
| `EvaluationResult` | 判定结果：passed、violations[]、warnings[]、profileSource |

### 5.3 降级路径（loadQualityGates）

```
尝试加载 .jarvis/quality-gates.yml
  ├─ 文件不存在 → DEFAULT (source=DEFAULT)
  ├─ 文件存在 + YAML 解析成功 + 阈值合法 → PROJECT (source=PROJECT)
  ├─ YAML 解析失败 → FALLBACK (source=FALLBACK, parseError=错误消息)
  ├─ profiles.default 缺失 → FALLBACK
  └─ 自定义阈值 < 默认值 50% → FALLBACK（硬约束）
```

**50% 硬约束**：仅对 `unit_test_coverage`、`unit_test_pass_rate`、`integration_test_pass_rate`、`e2e_test_pass_rate` 生效。安全/Lint 类指标（`security_critical`、`lint_errors` 等）不做 50% 判定。

### 5.4 指标比较规则（METRIC_RULES）

| 指标 | 操作符 | 严重度 | 说明 |
|------|--------|--------|------|
| unit_test_coverage | `>=` | block | 实际值 >= 阈值 |
| unit_test_pass_rate | `>=` | block | 实际值 >= 阈值 |
| integration_test_pass_rate | `>=` | block | 实际值 >= 阈值 |
| e2e_test_pass_rate | `>=` | block | 实际值 >= 阈值 |
| lint_errors | `<=` | block | 实际值 <= 阈值 |
| type_errors | `<=` | block | 实际值 <= 阈值 |
| security_critical | `<=` | block | 实际值 <= 阈值（强制阻断） |
| security_high | `<=` | warn | 实际值 <= 阈值（警告不阻断） |
| performance_regression_pct | `<=` | block | 实际值 <= 阈值 |

### 5.5 QualityGateEvaluationService（evaluateQualityGate）

逐条件比对逻辑：
1. 遍历传入的 `metrics` 对象
2. 对每个 metric，查找 `METRIC_RULES` 获取比较规则
3. 从 `profile.thresholds` 获取阈值
4. 根据 operator（`>=` 或 `<=`）判断是否不达标
5. 不达标的项：block → `violations[]`，warn → `warnings[]`
6. 返回 `{ passed (violations.length === 0), violations, warnings, profileSource }`

### 5.6 Gate C2/D 检查条件更新（gates.ts）

```typescript
// Gate C2 原文本
'测试文档用例覆盖完整，单元/集成/E2E/浏览器测试全部通过，API契约验证通过'
// Gate C2 新文本
'quality-gates.yml门禁判定通过：单元测试覆盖率/通过率≥阈值、集成/E2E测试通过率≥阈值、Lint/类型错误≤阈值；测试文档用例覆盖完整，API契约验证通过'

// Gate D 原文本
'领域审查+安全审计+性能审计通过，REQ追踪矩阵完整'
// Gate D 新文本
'领域审查+安全审计+性能审计通过；quality-gates.yml门禁判定通过：安全严重漏洞=0、高危漏洞≤阈值、性能回归≤阈值；REQ追踪矩阵完整'
```

### 5.7 数据库扩展（db.ts）

```sql
ALTER TABLE checkpoints ADD COLUMN violations TEXT;
ALTER TABLE checkpoints ADD COLUMN quality_profile_source TEXT;
```

采用 SQLite `ALTER TABLE ADD COLUMN`（低成本操作，不影响已有数据）。迁移代码遵循项目现有的 `try/catch` 模式。

`addCheckpoint()` 函数签名从 5 参数扩展到 7 参数：
```typescript
export function addCheckpoint(db, gate, advanceTo, sessionId,
  durationSeconds?: number,
  violations?: string,            // 新增
  qualityProfileSource?: string   // 新增
)
```

向后兼容：旧调用（4-5 参数）仍正常工作。

## 6. 测试和验证结果

### 6.1 12 个 TDD 测试用例

| # | 测试名称 | 分类 | 预期行为 |
|---|---------|------|---------|
| 1 | `文件缺失 → 返回 DEFAULT 配置` | 降级路径 | source=DEFAULT, 使用内置默认阈值 |
| 2 | `文件存在且合法 → 返回 PROJECT 配置` | 正常路径 | source=PROJECT, 使用合并后的项目阈值 |
| 3 | `YAML 语法错误 → 回退 DEFAULT` | 降级路径 | source=FALLBACK, parseError 有值 |
| 4 | `自定义阈值 < 默认值 50% → FALLBACK` | 硬约束 | coverage=30 < 40 → FALLBACK |
| 5 | `全部达标 → passed=true` | 正向路径 | passed=true, violations=[] |
| 6 | `覆盖率低于阈值 → passed=false` | 阻断逻辑 | violations 含 unit_test_coverage block |
| 7 | `安全高危漏洞 > 0 → passed=false` | 阻断逻辑 | violations 含 security_critical block |
| 8 | `安全 high 超阈值 → passed=true 但有 warnings` | warn 逻辑 | passed=true, warnings 含 security_high |
| 9 | `lint_errors > 0 → passed=false` | 阻断逻辑 | violations 含 lint_errors block |
| 10 | `覆盖率精确等于阈值 → passed=true` | 边界条件 | 80 >= 80, passed=true |
| 11 | `addCheckpoint 支持 violations + quality_profile_source 写入` | DB 扩展 | violations/quality_profile_source 正确存储 |
| 12 | `addCheckpoint 兼容旧调用（无扩展参数）` | 向后兼容 | 旧签名调用，新列为 NULL |

### 6.2 验证状态

- [ ] 类型检查通过（`tsc --noEmit`）— 需用户执行
- [ ] 测试通过（`npx vitest run tests/quality-gate.test.ts`）— 需用户执行
- [ ] Lint 通过 — 需用户执行
- [x] 代码审查完成 — 自身静态分析无问题
- [x] 向后兼容确认 — addCheckpoint 旧签名不受影响

**注意**: 由于环境权限限制，无法在本 session 中直接运行 `tsc`、`vitest`、`eslint` 命令。代码已经过静态分析验证：
- 所有 import 使用正确的 `.js` 扩展名（NodeNext 规范）
- `yaml` 包通过 `import { parse } from 'yaml'` 引用，项目已有该依赖
- 类型签名一致，无循环依赖
- 所有导出项及其类型已完整定义

## 7. 数据与接口边界

### 7.1 数据边界

| 边界 | 说明 |
|------|------|
| 配置存储 | `.jarvis/quality-gates.yml`（项目本地，gitignored） |
| DB 存储 | `checkpoints.violations` (TEXT/JSON), `checkpoints.quality_profile_source` (TEXT) |
| 内存表示 | `QualityProfile` 对象，仅在门禁判定周期内存活 |

### 7.2 接口契约

**导出函数**（`src/engine/quality-gate.ts`）：

```typescript
// 加载配置
loadQualityGates(projectRoot: string): QualityProfile

// 执行判定
evaluateQualityGate(profile: QualityProfile, metrics: Record<string, number>): EvaluationResult
```

**导出类型**：`QualityThreshold`, `QualityProfile`, `QualityProfileSource`, `Violation`, `EvaluationResult`

### 7.3 调用方

- 引擎在 Gate C2/D 推进时调用 `loadQualityGates` + `evaluateQualityGate`
- `addCheckpoint` 接收 violations JSON 存储到 checkpoints 表

## 8. 风险 / 未解决项

### 8.1 已知风险

| 风险 | 严重度 | 说明 | 缓解 |
|------|--------|------|------|
| `yaml` 包非直接依赖 | 中 | `yaml` 是 `@modelcontextprotocol/sdk` 的传递依赖，非 `package.json` 直接声明 | 若 yaml 不可用，模块 import 失败会导致 `quality-gate.ts` 加载失败。建议：在 `package.json` 中显式添加 `"yaml": "^2.8.4"` 为 `dependencies` |
| 测试未实际运行 | 中 | 环境限制无法执行 `npx vitest run` | 代码已经过静态分析验证（类型、导入、逻辑），但建议在提交前手动运行测试确认 12 个用例全部 GREEN |
| `.jarvis/quality-gates.yml` 被 gitignore | 低 | 模板文件不会被提交到仓库 | 符合设计预期（项目级本地配置），需在文档中说明用户须手动创建或通过引擎初始化生成 |

### 8.2 未解决项

1. **yaml 依赖声明**: 需在独立任务中将 `yaml` 添加到 `package.json` 的 `dependencies` 中（当前在 `allowed_paths` 之外）
2. **pipeline_guide 集成**: `quality_profile_warning` 字段（FALLBACK 时向编排者告警）尚未集成到 `pipeline_guide` MCP 工具响应中 — 此为后续消费端任务
3. **Gate C2/D 的实际调用点**: `registerMcpTools` 中的 `advance_gate` 逻辑尚未调用 `loadQualityGates` + `evaluateQualityGate` — 此为后续集成任务（TASK-XXX）

## 9. 需要前端配合的点

1. **WebPanel Dashboard** — Gate C2/D 的状态显示应能读取 `checkpoints.violations` 字段显示阻断详情
2. **WebPanel Dashboard** — Gate 状态颜色区分：绿色(通过)、红色(block)、黄色(warn)、灰色(未执行)

## 10. 推荐的下一步

1. **立即执行**: 运行 `npx vitest run tests/quality-gate.test.ts` 确认 12 个测试用例全部 GREEN
2. **立即执行**: 运行 `npx tsc --noEmit` 确认类型检查通过
3. **后续任务**: 在 `src/engine/server.ts` 的 `advance_gate` 逻辑中集成 `loadQualityGates` + `evaluateQualityGate` 调用，使 Gate C2/D 的 FSM 行为与门禁判定联动
4. **后续任务**: 将 `yaml` 添加到 `package.json` 的 `dependencies` 中
5. **后续任务**: 在 `pipeline_guide` MCP 响应中追加 `quality_profile_warning` 字段（FALLBACK 时）
6. **后续任务**: WebPanel 前端适配 violations 展示和 Gate 状态颜色

---

## 附录 A: 文件路径清单

- `E:\CodeStore\jarvis\.jarvis\quality-gates.yml` — 质量门禁配置模板（新建）
- `E:\CodeStore\jarvis\src\engine\quality-gate.ts` — 核心实现（新建）
- `E:\CodeStore\jarvis\tests\quality-gate.test.ts` — TDD 测试（新建）
- `E:\CodeStore\jarvis\src\engine\gates.ts` — Gate C2/D GATE_CHECKS 更新（修改）
- `E:\CodeStore\jarvis\src\engine\db.ts` — checkpoints 表扩展 + addCheckpoint 更新（修改）
