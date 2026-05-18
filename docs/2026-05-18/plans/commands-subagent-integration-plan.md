# 执行计划 -- 指令文件子Agent集成补充

> **需求文档**: `docs/requirements/REQ-commands-subagent-integration.md`
> **DDD 分析**: `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md`
> **BDD 场景**: `docs/2026-05-18/tasks/commands-subagent-integration-bdd.md`（覆盖 REQ-001/REQ-002）
> **任务文档**: `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md`
> **计划日期**: 2026-05-18
> **计划版本**: v1.0

---

## 1. 当前轮次目标

为 14 个指令文件（`.claude/commands/*.md`）补全子Agent集成——将编排者inline执行的代码生成/修改逻辑改为通过 `Agent()` spawn 子Agent执行，统一编排模式与 `/jarvis` 命令对齐。

## 2. 当前轮次范围

| 维度 | 内容 |
|------|------|
| 修改文件数 | 14 个 `.claude/commands/*.md` 指令文件 |
| 任务数 | 15 个 TASK（覆盖 15 个 REQ） |
| 总变更估算 | ~1,700 行（分散在 14 个独立文件中） |
| 交付批次 | 6 批（按风险递增顺序交付） |
| 参考模板 | `C:\Users\12247\.claude\commands\jarvis.md`（只读参考，不修改） |

### 范围包含

- 为每个指令文件插入 `Agent({subagent_type: "xxx", ...})` spawn 调用
- 补充 `gate_check()` / `gate_enforce()` / `advance_gate()` 调用
- 添加失败回退循环（最多 N 轮 -> BLOCKED）
- 补充 `allowed-tools` 中的 `Agent` 权限声明
- 按领域路由逻辑选择正确的 subagent_type

### 范围不包含

- 修改 `.claude/agents/` 下的 Agent 定义文件
- 修改 `.claude/settings.json` 的 hook 配置
- 修改 `/jarvis` 命令本身
- 创建新的 Agent 类型
- 部署或 CI/CD 配置变更

## 3. 完成标准

- [ ] 14 个指令文件全部完成 Agent 集成修改
- [ ] 每个文件的 `allowed-tools` 包含 `Agent`（如原本不包含）
- [ ] 所有 spawn 引用的 Agent 类型名称在 `.claude/agents/` 目录下有对应定义文件
- [ ] 每个 spawn 前存在 `gate_check()` 调用
- [ ] 每个指令的失败回退循环明确定义了 `max_retries` 和 `BLOCKED` 条件
- [ ] 每个指令的原有红线约束全部保留，无丢失
- [ ] 不再存在编排者直接编码的描述（代码生成/修改全部委托给子Agent）
- [ ] 6 个批次全部完成 Gate 验证

## 4. 共享区域改动归属

**结论：无共享区域冲突。** 14 个指令文件互相独立，每个文件由唯一 TASK 修改。

| 文件 | 唯一修改者 | 文件 | 唯一修改者 |
|------|----------|------|----------|
| `review.md` | TASK-001 | `migrate.md` | TASK-008 |
| `review-fix.md` | TASK-002 | `publish.md` | TASK-009 |
| `bug-fix.md` | TASK-003 | `sync.md` | TASK-010 |
| `refactor.md` | TASK-004 | `test-unit.md` | TASK-011 |
| `debug.md` | TASK-005 | `test-integration.md` | TASK-012 |
| `evaluate.md` | TASK-006 | `test-e2e.md` | TASK-013 |
| `hotfix.md` | TASK-007 | `test-perf.md` | TASK-014 |
| — | — | `test-security.md` | TASK-015 |

**参考文件（只读，所有 TASK 禁止修改）**:
- `C:\Users\12247\.claude\commands\jarvis.md` — Agent 编排模式参考
- `C:\Users\12247\.claude\agents\` (57 个文件) — Agent 名称正确性验证

## 5. 并行/串行策略

### 5.1 总体策略

- **批次内全并行**：同一批次内的所有 TASK 修改不同文件，无共享冲突，可安全并行
- **批次间建议串行**：后批次参考前批次的 Agent spawn 模式经验，降低返工风险
- **强制串行依赖**：无（所有文件独立）

### 5.2 批次交付顺序

```
Batch 1（试点验证）    → TASK-010                 [1 个文件, ~60 行, 低风险]
Batch 2（测试指令集群） → TASK-011~015              [5 个文件, ~400 行, 低风险]
Batch 3（核心指令A）    → TASK-003,005,006,007      [4 个文件, ~450 行, 低~中风险]
Batch 4（核心指令B）    → TASK-004,008              [2 个文件, ~340 行, 中风险]
Batch 5（审查指令集群） → TASK-001,002              [2 个文件, ~400 行, 中~高风险]
Batch 6（发布指令）     → TASK-009                  [1 个文件, ~150 行, 中风险]
```

### 5.3 每批总行数控制

| 批次 | 行数 | 是否超标 |
|------|------|---------|
| Batch 1 | ~60 | 否 |
| Batch 2 | ~400 | 否 |
| Batch 3 | ~450 | 否 |
| Batch 4 | ~340 | 否 |
| Batch 5 | ~400 | 否 |
| Batch 6 | ~150 | 否 |

## 6. 风险提醒

### 6.1 高风险项

| 风险 | 涉及 TASK | 描述 | 缓解措施 |
|------|----------|------|---------|
| TASK-002 变更规模 | TASK-002 | ~280 行 L 级变更，五阶段全部改造 | 分 5 个子步骤对应 5 个阶段，每阶段独立验证 |
| 编排模式一致性 | ALL | 15 个指令需遵循统一的编排模式 | 以 `/jarvis` 为唯一参考模板；每个 TASK 的 Refactor 阶段交叉验证 |
| 原有红线丢失 | ALL | 修改过程中可能误删现有约束 | 每个 TASK 的 acceptance_criteria 含红线保留验证项 |

### 6.2 中风险项

| 风险 | 涉及 TASK | 缓解措施 |
|------|----------|---------|
| Agent 名称拼写错误 | ALL | Grep 验证 spawn 引用的 Agent 名称在 `.claude/agents/` 目录存在 |
| gate_check 调用遗漏 | ALL | 每个 spawn 前验证 gate_check 存在 |
| 失败回退循环格式不统一 | TASK-001~009 | Refactor 阶段统一格式对齐 `/jarvis` |

### 6.3 垂直切片检查

通过全部任务检查：每个 TASK 交付一个指令文件的完整修改，所有步骤（Agent spawn、gate_check、回退循环）在同一文件中完成，不存在按技术层级拆分的水平切片。

## 7. 实现者交接信息

- **统一参考模板**：所有 Agent spawn 格式、gate_check 调用模式、失败回退循环格式均以 `C:\Users\12247\.claude\commands\jarvis.md` 为准
- **Agent 名称验证**：所有 spawn 引用的 Agent 类型名称必须在 `C:\Users\12247\.claude\agents\` 目录下有对应 `.md` 文件（已全部验证存在）
- **TDD 验证手段**：Red 阶段用 `grep` 验证当前缺失 Agent 调用；Green 阶段用 `grep` 验证 Agent 调用已插入；Refactor 阶段交叉验证格式一致性
- **禁止修改的文件**：`jarvis.md`（参考模板）、`.claude/agents/*.md`（Agent 定义）、`.claude/settings.json`（Hook 配置）

## 8. parallel_batches

### Batch 1（试点——无依赖，可立即启动）
- TASK-010 → subagent_type: docs-engineer

### Batch 2（依赖 Batch 1 完成——测试指令集群，内部全并行）
- TASK-011 → subagent_type: frontend-test-expert
- TASK-012 → subagent_type: backend-test-expert
- TASK-013 → subagent_type: e2e-test-expert
- TASK-014 → subagent_type: perf-test-expert
- TASK-015 → subagent_type: security-review-expert

### Batch 3（依赖 Batch 2 完成——核心指令集群A，内部全并行）
- TASK-003 → subagent_type: frontend-dev-expert
- TASK-005 → subagent_type: backend-dev-expert
- TASK-006 → subagent_type: frontend-dev-expert
- TASK-007 → subagent_type: backend-dev-expert

### Batch 4（依赖 Batch 3 完成——核心指令集群B，内部全并行）
- TASK-004 → subagent_type: frontend-dev-expert
- TASK-008 → subagent_type: backend-dev-expert

### Batch 5（依赖 Batch 4 完成——审查指令集群，内部全并行）
- TASK-001 → subagent_type: frontend-dev-expert
- TASK-002 → subagent_type: backend-dev-expert

### Batch 6（依赖 Batch 5 完成——发布指令，单任务）
- TASK-009 → subagent_type: backend-dev-expert

---

## 9. Execution Packets

---

### task_id: TASK-010
### task_name: `/sync` 指令引入 docs-engineer Agent
### requirement_ids: REQ-010
### owner: docs-engineer
### objective: 将 `/sync` 指令步骤 1-4 的文档一致性检查委托给 docs-engineer Agent，编排者转为审查 Agent 输出 + 决策修复
### in_scope:
- frontmatter `allowed-tools` 添加 `Agent`
- 步骤 1-4 合并为 `spawn docs-engineer` 执行文档一致性检查
- 编排者职责从"逐项检查"改为"审查Agent输出+决策修复"
- 明确编排者保留职责：步骤 0（扫描项目现状）、步骤 5（清理）、步骤 6（生成报告）
- 添加失败回退策略：Agent 超时/失败后编排者回退手动检查
- 保留 `--dry-run` / `--no-clean` 模式描述
### out_of_scope:
- 不修改 README.md 写作风格约束
- 不添加新的工具权限（除 Agent 外）
- 不修改清理策略逻辑
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-010)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.10)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-010)
### allowed_paths:
- `C:\Users\12247\.claude\commands\sync.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`（参考模板，只读）
- `C:\Users\12247\.claude\agents\*.md`（Agent 定义文件）
- `C:\Users\12247\.claude\settings.json`（Hook 配置）
- 其他 13 个指令文件
### dependencies: 无
### required_skills:
- behavioral-guidelines
- code-standards
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: 无（Batch 1 唯一任务）
### wait_for: []
### acceptance_criteria:
1. `sync.md` 的 `allowed-tools` 包含 `Agent`
2. 文件中包含 `spawn docs-engineer` 调用指令
3. 编排者职责描述从"直接逐项检查"改为"审查Agent输出+决策修复"
4. 原有 `--dry-run` / `--no-clean` 模式描述不丢失
5. 原有红线约束（README 不改变写作风格、清理需用户确认）不丢失
6. 包含失败回退策略（Agent 失败后回退手动检查）
### test_strategy: manual_only
### handoff_notes: 这是最简单的修改（单 Agent 委托），需验证 grep 确认 Agent spawn 模式已插入且原有红线保留
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-011
### task_name: `/test-unit` 指令引入 frontend/backend-test-expert
### requirement_ids: REQ-011
### owner: frontend-test-expert
### objective: 将 `/test-unit` 指令步骤 3（生成测试用例）和步骤 5（重构测试代码）从编排者直接编写改为 spawn 测试Agent执行
### in_scope:
- 步骤 3：替换编排者编写测试代码为 `spawn frontend-test-expert` 或 `spawn backend-test-expert`
- 添加领域路由逻辑（前端 vs 后端目标代码的判断条件）
- 步骤 5：替换编排者重构测试代码为 spawn 同一测试 Agent
- 保留步骤 1（检测框架）、步骤 2（分析代码）、步骤 4（运行测试）为编排者操作
- 新增失败回退循环：测试生成失败最多 2 轮修复-重试
### out_of_scope:
- 不修改 `test-driven-development` 技能加载
- 不修改 Red->Green->Refactor 循环描述
- 不修改覆盖率门禁标准
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-011)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.11)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-011)
### allowed_paths:
- `C:\Users\12247\.claude\commands\test-unit.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无（逻辑参考 Batch 1 的 Agent spawn 模式）
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-012, TASK-013, TASK-014, TASK-015]
### wait_for: []
### acceptance_criteria:
1. 步骤 3 不再包含"编排者编写测试代码"的描述
2. 文件中包含 `spawn frontend-test-expert` 或 `spawn backend-test-expert` 调用指令
3. 包含领域路由判断逻辑（前端 vs 后端测试 Agent 的选择条件）
4. 步骤 5 不再包含"编排者重构测试代码"的描述
5. Red -> Green -> Refactor 循环描述不丢失
6. 包含失败回退循环（最多 2 轮）
7. 原有红线约束（不检测框架就生成测试、测试无断言等）不丢失
### test_strategy: tdd
### handoff_notes: TDD Red 阶段需 grep 验证 `spawn frontend-test-expert` 和 `spawn backend-test-expert` 当前不存在；Green 后需验证已插入且领域路由逻辑清晰
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-012
### task_name: `/test-integration` 指令引入 backend-test-expert + api-contract-expert
### requirement_ids: REQ-012
### owner: backend-test-expert
### objective: 将 `/test-integration` 指令步骤 1（识别 API 契约）委托给 api-contract-expert，步骤 3（生成集成测试）委托给 backend-test-expert
### in_scope:
- `allowed-tools` 添加 `Agent`
- 步骤 1：新增 `spawn api-contract-expert`（提取 OpenAPI/路由定义，生成契约文档）
- 步骤 3：替换编排者编写测试代码为 `spawn backend-test-expert`（基于契约生成集成测试）
- 保留步骤 2（启动环境）、步骤 4（运行测试）、步骤 5（清理环境）为编排者操作
- 明确定义两个 Agent 的输入输出契约和传递链路
### out_of_scope:
- 不修改测试环境隔离原则
- 不修改测试框架选择逻辑
- 不修改契约格式标准
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-012)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.12)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-012)
### allowed_paths:
- `C:\Users\12247\.claude\commands\test-integration.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-011, TASK-013, TASK-014, TASK-015]
### wait_for: []
### acceptance_criteria:
1. `allowed-tools` 包含 `Agent`
2. 步骤 1 包含 `spawn api-contract-expert` 调用指令
3. 步骤 3 包含 `spawn backend-test-expert` 调用指令
4. 步骤 3 不再包含"编排者编写测试代码"的描述
5. 契约传递链路完整（api-contract-expert 输出 -> backend-test-expert 输入）
6. 原有红线约束不丢失
### test_strategy: tdd
### handoff_notes: TDD Red 阶段需 grep 验证 `spawn api-contract-expert` 和 `spawn backend-test-expert` 不存在；Green 后验证传递链路完整
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-013
### task_name: `/test-e2e` 指令引入 e2e-test-expert
### requirement_ids: REQ-013
### owner: e2e-test-expert
### objective: 将 `/test-e2e` 指令步骤 3（编写 E2E 测试脚本）从编排者直接编写改为 spawn e2e-test-expert
### in_scope:
- `allowed-tools` 添加 `Agent`
- 步骤 3：替换编排者编写测试脚本为 `spawn e2e-test-expert`
- 传递参数：用户故事、选定的测试工具（Playwright/Cypress）、测试范围
- 保留步骤 1（提取用户故事）、步骤 2（选择工具）、步骤 4（运行测试）、步骤 5（生成报告）为编排者操作
### out_of_scope:
- 不修改用户故事驱动测试原则
- 不修改 E2E 不 mock 后端的原则
- 不添加浏览器操作到编排者范围
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-013)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.13)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-013)
### allowed_paths:
- `C:\Users\12247\.claude\commands\test-e2e.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-011, TASK-012, TASK-014, TASK-015]
### wait_for: []
### acceptance_criteria:
1. `allowed-tools` 包含 `Agent`
2. 步骤 3 包含 `spawn e2e-test-expert` 调用指令
3. 步骤 3 不再包含"编排者编写测试脚本"的描述
4. 用户故事传递链路完整
5. 原有红线约束（不对生产环境测试、不 mock 后端等）不丢失
### test_strategy: tdd
### handoff_notes: 单 Agent 委托，最简单的测试指令修改之一；grep 验证 spawn 插入和原有描述替换即可
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-014
### task_name: `/test-perf` 指令引入 perf-test-expert
### requirement_ids: REQ-014
### owner: perf-test-expert
### objective: 将 `/test-perf` 指令步骤 3（编写负载测试脚本）委托给 perf-test-expert，步骤 6（定位性能瓶颈）增加 Agent 辅助
### in_scope:
- `allowed-tools` 添加 `Agent`
- 步骤 3：替换编排者编写脚本为 `spawn perf-test-expert`（生成 k6/Artillery 脚本）
- 步骤 6：新增 `spawn perf-test-expert` 或 `spawn backend-dev-expert` 辅助瓶颈定位
- 保留步骤 1（定义目标）、步骤 2（选择工具）、步骤 4（建立基线）、步骤 5（执行测试）为编排者操作
### out_of_scope:
- 不修改不对生产环境做负载测试的红线
- 不修改基线对比机制
- 不添加新的性能测试工具
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-014)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.14)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-014)
### allowed_paths:
- `C:\Users\12247\.claude\commands\test-perf.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-011, TASK-012, TASK-013, TASK-015]
### wait_for: []
### acceptance_criteria:
1. `allowed-tools` 包含 `Agent`
2. 步骤 3 包含 `spawn perf-test-expert` 调用指令
3. 步骤 6 包含 Agent 辅助瓶颈定位的描述
4. 步骤 3 不再包含"编排者编写负载测试脚本"的描述
5. 瓶颈定位的 Agent 路由逻辑（perf-test-expert vs backend-dev-expert 的选择条件）清晰
6. 原有红线约束（不对生产环境做负载测试、基线对比机制等）不丢失
### test_strategy: tdd
### handoff_notes: 需注意步骤 6 的 Agent 路由逻辑（性能瓶颈在前端用 perf-test-expert，在后端用 backend-dev-expert）
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-015
### task_name: `/test-security` 指令引入 security-review-expert
### requirement_ids: REQ-015
### owner: security-review-expert
### objective: 将 `/test-security` 指令步骤 3-4（执行安全扫描 + 分析结果）的分析部分委托给 security-review-expert
### in_scope:
- `allowed-tools` 添加 `Agent`
- 步骤 3：编排者负责工具启动（docker run ZAP），`spawn security-review-expert` 负责分析结果
- 步骤 4：整合到 security-review-expert 的输出中（编排者负责报告汇总）
- 保留步骤 1（授权确认）、步骤 2（工具选型）、步骤 5（生成报告）为编排者操作
- 明确编排者/Agent 职责边界："启工具"属编排者，"分析结果"属 Agent
### out_of_scope:
- 不修改不对生产环境扫描的红线
- 不修改授权确认不可绕过的约束
- 不修改 Critical/High 必须修复的约束
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-015)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.15)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-015)
### allowed_paths:
- `C:\Users\12247\.claude\commands\test-security.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- security-and-hardening
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-011, TASK-012, TASK-013, TASK-014]
### wait_for: []
### acceptance_criteria:
1. `allowed-tools` 包含 `Agent`
2. 步骤 3 包含 `spawn security-review-expert` 调用指令
3. 编排者职责明确为"工具启动"而非"结果分析"
4. 步骤 4 描述为使用 security-review-expert 的输出
5. 原有红线约束（不对生产环境扫描、授权确认不可绕过、Critical/High 必须修复）不丢失
### test_strategy: tdd
### handoff_notes: 需特别注意编排者/Agent 职责边界描述清晰——编排者操作 docker 命令是 CLI 操作不是写代码，可保留
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-003
### task_name: `/bug-fix` 指令引入 code-explore-expert + 领域实现 Agent
### requirement_ids: REQ-003
### owner: frontend-dev-expert
### objective: 将 `/bug-fix` 指令步骤 3（定位根因）委托给 code-explore-expert，步骤 4（修复代码）委托给领域实现 Agent
### in_scope:
- 步骤 3：替换"从页面反查代码，定位前端组件文件"等编排者直接探索为 `spawn code-explore-expert`
- 步骤 4：替换"修复代码"为按领域路由 spawn 实现 Agent
- 添加领域路由逻辑：code-explore-expert 输出中故障文件路径 -> 判断前端/后端 -> 路由到对应 Agent
- 添加失败回退循环：code-explore 最多 1 轮、修复最多 2 轮
- 保留步骤 1（收集信息）、步骤 2（浏览器复现）、步骤 5（质量验证）、步骤 6（浏览器验证）、步骤 7（关闭 Bug）为编排者操作
### out_of_scope:
- 不修改 agent-browser CLI 操作（步骤 2 和步骤 6 保留编排者执行）
- 不修改 Lint+Type-check+Build 的编排者执行（步骤 5 保留）
- 不修改 Bug Report 格式
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-003)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.3)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-003)
### allowed_paths:
- `C:\Users\12247\.claude\commands\bug-fix.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无（逻辑参考 Batch 1/2 的 Agent spawn 模式）
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-005, TASK-006, TASK-007]
### wait_for: []
### acceptance_criteria:
1. 步骤 3 包含 `spawn code-explore-expert` 调用指令
2. 步骤 4 包含 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert` 调用指令
3. 步骤 4 不再包含"编排者直接修复代码"的描述
4. 包含领域路由逻辑（前端 Bug vs 后端 Bug 的判断条件）
5. 包含失败回退循环：code-explore 最多 1 轮、修复最多 2 轮
6. 原有红线约束全部保留（不复现就改代码、复现不截图、不定位根因就修复、浏览器必须验证等）
7. 闭环图示更新，反映 Agent spawn 后的新流程
### test_strategy: tdd
### handoff_notes: 注意：步骤 2（浏览器复现）和步骤 6（浏览器验证）保留给编排者（agent-browser CLI 操作不是"写代码"），不要委托给 Agent；code-explore-expert 输出 -> 编排者 -> 实现 Agent 的传递链路要清晰
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-005
### task_name: `/debug` 指令引入 code-explore-expert 辅助诊断
### requirement_ids: REQ-005
### owner: backend-dev-expert
### objective: 在 `/debug` 指令 D3（交互式诊断）阶段新增 code-explore-expert 并行探索，并添加 algorithm-expert 条件性触发
### in_scope:
- `allowed-tools` 添加 `Agent`
- D3 阶段：新增 `spawn code-explore-expert` 并行探索代码库
- 添加 `algorithm-expert` 条件性触发逻辑（异常涉及算法/加密/哈希时触发）
- 编排者保留交互调试（断点追踪）——诊断行为不是写代码
- 新建"Agent 输出 + 编排者诊断 -> 合并诊断结论"的协作流程
### out_of_scope:
- 不修改 5 Gate 序列
- 不修改 D1（生成复现用例）、D2（启动调试）、D4（输出报告）
- 不将交互调试（断点设置）委托给 Agent
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-005)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.5)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-005)
### allowed_paths:
- `C:\Users\12247\.claude\commands\debug.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-003, TASK-006, TASK-007]
### wait_for: []
### acceptance_criteria:
1. `allowed-tools` 包含 `Agent`
2. D3 阶段包含 `spawn code-explore-expert` 调用指令
3. D3 阶段包含 `algorithm-expert` 条件性触发逻辑
4. 编排者仍保留交互调试（断点追踪）能力描述
5. 新建"Agent输出 + 编排者诊断 -> 合并诊断结论"的协作流程描述
6. 原有 5 Gate 序列和红线约束不丢失
### test_strategy: tdd
### handoff_notes: algorithm-expert 条件性触发逻辑格式需与 TASK-001 的审查矩阵一致；编排者保留交互调试是关键区分点
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-006
### task_name: `/evaluate` 指令引入实现 Agent + perf-test-expert
### requirement_ids: REQ-006
### owner: frontend-dev-expert
### objective: 将 `/evaluate` 指令 E1（生成快速原型）从编排者直接编写改为 spawn 实现 Agent，E2 添加可选 perf-test-expert
### in_scope:
- `allowed-tools` 添加 `Agent`
- E1：替换原型编写描述为 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert`
- E2：添加可选 `spawn perf-test-expert`（当评估维度包含性能时触发）
- 保留 E0（定义标准）、E2（运行用例命令）、E3（汇总报告）为编排者操作
- 保留"原型沙箱隔离"和"原型用完即弃"红线
### out_of_scope:
- 不修改 4 Gate 序列
- 不修改评估标准定义流程
- 不添加新的评估维度
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-006)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.6)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-006)
### allowed_paths:
- `C:\Users\12247\.claude\commands\evaluate.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-003, TASK-005, TASK-007]
### wait_for: []
### acceptance_criteria:
1. `allowed-tools` 包含 `Agent`
2. E1 包含 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert` 调用指令
3. E1 不再包含"编排者直接编写原型代码"的描述
4. E2 包含可选 `spawn perf-test-expert` 描述
5. 原有 4 Gate 序列和红线约束（原型沙箱隔离、不修改评估标准等）不丢失
### test_strategy: tdd
### handoff_notes: perf-test-expert 是条件性触发（仅当评估维度包含性能），需与 TASK-005 的 algorithm-expert 条件性触发模式保持一致
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-007
### task_name: `/hotfix` 指令引入 code-explore-expert + 领域实现 Agent
### requirement_ids: REQ-007
### owner: backend-dev-expert
### objective: 将 `/hotfix` 指令 H1（最小化修复）的根因定位和修复从编排者直接执行改为 spawn Agent 并行执行
### in_scope:
- `allowed-tools` 添加 `Agent`
- H1：`spawn code-explore-expert`（二分法定位引入故障的 commit）
- H1：`spawn frontend-dev-expert` 或 `spawn backend-dev-expert`（执行最小化修复）
- 添加并行执行提示（两个 Agent 可同时发起）
- 保留 H0（紧急声明）、H2（快速验证）、H3（事后审计）为编排者操作
- 新增失败回退循环：修复失败最多 2 轮回退
### out_of_scope:
- 不修改 4 Gate 序列
- 不修改紧急时效性要求
- 不修改 H2 的 Lint+Build+Test 编排者执行
- 不修改回滚预演逻辑
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-007)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.7)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-007)
### allowed_paths:
- `C:\Users\12247\.claude\commands\hotfix.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-003, TASK-005, TASK-006]
### wait_for: []
### acceptance_criteria:
1. `allowed-tools` 包含 `Agent`
2. H1 包含 `spawn code-explore-expert` 调用指令
3. H1 包含 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert` 调用指令
4. H1 不再包含"编排者直接定位根因/写修复代码"的描述
5. 包含并行执行提示（两个 Agent 可同时发起）
6. 原有 4 Gate 序列和红线约束（H0 未审批不写代码、不夹带重构等）不丢失
7. 紧急时效性描述不丢失
### test_strategy: tdd
### handoff_notes: H1 的并行执行提示是关键——code-explore-expert 和实现 Agent 可同时启动（code-explore 定位根因时实现 Agent 准备修复上下文），模式与 TASK-003 一致
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-004
### task_name: `/refactor` 指令引入测试 Agent + 实现 Agent
### requirement_ids: REQ-004
### owner: frontend-dev-expert
### objective: 将 `/refactor` 指令 R2（基线测试）、R3（执行重构）、R4（行为漂移检测）从编排者 inline 执行改为 spawn Agent
### in_scope:
- `allowed-tools` 添加 `Agent`
- R2：新增 `spawn frontend-test-expert` 或 `spawn backend-test-expert`（运行测试套件，记录基线覆盖率）
- R3：替换"逐文件执行重构"为 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert`
- R4：Lint+Type-check+Build 保留编排者执行；新增 spawn 测试 Agent 做覆盖率对比
- 保留 R1（定义边界）和 R5（生成报告）为编排者操作
- 保留 R3 红线约束（小步提交、不改行为、不越边界）作为 Agent 约束参数
### out_of_scope:
- 不修改 5 Gate 序列
- 不修改重构安全网原则
- 不修改不变行为清单格式
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-004)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.4)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-004)
### allowed_paths:
- `C:\Users\12247\.claude\commands\refactor.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无（逻辑参考前序批次的 Agent spawn 模式）
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-008]
### wait_for: []
### acceptance_criteria:
1. `allowed-tools` 包含 `Agent`
2. R2 包含 `spawn frontend-test-expert` 或 `spawn backend-test-expert` 调用指令
3. R3 包含 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert` 调用指令
4. R3 不再包含"编排者逐文件执行重构"的描述
5. R4 包含 Agent 辅助覆盖率对比的描述
6. 不变行为清单传递链路完整（R1 -> R3 Agent spawn -> R4 验证）
7. 原有 5 Gate 序列和红线约束（不改 API 契约、不夹带功能修改等）不丢失
### test_strategy: tdd
### handoff_notes: 不变行为清单从 R1 传递到 R3 的 Agent spawn 参数 -> 再到 R4 的验证对比，这个链路的完整性是关键验证点
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-008
### task_name: `/migrate` 指令引入批量并行实现 Agent
### requirement_ids: REQ-008
### owner: backend-dev-expert
### objective: 将 `/migrate` 指令 M2（应用迁移）从编排者逐规则执行改为批量 spawn 实现 Agent 并行执行
### in_scope:
- `allowed-tools` 添加 `Agent`
- M2：替换"按规则表逐规则迁移"为批量 spawn 实现 Agent 描述
- 定义文件分组策略（核心配置 1 组、业务逻辑 1~N 组、辅助代码 1 组）
- 每组的 Agent spawn 参数（迁移规则表 + 文件清单）
- 说明多 Agent 可并行发起
- 新增共享区域冲突检查提示
- 保留 M1（定义规则）、M3（编译验证）、M4（Lint 修复）为编排者操作
### out_of_scope:
- 不修改 4 Gate 序列
- 不修改"规则先行"和"每批次验证语法"的约束
- 不修改迁移不夹带业务逻辑修改的红线
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-008)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.8)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-008)
### allowed_paths:
- `C:\Users\12247\.claude\commands\migrate.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-004]
### wait_for: []
### acceptance_criteria:
1. `allowed-tools` 包含 `Agent`
2. M2 包含 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert` 调用指令
3. M2 不再包含"编排者逐规则迁移"的描述
4. 包含文件分组策略（按模块/目录分组，多 Agent 并行）
5. 包含共享区域冲突检查描述
6. 原有 4 Gate 序列和红线约束（迁移不夹带业务逻辑修改、不修改业务逻辑等）不丢失
### test_strategy: tdd
### handoff_notes: 批量并行 spawn 格式需与 `/jarvis` Gate C-impl 的 parallel_batches 一致；文件分组策略描述需清晰可操作
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-001
### task_name: `/review` 指令补全领域审查专家并行矩阵
### requirement_ids: REQ-001
### owner: frontend-dev-expert
### objective: 将 `/review` 指令审查流程从"建议可并发调用"改为强制执行 5+1 审查 Agent 并行矩阵，与 `/jarvis` Gate D 对齐
### in_scope:
- 替换审查流程中的"可并发调用..."为强制审查矩阵（5 必选 + 1 条件性）
- 5 个必选：frontend-review-expert, backend-review-expert, security-review-expert, perf-review-expert, qa-review-expert
- 1 个条件性：algorithm-expert（触发条件与 `/jarvis` Gate D 对齐）
- 新增审查失败回退循环规则（最多 2 轮、BLOCKED 条件）
- 保留只读审查模式核心纪律（不修改文件、不修复代码、只报告 findings）
- 保留现有 project-review-expert 和 diff-review-expert 作为补充选项
### out_of_scope:
- 不新增审查 Agent 类型（使用现有 Agent）
- 不修改审查报告格式
- 不修改 Gate D 序列定义
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-001)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.1)
- `docs/2026-05-18/tasks/commands-subagent-integration-bdd.md` (S1~S4)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-001)
### allowed_paths:
- `C:\Users\12247\.claude\commands\review.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无（逻辑参考 `/jarvis` Gate D 审查矩阵，但文件独立）
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-002]
### wait_for: []
### acceptance_criteria:
1. 文件中包含 5 个必选审查 Agent 的 spawn 指令（frontend/backend/security/perf/qa-review-expert）
2. 文件中包含 `algorithm-expert` 条件性触发逻辑 + 触发条件表
3. 审查流程从"可并发调用"改为"必须并发调用"
4. 包含审查失败回退循环规则（最多 2 轮、BLOCKED 条件）
5. 只读审查模式核心纪律不丢失（不修改文件、不修复代码、只报告 findings）
6. 现有 `project-review-expert` 和 `diff-review-expert` 作为补充选项保留
### test_strategy: tdd
### handoff_notes: 现有 review.md 第 29 行有"可并发调用 project-review-expert、diff-review-expert、perf-review-expert、code-explore-expert 等只读 Agent"——需将"可并发调用"改为"必须并发调用"，并补全 5+1 矩阵；algorithm-expert 触发条件需与 `/jarvis` Gate D 完全一致
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-002
### task_name: `/review-fix` 指令补全五阶段完整 Agent 矩阵
### requirement_ids: REQ-002
### owner: backend-dev-expert
### objective: 将 `/review-fix` 指令五个阶段全部从编排者 inline 执行改为 spam Agent 执行，补全初审矩阵 + 领域路由修复 + 复审关闭矩阵
### in_scope:
- 阶段一（初审）：替换现有部分审查 Agent 建议为完整 6+1 强制并行矩阵
- 阶段二（修复规划）：保留 remediation-expert，增补 remediation-planner 选项
- 阶段三（执行）：从编排者直接修复改为按领域路由 spawn 实现 Agent（4 种路由规则）
- 阶段四（验证）：新增 spawn 测试 Agent + browser-test-expert 条件性触发
- 阶段五（复审）：保留 change-review-expert，新增并行 qa-review-expert
- 新增五阶段失败回退循环规则
### out_of_scope:
- 不修改五阶段不可跳过的硬约束
- 不修改 session_join 注册逻辑
- 不修改现有 Agent 引用（project-review-expert、diff-review-expert、remediation-expert、change-review-expert）
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-002)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.2)
- `docs/2026-05-18/tasks/commands-subagent-integration-bdd.md` (S5~S10)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-002)
### allowed_paths:
- `C:\Users\12247\.claude\commands\review-fix.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无（逻辑参考 TASK-001 的审查矩阵，但文件独立可并行）
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: [TASK-001]
### wait_for: []
### acceptance_criteria:
1. 阶段一包含完整 6+1 审查 Agent 并行矩阵（5 必选 + 1 条件性）
2. 阶段三包含按领域路由 spawn 实现 Agent 的逻辑（4 种路由规则）
3. 阶段三不再包含"编排者直接执行修复"的描述
4. 阶段四包含测试 Agent spawn + browser-test-expert 条件性触发
5. 阶段五包含 `qa-review-expert` 并行复审
6. 包含完整的五阶段失败回退循环规则
7. 五阶段顺序不跳过、不减少红线约束
8. 现有 Agent 引用（project-review-expert、diff-review-expert、remediation-expert、change-review-expert）保留
### test_strategy: tdd
### handoff_notes: 这是最复杂的任务（~280 行 L 级），见下方 5 步实现方案。每个阶段修改后可独立 grep 验证
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

### task_id: TASK-009
### task_name: `/publish` 指令补全技能加载 + 质量门失败 Agent 修复回路
### requirement_ids: REQ-009
### owner: backend-dev-expert
### objective: 将 `/publish` 指令补全 shipping-and-launch/finishing-a-development-branch 技能加载，并将质量门/测试失败时的"用户手动修复"改为 Agent spawn 自动修复回路
### in_scope:
- `allowed-tools` 添加 `Agent`
- 步骤 0：新增加载 `Skill("shipping-and-launch")` 和 `Skill("finishing-a-development-branch")`
- 步骤 2（质量门失败修复回路）：
  - Lint 失败 -> `spawn frontend-dev-expert` 或 `spawn backend-dev-expert`（修复 lint 错误）
  - Type-check 失败 -> 同上（修复类型错误）
  - Build 失败 -> 同上（修复构建错误）
  - Deps Audit 失败 -> 同上（升级/替换有漏洞依赖）
  - 修复后重跑全部四项检查（不可只跑失败项）
  - 最多 2 轮修复-重试循环，2 轮仍失败 -> 标记 BLOCKED
- 步骤 3（测试失败修复回路）：
  - 测试失败 -> `spawn frontend-dev-expert` 或 `spawn backend-dev-expert`（修复导致测试失败的代码）
  - 最多 2 轮修复-重试循环
- 保留所有现有环境检测、版本递增、Git 操作步骤
### out_of_scope:
- 不修改 9 步发布流程
- 不修改版本号递增逻辑
- 不修改 Git 操作（分支/PR/合并/tag）
- 不修改环境检测逻辑
### input_documents:
- `docs/requirements/REQ-commands-subagent-integration.md` (REQ-009)
- `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md` (Section 6.9)
- `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md` (TASK-009)
### allowed_paths:
- `C:\Users\12247\.claude\commands\publish.md`
### forbidden_paths:
- `C:\Users\12247\.claude\commands\jarvis.md`
- `C:\Users\12247\.claude\agents\*.md`
- 其他 13 个指令文件
### dependencies: 无（逻辑参考前序批次的质量门修复回路模式）
### required_skills:
- behavioral-guidelines
- code-standards
- test-driven-development
- shipping-and-launch
- source-driven-development
- incremental-implementation
- verification-before-completion
### parallel_group: 无（Batch 6 唯一任务）
### wait_for: []
### acceptance_criteria:
1. `allowed-tools` 包含 `Agent`
2. 步骤 0 包含 `Skill("shipping-and-launch")` 和 `Skill("finishing-a-development-branch")` 加载指令
3. 步骤 2 质量门失败时包含 Agent spawn 修复回路（4 种失败类型各有明确 Agent 路由）
4. 步骤 2 不再包含"立即停止，用户修复后重新执行"的描述（替换为 Agent 自动修复）
5. 步骤 3 测试失败时包含 Agent spawn 修复回路
6. 步骤 3 不再包含"立即停止，用户修复后重新执行"的描述
7. 修复回路明确：最多 2 轮，2 轮后标记 BLOCKED
8. 原有 9 步流程不变、红线不减少、环境检测逻辑不变
### test_strategy: tdd
### handoff_notes: 这是唯一涉及 Skill 加载变更的任务（新增两个 Skill）；质量门 4 种失败类型的 Agent 路由需逐一明确；修复回路格式需与 `/jarvis` Gate C1 的修复回路对齐
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改

---

## 10. TASK-002（/review-fix）分步实现方案

TASK-002 变更约 280 行，涉及五个阶段的全面改造。以下为推荐的分步方案，每一步可独立验证。

### 步骤 1：阶段一修改（初审矩阵）

**操作**：将现有"可并发调用 project-review-expert、diff-review-expert、perf-review-expert、code-explore-expert"替换为完整 6+1 强制并行矩阵。

**修改内容**：
```
阶段一：初审（强制执行——全部 Agent 并行 spawn）
├── spawn frontend-review-expert（前端代码审查）
├── spawn backend-review-expert（后端代码审查）
├── spawn security-review-expert（安全审计）
├── spawn perf-review-expert（性能审计）
├── spawn qa-review-expert（综合签核——等待以上 4 个完成后执行）
└── spawn algorithm-expert（条件性触发——当变更涉及密码学/算法/ML时）
```

**验证**：`grep -c "spawn frontend-review-expert" review-fix.md` >= 1（且其他 5 个 Agent 同理）

**保留**：project-review-expert、diff-review-expert 作为补充选项（非必选，标注为可选增强）

---

### 步骤 2：阶段二修改（修复规划）

**操作**：保留现有 `remediation-expert` 调用，增补 `remediation-planner` 作为可选增强。

**修改内容**：在 `remediation-expert` 描述后增加"可选：spawn remediation-planner 生成更细粒度的修复排序和冲突预检"。

**验证**：`grep -c "remediation-expert" review-fix.md` >= 1（保留）；`grep -c "remediation-planner" review-fix.md` >= 1（新增）

---

### 步骤 3：阶段三修改（执行——按领域路由）

**操作**：将"按计划顺序或并发执行"替换为明确的按领域路由 spawn 实现 Agent。

**领域路由规则**：
| Finding 领域 | 路由目标 Agent | 条件 |
|-------------|---------------|------|
| frontend | `spawn frontend-dev-expert` | 文件路径在 `src/components/`、`src/pages/`、`web/` 下 |
| backend | `spawn backend-dev-expert` | 文件路径在 `src/services/`、`src/routes/`、`app/` 下 |
| security | `spawn backend-dev-expert`（传递安全报告） | 安全相关 Finding，传递 security-review-expert 的输出 |
| performance | `spawn frontend-dev-expert` 或 `spawn backend-dev-expert` | 根据瓶颈所在代码文件判断领域 |

**并行策略**：同一批次无共享文件冲突的 Finding 可并行 spawn；共享同一文件的 Finding 串行执行。

**验证**：
- `grep -c "spawn frontend-dev-expert" review-fix.md` >= 1
- `grep -c "spawn backend-dev-expert" review-fix.md` >= 1
- 确认不存在"编排者直接执行修复"的描述

---

### 步骤 4：阶段四修改（验证）

**操作**：保留 Lint+Type-check+Build 为编排者执行 CLI；新增测试 Agent spawn + browser-test-expert。

**修改内容**：
```
阶段四：验证
1. Lint + Type-check + Build（编排者执行 CLI命令——不可委托）
2. spawn frontend-test-expert 或 backend-test-expert（重跑测试套件，确认无回归）
3. 条件性：如有前端页面变更 → spawn browser-test-expert（浏览器交互验证）
```

**验证**：
- `grep -c "spawn frontend-test-expert\|spawn backend-test-expert" review-fix.md` >= 1
- `grep -c "spawn browser-test-expert" review-fix.md` >= 1
- Lint/Type-check/Build 描述中不含 Agent spawn（保留编排者执行）

---

### 步骤 5：阶段五修改（复审关闭矩阵）+ 失败回退循环

**操作**：保留 `change-review-expert`，新增并行 `qa-review-expert`；添加五阶段通用失败回退规则。

**修改内容**：
```
阶段五：复审
├── spawn change-review-expert（逐项关闭初审 Finding）
└── spawn qa-review-expert（并行——最终综合签核）

失败回退规则（五阶段通用）：
- 任何 Agent 超时/失败 → 最多 2 轮重试
- 第 2 轮仍失败 → 标记该 Agent 为 BLOCKED，向用户报告
- BLOCKED 条件：retries_exhausted / root_cause_unknown / shared_resource_conflict
- 阶段三修复后阶段四验证不通过 → 回退阶段三修复（最多 2 轮循环）
- 2 轮循环后阶段五复审仍有 OPEN Finding → 标记 ABORT，保留所有已关闭修复
```

**验证**：
- `grep -c "spawn qa-review-expert" review-fix.md` >= 1
- `grep -c "BLOCKED" review-fix.md` >= 1
- `grep -c "ABORT" review-fix.md` >= 1

---

## 11. plan patch / contract change request 触发条件

以下情况发生时，实现 Agent 应暂停执行并回编排者请求 plan patch：

1. **Agent 名称验证失败**：spawn 引用的 Agent 类型名称在 `.claude/agents/` 目录下不存在对应定义文件
2. **红线丢失检测**：实现过程中发现原有指令的红线约束被意外移除或覆盖
3. **格式冲突**：两个并行 Agent（Batch 5 的 TASK-001 和 TASK-002）的 Agent 矩阵格式不一致，需要统一
4. **参考模板变更**：`jarvis.md` 中的 Gate D 审查矩阵或修复回路规则在本轮次执行期间发生了变更
5. **Gate 序列冲突**：修改后的指令与当前引擎 Gate 配置不兼容（如 gate_check operation 名称不匹配）
6. **文件被外部修改**：目标指令文件在 Agent 编辑期间被其他进程修改

## 12. 推荐的下一步

1. **Batch 1 执行**：启动 TASK-010（`docs-engineer` 修改 `sync.md`），验证 Agent spawn 模式在指令文件中可用
2. **Batch 1 验证**：确认 `grep` 验证通过后，推送到 Batch 2
3. **Batch 2~6 依序执行**：按并行批次定义批量 spawn Agent
4. **全局 Refactor 验证**：所有 Batch 完成后，统一验证：
   - 所有 Agent 名称在 `.claude/agents/` 目录存在
   - 所有 gate_check 调用模式一致
   - 所有失败回退循环格式统一
   - 所有原有红线约束保留
   - 不存在编排者直接编码描述
5. **Gate 推进**：每批完成调用 `gate_enforce()` + `advance_gate()`
6. **QA 审查**：最终调用 `qa-review-expert` 做全量一致性审查

---

## 附件 A：当前文件状态矩阵（Red 起步基线）

| 指令文件 | allowed-tools 含 Agent | 已有 Agent spawn | 需补充 Agent spawn | 风险 |
|---------|----------------------|-----------------|-------------------|------|
| `review.md` | YES | partial（project/diff/perf-review-expert） | 5+1 矩阵补充 | 中 |
| `review-fix.md` | YES | partial（project/diff/remediation/change-review-expert） | 8+ Agent 补充 + 5阶段改造 | 高 |
| `bug-fix.md` | YES | none（编排者 inline） | code-explore + 领域实现 Agent | 中 |
| `refactor.md` | **NO** | none（编排者 inline） | 测试 Agent + 实现 Agent | 中 |
| `debug.md` | **NO** | none（编排者 inline） | code-explore + algorithm-expert | 低 |
| `evaluate.md` | **NO** | none（编排者 inline） | 实现 Agent + perf-test-expert | 低 |
| `hotfix.md` | **NO** | none（编排者 inline） | code-explore + 领域实现 Agent | 中 |
| `migrate.md` | **NO** | none（编排者 inline） | 批量并行实现 Agent | 中 |
| `publish.md` | **NO** | none（编排者 inline） | 质量门修复 Agent + Skill加载 | 中 |
| `sync.md` | **NO** | none（编排者 inline） | docs-engineer | 低 |
| `test-unit.md` | **NO** | none（编排者 inline） | 测试 Agent（frontend/backend） | 低 |
| `test-integration.md` | **NO** | none（编排者 inline） | api-contract + backend-test | 低 |
| `test-e2e.md` | **NO** | none（编排者 inline） | e2e-test-expert | 低 |
| `test-perf.md` | **NO** | none（编排者 inline） | perf-test-expert | 低 |
| `test-security.md` | **NO** | none（编排者 inline） | security-review-expert | 低 |

## 附件 B：所有引用的 Agent 名称验证

以下 18 个 Agent 类型名称已全部在 `C:\Users\12247\.claude\agents\` 目录下验证存在：

| Agent 名称 | 文件 | 用途 |
|-----------|------|------|
| `frontend-review-expert` | EXISTS | 前端审查 |
| `backend-review-expert` | EXISTS | 后端审查 |
| `security-review-expert` | EXISTS | 安全审计 |
| `perf-review-expert` | EXISTS | 性能审计 |
| `qa-review-expert` | EXISTS | 综合签核 |
| `algorithm-expert` | EXISTS | 算法审查（条件性） |
| `code-explore-expert` | EXISTS | 代码探索/根因定位 |
| `frontend-dev-expert` | EXISTS | 前端实现 |
| `backend-dev-expert` | EXISTS | 后端实现 |
| `frontend-test-expert` | EXISTS | 前端测试 |
| `backend-test-expert` | EXISTS | 后端测试 |
| `e2e-test-expert` | EXISTS | E2E 测试 |
| `perf-test-expert` | EXISTS | 性能测试 |
| `docs-engineer` | EXISTS | 文档一致性检查 |
| `api-contract-expert` | EXISTS | API 契约识别 |
| `remediation-expert` | EXISTS | 修复执行 |
| `change-review-expert` | EXISTS | 变更复审 |
| `browser-test-expert` | EXISTS | 浏览器测试 |
