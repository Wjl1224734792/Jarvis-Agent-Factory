# TDD 任务包 -- 指令文件子Agent集成补充

> **需求文档**: `docs/requirements/REQ-commands-subagent-integration.md`
> **DDD 分析**: `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md`
> **BDD 场景**: 未生成（BDD 仅覆盖 REQ-001/REQ-002，非本 TDD 包范围；REQ-001/REQ-002 的 BDD 验证由独立任务包处理）
> **分析日期**: 2026-05-18
> **任务总数**: 15 个 TASK，覆盖 15 个 REQ
> **修改文件**: 14 个 `.claude/commands/*.md` 指令文件（REQ-001 和 REQ-002 分别修改不同文件）

---

## 任务概览

| TASK-ID | REQ | 指令文件 | TDD 策略 | 变更行数 | 风险 | 批次 |
|---------|-----|---------|---------|---------|------|------|
| TASK-001 | REQ-001 | review.md | TDD | M (~120) | 中 | 5 |
| TASK-002 | REQ-002 | review-fix.md | TDD | L (~280) | 高 | 5 |
| TASK-003 | REQ-003 | bug-fix.md | TDD | M (~150) | 中 | 3 |
| TASK-004 | REQ-004 | refactor.md | TDD | M (~180) | 中 | 4 |
| TASK-005 | REQ-005 | debug.md | TDD | S (~80) | 低 | 3 |
| TASK-006 | REQ-006 | evaluate.md | TDD | S (~90) | 低 | 3 |
| TASK-007 | REQ-007 | hotfix.md | TDD | M (~130) | 中 | 3 |
| TASK-008 | REQ-008 | migrate.md | TDD | M (~160) | 中 | 4 |
| TASK-009 | REQ-009 | publish.md | TDD | M (~150) | 中 | 6 |
| TASK-010 | REQ-010 | sync.md | 直接开发 | S (~60) | 低 | 1 |
| TASK-011 | REQ-011 | test-unit.md | TDD | S (~80) | 低 | 2 |
| TASK-012 | REQ-012 | test-integration.md | TDD | S (~90) | 低 | 2 |
| TASK-013 | REQ-013 | test-e2e.md | TDD | S (~60) | 低 | 2 |
| TASK-014 | REQ-014 | test-perf.md | TDD | S (~90) | 低 | 2 |
| TASK-015 | REQ-015 | test-security.md | TDD | S (~80) | 低 | 2 |

**总变更估算**: ~1,700 行（分散在 14 个独立文件中，无共享冲突）

---

## 共享区域冲突检查

**结论：无共享区域冲突。** 15 个 TASK 修改 14 个不同的指令文件，每个 TASK 拥有其目标文件的唯一修改权。

| 文件 | 唯一修改 TASK |
|------|-------------|
| `C:\Users\12247\.claude\commands\review.md` | TASK-001 |
| `C:\Users\12247\.claude\commands\review-fix.md` | TASK-002 |
| `C:\Users\12247\.claude\commands\bug-fix.md` | TASK-003 |
| `C:\Users\12247\.claude\commands\refactor.md` | TASK-004 |
| `C:\Users\12247\.claude\commands\debug.md` | TASK-005 |
| `C:\Users\12247\.claude\commands\evaluate.md` | TASK-006 |
| `C:\Users\12247\.claude\commands\hotfix.md` | TASK-007 |
| `C:\Users\12247\.claude\commands\migrate.md` | TASK-008 |
| `C:\Users\12247\.claude\commands\publish.md` | TASK-009 |
| `C:\Users\12247\.claude\commands\sync.md` | TASK-010 |
| `C:\Users\12247\.claude\commands\test-unit.md` | TASK-011 |
| `C:\Users\12247\.claude\commands\test-integration.md` | TASK-012 |
| `C:\Users\12247\.claude\commands\test-e2e.md` | TASK-013 |
| `C:\Users\12247\.claude\commands\test-perf.md` | TASK-014 |
| `C:\Users\12247\.claude\commands\test-security.md` | TASK-015 |

**并行策略**：同一批次内所有 TASK 可完全并行执行。不同批次按依赖关系串行（后续批次依赖前序批次的编排模式经验）。

---

## TDD 方法论说明

### 为什么指令文件修改适用 TDD

指令文件（`.md`）是纯文本文档，不存在编译/运行时错误。TDD 在此上下文的含义：

| TDD 阶段 | 传统代码 TDD | 指令文件 TDD 适配 |
|----------|------------|-----------------|
| **Red** | 编写失败测试（编译错误或断言失败） | 读取当前指令文件，断言关键 Agent 路由模式**缺失**（如：文件中不包含 `spawn frontend-review-expert`） |
| **Green** | 编写最小实现通过测试 | 编辑指令文件，插入最小化的 Agent spawn 调用 |
| **Refactor** | 在测试保护下重整代码 | 统一 14 个指令文件的编排模式格式，确保所有 Agent 路由、gate_check 调用、失败回退循环遵循一致模板 |

### TDD 验证手段

每个 TASK 的 Red/Green 验证通过以下方式实现：

1. **Red 验证**：`grep` 目标文件中不存在预期的 Agent spawn 模式
2. **Green 验证**：`grep` 目标文件中已存在预期的 Agent spawn 模式
3. **完整性验证**：`grep` 所有修改后文件，确认：
   - Agent 名称与 `.claude/agents/` 目录下定义一致
   - `gate_check()` 调用在 spawn 前存在
   - 失败回退循环明确定义了 `max_retries` 和 `BLOCKED` 条件
   - 原有红线约束未被删除

---

## 任务分解

---

### 第 1 批：低风险试点（1 个 TASK）

---

### TASK-010
- **task_name**: `/sync` 指令引入 docs-engineer Agent
- **requirement_ids**: [REQ-010]
- **type**: 直接开发
- **priority**: P1
- **estimated_lines**: ~60
- **test_strategy**: manual_only
- **dependencies**: 无
- **parallel_group**: 无（本批次唯一任务）
- **risk**: 低
- **risk_description**: 最简单的修改——单 Agent 委托，无门禁、无多步骤协调。仅修改一个指令文件。
- **当前状态分析**:
  - 步骤 1-4（检查 CLAUDE.md / AGENTS.md / README.md / CHANGELOG.md）全部由编排者 inline 执行
  - 缺少 `allowed-tools` 中的 `Agent` 权限声明
  - 文件路径：`C:\Users\12247\.claude\commands\sync.md`
- **需要引入的 Agent**: `docs-engineer`（文档一致性检查，只读）
- **修改内容**:
  1. 在 frontmatter `allowed-tools` 中添加 `Agent`
  2. 在步骤 1-4 合并为：`spawn docs-engineer` 执行文档一致性检查，输出不一致清单
  3. 编排者从"逐项检查"转为"审查 Agent 输出 + 决策修复"
  4. 明确编排者保留的职责：扫描项目现状（步骤 0）、清理（步骤 5）、生成报告（步骤 6）
  5. 保留原有 `--dry-run` / `--no-clean` 模式和红线约束

- **Red 阶段验证**:
  ```
  1. grep -c "Agent" sync.md → 当前 = 0（未声明 Agent 工具权限）
  2. grep -c "spawn docs-engineer" sync.md → 当前 = 0（未委托文档检查）
  3. grep -c "allowed-tools:.*Agent" sync.md → 当前 = 0
  ```
  验证上述三项均为 0（Red 状态确认——Agent 路由模式缺失）。

- **Green 阶段实现**:
  1. 修改 frontmatter: `allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill, Agent`
  2. 合并步骤 1-4 为：`spawn docs-engineer`，传递检查范围（CLAUDE.md / AGENTS.md / README.md / CHANGELOG.md）
  3. 编排者步骤改为：
     - 接收 docs-engineer 输出（不一致清单）
     - 逐一决策是否修复、如何修复
     - 执行修复（Write/Edit —— 编排者保留文档修改能力）
     - 不修改 README.md 写作风格（红线保持）
  4. 添加失败回退：docs-engineer 超时/失败后编排者回退到手动逐项检查模式

- **Refactor 阶段验证**:
  1. 读取所有已修改的指令文件，确认 Agent spawn 格式一致
  2. 确认 `Agent()` 调用包含 `task_id` 和 `objective` 参数（与 `/jarvis` 模板对齐）

- **acceptance_criteria**:
  1. `sync.md` 的 `allowed-tools` 包含 `Agent`
  2. 文件中包含 `spawn docs-engineer` 调用指令
  3. 编排者职责描述从"直接逐项检查"改为"审查Agent输出+决策修复"
  4. 原有 `--dry-run` / `--no-clean` 模式描述不丢失
  5. 原有红线约束（README 不改变写作风格、清理需用户确认）不丢失
  6. 包含失败回退策略（Agent 失败后回退手动检查）

---

### 第 2 批：测试指令集群（5 个 TASK，可完全并行）

---

### TASK-011
- **task_name**: `/test-unit` 指令引入 frontend/backend-test-expert
- **requirement_ids**: [REQ-011]
- **type**: TDD
- **priority**: P1
- **estimated_lines**: ~80
- **test_strategy**: tdd
- **dependencies**: 无
- **parallel_group**: [TASK-012, TASK-013, TASK-014, TASK-015]
- **risk**: 低
- **risk_description**: 测试指令 Agent 委托逻辑明确（一对一映射），风险低
- **当前状态分析**:
  - 步骤 3（生成测试用例）由编排者直接写测试代码 -- 违反"编排者禁止直接编码"
  - 步骤 5（重构测试代码）由编排者直接执行 -- 同上
  - 步骤 1（检测框架）、步骤 2（分析代码）、步骤 4（运行测试）为编排者合理保留操作
  - `allowed-tools` 已包含 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\test-unit.md`
- **需要引入的 Agent**: `frontend-test-expert` 或 `backend-test-expert`（根据目标代码所在领域）
- **修改内容**:
  1. 步骤 3：从编排者写测试代码改为 `spawn frontend-test-expert` 或 `spawn backend-test-expert`
     - 传递：目标源文件路径、测试框架类型、场景矩阵
  2. 步骤 5：从编排者重构测试改为 spawn 同一测试 Agent 执行测试重构
  3. 新增条件性路由逻辑（前端 vs 后端目标代码的判断）
  4. 新增失败回退循环：测试生成失败最多 2 轮修复-重试

- **Red 阶段验证**:
  ```
  1. grep -c "spawn frontend-test-expert\|spawn backend-test-expert" test-unit.md → 当前 = 0
  2. grep -c "编排者.*直接写测试\|直接编写测试" test-unit.md → 当前 > 0（确认编排者当前直接执行）
  ```
  验证 Agent spawn 模式缺失。

- **Green 阶段实现**:
  1. 步骤 3：替换"生成测试用例"的编排者直接编码描述为 `spawn frontend-test-expert` / `spawn backend-test-expert`
  2. 添加领域路由逻辑：检测目标源文件路径 → 判断前端/后端 → 路由到对应测试 Agent
  3. 步骤 5：替换"重构测试代码"描述为 spawn 测试 Agent
  4. 步骤 1、2、4 保留为编排者操作

- **Refactor 阶段验证**:
  1. 确认 Agent spawn 格式与其他测试指令（TASK-012~015）一致
  2. 确认条件性路由模式清晰可读

- **acceptance_criteria**:
  1. 步骤 3 不再包含"编排者编写测试代码"的描述
  2. 文件中包含 `spawn frontend-test-expert` 或 `spawn backend-test-expert` 调用指令
  3. 包含领域路由判断逻辑（前端 vs 后端测试 Agent 的选择条件）
  4. 步骤 5 不再包含"编排者重构测试代码"的描述
  5. Red -> Green -> Refactor 循环描述不丢失
  6. 包含失败回退循环（最多 2 轮）
  7. 原有红线约束（不检测框架就生成测试、测试无断言等）不丢失

---

### TASK-012
- **task_name**: `/test-integration` 指令引入 backend-test-expert + api-contract-expert
- **requirement_ids**: [REQ-012]
- **type**: TDD
- **priority**: P1
- **estimated_lines**: ~90
- **test_strategy**: tdd
- **dependencies**: 无
- **parallel_group**: [TASK-011, TASK-013, TASK-014, TASK-015]
- **risk**: 低
- **risk_description**: 测试指令、低复杂度
- **当前状态分析**:
  - 步骤 1（识别 API 契约）由编排者直接执行——适合委托给 api-contract-expert
  - 步骤 3（生成集成测试用例）由编排者直接写测试代码——违反"禁止直接编码"
  - 步骤 2（启动环境）、步骤 4（运行测试）、步骤 5（清理环境）为编排者合理保留
  - `allowed-tools` 未声明 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\test-integration.md`
- **需要引入的 Agent**: `api-contract-expert`（契约识别）、`backend-test-expert`（测试生成）
- **修改内容**:
  1. `allowed-tools` 添加 `Agent`
  2. 步骤 1：新增 `spawn api-contract-expert`（提取 OpenAPI/路由定义，生成契约文档）
  3. 步骤 3：从编排者写测试代码改为 `spawn backend-test-expert`（基于契约生成集成测试）
  4. 编排者保留：步骤 2（启动环境）、步骤 4（运行测试）、步骤 5（清理环境）

- **Red 阶段验证**:
  ```
  1. grep -c "Agent" test-integration.md → frontmatter 中不包含 Agent
  2. grep -c "spawn api-contract-expert" test-integration.md → 0
  3. grep -c "spawn backend-test-expert" test-integration.md → 0
  ```

- **Green 阶段实现**:
  1. 添加 `Agent` 到 `allowed-tools`
  2. 步骤 1：添加 `spawn api-contract-expert` 子步骤
  3. 步骤 3：替换编排者直接写测试为 `spawn backend-test-expert`
  4. 明确定义两个 Agent 的输入输出契约

- **Refactor 阶段验证**:
  1. Agent spawn 格式与 TASK-011 一致
  2. 契约文档传递链路清晰（api-contract-expert -> 编排者 -> backend-test-expert）

- **acceptance_criteria**:
  1. `allowed-tools` 包含 `Agent`
  2. 步骤 1 包含 `spawn api-contract-expert` 调用指令
  3. 步骤 3 包含 `spawn backend-test-expert` 调用指令
  4. 步骤 3 不再包含"编排者编写测试代码"的描述
  5. 契约传递链路完整（api-contract-expert 输出 -> backend-test-expert 输入）
  6. 原有红线约束不丢失

---

### TASK-013
- **task_name**: `/test-e2e` 指令引入 e2e-test-expert
- **requirement_ids**: [REQ-013]
- **type**: TDD
- **priority**: P1
- **estimated_lines**: ~60
- **test_strategy**: tdd
- **dependencies**: 无
- **parallel_group**: [TASK-011, TASK-012, TASK-014, TASK-015]
- **risk**: 低
- **risk_description**: 单 Agent 委托，风险低
- **当前状态分析**:
  - 步骤 3（编写 E2E 测试脚本）由编排者直接写测试代码——违反"禁止直接编码"
  - 步骤 1（提取用户故事）、步骤 2（选择工具）、步骤 4（运行测试）、步骤 5（生成报告）为编排者合理保留
  - `allowed-tools` 未声明 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\test-e2e.md`
- **需要引入的 Agent**: `e2e-test-expert`
- **修改内容**:
  1. `allowed-tools` 添加 `Agent`
  2. 步骤 3：替换编排者编写测试脚本为 `spawn e2e-test-expert`
     - 传递：用户故事、选定工具、测试范围
  3. 编排者保留：步骤 1/2/4/5

- **Red 阶段验证**:
  ```
  1. grep -c "Agent" test-e2e.md → frontmatter 中不包含 Agent
  2. grep -c "spawn e2e-test-expert" test-e2e.md → 0
  ```

- **Green 阶段实现**:
  1. 添加 `Agent` 到 `allowed-tools`
  2. 步骤 3：替换为 `spawn e2e-test-expert` 调用指令
  3. 传递参数包含：用户故事、选定的测试工具（Playwright/Cypress）、测试范围

- **Refactor 阶段验证**:
  1. Agent spawn 格式与其他测试指令一致
  2. 用户故事->测试脚本的传递链路清晰

- **acceptance_criteria**:
  1. `allowed-tools` 包含 `Agent`
  2. 步骤 3 包含 `spawn e2e-test-expert` 调用指令
  3. 步骤 3 不再包含"编排者编写测试脚本"的描述
  4. 用户故事传递链路完整
  5. 原有红线约束（不对生产环境测试、不 mock 后端等）不丢失

---

### TASK-014
- **task_name**: `/test-perf` 指令引入 perf-test-expert
- **requirement_ids**: [REQ-014]
- **type**: TDD
- **priority**: P1
- **estimated_lines**: ~90
- **test_strategy**: tdd
- **dependencies**: 无
- **parallel_group**: [TASK-011, TASK-012, TASK-013, TASK-015]
- **risk**: 低
- **risk_description**: 单 Agent 委托，风险低
- **当前状态分析**:
  - 步骤 3（编写负载测试脚本）由编排者直接写脚本——违反"禁止直接编码"
  - 步骤 6（定位性能瓶颈）可由 Agent 辅助
  - 步骤 1/2/4/5 为编排者合理保留
  - `allowed-tools` 未声明 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\test-perf.md`
- **需要引入的 Agent**: `perf-test-expert`（脚本生成 + 瓶颈定位）
- **修改内容**:
  1. `allowed-tools` 添加 `Agent`
  2. 步骤 3：替换编排者编写脚本为 `spawn perf-test-expert`（生成 k6/Artillery 脚本）
  3. 步骤 6：新增 `spawn perf-test-expert` 或 `backend-dev-expert` 辅助瓶颈定位
  4. 编排者保留：步骤 1/2/4/5 及工具 CLI 操作

- **Red 阶段验证**:
  ```
  1. grep -c "Agent" test-perf.md → frontmatter 中不包含 Agent
  2. grep -c "spawn perf-test-expert" test-perf.md → 0
  ```

- **Green 阶段实现**:
  1. 添加 `Agent` 到 `allowed-tools`
  2. 步骤 3：替换为 `spawn perf-test-expert`（传递目标+工具选择）
  3. 步骤 6：新增 `spawn perf-test-expert` 或 `spawn backend-dev-expert` 瓶颈定位子步骤

- **Refactor 阶段验证**:
  1. 瓶颈定位的 Agent 路由逻辑（perf-test-expert vs backend-dev-expert 的选择条件）清晰

- **acceptance_criteria**:
  1. `allowed-tools` 包含 `Agent`
  2. 步骤 3 包含 `spawn perf-test-expert` 调用指令
  3. 步骤 6 包含 Agent 辅助瓶颈定位的描述
  4. 步骤 3 不再包含"编排者编写负载测试脚本"的描述
  5. 原有红线约束（不对生产环境做负载测试、基线对比机制等）不丢失

---

### TASK-015
- **task_name**: `/test-security` 指令引入 security-review-expert
- **requirement_ids**: [REQ-015]
- **type**: TDD
- **priority**: P1
- **estimated_lines**: ~80
- **test_strategy**: tdd
- **dependencies**: 无
- **parallel_group**: [TASK-011, TASK-012, TASK-013, TASK-014]
- **risk**: 低
- **risk_description**: 单 Agent 委托，风险低
- **当前状态分析**:
  - 步骤 3-4（执行安全扫描 + 分析结果）由编排者直接执行——工具操作保留，分析可委托
  - `allowed-tools` 未声明 `Agent`
  - 当前加载 `security-and-hardening` 技能（非 `test-driven-development`），逻辑正确
  - 文件路径：`C:\Users\12247\.claude\commands\test-security.md`
- **需要引入的 Agent**: `security-review-expert`（DAST 扫描结果分析、告警分类、修复建议）
- **修改内容**:
  1. `allowed-tools` 添加 `Agent`
  2. 步骤 3：编排者负责工具启动（docker run ZAP），`spawn security-review-expert` 负责分析结果
  3. 步骤 4：整合到 security-review-expert 的输出中
  4. 编排者保留：步骤 1（授权确认）、步骤 2（工具选型）、步骤 5（生成报告）

- **Red 阶段验证**:
  ```
  1. grep -c "Agent" test-security.md → frontmatter 中不包含 Agent
  2. grep -c "spawn security-review-expert" test-security.md → 0
  ```

- **Green 阶段实现**:
  1. 添加 `Agent` 到 `allowed-tools`
  2. 步骤 3：添加编排者启动 ZAP + `spawn security-review-expert` 分析结果的协作描述
  3. 明确定义 tool-based 操作（编排者）与 analysis 操作（Agent）的边界

- **Refactor 阶段验证**:
  1. 编排者/Agent 职责边界清晰："启工具"属编排者，"分析结果"属 Agent

- **acceptance_criteria**:
  1. `allowed-tools` 包含 `Agent`
  2. 步骤 3 包含 `spawn security-review-expert` 调用指令
  3. 编排者职责明确为"工具启动"而非"结果分析"
  4. 步骤 4 描述为使用 security-review-expert 的输出
  5. 原有红线约束（不对生产环境扫描、授权确认不可绕过、Critical/High 必须修复）不丢失

---

### 第 3 批：核心指令集群 A（4 个 TASK，可完全并行）

---

### TASK-003
- **task_name**: `/bug-fix` 指令引入 code-explore-expert + 领域实现 Agent
- **requirement_ids**: [REQ-003]
- **type**: TDD
- **priority**: P0
- **estimated_lines**: ~150
- **test_strategy**: tdd
- **dependencies**: 无（参考 TASK-010 的 Agent spawn 模式）
- **parallel_group**: [TASK-005, TASK-006, TASK-007]
- **risk**: 中
- **risk_description**: 涉及根因定位和修复两个关键步骤的委托，需要明确的 Agent 路由逻辑（前端 Bug vs 后端 Bug）
- **当前状态分析**:
  - 步骤 3（定位根因）由编排者直接执行代码探索——应委托给 code-explore-expert
  - 步骤 4（修复代码）由编排者直接写代码——**严重违反"编排者禁止直接编码"**
  - 步骤 5（Lint+Type-check+Build）和步骤 6（浏览器验证）由编排者执行 CLI 命令——合理保留
  - `allowed-tools` 已包含 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\bug-fix.md`
- **需要引入的 Agent**: `code-explore-expert`（步骤 3）、`frontend-dev-expert` 或 `backend-dev-expert`（步骤 4）
- **修改内容**:
  1. 步骤 3：从编排者 inline 探索改为 `spawn code-explore-expert`（只读探索，输出根因分析报告）
  2. 步骤 4：从编排者直接写代码改为 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert`
  3. 新增领域路由逻辑：根据 code-explore-expert 定位的故障文件路径判断前端/后端
  4. 新增失败回退：code-explore-expert 未能定位根因 → 最多 1 轮回退重新分析
  5. 修复失败：spawn 实现 Agent 修复失败 → 最多 2 轮回退（回到步骤 3 重新分析）
  6. 步骤 5/6 保留为编排者操作（CLI + 浏览器）

- **Red 阶段验证**:
  ```
  1. grep -c "spawn code-explore-expert" bug-fix.md → 当前 = 0
  2. grep -c "spawn frontend-dev-expert\|spawn backend-dev-expert" bug-fix.md → 当前 = 0
  3. grep -c "从页面反查代码.*定位前端组件" bug-fix.md → 当前 > 0（确认当前是编排者 inline 操作）
  ```

- **Green 阶段实现**:
  1. 步骤 3：替换"从页面反查代码，定位前端组件文件"等编排者直接探索描述为 `spawn code-explore-expert`
     - 传递：Bug Report 摘要、复现证据（截图/console 输出）
     - 输出要求：Root Cause Analysis 报告（故障文件:行号、故障类型、直接原因、影响范围）
  2. 步骤 4：替换"修复代码"描述为按领域路由 spawn 实现 Agent
     - 添加领域判断：`code-explore-expert` 输出中的故障文件路径 → 判断前端/后端
     - 前端 Bug → `spawn frontend-dev-expert`
     - 后端 Bug → `spawn backend-dev-expert`
     - 传递：Root Cause Analysis + 修复方案
  3. 保留步骤 1（收集信息）、步骤 2（浏览器复现）、步骤 5（质量验证）、步骤 6（浏览器验证）、步骤 7（关闭 Bug）为编排者操作

- **Refactor 阶段验证**:
  1. 确认失败回退循环格式与 `/jarvis` Gate C-impl 一致
  2. 领域路由逻辑描述清晰

- **acceptance_criteria**:
  1. 步骤 3 包含 `spawn code-explore-expert` 调用指令
  2. 步骤 4 包含 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert` 调用指令
  3. 步骤 4 不再包含"编排者直接修复代码"的描述
  4. 包含领域路由逻辑（前端 Bug vs 后端 Bug 的判断条件）
  5. 包含失败回退循环：code-explore 最多 1 轮、修复最多 2 轮
  6. 原有红线约束全部保留（不复现就改代码、复现不截图、不定位根因就修复、浏览器必须验证等）
  7. 闭环图示更新，反映 Agent spawn 后的新流程

---

### TASK-005
- **task_name**: `/debug` 指令引入 code-explore-expert 辅助诊断
- **requirement_ids**: [REQ-005]
- **type**: TDD
- **priority**: P1
- **estimated_lines**: ~80
- **test_strategy**: tdd
- **dependencies**: 无
- **parallel_group**: [TASK-003, TASK-006, TASK-007]
- **risk**: 低
- **risk_description**: 仅新增 1 个辅助 Agent，编排者保留交互调试能力
- **当前状态分析**:
  - D3（交互式诊断）包含大量代码阅读和分析——编排者直接执行
  - 调试有其特殊性：断点设置、变量追踪等交互操作难以完全委托
  - `allowed-tools` 未声明 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\debug.md`
- **需要引入的 Agent**: `code-explore-expert`（条件性：并行探索代码库，辅助分析调用链/变量流）; `algorithm-expert`（条件性：仅当异常涉及复杂算法/密码学/ML 时触发）
- **修改内容**:
  1. `allowed-tools` 添加 `Agent`
  2. D3（交互式诊断）：新增 `spawn code-explore-expert` 并行探索代码库
  3. `spawn algorithm-expert`（条件性触发——当异常涉及算法逻辑时）
  4. 编排者保留交互调试（断点追踪）——这是诊断行为，不是写代码
  5. 两者结果合并形成诊断结论

- **Red 阶段验证**:
  ```
  1. grep -c "Agent" debug.md → frontmatter 中不包含 Agent
  2. grep -c "spawn code-explore-expert" debug.md → 0
  ```

- **Green 阶段实现**:
  1. 添加 `Agent` 到 `allowed-tools`
  2. D3 阶段：在"交互式诊断"步骤中新增并行 `spawn code-explore-expert` 子步骤
  3. 添加 `algorithm-expert` 条件性触发逻辑（满足任一条件即触发）：
     - 异常涉及自定义算法/加密/哈希
     - 涉及复杂计算逻辑
     - 编排者判断需算法专项分析
  4. 合并 Agent 输出与编排者交互调试结果的描述

- **Refactor 阶段验证**:
  1. 确认 algorithm-expert 条件性触发逻辑格式与 REQ-001 的审查矩阵一致
  2. Agent 辅助与编排者主导的协作模式描述清晰

- **acceptance_criteria**:
  1. `allowed-tools` 包含 `Agent`
  2. D3 阶段包含 `spawn code-explore-expert` 调用指令
  3. D3 阶段包含 `algorithm-expert` 条件性触发逻辑
  4. 编排者仍保留交互调试（断点追踪）能力描述
  5. 新建"Agen输出 + 编排者诊断 → 合并诊断结论"的协作流程描述
  6. 原有 5 Gate 序列和红线约束不丢失

---

### TASK-006
- **task_name**: `/evaluate` 指令引入实现 Agent + perf-test-expert
- **requirement_ids**: [REQ-006]
- **type**: TDD
- **priority**: P1
- **estimated_lines**: ~90
- **test_strategy**: tdd
- **dependencies**: 无
- **parallel_group**: [TASK-003, TASK-005, TASK-007]
- **risk**: 低
- **risk_description**: E1 原型编写委托，逻辑简单
- **当前状态分析**:
  - E1（生成快速原型）由编排者直接写代码——违反"禁止直接编码"
  - E2（运行评估用例并收集指标）由编排者直接执行命令——可保留
  - `allowed-tools` 已包含 `Agent`（通过 `WebFetch, WebSearch` 权限推断，需确认）
  - 实际检查：`allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill, WebFetch, WebSearch` —— 不包含 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\evaluate.md`
- **需要引入的 Agent**: `frontend-dev-expert` 或 `backend-dev-expert`（E1 原型编写）; `perf-test-expert`（E2 性能指标收集，条件性）
- **修改内容**:
  1. `allowed-tools` 添加 `Agent`
  2. E1（生成快速原型）：从编排者直接写原型改为 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert`
     - 传递：E0 定义的评估标准、验证用例清单、原型沙箱隔离要求
  3. E2（收集指标）：新增可选 `spawn perf-test-expert`（当评估维度包含性能时触发）
  4. 编排者保留：E0（定义标准）、E2（运行用例命令）、E3（汇总报告）

- **Red 阶段验证**:
  ```
  1. grep -c "Agent" evaluate.md → frontmatter 中不包含 Agent
  2. grep -c "spawn frontend-dev-expert\|spawn backend-dev-expert" evaluate.md → 0
  3. grep -c "spawn perf-test-expert" evaluate.md → 0
  ```

- **Green 阶段实现**:
  1. 添加 `Agent` 到 `allowed-tools`
  2. E1：替换原型编写描述为 spawn 实现 Agent
  3. E2：添加 `spawn perf-test-expert` 可选子步骤
  4. 保留"原型沙箱隔离"和"原型用完即弃"红线

- **Refactor 阶段验证**:
  1. 确认条件性 perf-test-expert 触发逻辑与其他条件性 Agent 模式一致

- **acceptance_criteria**:
  1. `allowed-tools` 包含 `Agent`
  2. E1 包含 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert` 调用指令
  3. E1 不再包含"编排者直接编写原型代码"的描述
  4. E2 包含可选 `spawn perf-test-expert` 描述
  5. 原有 4 Gate 序列和红线约束（原型沙箱隔离、不修改评估标准等）不丢失

---

### TASK-007
- **task_name**: `/hotfix` 指令引入 code-explore-expert + 领域实现 Agent
- **requirement_ids**: [REQ-007]
- **type**: TDD
- **priority**: P0
- **estimated_lines**: ~130
- **test_strategy**: tdd
- **dependencies**: 无
- **parallel_group**: [TASK-003, TASK-005, TASK-006]
- **risk**: 中
- **risk_description**: 紧急场景，需保留时效性；Agent 并行执行可加速但需明确的并行边界
- **当前状态分析**:
  - H1（最小化修复）中"定位根因"和"实施最小化修复"由编排者直接执行——**违反"禁止直接编码"**
  - 热修复有紧急时效性要求
  - `allowed-tools` 未声明 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\hotfix.md`
- **需要引入的 Agent**: `code-explore-expert`（二分法定位引入故障的 commit）；`frontend-dev-expert` 或 `backend-dev-expert`（执行最小化修复）
- **修改内容**:
  1. `allowed-tools` 添加 `Agent`
  2. H1（最小化修复）：
     - `spawn code-explore-expert`：二分法定位引入故障的 commit + 根因定位
     - `spawn frontend-dev-expert` 或 `spawn backend-dev-expert`：执行最小化修复
     - 两者可并行——code-explore 定位时实现 Agent 可准备修复上下文
  3. 编排者保留：H0（紧急声明）、H2（快速验证）、H3（事后审计）
  4. 新增失败回退：修复失败 → 最多 2 轮回退

- **Red 阶段验证**:
  ```
  1. grep -c "Agent" hotfix.md → frontmatter 中不包含 Agent
  2. grep -c "spawn code-explore-expert" hotfix.md → 0
  3. grep -c "spawn frontend-dev-expert\|spawn backend-dev-expert" hotfix.md → 0
  ```

- **Green 阶段实现**:
  1. 添加 `Agent` 到 `allowed-tools`
  2. H1：替换"定位根因"和"实施最小化修复"的编排者直接执行为对应 Agent spawn
  3. 添加并行执行提示（code-explore + 实现 Agent 可同时发起）
  4. 保留"最小化修复"的红线约束（一行能修好不改两行、不重构、不升级依赖）

- **Refactor 阶段验证**:
  1. Agent 并行执行模式与 TASK-003（bug-fix）的委托逻辑一致
  2. 失败回退循环模式与 TASK-003 一致

- **acceptance_criteria**:
  1. `allowed-tools` 包含 `Agent`
  2. H1 包含 `spawn code-explore-expert` 调用指令
  3. H1 包含 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert` 调用指令
  4. H1 不再包含"编排者直接定位根因/写修复代码"的描述
  5. 包含并行执行提示（两个 Agent 可同时发起）
  6. 原有 4 Gate 序列和红线约束（H0 未审批不写代码、不夹带重构等）不丢失
  7. 紧急时效性描述不丢失

---

### 第 4 批：核心指令集群 B（2 个 TASK，可完全并行）

---

### TASK-004
- **task_name**: `/refactor` 指令引入测试 Agent + 实现 Agent
- **requirement_ids**: [REQ-004]
- **type**: TDD
- **priority**: P0
- **estimated_lines**: ~180
- **test_strategy**: tdd
- **dependencies**: 无（参考前序批次的 Agent spawn 模式）
- **parallel_group**: [TASK-008]
- **risk**: 中
- **risk_description**: 5 Gate 安全网全部从 inline 转为 Agent 委托，涉及 R2/R3/R4 三个阶段的修改
- **当前状态分析**:
  - R1 到 R5 **全部由编排者 inline 执行**
  - R2（基线测试）由编排者直接跑测试命令
  - R3（执行重构）由编排者直接写代码——**严重违反"编排者禁止直接编码"**
  - R4（行为漂移检测）由编排者直接跑测试和手动抽查
  - `allowed-tools` 未声明 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\refactor.md`
- **需要引入的 Agent**: `frontend-test-expert` 或 `backend-test-expert`（R2/R4）; `frontend-dev-expert` 或 `backend-dev-expert`（R3）
- **修改内容**:
  1. `allowed-tools` 添加 `Agent`
  2. R2（基线测试）：新增 `spawn frontend-test-expert` 或 `spawn backend-test-expert`
     - 运行测试套件，记录基线覆盖率
     - 输出基线覆盖率报告
  3. R3（执行重构）：从编排者直接写代码改为 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert`
     - 传递：R1 的重构边界 + 不变行为清单 + 成功标准
     - 约束：小步提交、不改行为、不越边界、不夹带
  4. R4（行为漂移检测）：
     - Lint+Type-check+Build 保留为编排者执行 CLI
     - 新增 `spawn frontend-test-expert` 或 `spawn backend-test-expert`（重跑测试套件，对比覆盖率）
  5. 保留 R1（定义边界）和 R5（生成报告）为编排者操作

- **Red 阶段验证**:
  ```
  1. grep -c "Agent" refactor.md → frontmatter 中不包含 Agent
  2. grep -c "spawn frontend-test-expert\|spawn backend-test-expert" refactor.md → 0
  3. grep -c "spawn frontend-dev-expert\|spawn backend-dev-expert" refactor.md → 0
  4. grep -c "逐文件执行重构" refactor.md → 当前 > 0（确认编排者直接重构）
  ```

- **Green 阶段实现**:
  1. 添加 `Agent` 到 `allowed-tools`，更新 `gate_check` 操作类型（添加 `spawn_impl`、`spawn_test`）
  2. R2：添加 spawn 测试 Agent 子步骤（替换编排者直接跑测试）
  3. R3：替换"逐文件执行重构"为 spawn 实现 Agent
     - 传递不变行为清单作为 Agent 必须遵守的约束
  4. R4：添加 spawn 测试 Agent 做覆盖率对比
  5. 保留 R3 的红线约束（小步提交、不改行为、不越边界），作为 Agent spawn 时的约束参数

- **Refactor 阶段验证**:
  1. 确认 R2/R3/R4 的 Agent 路由模式与 TASK-011（test-unit）一致
  2. 确认不变行为清单传递链路完整（R1 -> Agent spawn at R3 -> R4 验证）

- **acceptance_criteria**:
  1. `allowed-tools` 包含 `Agent`
  2. R2 包含 `spawn frontend-test-expert` 或 `spawn backend-test-expert` 调用指令
  3. R3 包含 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert` 调用指令
  4. R3 不再包含"编排者逐文件执行重构"的描述
  5. R4 包含 Agent 辅助覆盖率对比的描述
  6. 不变行为清单传递链路完整
  7. 原有 5 Gate 序列和红线约束（不改 API 契约、不夹带功能修改等）不丢失

---

### TASK-008
- **task_name**: `/migrate` 指令引入批量并行实现 Agent
- **requirement_ids**: [REQ-008]
- **type**: TDD
- **priority**: P1
- **estimated_lines**: ~160
- **test_strategy**: tdd
- **dependencies**: 无
- **parallel_group**: [TASK-004]
- **risk**: 中
- **risk_description**: 批量并行 Agent 执行迁移，需定义文件分组策略和共享区域冲突检查
- **当前状态分析**:
  - M1 到 M4 **全部由编排者 inline 执行**
  - M2（应用迁移）要求"按规则表逐规则迁移"——编排者直接执行大量代码修改
  - `allowed-tools` 未声明 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\migrate.md`
- **需要引入的 Agent**: `frontend-dev-expert` 或 `backend-dev-expert`（M2 批量并行迁移）
- **修改内容**:
  1. `allowed-tools` 添加 `Agent`
  2. M2（应用迁移）：从编排者逐规则执行改为批量 spawn 实现 Agent 并行执行
     - 按文件/模块分组，每个 Agent 负责一组文件的迁移
     - 所有 Agent 传递相同的迁移规则表 + 各自负责的文件清单
     - 文件分组策略：核心配置 1 组、业务逻辑 1~N 组、辅助代码 1 组
  3. M3/M4（编译验证 + Lint 修复）保留为编排者执行 CLI 命令
  4. M1（定义规则）和 M3/M4 保留编排者操作
  5. 新增共享区域冲突检查（如多个文件组共享 import/类型定义）

- **Red 阶段验证**:
  ```
  1. grep -c "Agent" migrate.md → frontmatter 中不包含 Agent
  2. grep -c "spawn backend-dev-expert\|spawn frontend-dev-expert" migrate.md → 0
  3. grep -c "按规则表逐规则迁移" migrate.md → 当前 > 0（确认编排者直接迁移）
  ```

- **Green 阶段实现**:
  1. 添加 `Agent` 到 `allowed-tools`
  2. M2：替换"按规则表逐规则迁移"为批量 spawn 实现 Agent 描述
     - 定义文件分组策略
     - 每组的 Agent spawn 参数（迁移规则表 + 文件清单）
     - 说明多 Agent 可并行发起
  3. 保留"规则先行"和"每批次验证语法"的约束，作为 Agent spawn 时的约束传递
  4. 新增共享区域冲突检查提示

- **Refactor 阶段验证**:
  1. 确认批量并行 spawn 格式与 `/jarvis` Gate C-impl 的 parallel_batches 一致
  2. 确认文件分组策略描述清晰

- **acceptance_criteria**:
  1. `allowed-tools` 包含 `Agent`
  2. M2 包含 `spawn frontend-dev-expert` 或 `spawn backend-dev-expert` 调用指令
  3. M2 不再包含"编排者逐规则迁移"的描述
  4. 包含文件分组策略（按模块/目录分组，多 Agent 并行）
  5. 包含共享区域冲突检查描述
  6. 原有 4 Gate 序列和红线约束（迁移不夹带业务逻辑修改、不修改业务逻辑等）不丢失

---

### 第 5 批：审查指令集群（2 个 TASK，可完全并行）

---

### TASK-001
- **task_name**: `/review` 指令补全领域审查专家并行矩阵
- **requirement_ids**: [REQ-001]
- **type**: TDD
- **priority**: P0
- **estimated_lines**: ~120
- **test_strategy**: tdd
- **dependencies**: 无（参考 `/jarvis` Gate D 审查矩阵）
- **parallel_group**: [TASK-002]
- **risk**: 中
- **risk_description**: 审查矩阵涉及 5+1 个 Agent 并行，需确保 Agent 类型名称正确、条件性触发逻辑清晰
- **当前状态分析**:
  - 第 29 行提到"可并发调用 project-review-expert、diff-review-expert、perf-review-expert、code-explore-expert 等只读 Agent"
  - **缺少** `frontend-review-expert`、`backend-review-expert`、`security-review-expert`、`qa-review-expert`、`algorithm-expert`
  - 当前是"建议"而非强制执行
  - `allowed-tools` 已包含 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\review.md`
- **需要引入的 Agent**: `frontend-review-expert`、`backend-review-expert`、`security-review-expert`、`perf-review-expert`、`qa-review-expert`、`algorithm-expert`（条件性）
- **修改内容**:
  1. 替换审查流程中的"可并发调用..."为强制审查矩阵，与 `/jarvis` Gate D 对齐：
     - 5 个必选：`frontend-review-expert`、`backend-review-expert`、`security-review-expert`、`perf-review-expert`、`qa-review-expert`
     - 1 个条件性：`algorithm-expert`（触发条件与 `/jarvis` Gate D 一致）
  2. 新增审查失败回退循环规则（参考 `/jarvis` Gate D 的修复回路规则）
  3. 保留只读审查模式的核心纪律（不修改文件、不修复代码、只报告 findings）
  4. 保留现有 `project-review-expert` 和 `diff-review-expert` 作为补充选项

- **Red 阶段验证**:
  ```
  1. grep -c "spawn frontend-review-expert" review.md → 当前 = 0
  2. grep -c "spawn backend-review-expert" review.md → 当前 = 0
  3. grep -c "spawn security-review-expert" review.md → 当前 = 0
  4. grep -c "spawn qa-review-expert" review.md → 当前 = 0
  5. grep -c "spawn algorithm-expert" review.md → 当前 = 0
  ```
  全部为 0，确认 5 个必须 + 1 个条件性 Agent 均未引用。

- **Green 阶段实现**:
  1. 在审查流程步骤中，替换现有的"可并发调用..."为完整审查矩阵：
     ```
     审查阶段（并行矩阵——强制执行）:
     ├── spawn frontend-review-expert（前端代码审查：组件/样式/状态/性能/可访问性）
     ├── spawn backend-review-expert（后端代码审查：API/业务逻辑/数据层/安全）
     ├── spawn security-review-expert（安全审计：威胁建模/CVE/SAST/密钥检测）
     ├── spawn perf-review-expert（性能审计：bundle/LCP/查询/运行时）
     ├── spawn qa-review-expert（综合签核：REQ追踪/文档/Gate条件）
     └── spawn algorithm-expert（条件性：算法审查——触发条件见下表）
     ```
  2. 添加 `algorithm-expert` 触发条件（与 `/jarvis` Gate D 对齐）
  3. 添加审查失败回退循环规则
  4. 将"可并发调用"改为"必须并发调用"（强制语义）

- **Refactor 阶段验证**:
  1. 确认审查矩阵格式与 `/jarvis` Gate D 完全一致
  2. 确认 algorithm-expert 触发条件与 `/jarvis` 一致
  3. 确认修复回路规则与 `/jarvis` Gate D 的修复回路规则一致

- **acceptance_criteria**:
  1. 文件中包含 5 个必选审查 Agent 的 spawn 指令（frontend/backend/security/perf/qa-review-expert）
  2. 文件中包含 `algorithm-expert` 条件性触发逻辑 + 触发条件表
  3. 审查流程从"可并发调用"改为"必须并发调用"
  4. 包含审查失败回退循环规则（最多 2 轮、BLOCKED 条件）
  5. 只读审查模式核心纪律不丢失（不修改文件、不修复代码、只报告 findings）
  6. 现有 `project-review-expert` 和 `diff-review-expert` 作为补充选项保留

---

### TASK-002
- **task_name**: `/review-fix` 指令补全五阶段完整 Agent 矩阵
- **requirement_ids**: [REQ-002]
- **type**: TDD
- **priority**: P0
- **estimated_lines**: ~280（L 级风险任务）
- **test_strategy**: tdd
- **dependencies**: 无（逻辑参考 TASK-001 的审查矩阵，但文件独立可并行）
- **parallel_group**: [TASK-001]
- **risk**: 高
- **risk_description**: 
  - **变更行数超 200（L 级）**：涉及五阶段中三阶段的 Agent 矩阵（初审 6~7 个、执行 1 个、复审 2 个）+ 领域路由逻辑
  - 不拆分理由：五个阶段在同一文件中紧密耦合，拆分为多个子任务会引入人为的文件编辑冲突
  - 缓解措施：严格遵循 TDD Red->Green->Refactor 循环，每阶段 Agent 矩阵可独立验证
- **当前状态分析**:
  - 阶段一（初审）：提到"可并发调用 project-review-expert、diff-review-expert、perf-review-expert、code-explore-expert"——缺少完整审查矩阵
  - 阶段二（修复规划）：提到"可调用 remediation-expert Agent 辅助规划"——基本满足
  - 阶段三（执行）：**完全由编排者 inline 执行**——违反"禁止直接编码"
  - 阶段四（验证）：**完全由编排者 inline 执行**——Lint+Type-check+Build 可保留
  - 阶段五（复审）：提到"可调用 change-review-expert Agent"——缺少 qa-review-expert
  - `allowed-tools` 已包含 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\review-fix.md`
- **需要引入的 Agent**:
  - 阶段一：`frontend-review-expert`、`backend-review-expert`、`security-review-expert`、`perf-review-expert`、`qa-review-expert`、`algorithm-expert`（条件性）
  - 阶段二：`remediation-expert`（已有，保留）或 `remediation-planner`
  - 阶段三：`frontend-dev-expert`、`backend-dev-expert`（按领域路由）
  - 阶段四：`frontend-test-expert`、`backend-test-expert`、`browser-test-expert`（条件性）
  - 阶段五：`change-review-expert`（已有，保留）、`qa-review-expert`
- **修改内容**:
  1. 阶段一（初审）：替换现有部分审查 Agent 列表为完整 6+1 审查矩阵（与 TASK-001 对齐）
  2. 阶段二（修复规划）：保留现有 `remediation-expert` 调用，增强为可选的 `remediation-planner`
  3. 阶段三（执行）：从编排者直接修复改为按领域路由 spawn 实现 Agent
     - 前端修复 → `spawn frontend-dev-expert`
     - 后端修复 → `spawn backend-dev-expert`
     - 安全修复 → `spawn backend-dev-expert`（传递安全报告）
     - 性能修复 → `spawn frontend-dev-expert` 或 `spawn backend-dev-expert`
  4. 阶段四（验证）：新增 spawn 测试 Agent + 浏览器验证
     - Lint+Type-check+Build 保留为编排者执行 CLI
     - `spawn frontend-test-expert` 或 `spawn backend-test-expert`
     - `spawn browser-test-expert`（如有前端变更）
  5. 阶段五（复审）：保留 `change-review-expert`，新增并行 `spawn qa-review-expert`
  6. 新增五阶段失败回退循环规则

- **Red 阶段验证**:
  ```
  1. grep -c "spawn frontend-review-expert" review-fix.md → 0
  2. grep -c "spawn backend-review-expert" review-fix.md → 0
  3. grep -c "spawn security-review-expert" review-fix.md → 0
  4. grep -c "spawn qa-review-expert" review-fix.md → 0
  5. grep -c "spawn algorithm-expert" review-fix.md → 0
  6. grep -c "spawn frontend-dev-expert\|spawn backend-dev-expert" review-fix.md → 0（阶段三当前无）
  7. grep -c "spawn frontend-test-expert\|spawn backend-test-expert" review-fix.md → 0（阶段四当前无）
  8. grep -c "spawn browser-test-expert" review-fix.md → 0
  ```
  全部为 0，确认 8+ 个 Agent 类型均未引用。

- **Green 阶段实现（分 5 个子步骤，对应 5 个阶段）**:
  1. **阶段一修改**：替换现有审查 Agent 建议为完整 6+1 强制并行矩阵（格式与 TASK-001 对齐）
  2. **阶段二修改**：`remediation-expert` 保留，可选 `remediation-planner`
  3. **阶段三修改**：替换"执行"步骤为按领域路由 spawn 实现 Agent，明确 4 种路由规则
  4. **阶段四修改**：Lint+Type-check+Build 保留编排者执行，新增测试 Agent spawn + browser-test-expert
  5. **阶段五修改**：`change-review-expert` 保留，新增并行 `qa-review-expert`
  6. 新增失败回退循环（五阶段通用规则 + 每阶段特定 BLOCKED 条件）

- **Refactor 阶段验证**:
  1. 确认审查矩阵（阶段一）格式与 TASK-001 和 `/jarvis` Gate D 完全一致
  2. 确认领域路由逻辑（阶段三）与 TASK-003/TASK-004/TASK-007 的模式一致
  3. 确认测试 Agent spawn（阶段四）与 TASK-011～TASK-015 的模式一致
  4. 确认失败回退循环格式与 `/jarvis` Gate D 修复回路规则一致

- **acceptance_criteria**:
  1. 阶段一包含完整 6+1 审查 Agent 并行矩阵（5 必选 + 1 条件性）
  2. 阶段三包含按领域路由 spawn 实现 Agent 的逻辑（4 种路由规则）
  3. 阶段三不再包含"编排者直接执行修复"的描述
  4. 阶段四包含测试 Agent spawn + browser-test-expert 条件性触发
  5. 阶段五包含 `qa-review-expert` 并行复审
  6. 包含完整的五阶段失败回退循环规则
  7. 五阶段顺序不跳过、不减少红线约束
  8. 现有 Agent 引用（project-review-expert、diff-review-expert、remediation-expert、change-review-expert）保留

---

### 第 6 批：发布指令（1 个 TASK）

---

### TASK-009
- **task_name**: `/publish` 指令补全技能加载 + 质量门失败 Agent 修复回路
- **requirement_ids**: [REQ-009]
- **type**: TDD
- **priority**: P0
- **estimated_lines**: ~150
- **test_strategy**: tdd
- **dependencies**: 无（逻辑参考前序批次的质量门修复回路模式）
- **parallel_group**: 无（本批次唯一任务）
- **risk**: 中
- **risk_description**: 涉及质量门失败→自动修复回路，需定义 Lint/Type-check/Build/Deps Audit 各自的 Agent 路由
- **当前状态分析**:
  - 步骤 0 只加载 `code-quality-gate` 和 `git-workflow-and-versioning`
  - **缺少** `shipping-and-launch` 和 `finishing-a-development-branch` 技能
  - 步骤 2（质量门）失败时："输出失败项的详细错误信息 → 立即停止 → 用户修复后重新执行"
    - **没有 spawn Agent 修复**——完全依赖用户手动修复
  - 步骤 3（测试）失败时："输出失败的测试名称和错误详情 → 立即停止 → 用户修复后重新执行"
    - **同样没有 Agent 修复**
  - `allowed-tools` 未声明 `Agent`
  - 文件路径：`C:\Users\12247\.claude\commands\publish.md`
- **需要引入的 Agent**: `frontend-dev-expert` 或 `backend-dev-expert`（质量门失败修复 + 测试失败修复）
- **修改内容**:
  1. `allowed-tools` 添加 `Agent`
  2. 步骤 0：新增加载 `Skill("shipping-and-launch")`（发布上线检查清单）和 `Skill("finishing-a-development-branch")`（发布后归档）
  3. 步骤 2（质量门失败修复回路）：
     - Lint 失败 → `spawn frontend-dev-expert` 或 `spawn backend-dev-expert`（修复 lint 错误）
     - Type-check 失败 → 同上（修复类型错误）
     - Build 失败 → 同上（修复构建错误）
     - Deps Audit 失败 → 同上（升级/替换有漏洞依赖）
     - 修复后重跑全部四项检查
     - 最多 2 轮修复-重试循环
  4. 步骤 3（测试失败修复回路）：
     - 测试失败 → `spawn frontend-dev-expert` 或 `spawn backend-dev-expert`（修复导致测试失败的代码）
     - 最多 2 轮修复-重试循环
  5. 步骤 6（PR 创建前）或 Gate E 发布前：加载 `Skill("finishing-a-development-branch")`
  6. 保留所有现有的环境检测、版本递增、Git 操作步骤

- **Red 阶段验证**:
  ```
  1. grep -c "Agent" publish.md → frontmatter 中不包含 Agent
  2. grep -c "Skill.*shipping-and-launch" publish.md → 0
  3. grep -c "Skill.*finishing-a-development-branch" publish.md → 0
  4. grep -c "spawn frontend-dev-expert\|spawn backend-dev-expert" publish.md → 0
  5. grep -c "立即停止.*用户修复后重新执行" publish.md → 当前 > 0（确认当前依赖用户手动修复）
  ```

- **Green 阶段实现**:
  1. 添加 `Agent` 到 `allowed-tools`
  2. 步骤 0：添加两个新 Skill 加载（`shipping-and-launch`、`finishing-a-development-branch`）
  3. 步骤 2（质量门失败时）：替换"立即停止 → 用户修复"为 Agent spawn 修复回路
     - 4 种失败类型 → 4 种 Agent 路由
     - 修复后重跑全部四项（不可只跑失败项）
     - 2 轮仍失败 → 标记 BLOCKED，向用户报告
  4. 步骤 3（测试失败时）：替换"立即停止 → 用户修复"为 Agent spawn 修复回路
  5. 保留"质量门全部通过才继续"的核心纪律

- **Refactor 阶段验证**:
  1. 确认质量门修复回路格式与 `/jarvis` Gate C1 的修复回路一致
  2. 确认测试失败修复回路格式与 `/jarvis` Gate C2/C2 的修复回路一致
  3. 确认 Skill 加载顺序合理（基座 → 质量门 → 版本管理 → 发布 → 归档）

- **acceptance_criteria**:
  1. `allowed-tools` 包含 `Agent`
  2. 步骤 0 包含 `Skill("shipping-and-launch")` 和 `Skill("finishing-a-development-branch")` 加载指令
  3. 步骤 2 质量门失败时包含 Agent spawn 修复回路（4 种失败类型各有明确 Agent 路由）
  4. 步骤 2 不再包含"立即停止，用户修复后重新执行"的描述（替换为 Agent 自动修复）
  5. 步骤 3 测试失败时包含 Agent spawn 修复回路
  6. 步骤 3 不再包含"立即停止，用户修复后重新执行"的描述
  7. 修复回路明确：最多 2 轮，2 轮后标记 BLOCKED
  8. 原有 9 步流程不变、红线不减少、环境检测逻辑不变

---

## DDD 分类确认

| DDD 路由建议 | 涉及 REQ | TASK | 本 TDD 包处理方式 |
|-------------|---------|------|-----------------|
| →BDD | REQ-001 | TASK-001 | TDD 包内处理（审查 Agent 矩阵增补是确定性修改） |
| →BDD | REQ-002 | TASK-002 | TDD 包内处理（五阶段 Agent 替换是确定性修改） |
| →TDD | REQ-003~009, REQ-011~015 | TASK-003~009, TASK-011~015 | 全部 TDD 包内处理 |
| 直接开发 | REQ-010 | TASK-010 | TDD 包内处理（标记为直接开发类型） |

**说明**：REQ-001 和 REQ-002 虽然 DDD 分析建议路由到 BDD，但本次修改的本质是**向现有指令文件中增补 Agent 引用**（类似配置修改），行为确定性高（每个 Agent 类型、路由条件、触发逻辑均已明确定义），可在 TDD 包中处理。如需完整的 BDD 验收流程（用户旅程级验证），建议后续单独创建 BDD 任务包。

---

## TDD / 直接开发分类

### TDD 任务（14 个）

| TASK | REQ | TDD 理由 |
|------|-----|---------|
| TASK-001 | REQ-001 | 审查 Agent 矩阵是确定性路由表，Agent 名称和触发条件可 grep 验证 |
| TASK-002 | REQ-002 | 五阶段 Agent 替换路径明确，每阶段 Agent 路由规则确定性高 |
| TASK-003 | REQ-003 | 根因定位→修复委托链路清晰，领域路由逻辑确定性高 |
| TASK-004 | REQ-004 | 5 Gate 安全网中 R2/R3/R4 的 Agent 替换路径明确，不变行为清单传递可验证 |
| TASK-005 | REQ-005 | 单 Agent 辅助探索，输入输出边界明确 |
| TASK-006 | REQ-006 | 原型编写 Agent 委托 + 条件性 perf-test-expert，逻辑明确 |
| TASK-007 | REQ-007 | 定位+修复双 Agent 并行，Agent 路由确定性高 |
| TASK-008 | REQ-008 | 批量并行 Agent 迁移，文件分组策略可验证 |
| TASK-009 | REQ-009 | 质量门失败→修复→重验是确定性有限状态机 |
| TASK-011 | REQ-011 | 测试 Agent 一对一替换编排者写测试代码 |
| TASK-012 | REQ-012 | 契约识别→测试生成链路明确，Agent 输入输出契约可验证 |
| TASK-013 | REQ-013 | 用户故事→E2E 测试脚本委托路径明确 |
| TASK-014 | REQ-014 | 负载脚本生成→瓶颈定位委托路径明确 |
| TASK-015 | REQ-015 | 安全扫描结果分析→修复建议委托路径明确 |

### 直接开发任务（1 个）

| TASK | REQ | 理由 |
|------|-----|------|
| TASK-010 | REQ-010 | 低业务价值 + 低规则复杂度；单 Agent 委托（docs-engineer），无需 TDD 循环 |

---

## 风险任务清单

| TASK | REQ | 风险等级 | 变更行数 | 风险描述 | 缓解措施 |
|------|-----|---------|---------|---------|---------|
| TASK-002 | REQ-002 | **高** | ~280 (L) | 五阶段全部改造，涉及 8+ Agent 类型引用 | 分 5 个子步骤对应 5 个阶段，每阶段独立验证；以 `/jarvis` Gate D 为唯一参考模板 |
| TASK-003 | REQ-003 | 中 | ~150 | 根因定位+修复两步委托，需领域路由逻辑 | 复用 `/jarvis` Gate C-impl 的 Agent spawn 模式和修复回路 |
| TASK-004 | REQ-004 | 中 | ~180 | 5 Gate 安全网中 3 个阶段从 inline 转 Agent | 不变行为清单明确传递；测试 Agent 模式与 TASK-011 对齐 |
| TASK-007 | REQ-007 | 中 | ~130 | 紧急场景需保留时效性 | Agent 并行执行可加速；保留编排者紧急审批和验证能力 |
| TASK-008 | REQ-008 | 中 | ~160 | 批量并行 Agent 迁移需文件分组策略 | 明确定义分组规则和共享区域冲突检查 |
| TASK-009 | REQ-009 | 中 | ~150 | 质量门自动修复回路改变现有"用户手动修复"流程 | 保留 2 轮限制和 BLOCKED 兜底；修复回路模式与 `/jarvis` Gate C1 对齐 |

---

## 文件所有权和共享路径提醒

### 单文件唯一所有权

15 个 TASK 修改 14 个独立的 `.claude/commands/*.md` 文件，每个文件由唯一 TASK 修改。**无共享区域冲突，全部可并行执行。**

### 参考文件（只读，不修改）

以下文件作为所有 TASK 的参考模板，任何 TASK 不得修改：

| 参考文件 | 用途 | 关键参考内容 |
|---------|------|------------|
| `C:\Users\12247\.claude\commands\jarvis.md` | Agent 编排模式参考 | Gate D 审查矩阵（6+1 Agent）、Gate C-impl 并行 batch 模式、修复回路规则 |
| `C:\Users\12247\.claude\agents\` (57 个文件) | Agent 名称正确性验证 | 确保所有 spawn 引用的 Agent 类型名称与定义文件一致 |

### 全局一致性约束

所有 TASK 完成后的 Refactor 阶段，需统一验证以下全局约束：

1. **Agent 名称正确性**：所有 `spawn` 引用的 Agent 类型名称在 `.claude/agents/` 目录下有对应定义文件
2. **gate_check 调用模式**：spawn 前必须调用 `gate_check({ operation: "..." })`
3. **失败回退循环格式**：`max_retries` 和 `BLOCKED` 条件格式统一
4. **红线不减少**：每个指令文件的原有红线约束全部保留
5. **编排者禁止直接编码**：所有指令文件中修改代码的步骤已委托给子 Agent

---

## 推荐交付顺序

```
第 1 批 ── TASK-010 (/sync)
  │         1 个 TASK，S 级变更，最低风险
  │         验证：Agent spawn 模式在指令文件中可用
  │
  ▼
第 2 批 ── TASK-011~015 (5 个测试指令)
  │         5 个 TASK 可完全并行，模式高度相似
  │         验证：测试 Agent 一对一替换编排者的模式可靠
  │
  ▼
第 3 批 ── TASK-003 (/bug-fix), TASK-005 (/debug), TASK-006 (/evaluate), TASK-007 (/hotfix)
  │         4 个 TASK 可完全并行
  │         验证：不同复杂度的 Agent 委托模式（单一/双Agent/并行/条件性）
  │
  ▼
第 4 批 ── TASK-004 (/refactor), TASK-008 (/migrate)
  │         2 个 TASK 可完全并行
  │         验证：5 Gate 安全网委托 / 批量并行 Agent 迁移
  │
  ▼
第 5 批 ── TASK-001 (/review), TASK-002 (/review-fix)
  │         2 个 TASK 可完全并行
  │         验证：6+1 审查矩阵 / 五阶段全链路 Agent 委托
  │
  ▼
第 6 批 ── TASK-009 (/publish)
            1 个 TASK，中风险
            验证：质量门自动修复回路
```

**每批内部全部并行，批次间建议串行**（后批次参考前批次的 Agent spawn 模式经验和教训）。

---

## 推荐的下一步

1. **Planner** 读取本任务文档，生成执行计划（`docs/2026-05-18/plans/commands-subagent-integration-plan.md`）
2. 计划文档应包含：
   - 6 个批次的 `parallel_batches` 定义
   - 每个 TASK 的 Execution Packet（task_id, objective, allowed_paths, required_skills, acceptance_criteria）
   - 共享区域唯一责任方确认（虽然本次无冲突，但需正式声明）
   - 每批完成后的检查点定义
3. 实现阶段由 `/jarvis` Gate C-impl 按计划文档的 `parallel_batches` 批量 spawn Agent（注意：修改的是指令 `.md` 文件，Agent 类型应为 `task-design` 或通用实现 Agent）

---

## 验证清单

- [x] 所有 15 个 REQ-XXX 都至少映射到 1 个 TASK
- [x] 任务使用垂直切片策略（每个 TASK = 一个指令文件的完整修改）
- [x] 无水平切片（无按技术层级拆分的任务）
- [x] 每个任务有明确的优先级和 test_strategy
- [x] 依赖关系已明确（批次间串行，批次内全并行）
- [x] 并行机会已识别（同一批次内全部可并行）
- [x] 风险任务已标注（TASK-002 标注为高/L级，TASK-003/004/007/008/009 标注为中风险）
- [x] 总变更行数 ~1,700 行，分 6 批交付（每批 <400 行）
- [x] 共享区域已指定唯一责任方（每个文件由唯一 TASK 修改）
- [x] 每个任务有可独立验证的完成标准
- [x] DDD/TDD/直接开发分类完整
- [x] 红线和不变约束保持验证已包含在每个 TASK 的 acceptance_criteria 中
