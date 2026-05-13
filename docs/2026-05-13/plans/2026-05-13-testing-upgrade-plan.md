# 执行计划：贾维斯测试体系化升级 & 新指令流程 & 全平台 Gate 适配

> 需求文档: `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md`
> 任务文档: `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md`
> DDD 分析: `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-ddd.md`
> BDD 场景: `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-bdd.md`
> 后端架构评审: `docs/2026-05-13/architecture/backend-arch-review.md`
> 前端架构评审: `docs/2026-05-13/architecture/frontend-arch-review.md`
> 日期: 2026-05-13
> 版本: v1.0

---

## 1. Gate B 前置检查通过声明

| 检查项 | 状态 |
|--------|------|
| 任务 ID 完整（TASK-XXX 格式，TASK-001 ~ TASK-021） | 通过 |
| 每个任务映射到至少一个 REQ-XXX | 通过（覆盖矩阵 100%） |
| 类型完整（前端/后端/共享/测试） | 通过 |
| 优先级完整（P0/P1/P2）、完成标准完整 | 通过 |
| DDD 分类完整 | 通过（TASK-002/009/010/013 标记为 DDD） |
| TDD / 非TDD / manual_only 分类完整 | 通过 |
| 风险任务已标注、文件所有权提醒已写明 | 通过 |
| 测试 expert 分配完整 | 通过（TDD 任务自包含 Red-Green-Refactor，非TDD 任务通过集成验证） |
| E2E 测试已分配且位于独立批次 | 通过（TASK-020 manual_only 人工验证） |

---

## 2. 当前轮次目标与范围

### 轮次目标

本轮次为**全量 3 轮交付中的第 1 轮**，聚焦 P0 引擎基础设施。后续第 2/3 轮由本计划文档的 Batch 2-5 覆盖，按优先级顺序执行。

### 第 1 轮范围（P0，引擎根基）

- TASK-001: 引擎层流水线注册（REQ-020）
- TASK-002: 质量门禁配置与引擎逻辑（REQ-007）

### 第 2 轮范围（P1，测试体系 + 核心指令，预计后续批次）

- TASK-003 ~ TASK-014: 测试指令 + 5 条新指令 + bug-fix 增强 + 5 个新 Skill

### 第 3 轮范围（P2，平台补齐 + 面板适配 + 优化）

- TASK-015 ~ TASK-021: 平台 Gate B + API 文档 + 流水线优化 + CI/CD + Web 面板 + 流程图

---

## 3. 完成标准

- [ ] TASK-001 的 17 个 TDD 测试用例全部 GREEN（Red → Green → Refactor 完成）
- [ ] 5 条新流水线在 `PIPELINE_DEFS` 中正确注册，FSM 硬约束对新 Gate 生效
- [ ] `session_join` 白名单接受 5 种新 pipeline_type
- [ ] `inferPipelineType` / `inferCategory` 正确识别新指令类型
- [ ] TASK-002 的 12 个 TDD 测试用例全部 GREEN
- [ ] `.jarvis/quality-gates.yml` 模板创建并加载正常
- [ ] QualityGateEvaluationService 门禁判定逻辑正确（block/warn/复合失败）
- [ ] 已有 4 条流水线行为不变（NFR-03 兼容性验证通过）
- [ ] 引擎 checkpoints 表扩展完成且回退兼容

---

## 4. 架构评审发现的关键风险（必须在 TASK-001 中修复）

后端架构评审（`docs/2026-05-13/architecture/backend-arch-review.md`）发现以下 P0 阻塞问题，已纳入 TASK-001 实现范围：

| 风险编号 | 严重度 | 位置 | 描述 | 修复措施 |
|---------|--------|------|------|---------|
| #1 | 严重 | `server.ts:358` | `session_join` 白名单只含 full/frontend/backend/lite | 扩展为包含 refactor/hotfix/migrate/evaluate/debug |
| #2 | 严重 | `routes.ts:835,848` | `inferPipelineType` / `inferCategory` 不识别新指令 | 增加 5 种 pipeline 类型和 5 种 category 识别规则 |
| #4 | 高 | `gates.ts:54` | `GATE_DIRS` 缺少新 Gate 映射 | 为 22 个新 Gate 补充 docs/ 子目录映射 |

**关键修正**: TASK-001 的实现范围从仅 `gates.ts` 扩展为同时修改 4 个文件：`gates.ts`、`server.ts`、`routes.ts`、以及 10 个 command 占位文件。

---

## 5. 共享区域唯一责任方声明

| 共享文件 | 唯一写入方 | 读写限制 |
|---------|-----------|---------|
| `src/engine/gates.ts` | TASK-001（主写），TASK-002（追加 GATE_CHECKS） | 串行：TASK-002 必须在 TASK-001 完成后执行 |
| `src/engine/server.ts` | TASK-001（session_join 白名单 + gate_check 枚举），TASK-018（gate-check CLI 工具函数） | 串行：TASK-018 必须在 TASK-001 完成后执行 |
| `src/web/routes.ts` | TASK-001（inferPipelineType + inferCategory） | 唯一写入，TASK-020 不修改此文件 |
| `src/engine/db.ts` | TASK-002（checkpoints 表扩展） | 唯一写入方 |
| `.jarvis/quality-gates.yml` | TASK-002 | 唯一写入方 |
| 10 个新建 command .md 文件 | 各对应任务（TASK-003~012, 017, 019） | 各自独立文件，零冲突 |
| 5 个新建 Skill 目录 | 各对应任务（TASK-006, 007, 008, 009, 013） | 各自独立目录，零冲突 |
| `.claude/commands/bug-fix.md` | TASK-014 | 唯一写入方 |
| `.claude/agents/planner.md` | TASK-017 | 唯一写入方 |
| `.claude/agents/api-contract-expert.md` | TASK-016 | 唯一写入方 |
| 5 个平台 command 文件 | TASK-015 | 各自独立文件，零冲突 |
| `web/src/*`（前端文件） | TASK-020 | 唯一写入方 |
| `docs/flows/*`（10+ 新文件） | TASK-021 | 各自独立文件，零冲突 |

---

## 6. 变更规模控制

任务文档预估总变更 ~4340 行（21 个任务）。分为 3 个交付轮次：

| 轮次 | 预估变更行数 | 任务数 |
|------|-------------|--------|
| 第 1 轮（P0 引擎） | ~520 行 | 2 |
| 第 2 轮（P1 测试体系 + 核心指令） | ~2500 行 | 12 |
| 第 3 轮（P2 平台 + 面板 + 优化） | ~1320 行 | 7 |

第 1 轮在 1000 行约束内。第 2/3 轮均超过 1000 行，建议各拆分为 2-3 个子轮次执行。

---

## 7. 垂直切片检查

| 任务 | 垂直切片？ | 说明 |
|------|-----------|------|
| TASK-001 | 是 | 引擎注册 + server 白名单 + routes 路由 + command 占位 = 端到端可验证的新流水线识别 |
| TASK-002 | 是 | quality-gates.yml + quality-gate.ts + db 扩展 + 门禁判定 = 端到端可验证的质量门禁 |
| TASK-003~008 | 是 | 每个测试命令 = 可独立执行的端到端指令 |
| TASK-009~013 | 是 | 每个新指令 = 可独立执行的端到端流水线 |
| TASK-014 | 是 | bug-fix 增强 = 可独立验证的诊断阶段 |
| TASK-015 | 是（5 个独立垂直切片） | 每个平台 = 独立可验证的 Gate B 流程 |
| TASK-020 | 是 | Web 面板适配 = 可视觉验证的完整 UI |
| TASK-021 | 是 | 每个流程图 = 独立可验证的文档 |

无水平切片（按技术层级拆分）任务。

---

## 8. parallel_batches

### Batch 0a（无依赖，唯一串行启动）
- **TASK-001** → subagent_type: backend-architect + task-tdd

### Batch 0b（依赖 Batch 0a 完成）
- **TASK-002** → subagent_type: task-ddd + task-tdd

> 理由: TASK-002 在 gates.ts 上追加 GATE_CHECKS，必须等 TASK-001 完成 gates.ts 主写入。

### Batch 1（依赖 Batch 0b 完成，5 个 Agent 并行）
- **TASK-003** → subagent_type: task-design
- **TASK-004** → subagent_type: task-design
- **TASK-005** → subagent_type: task-design
- **TASK-006** → subagent_type: task-design
- **TASK-007** → subagent_type: task-design

> 理由: 5 个测试指令全部创建独立 command .md 文件 + Skill 目录，零共享区域冲突。TASK-003 依赖 TASK-002（需知 quality-gates.yml 格式），其余仅依赖 TASK-001。

### Batch 2（依赖 Batch 0a 完成，可与 Batch 1 重叠，5 个 Agent 并行）
- **TASK-008** → subagent_type: task-design
- **TASK-009** → subagent_type: task-ddd + task-tdd
- **TASK-010** → subagent_type: task-ddd + task-tdd
- **TASK-011** → subagent_type: task-design
- **TASK-012** → subagent_type: task-design

> 理由: 全部创建独立文件，零共享区域冲突。所有任务仅需 TASK-001 的 Gate 定义即可编写。

### Batch 3（依赖 Batch 0a 完成，可与 Batch 1/2 重叠，5 个 Agent 并行）
- **TASK-013** → subagent_type: task-ddd + task-tdd
- **TASK-014** → subagent_type: task-design
- **TASK-016** → subagent_type: task-design
- **TASK-017** → subagent_type: task-ddd + task-tdd
- **TASK-019** → subagent_type: task-design

> 理由: 全部独立文件，零冲突。TASK-017 修改 planner.md 和新建 jarvis-change.md，与其他任务无交集。

### Batch 4（依赖 Batch 0a 完成，可与 Batch 1/2/3 重叠，4 个 Agent 并行）
- **TASK-015** → subagent_type: task-design（内部可 spawn 5 个子 task-design 各负责一个平台）
- **TASK-018** → subagent_type: task-tdd（必须等 TASK-001 — server.ts 共享文件）
- **TASK-020** → subagent_type: frontend-dev-expert + frontend-ui-expert
- **TASK-021** → subagent_type: task-design

> 理由: TASK-015/020/021 创建独立文件，无冲突。TASK-018 修改 server.ts — 与 TASK-001 共享文件，必须等 TASK-001 完成。TASK-021 的流程图依赖 Batch 1-3 中各指令的具体 Gate 步骤，建议在 Batch 1-3 完成后启动，或先按 TASK-001 定义的 Gate 序列写骨架。

---

### 批次依赖可视化

```
Batch 0a: [TASK-001] ─────────────────────┐
         （串行瓶颈，所有任务依赖）          │
           │                                │
Batch 0b: [TASK-002] ──────────────────────┤
         （串行，依赖 TASK-001）             │
           │                                │
           ├────────────────────────────────┤
           │                                │
Batch 1:  [TASK-003] [TASK-004] [TASK-005] │  ← 5 parallel
          [TASK-006] [TASK-007]            │    (after Batch 0b)
           │                                │
Batch 2:  [TASK-008] [TASK-009] [TASK-010] │  ← 5 parallel
          [TASK-011] [TASK-012]            │    (after Batch 0a)
           │                                │
Batch 3:  [TASK-013] [TASK-014] [TASK-016] │  ← 5 parallel
          [TASK-017] [TASK-019]            │    (after Batch 0a)
           │                                │
Batch 4:  [TASK-015] [TASK-018] [TASK-020] │  ← 4 parallel
          [TASK-021]                        │    (after Batch 0a/1/2/3)
```

**关键观察**:
- Batch 1-4 可在 Batch 0a 完成后与 Batch 0b **重叠启动**（除 TASK-003 需等 TASK-002、TASK-021 需等 Batch 1-3 外）
- 理论最短执行时间: Batch 0a → (Batch 0b || Batch 1-4) → TASK-021 = 3 个时间单位

---

## 9. Execution Packets

---

### task_id: TASK-001
### task_name: 引擎层流水线注册 + session_join 白名单 + 路由分类 + command 占位文件
### requirement_ids: REQ-020
### owner: backend-architect + task-tdd
### objective: 在引擎 gates.ts 中注册 5 条新流水线，同步修复 server.ts/routes.ts 中的硬编码白名单和分类函数，并创建 10 个新 command 占位文件。
### in_scope:
1. `PIPELINE_DEFS` 新增 5 条流水线: refactor (R1-R5), hotfix (H0-H3), migrate (M1-M4), evaluate (E0-E3), debug (D0-D4)
2. `GATE_OPERATIONS` 注册 22 个新 Gate 的 allow/deny 矩阵（含关键 deny 规则: deploy/write_code/spawn_impl 在各 Gate 的限制）
3. `GATE_AGENT_GUIDE` 注册 22 个新 Gate 的可生成 Agent 清单
4. `GATE_DIRS` 注册 22 个新 Gate 的产物目录映射
5. `GATE_CHECKS` 注册 22 个新 Gate 的检查条件描述
6. `MAX_RETRY` 设置新 Gate 的重试次数（H0=1, H3=Infinity, D3=Infinity, M4=2, 其他=默认）
7. `GATE_ENTRY_CONDITIONS` 设定 18 条新 Gate 入口条件
8. `src/engine/server.ts:358` — `session_join` 白名单扩展: 新增 refactor/hotfix/migrate/evaluate/debug
9. `src/engine/server.ts:691` — `gate_check` 操作类型枚举: 按需新增 `sandbox_exec`/`interact`/`scan_security`/`emergency_bypass`（仅当现有 12 种操作无法表达时）
10. `src/web/routes.ts:835` — `inferPipelineType` 函数扩展: 识别 refactor/hotfix/migrate/evaluate/debug
11. `src/web/routes.ts:848` — `inferCategory` 函数扩展: 识别新分类 (test/refactoring/operations/research/debug/documentation)
12. 创建 10 个 command 占位 .md 文件（仅 frontmatter: name/description/model），详细 prompt 由后续 TASK 编写
13. 17 个 TDD 测试用例全部 GREEN（包括兼容性测试 `existing_pipelines_unchanged`）

### out_of_scope:
- 不编写 quality-gates.yml（TASK-002）
- 不编写完整 command prompt（TASK-003~013）
- 不修改 engine/db.ts（TASK-002）
- 不修改前端 web/src/ 文件（TASK-020）

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md`
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md`
- `docs/2026-05-13/architecture/backend-arch-review.md`（必须读取: 风险 #1/#2/#3/#4/#5/#6/#8）

### allowed_paths:
- `src/engine/gates.ts`
- `src/engine/server.ts`
- `src/web/routes.ts`
- `.claude/commands/test-unit.md`
- `.claude/commands/test-integration.md`
- `.claude/commands/test-e2e.md`
- `.claude/commands/test-perf.md`
- `.claude/commands/test-security.md`
- `.claude/commands/refactor.md`
- `.claude/commands/hotfix.md`
- `.claude/commands/migrate.md`
- `.claude/commands/evaluate.md`
- `.claude/commands/debug.md`
- `src/__tests__/`（TDD 测试文件）

### forbidden_paths:
- `src/engine/db.ts`（TASK-002 领域）
- `web/src/`（TASK-020 领域）
- `.claude/agents/`（TASK-016/017 领域）
- `.claude/skills/`（TASK-006/007/008/009/013 领域）
- `.jarvis/`（TASK-002 领域）
- `docs/flows/`（TASK-021 领域）

### dependencies:
- 无前置依赖（这是所有任务的根基）
- 输出契约: PIPELINE_DEFS 接口格式、Gate 命名规则（ADR-001）、GATE_OPERATIONS 矩阵格式

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `test-driven-development`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: []
### wait_for: []
### acceptance_criteria:
- [ ] 5 条新流水线在 PIPELINE_DEFS 中正确注册
- [ ] 22 个新 Gate 的 GATE_OPERATIONS 矩阵完整（allow + deny）
- [ ] GATE_AGENT_GUIDE / GATE_DIRS / GATE_CHECKS / MAX_RETRY / GATE_ENTRY_CONDITIONS 对新增 Gate 均有条目
- [ ] session_join 白名单接受 5 种新 pipeline_type
- [ ] inferPipelineType / inferCategory 正确并正确返回新类型
- [ ] 已有 4 条流水线行为不变（NFR-03 — `existing_pipelines_unchanged` 测试通过）
- [ ] FSM 拒绝回退/跳跃约束对新 Gate 生效（NFR-04）
- [ ] 10 个新 command .md 文件存在且含最小 frontmatter
- [ ] 17 个 TDD 测试用例全部 GREEN

### test_strategy: tdd
### handoff_notes:
- 这是**唯一串行瓶颈**：所有后续任务依赖此任务完成
- 必须严格遵循 TDD 流程：先写 `gates.test.ts` 中全部 17 个 RED 测试 → 实现代码使测试 GREEN → 重构
- 特别注意 GATE_DIRS 不能为空——否则 `findGateArtifacts` 扫描跳过新 Gate
- gate_check 操作枚举扩展遵循最小化原则：仅当现有 12 种操作类型确实无法表达时新增
- ADR-001（Gate 命名前缀隔离）和 ADR-002（TEXT 列存 JSON）已由后端架构评审批准
- 兼容性测试 `existing_pipelines_unchanged` 是 RED 阶段的强制测试，必须先失败再通过
- 10 个 command 占位文件仅需包含 `---\nname: xxx\ndescription: xxx\nmodel: xxx\n---\n` 最小 frontmatter

### escalation_rule:
- 如需修改 `PIPELINE_DEFS` / `GATE_OPERATIONS` / `GATE_DIRS` 的数据结构格式（非仅添加条目），必须先回编排者
- 如需修改 `getPipelineGates` / `advance_gate` FSM 核心逻辑，必须先回编排者
- 如果发现现有 12 种操作类型确实无法覆盖新 Gate 需求，需列出具体缺口再扩展枚举

---

### task_id: TASK-002
### task_name: 质量门禁配置与引擎逻辑
### requirement_ids: REQ-007, REQ-020
### owner: task-ddd + task-tdd
### objective: 创建质量门禁配置系统（quality-gates.yml + quality-gate.ts + 门禁判定服务 + DB 扩展），使引擎在 Gate C2/D 处自动执行门禁判定。
### in_scope:
1. 创建 `.jarvis/quality-gates.yml` 模板文件（含默认阈值: 覆盖率≥80%, 通过率100%, 高危漏洞=0, Lint错误=0）
2. 创建 `src/engine/quality-gate.ts`:
   - YAML 加载/解析/校验逻辑
   - QualityProfile 值对象定义
   - 50% 硬约束校验（项目自定义阈值不可低于默认值 50%）
   - 降级路径: 文件缺失→DEFAULT, YAML错误→FALLBACK, 低于50%→FALLBACK
3. `GATE_CHECKS` 细化: 在 `gates.ts` 中更新 Gate C2/D 的 check 字段，引用 quality-gates.yml 具体阈值
4. QualityGateEvaluationService:
   - 逐条件比对实际值 vs 阈值（使用 >= / <= / == 操作符）
   - on_violation=block → 阻断 + 记录 violations[]
   - on_violation=warn → 警告但不阻断
   - 多个 block 条件失败时全部收集后一次性报告
5. 数据库扩展: `checkpoints` 表新增 `violations` TEXT 列 + `quality_profile_source` TEXT 列
6. 12 个 TDD 测试用例全部 GREEN

### out_of_scope:
- 不改变 PIPELINE_DEFS 或 GATE_OPERATIONS（TASK-001 已定义）
- 不修改 FSM 核心逻辑（advance_gate/session_join）
- 不实现前端门禁展示 UI（TASK-020）
- 不实现 CI 模式门禁适配（TASK-018）

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-007 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-002 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-bdd.md` (场景 1/4)
- `docs/2026-05-13/architecture/backend-arch-review.md` (风险 #7、第 7 章)

### allowed_paths:
- `.jarvis/quality-gates.yml`
- `src/engine/quality-gate.ts`
- `src/engine/gates.ts`（追加 GATE_CHECKS 细化，不可回退 TASK-001 的改动）
- `src/engine/db.ts`（checkpoints 表 ALTER TABLE ADD COLUMN）
- `src/__tests__/`（TDD 测试文件）

### forbidden_paths:
- `src/engine/server.ts`（TASK-001/018 领域）
- `src/web/routes.ts`（TASK-001 领域）
- `web/src/`（TASK-020 领域）
- `.claude/commands/`、`.claude/skills/`、`.claude/agents/`（其他 TASK 领域）

### dependencies:
- TASK-001 必须完成（需新 Gate 定义已存在于 PIPELINE_DEFS / GATE_OPERATIONS / GATE_DIRS 中）
- YAML 解析: 使用 Node.js 内置或 `js-yaml`，不依赖外部服务

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `test-driven-development`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: []
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `.jarvis/quality-gates.yml` 模板文件包含完整默认阈值
- [ ] 引擎在 Gate C2/D 读取配置并执行门禁判定
- [ ] 不达标时自动阻断并提示具体缺口（含 violations[] 详情）
- [ ] 项目自定义阈值不可低于默认值 50%（建议: 通过率下限 80%，覆盖率下限 50%，安全/Lint 下限 0）
- [ ] 配置异常时回退默认值且不阻塞流水线
- [ ] checkpoints 表新增 violations + quality_profile_source 列
- [ ] 12 个 TDD 测试用例全部 GREEN
- [ ] YAML 解析失败时记录 FALLBACK source 到 checkpoints

### test_strategy: tdd
### handoff_notes:
- gates.ts 修改必须在 TASK-001 改动基础上追加，不可覆盖 TASK-001 的 PIPELINE_DEFS/GATE_OPERATIONS 等条目
- YAML 解析使用 try/catch，失败时不抛异常（降级到 DEFAULT）
- DB 迁移使用已有的 try/catch ALTER TABLE 模式（`try { db.exec("ALTER TABLE...") } catch {}`）
- 50% 硬约束: 通过率下限建议设为 80%（非 50%），安全/Lint 下限固定为 0
- FALLBACK 时建议在 `pipeline_guide` 响应中追加 `quality_profile_warning` 字段

### escalation_rule:
- 如需修改 quality-gates.yml 的 YAML schema 顶层结构，必须先回编排者
- 如需修改 checkpoints 表的 UNIQUE 约束或已有列，必须先回编排者
- 如果发现 50% 约束在实际场景中不合理，记录但不要单方面修改——回编排者

---

### task_id: TASK-003
### task_name: `/test-unit` 单元测试指令 prompt 编写
### requirement_ids: REQ-001, REQ-007
### owner: task-design
### objective: 编写 `/test-unit` 指令的完整 prompt 文件，使 Agent 能自动检测测试框架、生成单元测试、执行覆盖率门禁检查。
### in_scope:
1. 编写 `.claude/commands/test-unit.md` 完整 prompt（仿 `backend.md` 模板风格）
2. 自动检测项目测试框架逻辑（Jest/Vitest/Mocha/Pytest）
3. 为新增/修改模块生成单元测试用例的指引
4. 执行测试套件并生成覆盖率报告到 `docs/testing/`
5. 集成 QualityGate: 读取 quality-gates.yml 阈值，不达标输出结构化阻断提示
6. Gate C2 流程集成: 在指令中包含 Gate C2 覆盖率报告检查步骤
7. pipeline_type="full"，在 Gate C2 阶段执行

### out_of_scope:
- 不实现测试框架本身（使用已有框架）
- 不修改引擎逻辑
- 不生成实际的测试代码（由 Agent 在运行时生成）

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-001 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-003 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-bdd.md` (场景 1)
- 参考: `.claude/commands/backend.md`（模板风格）

### allowed_paths:
- `.claude/commands/test-unit.md`

### forbidden_paths:
- `src/engine/`（引擎层）
- `web/src/`（前端层）
- `.claude/skills/`（Skill 层）

### dependencies:
- TASK-001（PIPELINE_DEFS 中已有 Gate C2 定义）
- TASK-002（quality-gates.yml 格式已知，用于 prompt 中引用）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-004, TASK-005, TASK-006, TASK-007]
### wait_for: [TASK-001, TASK-002]
### acceptance_criteria:
- [ ] `/test-unit` 指令可被 Claude Code 识别并独立执行
- [ ] prompt 包含测试框架自动检测逻辑（至少 Jest/Vitest）
- [ ] prompt 包含覆盖率报告生成到 `docs/testing/` 的指引
- [ ] prompt 包含覆盖率 >= 80% 通过、< 80% 阻断的逻辑
- [ ] prompt 包含通过率 100% 要求
- [ ] prompt 遵循现有 command 模板风格（NFR-02）

### test_strategy: test_after
### handoff_notes:
- prompt 工程任务，验证方式: 在真实项目上执行 `/test-unit` 指令
- 模板风格参考 `.claude/commands/backend.md`（Gate A→B→C 序列描述方式）
- TASK-001 已创建占位 frontmatter，需在此基础上补充完整 prompt body

### escalation_rule:
- 如需修改 Gate 序列或引擎行为，回编排者

---

### task_id: TASK-004
### task_name: `/test-integration` 集成测试指令 prompt 编写
### requirement_ids: REQ-002
### owner: task-design
### objective: 编写 `/test-integration` 指令的完整 prompt 文件，使 Agent 能自动解析 OpenAPI spec、生成集成测试用例、验证 API 契约一致性。
### in_scope:
1. 编写 `.claude/commands/test-integration.md` 完整 prompt
2. OpenAPI/Swagger spec 自动发现与解析指引
3. 基于 API 契约生成集成测试用例的流程
4. ContractVerificationService: API 实现与契约一致性验证
5. Pact 契约测试集成指引（标注支持，非强制）
6. 测试报告含请求/响应快照格式
7. `/backend` 流程集成说明（在 Gate C2 中插入集成测试步骤）

### out_of_scope:
- 不修改引擎逻辑
- 不修改 `/backend` 命令文件

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-002 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-004 节)

### allowed_paths:
- `.claude/commands/test-integration.md`

### forbidden_paths:
- `src/engine/`、`web/src/`、`.claude/skills/`

### dependencies:
- TASK-001（PIPELINE_DEFS 中已有 Gate C2 定义）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-003, TASK-005, TASK-006, TASK-007]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `/test-integration` 指令可独立执行
- [ ] prompt 包含自动解析 OpenAPI spec 生成测试用例的流程
- [ ] prompt 包含测试报告含请求/响应快照格式
- [ ] prompt 包含 Pact 契约测试集成指引
- [ ] prompt 包含与 `/backend` 流程 Gate C2 步骤对齐说明

### test_strategy: test_after
### handoff_notes:
- TASK-001 已创建占位 frontmatter，需在此基础上补充完整 prompt body
- 契约测试（Pact）标注为可选，不要设为强制依赖

### escalation_rule:
- 如需修改 Gate 序列，回编排者

---

### task_id: TASK-005
### task_name: `/test-e2e` 端到端测试指令 prompt 编写
### requirement_ids: REQ-003
### owner: task-design
### objective: 编写 `/test-e2e` 指令的完整 prompt 文件，使 Agent 能基于用户故事自动生成和执行 E2E 测试脚本。
### in_scope:
1. 编写 `.claude/commands/test-e2e.md` 完整 prompt
2. 基于用户故事/关键路径自动生成 Playwright/Cypress 测试脚本的指引
3. Gate C3（E2E 验证门禁）在 prompt 中的定义（Gate D 后、Gate E 前）
4. 与 `/browser-test` 关系说明: 互补策略——`/browser-test` 用于已有测试文档的浏览器手动测试，`/test-e2e` 用于自动生成和执行 E2E 脚本
5. 核心流程无回归保证的验证逻辑

### out_of_scope:
- 不实现 E2E 测试框架本身
- 不修改 `/browser-test` 命令文件

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-003 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-005 节)

### allowed_paths:
- `.claude/commands/test-e2e.md`

### forbidden_paths:
- `src/engine/`、`web/src/`、`.claude/skills/`

### dependencies:
- TASK-001（PIPELINE_DEFS 中已有 Gate C3 定义）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-003, TASK-004, TASK-006, TASK-007]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `/test-e2e` 指令可独立执行
- [ ] prompt 包含自动识别关键路径并生成测试脚本的流程
- [ ] prompt 明确说明与 `/browser-test` 互补而非重叠
- [ ] Gate C3 在 prompt 中的定位清晰

### test_strategy: test_after
### handoff_notes:
- 与 `/browser-test` 的边界必须在 prompt 中显式说明，避免混淆

### escalation_rule:
- 如需修改 Gate 序列，回编排者

---

### task_id: TASK-006
### task_name: `/test-perf` 性能测试指令 + perf-testing Skill
### requirement_ids: REQ-004, REQ-021
### owner: task-design
### objective: 编写 `/test-perf` 指令 prompt 和 `perf-testing` Skill 文件，使 Agent 能执行性能负载测试并生成趋势报告。
### in_scope:
1. 编写 `.claude/commands/test-perf.md` 完整 prompt（~100 行）:
   - k6/Artillery 脚本生成与执行
   - API 端点或关键页面的基础负载测试
   - 对比基线并生成趋势报告
   - 可选门禁说明（性能敏感服务建议强制）
2. 创建 `.claude/skills/perf-testing/SKILL.md`（~100 行）:
   - 性能测试方法论（负载模型、基线建立、趋势分析）
   - k6/Artillery 脚本模板
   - 报告模板（吞吐量、延迟 p50/p95/p99、错误率）
   - 完整 frontmatter（name/description/model/effort）

### out_of_scope:
- 不安装 k6/Artillery 工具（由 Agent 运行时按需安装）
- 不修改引擎逻辑

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-004 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-006 节)

### allowed_paths:
- `.claude/commands/test-perf.md`
- `.claude/skills/perf-testing/SKILL.md`

### forbidden_paths:
- `src/engine/`、`web/src/`

### dependencies:
- TASK-001（PIPELINE_DEFS 中已有 Gate 定义）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-003, TASK-004, TASK-005, TASK-007]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `/test-perf` 指令可独立执行
- [ ] `perf-testing` Skill 可被加载
- [ ] 报告模板包含吞吐量、延迟、错误率对比
- [ ] SKILL.md 含完整 frontmatter

### test_strategy: test_after
### handoff_notes:
- Skill 文件必须包含 name/description/model/effort frontmatter，参考现有 skill 格式
- 性能基线存储位置建议 `docs/testing/perf-baselines/`

### escalation_rule:
- 如需新增依赖或工具安装逻辑，标注为可选

---

### task_id: TASK-007
### task_name: `/test-security` 安全测试指令 + security-testing Skill
### requirement_ids: REQ-005, REQ-021
### owner: task-design
### objective: 编写 `/test-security` 指令 prompt 和 `security-testing` Skill 文件，使 Agent 能执行 OWASP ZAP DAST 扫描并生成安全报告。
### in_scope:
1. 编写 `.claude/commands/test-security.md` 完整 prompt（~100 行）:
   - OWASP ZAP 集成指引
   - 对运行中应用进行快速 DAST 扫描
   - 检测注入、XSS、CSRF 等运行时漏洞
   - OWASP Top 10 覆盖报告
   - 高危漏洞必须修复后方可推进
2. 创建 `.claude/skills/security-testing/SKILL.md`（~100 行）:
   - DAST 方法论（OWASP ZAP 自动化模式）
   - 安全漏洞严重级别分类（CRITICAL/HIGH/MEDIUM/LOW）
   - 扫描配置与报告模板

### out_of_scope:
- 不安装 OWASP ZAP（由 Agent 运行时按需安装）
- 不执行实际的 DAST 扫描（由 Agent 在运行时执行）

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-005 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-007 节)

### allowed_paths:
- `.claude/commands/test-security.md`
- `.claude/skills/security-testing/SKILL.md`

### forbidden_paths:
- `src/engine/`、`web/src/`

### dependencies:
- TASK-001（PIPELINE_DEFS 中已有 Gate D 定义）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-003, TASK-004, TASK-005, TASK-006]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `/test-security` 指令可独立执行
- [ ] `security-testing` Skill 可被加载
- [ ] 报告模板包含 OWASP Top 10 覆盖情况
- [ ] prompt 明确高危漏洞必须修复后方可推进

### test_strategy: test_after
### handoff_notes:
- DAST 扫描目标需标注必须是开发/测试环境，非生产环境
- Skill frontmatter 参考现有 skill 格式

### escalation_rule:
- 如需新增依赖，标注为可选

---

### task_id: TASK-008
### task_name: `test-data-factory` Skill 创建
### requirement_ids: REQ-006, REQ-021
### owner: task-design
### objective: 创建 `test-data-factory` Skill，使测试 Agent 能根据 Schema 自动生成 mock 数据和脱敏数据。
### in_scope:
1. 创建 `.claude/skills/test-data-factory/SKILL.md`（~120 行）:
   - 根据 JSON Schema / OpenAPI Schema 自动生成 mock 数据
   - 支持脱敏规则配置（mask_email / mask_phone / mask_idcard / redact_key）
   - 生成数据可重复（seed 机制）
   - 合法数据生成（边界值: 空字符串、最大长度、Unicode）
   - 非法数据生成（注入攻击 payload、类型错误）
   - 集成到所有测试指令中（通过 Skill 加载机制）

### out_of_scope:
- 不生成实际的测试数据文件（由 Agent 在运行时生成）

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-006 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-008 节)

### allowed_paths:
- `.claude/skills/test-data-factory/SKILL.md`

### forbidden_paths:
- `src/engine/`、`web/src/`、`.claude/commands/`

### dependencies:
- TASK-001（引擎基础就绪）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-009, TASK-010, TASK-011, TASK-012]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `test-data-factory` Skill 可被所有测试 Agent 加载
- [ ] 生成数据指引包含可重复（seed）和脱敏规则
- [ ] 支持 JSON Schema 和 OpenAPI Schema 输入
- [ ] SKILL.md 含完整 frontmatter

### test_strategy: test_after
### handoff_notes:
- Skill 必须声明可被其他 Skill 加载的关系
- 脱敏规则必须在 Skill 开头显式声明，确保 Agent 优先读取

### escalation_rule:
- 无

---

### task_id: TASK-009
### task_name: `/refactor` 重构指令 + refactoring Skill
### requirement_ids: REQ-008, REQ-021
### owner: task-ddd + task-tdd
### objective: 编写 `/refactor` 指令 prompt 和 `refactoring` Skill，使 Agent 能执行受安全网保护的重构流程（R1-R5），实现行为漂移检测。
### in_scope:
1. 编写 `.claude/commands/refactor.md` 完整 prompt（~140 行）:
   - Gate 序列: R1（定义重构边界）→ R2（基线测试/覆盖率/突变测试）→ R3（执行重构）→ R4（对比覆盖率/断言/突变评分）→ R5（生成重构报告）
   - R2/R4 覆盖率对比差异 <= 阈值（默认 0%）
   - 突变测试集成说明（Stryker/MutPy 工具检测）
   - 重构边界定义（仅重构内部实现，保持对外接口不变）
2. 创建 `.claude/skills/refactoring/SKILL.md`（~140 行）:
   - 重构安全网方法论（红-绿-重构 + 突变测试）
   - 行为漂移检测策略（覆盖率对比、断言快照 hash、突变评分对比）
   - 常见重构模式（提取函数、消除 switch、简化条件、移除重复）
3. 实现 RefactorSafetyNetService 核心逻辑（TDD）:
   - 覆盖率对比算法
   - 断言快照 hash 算法
   - 突变评分对比
   - 边界条件: 新增模块 0% 覆盖→DRIFT_DETECTED_ZERO_COVERAGE_NEW_MODULE
4. 10 个 TDD 测试用例全部 GREEN

### out_of_scope:
- 不安装 Stryker/MutPy（标注可选，由 Agent 按项目语言动态检测）
- 不修改引擎 FSM 逻辑

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-008 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-009 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-bdd.md` (场景 3)

### allowed_paths:
- `.claude/commands/refactor.md`
- `.claude/skills/refactoring/SKILL.md`
- `src/__tests__/`（TDD 测试文件）

### forbidden_paths:
- `src/engine/gates.ts`（TASK-001 已定义 R1-R5，不可修改）
- `web/src/`

### dependencies:
- TASK-001（PIPELINE_DEFS 中已有 refactor Gate 序列）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `test-driven-development`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-008, TASK-010, TASK-011, TASK-012]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `/refactor` 指令可独立执行
- [ ] R1 重构边界定义阶段完整
- [ ] R2/R4 覆盖率对比逻辑正确（差异 <= 0% 通过）
- [ ] 行为漂移 > 0% 时阻断 R5
- [ ] 重构报告自动生成
- [ ] `refactoring` Skill 可被加载
- [ ] 10 个 TDD 测试用例全部 GREEN

### test_strategy: tdd
### handoff_notes:
- 突变测试工具集成标注为可选配置
- 行为漂移检测的断言快照 hash 算法需在 Skill 中明确定义
- 覆盖率对比逻辑: 任意维度下降 > 0% → DRIFT_DETECTED

### escalation_rule:
- 如需修改 PIPELINE_DEFS 中的 refactor Gate 序列，回编排者

---

### task_id: TASK-010
### task_name: `/hotfix` 热修复指令 prompt 编写
### requirement_ids: REQ-009
### owner: task-ddd + task-tdd
### objective: 编写 `/hotfix` 指令 prompt，实现审批链合规逻辑，确保 H0 人工确认→H3 强制回溯的完整链路。
### in_scope:
1. 编写 `.claude/commands/hotfix.md` 完整 prompt（~180 行）:
   - Gate 序列: H0（紧急声明 + 审批人 + 人工确认）→ H1（最小化修复）→ H2（快速验证 + 回滚预案）→ H3（事后强制回溯到 Gate E 完整审计和根因分析）
   - H0 审批支持 CLI/Webhook 人工确认渠道
   - 引擎记录完整紧急链路供合规审计
2. 实现 HotfixApprovalService 核心逻辑（TDD）:
   - EmergencyDeclaration 实体
   - ApprovalRecord 状态机（PENDING→APPROVED/REJECTED/TIMEOUT）
   - H3 不可跳过强制约束
   - H2 回滚预案必须包含完整步骤
3. 8 个 TDD 测试用例全部 GREEN

### out_of_scope:
- 不修改 server.ts 中的 session_join 逻辑（TASK-001 已处理）
- 不实现 Webhook 审批渠道后端（prompt 中标注支持渠道即可）

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-009 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-010 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-bdd.md` (场景 2)

### allowed_paths:
- `.claude/commands/hotfix.md`
- `src/__tests__/`（TDD 测试文件）

### forbidden_paths:
- `src/engine/gates.ts`（TASK-001 已定义 H0-H3，不可修改）
- `src/engine/server.ts`（TASK-001/018 领域）
- `.claude/skills/`

### dependencies:
- TASK-001（PIPELINE_DEFS 中已有 hotfix Gate 序列）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `test-driven-development`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-008, TASK-009, TASK-011, TASK-012]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `/hotfix` 指令可独立执行
- [ ] H0 阶段支持 CLI/Webhook 人工确认
- [ ] 拒绝/超时阻断推进并记录合规证据
- [ ] H3 不可跳过（合规审计硬约束）
- [ ] 引擎记录完整紧急链路
- [ ] H2 包含自动回滚预案
- [ ] 8 个 TDD 测试用例全部 GREEN

### test_strategy: tdd
### handoff_notes:
- 审批超时阈值（30 分钟）在 prompt 中建议为可配置项
- H3 强制回溯是硬约束，prompt 中必须显式声明不可跳过

### escalation_rule:
- 如需修改 PIPELINE_DEFS 中的 hotfix Gate 序列，回编排者

---

### task_id: TASK-011
### task_name: `/migrate` 迁移指令 prompt 编写
### requirement_ids: REQ-010
### owner: task-design
### objective: 编写 `/migrate` 指令 prompt，使 Agent 能执行框架迁移/依赖升级的 M1-M4 流程。
### in_scope:
1. 编写 `.claude/commands/migrate.md` 完整 prompt（~130 行）:
   - Gate 序列: M1（验证迁移规则覆盖）→ M2（逐文件执行迁移）→ M3（编译/构建验证）→ M4（自动修复 Lint 错误）
   - 支持用户提供迁移脚本或规则文件
   - M3/M4 自动循环修复（最多 2 轮）
   - 失败文件记录与展示

### out_of_scope:
- 不实现迁移脚本执行器（由 Agent 在运行时按规则执行）
- 不修改引擎逻辑

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-010 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-011 节)

### allowed_paths:
- `.claude/commands/migrate.md`

### forbidden_paths:
- `src/engine/`、`web/src/`、`.claude/skills/`

### dependencies:
- TASK-001（PIPELINE_DEFS 中已有 migrate Gate 序列）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-008, TASK-009, TASK-010, TASK-012]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `/migrate` 指令可独立执行
- [ ] prompt 包含支持用户提供迁移脚本或规则文件的说明
- [ ] prompt 包含 M3/M4 自动循环修复流程（<=2 轮）
- [ ] prompt 包含失败文件记录与展示逻辑

### test_strategy: test_after
### handoff_notes:
- M3/M4 循环修复的轮次上限（2 轮）需在 prompt 中明确

### escalation_rule:
- 无

---

### task_id: TASK-012
### task_name: `/evaluate` 评估指令 prompt 编写
### requirement_ids: REQ-011
### owner: task-design
### objective: 编写 `/evaluate` 指令 prompt，使 Agent 能在隔离环境中执行技术方案评估并生成结构化报告。
### in_scope:
1. 编写 `.claude/commands/evaluate.md` 完整 prompt（~180 行）:
   - Gate 序列: E0（定义评估标准/用例/权重/成功标准）→ E1（隔离沙箱/独立分支生成快速原型）→ E2（运行用例收集指标）→ E3（生成评估报告）
   - 非破坏性保证（不影响主工作区）
   - E0 校验不完整时拒绝推进并给出结构化提示
   - 评估报告模板: 结论 + 关键差异 + 风险评估 + 建议
   - 平局结论处理（无显著差异时的条件建议）

### out_of_scope:
- 不实现沙箱/隔离机制（由 Agent 在运行时使用 git worktree 或 Docker 实现）
- 不修改引擎逻辑

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-011 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-012 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-bdd.md` (场景 5)

### allowed_paths:
- `.claude/commands/evaluate.md`

### forbidden_paths:
- `src/engine/`、`web/src/`、`.claude/skills/`

### dependencies:
- TASK-001（PIPELINE_DEFS 中已有 evaluate Gate 序列）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-008, TASK-009, TASK-010, TASK-011]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `/evaluate` 指令可独立执行
- [ ] prompt 包含在隔离沙箱或独立分支上运行的指引
- [ ] prompt 包含非破坏性保证说明
- [ ] prompt 包含评估报告模板（结论 + 建议）
- [ ] prompt 包含 E0 不完整时拒绝推进的结构化提示

### test_strategy: test_after
### handoff_notes:
- E0 阶段的 BDD 场景已在文档中定义，prompt 中直接引用
- 平局结论处理逻辑需明确

### escalation_rule:
- 无

---

### task_id: TASK-013
### task_name: `/debug` 调试指令 + debugging-deep Skill
### requirement_ids: REQ-012, REQ-021
### owner: task-ddd + task-tdd
### objective: 编写 `/debug` 指令 prompt 和 `debugging-deep` Skill，实现交互式调试和 Post-mortem 崩溃分析。
### in_scope:
1. 编写 `.claude/commands/debug.md` 完整 prompt（~140 行）:
   - Gate 序列: D0（收集日志/报错/环境快照）→ D1（生成最小复现用例）→ D2（插入智能日志/断点）→ D3（交互式诊断）→ D4（输出诊断报告，不自动修改代码）
   - Post-mortem 模式: 自动解析 core dump/崩溃日志/堆栈跟踪
   - 集成 browser-use/agent-browser 通过标准协议附加进程
2. 创建 `.claude/skills/debugging-deep/SKILL.md`（~140 行）:
   - 深度调试方法论（交互式 + Post-mortem）
   - 最小复现用例构造策略
   - 断点管理协议
   - 崩溃转储分析技巧（堆栈重构、线程状态、内存快照）
3. 实现 PostMortemAnalysisService（TDD）:
   - 堆栈解析提取文件和行号
   - 识别最可能根因帧（排除框架层）
   - 最小复现脚本生成
   - 崩溃转储分析
   - 诊断报告与修复方案分离
4. 5 个 TDD 测试用例全部 GREEN

### out_of_scope:
- 不实现实际的调试协议（由 Agent 在运行时使用 browser-use/agent-browser）
- 不修改引擎 FSM 逻辑

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-012 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-013 节)

### allowed_paths:
- `.claude/commands/debug.md`
- `.claude/skills/debugging-deep/SKILL.md`
- `src/__tests__/`（TDD 测试文件）

### forbidden_paths:
- `src/engine/gates.ts`（TASK-001 已定义 D0-D4，不可修改）
- `src/engine/server.ts`

### dependencies:
- TASK-001（PIPELINE_DEFS 中已有 debug Gate 序列）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `test-driven-development`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-014, TASK-016, TASK-017, TASK-019]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `/debug` 指令可独立执行
- [ ] D3 阶段支持交互式断点调试
- [ ] 诊断报告与修复方案分离
- [ ] Post-mortem 模式支持离线分析
- [ ] `debugging-deep` Skill 可被加载
- [ ] 5 个 TDD 测试用例全部 GREEN

### test_strategy: tdd
### handoff_notes:
- Post-mortem 分析算法需在 Skill 中明确定义
- 交互式调试协议与 browser-use/agent-browser 的对齐需在 prompt 中说明

### escalation_rule:
- 如需修改 debug Gate 序列，回编排者

---

### task_id: TASK-014
### task_name: `/bug-fix` 增强 — 显式诊断 Gate
### requirement_ids: REQ-013
### owner: task-design
### objective: 在已有 `.claude/commands/bug-fix.md` 中增加显式诊断阶段，要求修复前必须有运行时证据支撑。
### in_scope:
1. 修改 `.claude/commands/bug-fix.md`:
   - 在现有步骤 1（收集 Bug 信息）和步骤 2（浏览器复现）之后增加"显式诊断阶段"
   - 复现后强制要求 Agent 调用调试工具获取运行时证据
   - 生成诊断报告后再进入修复流程
   - 选项: 若 `/debug` 指令已可用，诊断阶段可委托给 `/debug` 指令
2. 与 TASK-013（`/debug`）的协作说明

### out_of_scope:
- 不重写整个 bug-fix.md（增量修改）
- 不改变 bug-fix 的现有业务逻辑

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-013 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-014 节)

### allowed_paths:
- `.claude/commands/bug-fix.md`

### forbidden_paths:
- `src/engine/`、`web/src/`、`.claude/skills/`

### dependencies:
- TASK-001（引擎基础就绪）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-013, TASK-016, TASK-017, TASK-019]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `/bug-fix` 流程包含显式诊断阶段
- [ ] 修复前必须有运行时证据支撑
- [ ] 不改变现有 bug-fix 指令的其他行为（NFR-03）
- [ ] 与 `/debug` 指令的委托关系说明完整

### test_strategy: test_after
### handoff_notes:
- 这是对已有文件的增量修改，先完整阅读现有 bug-fix.md，再精准插入诊断阶段
- 必须保留所有现有步骤不变
- 诊断阶段的插入位置需仔细选择——在"复现"之后、"修复"之前

### escalation_rule:
- 如需修改 bug-fix 现有 Gate 序列，回编排者

---

### task_id: TASK-015
### task_name: 全平台移动端 Gate B 三分析补齐
### requirement_ids: REQ-014
### owner: task-design
### objective: 为 Android/iOS/Flutter/Expo/Taro 5 个平台 command 文件补齐 Gate B-DDD/B-BDD/B-TDD 三分析章节。
### in_scope:
为以下 5 个文件补齐 Gate B 三分析章节:
1. `.claude/commands/android.md` — Gate B-DDD + B-BDD + B-TDD
2. `.claude/commands/ios.md` — 同上
3. `.claude/commands/flutter.md` — 同上
4. `.claude/commands/expo.md` — 同上
5. `.claude/commands/taro.md` — 同上

每个平台补齐内容:
- Gate B-DDD: spawn task-design (DDD 模式) 的明确指令，平台特定领域模型产出模板，Agent 路由（task-ddd）
- Gate B-BDD: 高业务价值聚合行为的 Gherkin 场景编写指引，纯技术逻辑时可跳过
- Gate B-TDD: 产出 TDD 任务包，每个 TASK 映射 REQ + 场景
- Agent 路由表更新: 明确 task-design 在 Gate B 各子阶段的使用
- 移动端轻量化说明保留

### out_of_scope:
- 不改变已有平台 Agent 行为（NFR-03）
- 不修改引擎 Gate 定义
- 不引入跨平台依赖

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-014 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-015 节)
- 参考: `.claude/commands/backend.md`（已含完整 Gate B 三分析）
- 参考: `.claude/commands/frontend.md`（已含完整 Gate B 三分析）

### allowed_paths:
- `.claude/commands/android.md`
- `.claude/commands/ios.md`
- `.claude/commands/flutter.md`
- `.claude/commands/expo.md`
- `.claude/commands/taro.md`

### forbidden_paths:
- `src/engine/`、`web/src/`、`.claude/skills/`

### dependencies:
- TASK-001（引擎基础就绪）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-018, TASK-020, TASK-021]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] 5 个平台 command 文件均包含 Gate B 三分析章节
- [ ] 流程与 `/frontend`/`/backend` 对齐
- [ ] 移动端轻量化说明保留
- [ ] 不影响已有平台 Agent 行为（NFR-03）
- [ ] 5 个文件各自独立，不引入跨平台依赖

### test_strategy: test_after
### handoff_notes:
- 5 个平台文件互不冲突，可在单个 task-design Agent 内顺序编写或 spawn 5 个子 task-design 并行
- 必须先阅读 backend.md 和 frontend.md 了解现有 Gate B 三分析模板风格
- 再逐一阅读 5 个平台 command 文件，找到合适插入位置
- 每个平台的 Gate B 章节需适配该平台特有的 Agent 路由（如 android-dev/ui/state-expert）

### escalation_rule:
- 如需修改引擎 Gate 定义或 Gate 序列，回编排者

---

### task_id: TASK-016
### task_name: API 文档维护增强（api-contract-expert）
### requirement_ids: REQ-015
### owner: task-design
### objective: 在 `api-contract-expert.md` Agent 模板中增强 OpenAPI/Swagger 文档生成与校验职责。
### in_scope:
1. 修改 `.claude/agents/api-contract-expert.md`:
   - OpenAPI/Swagger 自动生成职责增强（补充常见框架列表的生成命令）
   - 从代码注解/装饰器自动生成 OpenAPI spec 的详细指引
   - 从 OpenAPI spec 生成 API 文档页面的指引
   - Gate E 发布阶段检查 API 文档与代码一致性的职责说明
   - 新增"一致性状态"输出字段

### out_of_scope:
- 不重写整个 Agent 模板（增量修改）
- 不修改引擎逻辑

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-015 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-016 节)

### allowed_paths:
- `.claude/agents/api-contract-expert.md`

### forbidden_paths:
- `src/engine/`、`web/src/`、`.claude/skills/`

### dependencies:
- TASK-001（引擎基础就绪）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-013, TASK-014, TASK-017, TASK-019]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `api-contract-expert` 支持 OpenAPI 生成与校验职责
- [ ] Gate E 中检查 API 文档一致性的职责明确
- [ ] 不改变已有行为模式

### test_strategy: test_after
### handoff_notes:
- 增量修改已有文件，先完整阅读再精准插入
- 一致性状态输出字段需与现有输出格式兼容

### escalation_rule:
- 如需修改 Agent 模板的 frontmatter 格式，回编排者

---

### task_id: TASK-017
### task_name: 流水线深度优化 + `/jarvis-change` 指令
### requirement_ids: REQ-016
### owner: task-ddd + task-tdd
### objective: 实现动态粒度策略、`/jarvis-change` 变更指令、风险评估模型，优化 planner Agent 模板。
### in_scope:
1. 修改 `.claude/agents/planner.md`: 增加系统提示——根据项目规模自动限制最大子任务数（<= 5）
2. 创建 `.claude/commands/jarvis-change.md`: 评估影响范围 → 决定回退/插入策略 → 生成回滚计划
3. 实现 RiskAssessmentService（TDD）:
   - <=50 行变更 → 低风险，自动降级确认
   - 支付/认证/数据迁移相关变更 → 高风险，强制人工确认
   - affectedModules 计算
   - 回滚计划生成
4. 引擎阈值配置
5. 6 个 TDD 测试用例全部 GREEN

### out_of_scope:
- 不修改引擎 FSM 核心逻辑
- 不实现跨会话上下文继承的完整存储（planner 中说明即可）

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-016 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-017 节)

### allowed_paths:
- `.claude/agents/planner.md`
- `.claude/commands/jarvis-change.md`
- `src/__tests__/`（TDD 测试文件）

### forbidden_paths:
- `src/engine/gates.ts`（TASK-001 领域）
- `web/src/`

### dependencies:
- TASK-001（引擎基础就绪）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `test-driven-development`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-013, TASK-014, TASK-016, TASK-019]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] planner Agent 模板包含动态粒度说明
- [ ] `/jarvis-change` 指令工作流完整
- [ ] 风险评估模型在引擎中有对应阈值配置
- [ ] 跨会话上下文继承在 planner 中说明
- [ ] 6 个 TDD 测试用例全部 GREEN

### test_strategy: tdd
### handoff_notes:
- planner.md 是已有文件，增量修改——增加动态粒度段落，不可重写
- 敏感操作列表（支付/认证/数据迁移）需在 RiskAssessmentService 中硬编码或配置化

### escalation_rule:
- 如需修改 planner.md 的核心流程描述（非增量追加），回编排者

---

### task_id: TASK-018
### task_name: CI/CD 流程整合 — Gate CLI 导出 + CI 模式
### requirement_ids: REQ-017
### owner: task-tdd
### objective: 实现 `jarvis gate-check <Gate>` CLI 命令封装和 CI 模式适配，使引擎可被 CI 管线独立调用。
### in_scope:
1. `jarvis gate-check <Gate>` CLI 命令: 封装 gate_enforce 逻辑为独立 CLI 入口
   - 每个 Gate 可被 CI 脚本独立调用
   - 返回标准退出码（0=通过, 1=阻断）
   - 输出 JSON 格式结果
2. CI 模式环境变量 `JARVIS_CI=true`:
   - 跳过所有人工确认步骤
   - 保留完整日志但不阻塞等待人工输入
3. JUnit/xUnit 格式测试报告输出:
   - 从引擎 checkpoints 提取测试结果
   - 转换为 JUnit XML 格式
4. 在 `server.ts` 中新增 `gate_check_ci` MCP 工具或复用现有 `gate_enforce`
5. 6 个 TDD 测试用例全部 GREEN

### out_of_scope:
- 不修改已有 Gate 序列
- 不实现 CI 平台集成（仅导出可被 CI 调用的接口）

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-017 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-018 节)

### allowed_paths:
- `src/engine/server.ts`（追加 CI 模式逻辑和 gate-check CLI 工具，不可回退 TASK-001 的白名单/枚举变更）
- `src/__tests__/`（TDD 测试文件）

### forbidden_paths:
- `src/engine/gates.ts`（TASK-001/002 领域）
- `web/src/`

### dependencies:
- TASK-001 必须完成（server.ts 的 session_join 白名单 + gate_check 枚举扩展已就绪）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `test-driven-development`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-015, TASK-020, TASK-021]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `jarvis gate-check <Gate>` CLI 命令可被 CI 脚本调用
- [ ] CI 模式（JARVIS_CI=true）保留完整日志但不阻塞等待人工输入
- [ ] CI 模式输出 JUnit/xUnit 格式测试报告
- [ ] 标准退出码正确（0=通过, 1=阻断）
- [ ] 6 个 TDD 测试用例全部 GREEN

### test_strategy: tdd
### handoff_notes:
- server.ts 修改必须在 TASK-001 变更基础上追加——先 diff TASK-001 的改动，再实施
- gate_bypass（CI 跳过人工确认）应通过环境变量 + 引擎逻辑实现，非新增操作类型
- JUnit XML 格式需符合标准 schema（testsuites > testsuite > testcase > failure）

### escalation_rule:
- 如需新增 MCP 工具（修改 server.ts 的 tools/list 注册），先确认不破坏已有工具接口
- 如需修改 server.ts 中 TASK-001 写入的白名单/枚举，回编排者

---

### task_id: TASK-019
### task_name: `/doc` 文档自动化指令 prompt 编写
### requirement_ids: REQ-018
### owner: task-design
### objective: 编写 `/doc` 指令 prompt，使 Agent 能自动更新项目文档并在 Gate E 执行文档同步检查。
### in_scope:
1. 创建 `.claude/commands/doc.md`:
   - `/doc` 指令用于更新所有自动生成文档
   - Gate E 文档同步检查子步骤
   - `docs-engineer` Agent 增强说明（自动对比代码变更与文档站）
2. Gate E 增强: 文档同步检查不通过时阻断发布

### out_of_scope:
- 不修改 docs-engineer Agent 模板（在 prompt 中引用即可）

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-018 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-019 节)

### allowed_paths:
- `.claude/commands/doc.md`

### forbidden_paths:
- `src/engine/`、`web/src/`、`.claude/agents/`

### dependencies:
- TASK-001（引擎基础就绪）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-013, TASK-014, TASK-016, TASK-017]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] `/doc` 指令可独立执行
- [ ] Gate E 文档同步检查不通过时阻断发布
- [ ] docs-engineer 支持对比代码变更与文档站的说明完整

### test_strategy: test_after
### handoff_notes:
- TASK-001 已创建占位 frontmatter（若需要），需在此基础上补充完整 prompt
- Gate E 的文档同步检查是 /doc 指令的一部分，也在 /jarvis 全流程的 Gate E 中引用

### escalation_rule:
- 无

---

### task_id: TASK-020
### task_name: Web 面板同步适配 — 新流水线类型展示
### requirement_ids: REQ-019
### owner: frontend-dev-expert + frontend-ui-expert
### objective: 适配 Web 面板以支持 5 条新流水线类型和 10+ 个新指令的展示、筛选和可视化。
### in_scope:
按照前端架构评审（`docs/2026-05-13/architecture/frontend-arch-review.md`）的实施建议:

**第 1 步**: 创建 `web/src/constants/pipelineConfig.ts`（~80 行）:
- Pipeline 类型名称/颜色令牌/标签的统一配置
- 5 种新 pipeline 类型: refactor(geekblue)/hotfix(error)/migrate(purple)/evaluate(cyan)/debug(orange)

**第 2 步**: 创建 `web/src/constants/gateConfig.ts`（~150 行）:
- Gate 颜色/标签/描述，按 pipelineType 分组
- 22 个新 Gate 的配置

**第 3 步**: 修改 `Layout.tsx`、`Commands.tsx`、`Archive.tsx` 引用 pipelineConfig 替代重复硬编码

**第 4 步**: 修改 `matchPipelineType.ts` 新增 5 种类型匹配

**第 5-8 步**: 创建子组件和拆分 Dashboard:
- `hooks/usePipelineData.ts`（~40 行）
- `components/GateTimeline.tsx`（~120 行）
- `components/ArtifactCard.tsx`（~80 行）
- `components/MarkdownPreview.tsx`（~100 行）

**第 9 步**: 重构 `Dashboard.tsx` 为骨架组件（~250 行），引用拆分子组件

**第 10 步**: 修改 `Commands.tsx` FALLBACK_COMMANDS 追加 12 条新指令数据

**第 11 步**: 修改 `Agents.tsx` Pipeline 筛选扩展

### out_of_scope:
- 不修改 `src/web/routes.ts`（TASK-001 已处理 inferPipelineType / inferCategory）
- 不修改后端 API 逻辑
- 不修改 SSE 推送机制

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md` (REQ-019 节)
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md` (TASK-020 节)
- `docs/2026-05-13/architecture/frontend-arch-review.md`（**必须完整阅读**——含组件拆分方案、颜色方案、风险清单）

### allowed_paths:
- `web/src/constants/gateConfig.ts`
- `web/src/constants/pipelineConfig.ts`
- `web/src/hooks/usePipelineData.ts`
- `web/src/components/GateTimeline.tsx`
- `web/src/components/ArtifactCard.tsx`
- `web/src/components/MarkdownPreview.tsx`
- `web/src/pages/Dashboard.tsx`
- `web/src/pages/Commands.tsx`
- `web/src/pages/Agents.tsx`
- `web/src/pages/Archive.tsx`
- `web/src/pages/matchPipelineType.ts`
- `web/src/components/Layout.tsx`

### forbidden_paths:
- `src/engine/`（引擎层）
- `src/web/routes.ts`（TASK-001 已处理）
- `.claude/commands/`、`.claude/skills/`、`.claude/agents/`

### dependencies:
- TASK-001 必须完成（需要知道新增的 pipeline_type 枚举值和 Gate 命名）

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-015, TASK-018, TASK-021]
### wait_for: [TASK-001]
### acceptance_criteria:
- [ ] Web 面板 Dashboard 显示 refactor/hotfix/migrate/evaluate/debug 流水线状态
- [ ] Gate Timeline 正确渲染所有 30+ 个 Gate 的颜色/标签/描述
- [ ] Commands 页面显示所有 30+ 条新指令，分类 Tab 正确筛选
- [ ] Agents 页面可按 13 种流程分类正确筛选
- [ ] Archive 页面可按 9 种 pipeline 类型筛选
- [ ] SSE 实时同步对新流程类型正常工作
- [ ] `npm run lint` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 成功
- [ ] 响应式布局: 窄屏下 Gate Timeline 可横向滚动

### test_strategy: manual_only
### handoff_notes:
- 这是对已有前端代码的大规模重构 + 扩展，务必遵循增量实现原则
- 实施顺序严格按前端架构评审的第 8.1 节执行（先创建常量文件，再拆分组件，最后修改页面）
- Pipeline 颜色方案使用 Ant Design 语义令牌（`var(--ant-color-*)`），确保主题联动
- 验证方式: 启动 Web 面板后人工检查 Dashboard/Commands/Agents/Archive 四个页面
- 后端 `inferPipelineType` / `inferCategory` 已由 TASK-001 修改，前端无需关心

### escalation_rule:
- 如需修改后端 API 接口格式或 SSE 事件格式，回编排者
- 如需修改 routes.ts 中的 inferPipelineType / inferCategory，回编排者（由 TASK-001 负责）

---

### task_id: TASK-021
### task_name: 流程图文档同步更新（10+ 新流程图）
### requirement_ids: NFR-01
### owner: task-design
### objective: 为 10 条新指令创建对应的流程图 Markdown 文档，并更新已有流程图。
### in_scope:
新增以下 10 个流程图文件（每个 ~30-50 行）:
| 文件 | 对应指令 |
|------|---------|
| `docs/flows/test-unit.md` | /test-unit Gate 序列 + 覆盖率门禁判断 |
| `docs/flows/test-integration.md` | /test-integration OpenAPI 解析 → 测试生成 → 执行 → 报告 |
| `docs/flows/test-e2e.md` | /test-e2e 关键路径识别 → 脚本生成 → 执行 |
| `docs/flows/test-perf.md` | /test-perf k6/Artillery 脚本生成 → 负载测试 → 基线对比 |
| `docs/flows/test-security.md` | /test-security OWASP ZAP 扫描 → 漏洞报告 |
| `docs/flows/refactor.md` | R1→R2→R3→R4→R5 五阶段 + 行为漂移判断分支 |
| `docs/flows/hotfix.md` | H0→H1→H2→H3 四阶段 + 审批判断分支 |
| `docs/flows/migrate.md` | M1→M2→M3→M4 + M3/M4 循环 |
| `docs/flows/evaluate.md` | E0→E1→E2→E3 + E0 校验判断分支 |
| `docs/flows/debug.md` | D0→D1→D2→D3→D4 + 交互式/post-mortem 模式选择 |

同时检查: `docs/flows/bug-fix.md` 是否需要因 REQ-013 增强而更新

### out_of_scope:
- 不修改已有流程图的核心结构

### input_documents:
- `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md`（各 REQ 节）
- `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md`（TASK-021 节）
- 参考现有流程图: `docs/flows/` 目录下已有文件（了解风格模板）

### allowed_paths:
- `docs/flows/test-unit.md`
- `docs/flows/test-integration.md`
- `docs/flows/test-e2e.md`
- `docs/flows/test-perf.md`
- `docs/flows/test-security.md`
- `docs/flows/refactor.md`
- `docs/flows/hotfix.md`
- `docs/flows/migrate.md`
- `docs/flows/evaluate.md`
- `docs/flows/debug.md`
- `docs/flows/bug-fix.md`

### forbidden_paths:
- `src/engine/`、`web/src/`、`.claude/commands/`、`.claude/skills/`

### dependencies:
- TASK-001（Gate 序列定义）+ TASK-003~013（各指令的最终 Gate 步骤和判断逻辑）
- 建议在 Batch 1-3 中相关指令的 prompt 完成后启动，或先按 TASK-001 定义写骨架

### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `incremental-implementation`
- `verification-before-completion`

### parallel_group: [TASK-015, TASK-018, TASK-020]
### wait_for: [TASK-001, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013]
### acceptance_criteria:
- [ ] 10 个新流程图文件完整
- [ ] 每个流程图覆盖对应指令的完整 Gate 序列
- [ ] 流程图风格与现有 `docs/flows/*.md` 一致
- [ ] 现有流程图必要时更新（如 bug-fix.md）

### test_strategy: test_after
### handoff_notes:
- 10 个文件互不冲突，可完全并行编写
- 必须先查看至少 2 个现有 flow 文件了解风格和 Mermaid 语法约定
- 如果部分指令 prompt 尚未完成，先按 TASK-001 的 Gate 定义写骨架，后续补充细节

### escalation_rule:
- 无

---

## 10. Plan Patch / Contract Change Request 触发条件

| 触发条件 | 响应 |
|---------|------|
| TASK-001 实现时发现需要修改 FSM 核心逻辑（`advance_gate` / `sessionGates`） | 实现 Agent 回编排者，提交 plan patch |
| TASK-001 实现时发现现有 12 种操作类型无法覆盖新 Gate 需求 | 列出具体缺口，回编排者审批后再扩展枚举 |
| TASK-002 实现时发现 `checkpoints` 表结构有未预期的兼容性问题 | 回编排者，提交 contract change request |
| TASK-018 实现时发现 server.ts 中 TASK-001 的变更与 CI 模式逻辑冲突 | 回编排者协调 |
| TASK-020 实现时发现前端组件拆分超出预期范围 | 回编排者评估是否需要拆分为独立子轮次 |
| 任何任务发现 `PIPELINE_DEFS` 的 Gate 序列需要调整 | **必须回编排者**——Gate 序列变更影响所有依赖任务 |
| 任何 TDD 任务发现测试需要新增/删除（非 TASK 文档已有用例） | 记录，提交 plan patch |

---

## 11. 风险提醒

| 风险 | 等级 | 缓解 |
|------|------|------|
| TASK-001 是串行瓶颈，若延期则所有后续任务延期 | 高 | 优先执行，确保代码质量而非速度 |
| gates.ts 被 TASK-001 和 TASK-002 先后修改，可能产生 merge 冲突 | 高 | 严格串行: TASK-002 在 TASK-001 完全提交后基于其产物修改 |
| server.ts 被 TASK-001 和 TASK-018 先后修改 | 中 | 严格串行: TASK-018 在 TASK-001 完全提交后基于其产物修改 |
| Gate 命名 "E0-E3" 与现有 "Gate E" 语义混淆 | 中 | 已通过 ADR-001 注释标注缓解 |
| 22 个新 Gate 的 deny 规则遗漏 | 中 | TASK-001 的 TDD 测试必须覆盖每个新 Gate 的关键 deny |
| 单轮次总变更超 1000 行（第 2 轮 ~2500 行，第 3 轮 ~1320 行） | 中 | 第 2/3 轮各拆为 2-3 个子轮次执行 |
| Web 面板组件拆分可能破坏现有 UI 行为 | 中 | 增量重构，先创建新文件，最后修改 Dashboard.tsx |
| DB migration 回滚方案 | 低 | 已提供完整回滚 SQL 脚本（见后端架构评审第 4.2 节） |

---

## 12. 实现者交接信息

### 对所有实现 Agent 的通用要求
1. 启动时加载全部 `required_skills`
2. 遵循 behavioral-guidelines 四项准则
3. 遵循代码规范（嵌套 <=4 层、禁止 push/pop/splice、使用 ===、模块化）
4. 中国注释 + JSDoc/TSDoc（`@param`、`@returns`、`@throws`）
5. Commit 前: lint + typecheck + build + test 全部通过
6. 每次改动后验证: 运行测试套件确认无回归

### 对 TDD Agent 的特别要求
- 严格 Red（写失败测试）→ Green（最少代码通过）→ Refactor（重构优化）循环
- RED 阶段测试必须先失败（证明测试有效），再实现代码使其通过
- 每个测试验证一个行为
- 测试文件放到 `src/__tests__/` 目录

### 对 task-design Agent 的特别要求
- Prompt 工程遵循现有 command 模板风格
- 所有 prompt 文件必须包含标准 frontmatter（name/description/model）
- TASK-001 创建的占位 frontmatter 已有 name/description/model，需在此基础上追加 body

### 对前端 Agent 的特别要求
- 严格按前端架构评审第 8.1 节顺序实施
- 先创建常量文件（pipelineConfig.ts → gateConfig.ts），再拆分子组件，最后修改页面
- 使用 Ant Design 5 语义颜色令牌（`var(--ant-color-*)`），不硬编码 hex
- 所有新组件需包含 `aria-label` 实现无障碍
- 响应式: Gate Timeline 在窄屏需 `overflow-x: auto`

---

## 13. 推荐的下一步

1. **立即执行 Batch 0a**: 启动 `backend-architect` + `task-tdd` 执行 TASK-001（引擎流水线注册）
2. **紧随执行 Batch 0b**: TASK-001 完成并通过 Gate C1（代码质量）和 Gate C2（测试验证）后，启动 `task-ddd` + `task-tdd` 执行 TASK-002
3. **Batch 0a 完成后并行启动 Batch 2-4**（除依赖 TASK-002 的 TASK-003 和依赖 Batch 1-3 的 TASK-021）
4. **Batch 0b 完成后启动 Batch 1**: 5 个测试指令并行编写
5. **关注风险**: 所有高风险任务（TASK-001/002/009/010/013/018/020）需在完成后由 qa-review-expert 重点审查

---

> **生成信息**: 由 planner 在 2026-05-13 生成
> **输入**: REQ 需求文档 + DDD 领域分析 + BDD 场景文档 + TDD 任务包 + 后端架构评审 + 前端架构评审
> **状态**: 待编排者审阅，待实现 Agent 按 Batch 顺序执行
