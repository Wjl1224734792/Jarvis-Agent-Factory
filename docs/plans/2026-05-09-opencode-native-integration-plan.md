# 执行计划：OpenCode 原生插件/工具机制集成

> 需求文档: `docs/requirements/2026-05-09-opencode-native-integration.md`
> 任务文档: `docs/tasks/2026-05-09-opencode-native-integration-tasks.md`
> 状态: draft | 日期: 2026-05-09 | 版本: 1.0

---

## 1. 规划前检查

### 1.1 Gate B 合规

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 任务 ID 完整（TASK-XXX 格式） | PASS | TASK-001 ~ TASK-006 |
| 每个任务映射到至少一个 REQ-XXX | PASS | TASK-001→REQ-001, 002→REQ-002, 003→REQ-003, 004→REQ-004, 005→REQ-005+006, 006→REQ-007 |
| 类型完整 | PASS | TDD / 直接开发，分类明确 |
| 优先级完整、完成标准完整 | PASS | P0/P1，每个任务有明确完成标准 |
| DDD 分类完整 | PASS | "本次需求无需 DDD" |
| TDD / 直接开发分类完整 | PASS | 3 个 TDD + 3 个直接开发 |
| 风险任务已标注、文件所有权已写明 | PASS | TASK-004（中风险）、TASK-006（中风险）已标注，文件所有权表完整 |

### 1.2 测试覆盖检查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| TDD 任务（TASK-001/002/005）已分配 test expert | 计划内分配 | Batch 2 分配 backend-test-expert 进行 Refactor 验证 |
| TASK-003（test_after）独立测试 Batch | 计划内补充 | 本计划新增 TASK-007，由 backend-test-expert 在 Batch 2 执行 |
| E2E 测试分配在最后一个测试 Batch | 计划内补充 | 本计划新增 TASK-008，在 Round 2（Phase 2）的最终 Batch 由 e2e-test-expert 执行 |

> **说明**: 任务文档未包含 TASK-003 的独立测试任务及 E2E 任务。planning 在计划中补充 TASK-007（Agent 模板对齐验证）和 TASK-008（E2E 集成验证），以确保测试覆盖完整性。

### 1.3 垂直切片检查

所有任务均交付完整、可测试的端到端功能：

| 任务 | 交付物 | 可验证性 |
|------|--------|---------|
| TASK-001 | Hook 增强（硬阻断 + 事件上报） | `tool.execute.before` 阻断行为可测试 |
| TASK-002 | 5 个原生自定义工具 | 每个工具的返回格式和参数 schema 可测试 |
| TASK-003 | Agent 模板对齐 | 文件对比 + 数量核对可验证 |
| TASK-005 | MCP 工具增强 | `platform_info` 返回数据可测试 |
| TASK-006 | Install/Upgrade 路径验证 | CLI 命令执行可验证 |

无水平切片（按技术层级拆分）任务。

### 1.4 是否需要先查阅 code-explore-expert / docs-research-expert

**不需要**。planning 已在编制本计划前阅读了所有相关源码文件（`jarvis-gate-check.ts`、`server.ts`、`agent-registry.ts`、`routes.ts`、`agents.html`、`install.ts`、`mcp-opencode.json` 及两平台 Agent 模板样例），计划中已包含实现所需的关键代码结构信息。各实现 Agent 启动时应使用 `source-driven-development` 技能进一步阅读其负责的具体文件，无需额外调用 code-explore-expert。

---

## 2. 当前轮次目标与范围

### 2.1 当前轮次（Round 1：Phase 1）

实现 OpenCode 原生插件机制的核心增强：Hook 全覆盖、自定义工具创建、Agent 模板对齐、引擎 MCP 适配、安装流程验证。

**范围**：
- TASK-001：Gate Hook 增强（硬阻断 + 事件上报）
- TASK-002：5 个原生自定义工具创建
- TASK-003：Agent 模板集对齐（两平台对比 + frontmatter 修正）
- TASK-005：引擎 MCP 适配 + platform_info 增强
- TASK-006：Install/Upgrade 验证
- TASK-007：Agent 模板对齐验证（planning 补充的 test_after 测试）
- TASK-001-T / TASK-002-T / TASK-005-T：TDD 测试验证

**排除**：
- TASK-004（Web 面板 OpenCode 适配）→ Round 2
- TASK-008（E2E 集成测试）→ Round 2

### 2.2 完成标准

1. `jarvis-gate-check.ts` 实现完整的 5 个 hook 处理，`tool.execute.before` 可硬阻断
2. `tools/` 目录下 5 个工具全部可被 OpenCode AI 调用，返回中文格式化结果
3. 两平台 Agent 模板功能覆盖一致，OpenCode frontmatter 格式正确
4. `platform_info` MCP 工具返回三平台完整信息（含 features 字段）
5. `mcp-opencode.json` 配置正确，`npm pack --dry-run` 包含 OpenCode 模板
6. 所有测试验证通过

---

## 3. 执行代理分工

| 任务 | Agent 类型 | 职责 |
|------|-----------|------|
| TASK-001 | backend-dev-expert | Hook 插件增强（TDD Red+Green） |
| TASK-002 | backend-dev-expert | 工具创建（TDD Red+Green） |
| TASK-003 | backend-dev-expert | 模板对齐（直接开发） |
| TASK-005 | backend-dev-expert | MCP 增强（TDD Red+Green） |
| TASK-006 | backend-dev-expert | Install/Upgrade 验证（直接开发） |
| TASK-001-T | backend-test-expert | TASK-001 TDD 测试验证 + Refactor |
| TASK-002-T | backend-test-expert | TASK-002 TDD 测试验证 + Refactor |
| TASK-005-T | backend-test-expert | TASK-005 TDD 测试验证 + Refactor |
| TASK-007 | backend-test-expert | TASK-003 test_after 验证 |

---

## 4. 共享区域改动归属

### 4.1 唯一责任方指定

| 共享区域 | 唯一责任方 | 备注 |
|---------|-----------|------|
| `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts` | TASK-001 | 独占，无冲突 |
| `src/templates/platforms/opencode/tools/` (新建) | TASK-002 | 独占，无冲突 |
| `src/templates/platforms/opencode/agents/*.md` | TASK-003 | 独占，无冲突 |
| `src/templates/platforms/claude/agents/*.md` | TASK-003 | 独占，无冲突 |
| `src/engine/server.ts` | TASK-005 | 独占，无冲突 |
| `src/templates/mcp-opencode.json` | TASK-005 | 独占，无冲突 |
| `src/install.ts` | TASK-006 | 独占，无冲突 |
| `package.json` | TASK-006 | 独占，无冲突 |
| `src/engine/agent-registry.ts` | Round 2 TASK-004 | 本轮不变更 |
| `src/web/routes.ts` | Round 2 TASK-004 | 本轮不变更 |
| `src/web/views/agents.html` | Round 2 TASK-004 | 本轮不变更 |
| `tests/` 测试文件 | 各测试任务 | 按任务 ID 划分命名空间 |

### 4.2 共享冲突确认

Phase 1 的 5 个实现任务各自修改完全不同的文件集，**零共享文件冲突**，可全部并行执行。详见并行组文件冲突矩阵（第 5 章）。

### 4.3 跨任务接口契约

| 契约项 | 定义方 | 消费者 | 稳定性 |
|--------|--------|--------|--------|
| `jarvis-*` 工具名称列表 | REQ-002（TASK-002） | TASK-003（模板工具引用替换） | 已确定，5 个工具名 |
| `AgentItem.subdir` 字段 | agent-registry.ts（已有） | TASK-004 (Round 2) | 稳定（类型已定义） |
| `platform_info` MCP 工具返回格式 | server.ts（TASK-005） | TASK-008 E2E（Round 2） | 需在 TASK-005 中增加 features 字段 |
| `INSTALL_BUCKETS` 常量 | install.ts（已有） | TASK-006 | 稳定（已含 plugins） |

---

## 5. 并行 / 串行策略

### 5.1 文件冲突矩阵

```
             TASK-001  TASK-002  TASK-003  TASK-005  TASK-006  TASK-001-T  TASK-002-T  TASK-005-T  TASK-007
TASK-001        -         ✗         ✗         ✗         ✗         ✗          ✗          ✗          ✗
TASK-002        ✗         -         ✗         ✗         ✗         ✗          ✗          ✗          ✗
TASK-003        ✗         ✗         -         ✗         ✗         ✗          ✗          ✗          ✗
TASK-005        ✗         ✗         ✗         -         ✗         ✗          ✗          ✗          ✗
TASK-006        ✗         ✗         ✗         ✗         -         ✗          ✗          ✗          ✗
TASK-001-T      ✗         ✗         ✗         ✗         ✗         -          ✓          ✓          ✓
TASK-002-T      ✗         ✗         ✗         ✗         ✗         ✓          -          ✓          ✓
TASK-005-T      ✗         ✗         ✗         ✗         ✗         ✓          ✓          -          ✓
TASK-007        ✗         ✗         ✗         ✗         ✗         ✓          ✓          ✓          -
```

- ✗ = 无共享文件冲突，可并行
- ✓ = 需要确认（测试任务共享 `tests/` 目录但按任务 ID 命名文件，无实际冲突）

### 5.2 并行组

- **并行组 1**（Batch 1）：[TASK-001, TASK-002, TASK-003, TASK-005, TASK-006] —— 5 个实现任务全部无共享冲突
- **并行组 2**（Batch 2）：[TASK-001-T, TASK-002-T, TASK-005-T, TASK-007] —— 4 个测试任务，测试文件命名空间隔离

### 5.3 串行链

- Batch 1（5 个实现任务）→ Batch 2（4 个测试任务）：测试任务需要在实现产物稳定后再运行
- TASK-003（模板对齐）→ Round 2 TASK-004（Web 面板验证）：TASK-004 依赖 TASK-003 的 Agent 模板对齐结果

---

## 6. 风险提醒

| 风险 | 等级 | 触发条件 | 缓解措施 |
|------|------|---------|---------|
| TASK-004 数据结构变更 | 中 | `AgentItem` 增加字段影响 Claude/Codex 平台渲染 | Round 2 时必须在 TASK-004 Execution Packet 中明确 `escalation_rule`，修改 `AgentItem` 需先回编排者确认 |
| TASK-006 npm 打包配置错误 | 中 | `package.json` 的 `files` 字段遗漏 OpenCode 模板目录 | TASK-006 执行时需实际执行 `npm pack --dry-run` 验证输出 |
| TASK-003 与 TASK-002 的工具名耦合 | 低 | TASK-003 替换工具引用时使用的名称与 TASK-002 产出不一致 | 工具名已在 REQ-002 中明确定义（`jarvis-gate-check` 等 5 个），两个任务均以此契约为准 |
| `tool.execute.before` 阻断过于激进 | 低 | 阻断所有被监听工具导致正常操作也被拦 | TASK-001 应设计 Gate 检查的过滤逻辑，仅对必须通过 Gate 的工具执行阻断 |
| Phase 1 并行调试困难 | 低 | 5 个并行任务中某任务引入回归，定位困难 | 每个任务独立文件集，运行各自测试套件隔离定位 |

---

## 7. 实现者交接信息

### 7.1 代码风格与约定

- 所有 TypeScript 文件使用 `/** JSDoc */` 注释，中文描述
- 测试文件位于 `tests/` 目录，使用 `vitest` 框架 + `describe/it/expect/vi` 模式
- 禁止使用 `any` 类型（除非确有必要且注释说明）
- 不可变操作：使用 `[...arr]` 扩展运算符，禁止 `push/pop/splice`
- 嵌套 ≤ 4 层

### 7.2 TDD 任务交接

TASK-001/002/005 均为 TDD 任务。执行流程：

1. **Red**: 先编写失败测试（`tests/<task-name>.test.ts`）
2. **Green**: 实现最快通过测试的代码
3. **Refactor**: 在 Batch 2 中由 `backend-test-expert` 审查并重构

TDD Red 阶段测试用例的最低覆盖要求：
- TASK-001: 5 个 hook 事件各 1 个行为测试 + 1 个阻断测试 + 1 个错误处理测试
- TASK-002: 每个工具 2 个测试（正常调用 + 错误处理），共 10 个
- TASK-005: `platform_info` 无参数、指定平台、未知平台 共 3 个场景

### 7.3 TASK-003（模板对齐）交接

TASK-003 需要对比两平台完整 Agent 清单。关键信息：
- Claude 平台 53 个 agent（`tests/` 已确认计数，使用 `-expert` 后缀）
- OpenCode 平台 58 个 agent（使用 `-worker`/`-implementer` 后缀）
- 按**角色/功能维度**对比，非按命名维度
- 输出差异清单作为 TASK-004 和 TASK-007 的输入

### 7.4 TASK-006（Install/Upgrade）交接

已有完整安装逻辑在 `install.ts`，本轮聚焦于：
- 路径验证（`dist/src/templates/platforms/opencode/` 是否存在于构建产物中）
- `package.json` 的 `files` 字段审核
- 实际执行 `npm pack --dry-run` 确认打包内容

---

## 8. parallel_batches

### Batch 1（无依赖，可同时启动，5 个实现任务并行）

- TASK-001 → subagent_type: backend-dev-expert（TDD Red+Green）
- TASK-002 → subagent_type: backend-dev-expert（TDD Red+Green）
- TASK-003 → subagent_type: backend-dev-expert（直接开发）
- TASK-005 → subagent_type: backend-dev-expert（TDD Red+Green）
- TASK-006 → subagent_type: backend-dev-expert（直接开发）

### Batch 2（依赖 Batch 1 全部完成，4 个测试任务并行）

- TASK-001-T → subagent_type: backend-test-expert（TDD Refactor 验证）
- TASK-002-T → subagent_type: backend-test-expert（TDD Refactor 验证）
- TASK-005-T → subagent_type: backend-test-expert（TDD Refactor 验证）
- TASK-007 → subagent_type: backend-test-expert（TASK-003 test_after 验证）

### 后续 Round 2（不在本轮范围）

- TASK-004 → subagent_type: frontend-dev-expert（Web 面板 OpenCode 适配，依赖 TASK-003）
- TASK-008 → subagent_type: e2e-test-expert（E2E 集成测试，排在所有单元/集成测试之后）

---

## 9. Execution Packets

---

### task_id: TASK-001
### task_name: OpenCode Gate Hook 增强
### requirement_ids: REQ-001
### owner: backend-dev-expert
### objective: 增强 `jarvis-gate-check.ts`，实现 `tool.execute.before` 硬阻断及完整事件上报
### in_scope:
- 增加 `tool.execute.before` hook：在 Task/Agent/Write/Edit/Bash 工具执行前调用 `jarvis hook gate-check`，Gate 不满足时 `throw new Error(...)` 硬阻断
- 增强 `tool.execute.after`：Task 执行后 `fetch()` 上报状态变更到 `http://localhost:3456/api/events`
- 增强 `session.idle`：调用 `fetch()` 同步流水线状态到 `/api/pipeline`
- 增加 `session.error` 事件处理：错误时 `POST /api/events`
- 增加 `permission.asked` 事件处理：记录权限请求到 `/api/events`
### out_of_scope:
- 不修改 Gate 核心逻辑（`gates.ts`）
- 不修改数据库 Schema
- 不修改 OpenCode 插件系统的其他文件
- 不修改 Web API 接口定义
### input_documents:
- `docs/requirements/2026-05-09-opencode-native-integration.md`
- `docs/tasks/2026-05-09-opencode-native-integration-tasks.md`
### allowed_paths:
- `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts`
- `tests/gate-hook.test.ts` (新增)
### forbidden_paths:
- `src/engine/gates.ts` — Gate 核心逻辑
- `src/engine/server.ts` — 引擎 MCP 定义
- `src/engine/db.ts` — 数据库层
- `src/web/` — Web 面板
### dependencies:
- `jarvis hook gate-check` CLI 命令（已存在，提供 Gate 状态检查）
- 引擎 Web API `/api/events`（已有 SSE 事件接口）
### required_skills: behavioral-guidelines, code-standards, test-driven-development, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-002, TASK-003, TASK-005, TASK-006
### wait_for: (无)
### acceptance_criteria:
1. `tool.execute.before` 在 Gate 不满足时抛出 Error，OpenCode 能捕获并阻断工具调用
2. `tool.execute.after` Task 执行后成功 POST 事件到 `/api/events`
3. `session.idle` 能调用 `/api/pipeline` 同步状态
4. `session.error` 和 `permission.asked` 事件均能记录到引擎
5. 所有 5 个 hook 的测试用例通过
### test_strategy: tdd
### handoff_notes:
- TDD Red 阶段需在 `tests/gate-hook.test.ts` 编写：5 个 hook 事件各 1 个行为测试 + 1 个硬阻断测试 + 1 个网络错误处理测试（共 7 个用例）
- 由于 hook 运行在 OpenCode 上下文中，测试需 mock `node:child_process` 的 `execSync` 和全局 `fetch`
- `tool.execute.before` 的过滤逻辑需明确：仅对 `Task`、`Agent`、`Write`、`Edit`、`Bash` 5 个工具执行 Gate 检查
- 传递给 Batch 2 的 `backend-test-expert` 时，需确保测试覆盖率达标
### escalation_rule: 如需变更 `tool.execute.before` 的过滤工具列表、引擎 Web API 接口签名、Gate 判定逻辑，必须先回编排者，不得直接修改

---

### task_id: TASK-002
### task_name: 创建 OpenCode 原生自定义工具
### requirement_ids: REQ-002
### owner: backend-dev-expert
### objective: 在 `src/templates/platforms/opencode/tools/` 创建 5 个语义化包装工具，使 OpenCode AI 可调用 Gate 流水线功能
### in_scope:
- 创建 `jarvis-gate-check.ts`：包装 `gate_check` MCP 工具
- 创建 `jarvis-gate-advance.ts`：包装 `advance_gate` MCP 工具
- 创建 `jarvis-pipeline-status.ts`：包装 `pipeline_status` MCP 工具
- 创建 `jarvis-report.ts`：包装 `report_status` MCP 工具
- 创建 `jarvis-agent-config.ts`：包装 `agent_config` MCP 工具
- 每个工具：使用 `@opencode-ai/plugin` 的 `tool()` 函数，`describe()` 中文描述，args schema 中文 `describe()`
### out_of_scope:
- 不修改 MCP 引擎工具本身的实现
- 不创建 OpenCode 命令目录（`commands/`）
- 不实现 `@opencode-ai/plugin` 的 `tool()` 函数本身（使用已有 API）
### input_documents:
- `docs/requirements/2026-05-09-opencode-native-integration.md`
- `docs/tasks/2026-05-09-opencode-native-integration-tasks.md`
### allowed_paths:
- `src/templates/platforms/opencode/tools/` (新建目录及 5 个 .ts 文件)
- `tests/tools.test.ts` (新增)
### forbidden_paths:
- `src/engine/server.ts` — 引擎 MCP 定义
- `src/templates/platforms/opencode/plugins/` — 插件目录
- `src/templates/platforms/opencode/agents/` — Agent 模板
### dependencies:
- 引擎 MCP 工具 `gate_check`、`advance_gate`、`pipeline_status`、`report_status`、`agent_config`（已在 `server.ts` 中定义）
- `@opencode-ai/plugin` 包的 `tool()` 函数签名
### required_skills: behavioral-guidelines, code-standards, test-driven-development, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-001, TASK-003, TASK-005, TASK-006
### wait_for: (无)
### acceptance_criteria:
1. 5 个工具文件均位于 `tools/` 目录，每个 `~30-40` 行
2. 每个工具的 `describe()` 和 args schema 均为中文描述
3. 返回结果均为格式化中文文本（非原始 JSON）
4. 10 个测试用例（每工具 2 个）全部通过
### test_strategy: tdd
### handoff_notes:
- 工具名契约（固定）: `jarvis-gate-check`、`jarvis-gate-advance`、`jarvis-pipeline-status`、`jarvis-report`、`jarvis-agent-config`
- 这些名称被 TASK-003 用于替换 Agent 模板中的 MCP 工具引用，不可变更
- `tool()` 函数签名参考 OpenCode 文档：`tool(name, description, argsSchema, handler)`
- MCP 工具调用方式：通过引擎 stdio 连接调用 `mcp__jarvis-engine__gate_check` 等
- 传递给 Batch 2 的 `backend-test-expert` 时需附带工具契约文档
### escalation_rule: 如需变更工具名称（影响 TASK-003 的契约）、修改 args schema 结构（影响 AI 调用方式），必须先回编排者，不得直接修改

---

### task_id: TASK-003
### task_name: 对齐 OpenCode Agent 模板集与 Claude
### requirement_ids: REQ-003
### owner: backend-dev-expert
### objective: 对比 Claude（53 个）与 OpenCode（58 个）Agent 模板，按功能维度补全缺失项，统一 frontmatter 格式
### in_scope:
1. 列出两平台 Agent 完整清单并对比（按角色/功能维度，非命名维度）
2. 补充缺失 Agent 类型到对应平台
3. 确保 OpenCode 模板使用正确 frontmatter 格式（`mode: subagent/primary`、`permission:`、`model:`）
4. 替换 OpenCode 模板中的 MCP 工具引用：`mcp__jarvis-engine__*` → `jarvis-*`（5 个工具名）
5. 确保 Claude 模板保留 `mcp__jarvis-engine__*` 前缀（不受影响）
### out_of_scope:
- 不创建新 Agent 类型的定义规范（复用现有命名体系）
- 不修改 Web 面板显示的 Agent 逻辑（由 TASK-004 负责）
- 不修改 CLI 命令（不涉及 commands 目录）
- 不修改 OpenCode 插件或工具文件
### input_documents:
- `docs/requirements/2026-05-09-opencode-native-integration.md`
- `docs/tasks/2026-05-09-opencode-native-integration-tasks.md`
### allowed_paths:
- `src/templates/platforms/opencode/agents/*.md`
- `src/templates/platforms/claude/agents/*.md`
### forbidden_paths:
- `src/templates/platforms/opencode/plugins/` — 插件目录
- `src/templates/platforms/opencode/tools/` — TASK-002 的领域
- `src/engine/agent-registry.ts` — 注册逻辑（TASK-004）
- `src/web/` — Web 面板
### dependencies:
- TASK-002 的工具名称契约（`jarvis-gate-check` 等 5 个名称，已在 REQ-002 预定义）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-001, TASK-002, TASK-005, TASK-006
### wait_for: (无；工具名称契约已预定义，无需等待 TASK-002 完成)
### acceptance_criteria:
1. Claude 和 OpenCode 两平台的同功能 Agent 类型一一对应
2. OpenCode 模板 frontmatter 格式符合规范（含 `mode`/`permission`/`model` 字段）
3. OpenCode 模板中不存在 `mcp__jarvis-engine__*` MCP 工具前缀（已替换为 `jarvis-*`）
4. Claude 模板不受影响，保留 `mcp__jarvis-engine__*` 前缀
### test_strategy: test_after
### handoff_notes:
- 产出差异清单（缺失项 + 格式修正项）作为 TASK-007 和 TASK-004 的输入依据
- 差异清单格式建议：Markdown 表格（Agent 角色 | Claude 文件名 | OpenCode 文件名 | 状态）
- Claude 使用 `-expert` 后缀，OpenCode 使用 `-worker`/`-implementer` 后缀，映射关系需明确记录
- OpenCode 模板当前使用 `mode: subagent`、`permission:` (YAML 对象)、`reasoningEffort:` 字段，Claude 使用 `tools:`、`effort:` 字段，保持各自格式
- 传递给 TASK-007 的 `backend-test-expert` 时，需提供完整的差异清单和处理结果
### escalation_rule: 如需新增 Agent 类型命名规范、修改 frontmatter 字段语义（如 `mode` 的可选值），必须先回编排者

---

### task_id: TASK-005
### task_name: 引擎 MCP 适配与 platform_info 增强
### requirement_ids: REQ-005, REQ-006
### owner: backend-dev-expert
### objective: 审核 `mcp-opencode.json` 配置，增强 `server.ts` 中 MCP 工具定义，使 `platform_info` 返回完整平台特性信息
### in_scope:
1. 审核 `mcp-opencode.json`：确认 jarvis-engine 和 playwright 配置正确
2. `server.ts` 中 `platform_info` 工具增强：
   - 增加 `features` 字段（OpenCode: `["plugins"]`, Claude: `["commands"]`, Codex: `[]`）
   - 确认 `getPlatformModels()` 覆盖三平台完整模型列表
3. MCP 工具描述优化：在 `gate_check`、`advance_gate` 等工具的 `describe()` 中增加"当 platform=opencode 时..."的上下文说明
### out_of_scope:
- 不修改 MCP 工具的实际逻辑（仅增强描述和返回格式）
- 不修改 `getPlatformModels()` 的实现（已在 agent-registry.ts 中实现）
- 不修改 `agent-registry.ts` 的扫描逻辑
### input_documents:
- `docs/requirements/2026-05-09-opencode-native-integration.md`
- `docs/tasks/2026-05-09-opencode-native-integration-tasks.md`
### allowed_paths:
- `src/engine/server.ts`
- `src/templates/mcp-opencode.json`
- `tests/mcp-platform-info.test.ts` (新增)
### forbidden_paths:
- `src/engine/agent-registry.ts` — 注册扫描逻辑
- `src/engine/gates.ts` — Gate 核心逻辑
- `src/engine/db.ts` — 数据库层
### dependencies:
- `getPlatformModels()` 和 `getPlatforms()` 函数（已在 `agent-registry.ts` 中实现并导入 `server.ts`）
### required_skills: behavioral-guidelines, code-standards, test-driven-development, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-001, TASK-002, TASK-003, TASK-006
### wait_for: (无)
### acceptance_criteria:
1. `platform_info` 不传参返回三平台 `agent_count` + `available_models` + `features`
2. `platform_info` 传 `platform=opencode` 返回 `features: ["plugins"]`
3. `platform_info` 传 `platform=claude` 返回 `features: ["commands"]`
4. `mcp-opencode.json` 配置审核无问题
5. 3 个 TDD 测试场景通过（无参数、指定平台、未知平台错误处理）
### test_strategy: tdd
### handoff_notes:
- `mcp-opencode.json` 当前配置已正确（jarvis-engine + playwright），本次主要是审核确认，可能无需修改
- `features` 字段数据来源：OpenCode 的 `PLATFORM_CONFIG.opencode.subdirs` 包含 `plugins`，Claude 的包含 `commands`
- 传递给 Batch 2 的 `backend-test-expert` 时，需确认 `platform_info` 返回格式与契约一致
### escalation_rule: 如需修改 `getPlatformModels()` 的模型硬编码补充列表、变更 `platform_info` 路径参数名，必须先回编排者

---

### task_id: TASK-006
### task_name: Install/Upgrade OpenCode 路径验证
### requirement_ids: REQ-007
### owner: backend-dev-expert
### objective: 验证 `install.ts` 中 OpenCode 安装路径完整性，审核 `package.json` 打包配置，确认所有必要模板文件在 npm 包中
### in_scope:
1. 审核 `src/install.ts`：确认 `jarvis add opencode` 流程完整
   - MCP 配置写入 `.opencode/opencode.json`
   - 插件安装到 `.opencode/plugins/`
   - Agents / skills 安装到 `.opencode/` 对应子目录
2. 审核 `package.json` 的 `files` 字段：确认 `dist/src/templates/platforms/opencode/` 在打包范围内
3. 检查 `dist/` 目录构建产物完整性
4. 发现缺失或错误路径时修复
### out_of_scope:
- 不修改安装逻辑的核心流程（`mergeDir`、`installMcp` 等）
- 不添加新的平台支持
- 不修改 `INSTALL_BUCKETS` 常量（已含 `plugins`）
### input_documents:
- `docs/requirements/2026-05-09-opencode-native-integration.md`
- `docs/tasks/2026-05-09-opencode-native-integration-tasks.md`
### allowed_paths:
- `src/install.ts`
- `package.json`
- `dist/` (仅审核，最小修改)
### forbidden_paths:
- `src/engine/` — 引擎核心
- `src/templates/platforms/` (除审核 `dist/` 副本外不修改源码模板)
### dependencies: (无)
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-001, TASK-002, TASK-003, TASK-005
### wait_for: (无)
### acceptance_criteria:
1. `install.ts` 代码审核通过，OpenCode 安装路径完整
2. `package.json` 的 `files` 字段确保 `dist/src/templates/platforms/opencode/` 打包在内
3. `node_modules/` 不被打入 npm 包
4. 执行 `npm pack --dry-run` 输出包含所有 OpenCode 模板文件（agents/、plugins/、skills/、mcp-opencode.json）
### test_strategy: manual_only
### handoff_notes:
- 当前 `install.ts` 已有完整的 OpenCode 安装逻辑，本轮重点是**验证**而非重写
- 关键验证点：`dist/` 目录路径正确性（发布后 npm 全局安装的路径 vs 源码路径）
- `INSTALL_BUCKETS` 已包含 `['agents', 'commands', 'skills', 'plugins']`，`mergeDir` 会自动扫描安装
- 如果 `package.json` 的 `files` 字段缺失或排除 OpenCode 模板目录，需增加配置
- 手动验证步骤需记录在完成任务报告中
### escalation_rule: 如需修改 `INSTALL_BUCKETS` 常量、变更 `.opencode/` 目录结构约定、修改 MCP 配置写入逻辑，必须先回编排者

---

### task_id: TASK-001-T
### task_name: TASK-001 TDD 测试验证与重构
### requirement_ids: REQ-001
### owner: backend-test-expert
### objective: 验证 TASK-001 的 TDD 测试覆盖率，执行 Refactor 阶段优化，确保 Hook 增强代码质量
### in_scope:
- 审查 `tests/gate-hook.test.ts` 测试用例完整性和断言准确性
- 验证 5 个 hook 事件的行为覆盖（before/after/idle/error/permission.asked）
- 执行 Refactor 阶段：优化代码结构，消除重复，确保嵌套 ≤4 层
- 确认 `tool.execute.before` 硬阻断行为的测试覆盖
- 运行测试套件确认全部通过
### out_of_scope:
- 不修改 `jarvis-gate-check.ts` 的业务逻辑（仅结构优化）
- 不新增测试场景（仅审查和补充边界用例）
### allowed_paths:
- `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts` (仅 Refactor)
- `tests/gate-hook.test.ts`
### forbidden_paths:
- `src/engine/` — 引擎核心
- `src/templates/platforms/opencode/tools/` — TASK-002 领域
### dependencies: TASK-001 完成 Red+Green 阶段
### required_skills: behavioral-guidelines, code-standards, code-review-and-quality, verification-before-completion
### parallel_group: TASK-002-T, TASK-005-T, TASK-007
### wait_for: TASK-001
### acceptance_criteria:
1. TASK-001 的测试覆盖率达标（7 个用例全部通过）
2. Refactor 后代码无冗余、嵌套 ≤4 层、无可变数组操作
3. 所有测试仍通过（重构不破坏行为）
### test_strategy: tdd
### handoff_notes:
- 本任务是 TDD 的 Refactor 阶段，由独立测试专家执行以确保客观性
- 审查重点：mock 策略合理性、错误分支覆盖、硬阻断逻辑的边界条件
- 如有测试遗漏，在报告中标注并建议补充
### escalation_rule: 如需新增 hook 事件类型或修改硬阻断的过滤工具列表，必须先回编排者

---

### task_id: TASK-002-T
### task_name: TASK-002 TDD 测试验证与重构
### requirement_ids: REQ-002
### owner: backend-test-expert
### objective: 验证 TASK-002 的 TDD 测试覆盖率和工具契约正确性，执行 Refactor 优化
### in_scope:
- 审查 `tests/tools.test.ts` 测试用例完整性和断言准确性
- 验证 5 个工具各 2 个用例（正常 + 错误处理）的行为覆盖
- 验证每个工具的 args schema 和 `describe()` 中文描述完整性
- 执行 Refactor 阶段：优化代码结构，统一工具文件风格
- 运行测试套件确认全部通过
### out_of_scope:
- 不修改工具的业务逻辑（仅结构优化）
- 不创建新工具
### allowed_paths:
- `src/templates/platforms/opencode/tools/*.ts` (仅 Refactor)
- `tests/tools.test.ts`
### forbidden_paths:
- `src/engine/server.ts` — MCP 定义
- `src/templates/platforms/opencode/plugins/` — TASK-001 领域
### dependencies: TASK-002 完成 Red+Green 阶段
### required_skills: behavioral-guidelines, code-standards, code-review-and-quality, verification-before-completion
### parallel_group: TASK-001-T, TASK-005-T, TASK-007
### wait_for: TASK-002
### acceptance_criteria:
1. TASK-002 的测试覆盖率达标（10 个用例全部通过）
2. 5 个工具文件的代码风格统一，中文描述完整
3. Refactor 后所有测试仍通过
### test_strategy: tdd
### handoff_notes:
- 关注工具名称与 TASK-003 契约的一致性（5 个预定义名称）
- 关注 args schema 的 `describe()` 是否对 AI 友好（中文、明确参数含义）
### escalation_rule: 如需修改工具名称或 args schema 结构，必须先回编排者

---

### task_id: TASK-005-T
### task_name: TASK-005 TDD 测试验证与重构
### requirement_ids: REQ-005, REQ-006
### owner: backend-test-expert
### objective: 验证 TASK-005 的 TDD 测试覆盖率，确保 `platform_info` 返回数据准确性
### in_scope:
- 审查 `tests/mcp-platform-info.test.ts` 测试用例完整性和断言准确性
- 验证 3 个测试场景（无参数、指定平台、未知平台错误处理）
- 验证 `features` 字段返回正确性（OpenCode→plugins, Claude→commands, Codex→[]）
- 执行 Refactor 阶段：优化 `platform_info` 的实现结构
- 运行测试套件确认全部通过
### out_of_scope:
- 不修改 MCP 工具的实际业务逻辑
- 不新增 MCP 工具
### allowed_paths:
- `src/engine/server.ts` (仅 Refactor)
- `tests/mcp-platform-info.test.ts`
### forbidden_paths:
- `src/engine/gates.ts` — Gate 逻辑
- `src/engine/agent-registry.ts` — 扫描逻辑
### dependencies: TASK-005 完成 Red+Green 阶段
### required_skills: behavioral-guidelines, code-standards, code-review-and-quality, verification-before-completion
### parallel_group: TASK-001-T, TASK-002-T, TASK-007
### wait_for: TASK-005
### acceptance_criteria:
1. TASK-005 的测试覆盖率达标（3 个场景全部通过）
2. `platform_info` 返回的 `features` 字段值正确
3. Refactor 后所有测试仍通过
### test_strategy: tdd
### handoff_notes:
- 关注 `getPlatformModels()` 返回的模型列表是否完整（当前有硬编码补充，需确认覆盖）
- 关注 `platform_info` 的 JSON 响应格式与前端的契约一致性
### escalation_rule: 如需修改 `platform_info` 返回字段结构，必须先回编排者

---

### task_id: TASK-007
### task_name: Agent 模板对齐验证（TASK-003 test_after）
### requirement_ids: REQ-003
### owner: backend-test-expert
### objective: 验证 TASK-003 的 Agent 模板对齐结果：确认两平台功能覆盖一致、frontmatter 格式正确、工具引用清洁
### in_scope:
1. 编写自动化验证脚本或测试（`tests/agent-template-alignment.test.ts`）
2. 验证 Claude 和 OpenCode 两平台按角色的 Agent 数量/覆盖率
3. 验证所有 OpenCode 模板 frontmatter 包含必需的 `mode`/`permission`/`model` 字段
4. 验证 OpenCode 模板中无残留 `mcp__jarvis-engine__*` 前缀
5. 验证 Claude 模板中仍保留 `mcp__jarvis-engine__*` 前缀（未被误修改）
6. 运行验证通过或列出修复建议
### out_of_scope:
- 不修改 Agent 模板内容（仅验证和报告）
- 不修改 Web 面板逻辑
### allowed_paths:
- `tests/agent-template-alignment.test.ts` (新增)
- `src/templates/platforms/opencode/agents/` (只读)
- `src/templates/platforms/claude/agents/` (只读)
### forbidden_paths:
- `src/engine/` — 引擎核心
- `src/web/` — Web 面板
### dependencies:
- TASK-003 完成 Agent 模板对齐（需读取其产出的差异清单）
### required_skills: behavioral-guidelines, code-standards, code-review-and-quality, verification-before-completion
### parallel_group: TASK-001-T, TASK-002-T, TASK-005-T
### wait_for: TASK-003
### acceptance_criteria:
1. 验证脚本通过：两平台 Agent 功能覆盖无缺失
2. OpenCode 模板 frontmatter 格式 100% 合规
3. 无 `mcp__jarvis-engine__*` 前缀残留在 OpenCode 模板中
4. Claude 模板 `mcp__jarvis-engine__*` 前缀保留完整
### test_strategy: test_after
### handoff_notes:
- 本任务是 planning 为满足 test_strategy=test_after 要求而补充的独立测试任务
- 产出验证报告作为 TASK-004（Round 2 Web 面板适配）的输入依据
- 如果验证发现遗留问题，报告给编排者，由编排者决定是否需要 patch
- 验证脚本应设计为可重复运行（CI 兼容）
### escalation_rule: 如发现大量（>5 个）模板格式问题或功能覆盖缺失，立即回报编排者

---

## 10. Plan Patch / Contract Change Request 触发条件

| 触发条件 | 响应方式 |
|---------|---------|
| TASK-001 实现过程发现需要修改 hook 过滤工具列表 | 提交 plan patch，说明新增/移除的工具及理由 |
| TASK-002 发现 `@opencode-ai/plugin` 的 `tool()` API 与预期不符 | 提交 contract change request，说明替代方案 |
| TASK-003 发现两个平台有 >5 个以上差异需要新增模板 | 提交 plan patch，扩展 TASK-003 范围或拆分为子任务 |
| TASK-005 发现 `getPlatformModels()` 返回的模型列表不完整 | 提交 contract change request 扩展到 `agent-registry.ts` |
| TASK-006 发现 `package.json` 或构建产物路径问题 | 提交 plan patch，说明需要的配置修改 |
| 任两个任务出现实际文件冲突（虽然设计上无冲突） | 提交 plan patch，将冲突任务改为串行 |
| 单任务预估变更行数超过 200 行限制 | 提交 plan patch，拆分任务 |

---

## 11. 推荐的下一步

1. **编排者** 按 Batch 1 → Batch 2 顺序派发任务：
   - 首先同时启动 Batch 1 的 5 个实现 Agent（TASK-001 ~ TASK-006）
   - Batch 1 全部完成后，同时启动 Batch 2 的 4 个测试 Agent
2. **TASK-003** 完成后，编排者应取差异清单作为 Round 2 TASK-004 的输入
3. **Round 2**（不在本轮范围）：
   - TASK-004：frontend-dev-expert 执行 Web 面板 OpenCode 适配
   - TASK-008：e2e-test-expert 执行端到端集成测试
4. 全部完成后由 qa-review-expert 执行 Gate C1 审查

---

## 12. 变更行数汇总

| 批次 | 任务 | 预估行数 |
|------|------|---------|
| Batch 1 | TASK-001 | ~150 |
| Batch 1 | TASK-002 | ~200 |
| Batch 1 | TASK-003 | ~120 |
| Batch 1 | TASK-005 | ~120 |
| Batch 1 | TASK-006 | ~80 |
| Batch 2 | TASK-001-T (测试) | ~35 |
| Batch 2 | TASK-002-T (测试) | ~40 |
| Batch 2 | TASK-005-T (测试) | ~30 |
| Batch 2 | TASK-007 (测试) | ~45 |
| **合计** | | **~820** |

在 1000 行限制内。Round 2（TASK-004 + TASK-008）预计 ~250 行，另行规划。

---

> 计划文档版本: 1.0 | 编制: planning | 日期: 2026-05-09
