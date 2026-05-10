# 执行计划 -- 贾维斯流水线与智能体体系全面优化

> 日期：2026-05-11 | 计划者：planner | 状态：ready

---

## 1. 需求文档路径

- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`（Gate A 已通过，status: confirmed）

## 2. 任务文档路径

- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`（Gate B 已通过）

## 3. 当前轮次目标

单轮次交付全部 12 个任务，覆盖 11 个 REQ（REQ-039 ~ REQ-050，不含 REQ-048 已由 REQ-049 间接覆盖）。完成 Claude 平台流水线与智能体体系的全面优化：Agent 重命名/去重/新增、行为准则修正、Gate 流程更新、Web 面板同步。

## 4. 当前轮次范围

### 纳入范围

- **Claude 平台模板**（`src/templates/platforms/claude/`）：Agent 模板（新增/删除/重命名/重写）、Skill 模板（准则修订/动态加载/多模态注入）、Command 模板（引用更新）
- **引擎核心**（`src/engine/`）：`agent-registry.ts`（分类规则）、`gates.ts`（GATE_AGENT_GUIDE）、`server.ts`（pipeline_guide 返回）
- **项目文档**（`AGENTS.md`）：智能体清单、关键约束、新增"文档驱动"章节
- **用户级同步**（`.claude/skills/behavioral-guidelines/SKILL.md`）：与模板层同步
- **Web 面板**（`web/src/pages/`）：`Dashboard.tsx`、`Agents.tsx`、`matchPipelineType.ts`

### 排除范围

- OpenCode/Codex 平台模板（不做任何修改）
- 移动端 Agent 合并（Android/iOS/Flutter/Taro/Expo 保留 3 层模式）
- `browser-use` skill 模板本身（已存在，TASK-005 只需创建 Agent 模板加载它）
- 新增路由或 Web 面板页面

## 5. 完成标准

1. 所有 12 个任务的 Acceptance Criteria 逐项满足
2. `npm run typecheck` 通过（项目根目录 + web 子目录）
3. `npm test` 全部通过（TDD 任务新增测试用例 + 无回归）
4. `jarvis engine status` 正常，引擎无错误日志
5. `grep -r "docs-researcher\|remediation-planner\|fix-retest\|docs-research-expert" src/templates/platforms/claude/ src/engine/` 无命中（确认旧 Agent 名称彻底清除）
6. AGENTS.md 与代码变更一致（Agent 列表、约束、统计数字）
7. 模板层与用户级 `behavioral-guidelines/SKILL.md` 内容一致

## 6. 是否需要先查阅 code-explore-expert / docs-research-expert

**不需要。** 本轮规划已完成全部文件的实地读取验证：

- 模板目录：`src/templates/platforms/claude/agents/`（55 个 .md）、`skills/`（29 个目录）、`commands/`（16 个 .md）
- 用户级目录：`.claude/agents/`（55 个 .md）、`.claude/skills/`（30 个目录）
- 引擎文件：`gates.ts`（264 行）、`agent-registry.ts`（441 行）、`server.ts`（pipeline_guide 位于 L619-645）
- Web 组件：`Dashboard.tsx`、`Agents.tsx`（matchFunctionRole L30-61）、`matchPipelineType.ts`（55 行）
- 项目文档：`AGENTS.md`（208 行）
- 测试目录：`tests/`（7 个 .test.ts 文件，含 `gates.test.ts`、`agent-registry.test.ts`）

所有文件路径、内容结构、引用链已确认，无需额外探索。

## 7. 执行代理分工

| TASK | Agent | 理由 |
|------|-------|------|
| TASK-001 | `remediation-expert` | 纯 Skill .md 编辑（准则删除+重编号），无引擎逻辑 |
| TASK-002 | `backend-dev-expert` | 引擎核心文件（gates.ts + agent-registry.ts + AGENTS.md）是变更的主心骨 |
| TASK-003 | `backend-dev-expert` | TDD 任务，引擎核心 GATE_AGENT_GUIDE 变更 + 多 Agent 模板引用更新 |
| TASK-004 | `backend-dev-expert` | 引擎核心 + 新增 Agent 模板，需同步 3 处注册点 |
| TASK-005 | `backend-dev-expert` | 引擎核心 + 新增 Agent 模板 + 新增注册分类"浏览器" |
| TASK-006 | `remediation-expert` | 纯 Skill/Agent .md 编辑（移除 skills frontmatter + 文档完善） |
| TASK-007 | `remediation-expert` | 纯 .md 编辑（behavioral-guidelines + AGENTS.md 约束追加） |
| TASK-008 | `backend-dev-expert` | TDD 任务，gates.ts 全面刷新 + server.ts pipeline_guide 变更 |
| TASK-009 | `backend-dev-expert` | 引擎核心分类修订 + Agent 模板重写 |
| TASK-010 | `frontend-dev-expert` | 纯 React 组件修改（Dashboard/Agents/matchPipelineType） |
| TASK-011 | `remediation-expert` | 纯 AGENTS.md 文档编辑（新增章节） |
| TASK-012 | `infra-deploy-expert` | 发布流程（版本号/Tag/npm/引擎重启） |

## 8. 共享区域改动归属与顺序

### 8.1 共享文件修改顺序表

| 文件 | 修改顺序 | 归属 Agent |
|------|---------|-----------|
| `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md` | TASK-001 → TASK-006 → TASK-007 | remediation-expert（全程） |
| `.claude/skills/behavioral-guidelines/SKILL.md` | TASK-001 → TASK-006 | remediation-expert（全程） |
| `src/engine/agent-registry.ts` | TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-009 | backend-dev-expert（全程） |
| `src/engine/gates.ts` | TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-008 | backend-dev-expert（全程） |
| `AGENTS.md` | TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-007 → TASK-009 → TASK-011 → TASK-012 | 多 Agent，严格串行 |
| `src/templates/platforms/claude/agents/api-test-expert.md` | TASK-003 → TASK-006 | backend-dev-expert → remediation-expert |

### 8.2 唯一责任方确认

| 共享文件 | 唯一责任方 | 备注 |
|---------|-----------|------|
| `agent-registry.ts` | backend-dev-expert | 5 个 TASK 修改，同一 Agent 执行保证一致性 |
| `gates.ts` | backend-dev-expert | 5 个 TASK 修改，同一 Agent 执行保证一致性 |
| `AGENTS.md` | 多 Agent 串行 | 8 个 TASK 修改，批次间严格串行避免覆盖 |
| `behavioral-guidelines/SKILL.md`（模板+用户级） | remediation-expert | 3 个 TASK 修改同一文件，同一 Agent 保证一致性 |
| `api-test-expert.md` | backend-dev-expert（先）→ remediation-expert（后） | TASK-003 先改引用，TASK-006 再移除 skills frontmatter |

## 9. 并行 / 串行策略

### 9.1 执行批次总览

```
Batch 1: TASK-001 || TASK-002
    ↓ (TASK-002 完成)
Batch 2: TASK-003
    ↓ (TASK-001 + TASK-003 完成)
Batch 3: TASK-004 || TASK-006
    ↓ (TASK-004 完成)
Batch 4: TASK-005
    ↓ (TASK-005 + TASK-006 完成)
Batch 5: TASK-007 || TASK-008 || TASK-010
    ↓ (TASK-008 完成)
Batch 6: TASK-009
    ↓ (TASK-009 完成)
Batch 7: TASK-011
    ↓ (TASK-011 完成)
Batch 8: TASK-012
```

### 9.2 并行组说明

- **Batch 1**：TASK-001（L1 行为准则）与 TASK-002（L2 引擎+模板端）无任何共享文件，完全并行
- **Batch 3**：TASK-004（L2 新增 Agent，仅改引擎文件 + 新建模板）与 TASK-006（L1 行为准则 + 移除 skills frontmatter）无共享文件——TASK-004 新创 `skill-assignment-expert.md`，TASK-006 编辑已有 `api-test-expert.md`/`test-executor.md`/`test-doc-writer.md` + `planning-and-task-breakdown/SKILL.md`
- **Batch 5**：三个任务分属不同领域：TASK-007（.md 文档编辑）、TASK-008（引擎 TS）、TASK-010（React TSX）。三者无任何共享文件，且各自依赖均已满足，可三路并行

### 9.3 串行链说明

- **L1 链（行为准则）**：TASK-001 → TASK-006 → TASK-007（同一文件 behavioral-guidelines/SKILL.md 逐次累加）
- **L2 链（引擎 + AGENTS.md）**：TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-008 → TASK-009 → TASK-011 → TASK-012（agent-registry.ts + gates.ts + AGENTS.md 逐次累加）

## 10. 风险提醒

### 10.1 变更规模

| 指标 | 数值 | 评估 |
|------|------|------|
| 预估总变更行数 | ~870 行 | 控制在 1000 行预算内 |
| 涉及文件数 | ~25 个 | 多为模板 .md 文件，低耦合 |
| 引擎核心文件 | 3 个（gates.ts / agent-registry.ts / server.ts） | 需 TDD 保护 |
| AGENTS.md | 1 个（8 次串行修改） | 最高冲突风险，最后一次执行者负责最终一致性检查 |

### 10.2 高风险点

| 风险 | 严重度 | 缓解措施 |
|------|--------|----------|
| AGENTS.md 串行修改冲突 | 高 | 严格 8 次串行，每个 Batch 完成后读取最新状态再修改 |
| GATE_AGENT_GUIDE 变更破坏编排行为 | 高 | TASK-003 和 TASK-008 均采用 TDD，先写测试验证 Gate 行为再实施 |
| 删除 Agent 模板后引用链残留 | 中 | 每步完成后 `grep -r` 验证零残留；TASK-003 引用链溯源清单全覆盖 |
| 新增"浏览器"分类影响 ICON_MAP | 中 | `browser` 键已存在于 ICON_MAP（值为 `globe`），`browser-use` 包含 `browser` 子串可自动匹配 |
| Web 面板类型检查失败 | 低 | `npm run typecheck` 在 web 目录验证 |
| 用户级 skills 未同步 | 低 | TASK-001 + TASK-006 同步更新 `.claude/skills/` |

### 10.3 垂直切片检查

本轮非业务功能开发（无 API/数据库/UI 端到端切片），而是配置工程的整体一致性优化。每个任务的完成标准独立可验证（grep 检查、引擎启动、类型检查），交付标准非传统意义上的"用户可见功能"而是"系统状态一致性"。

### 10.4 水平切片警告

无。所有任务均按端到端一致性维度组织，不存在"先全部改数据层、再全部改 API 层"的拆法。每个 TASK 都是一个完整的修改闭环（模板编辑 → 引擎注册 → 文档同步 → 验证）。

## 11. 实现者交接信息

### 11.1 重构后的 Agent 清单

| 旧 Agent | 新 Agent | 动作 |
|----------|---------|------|
| `docs-research-expert` | `external-resource-expert` | 重命名 |
| `remediation-planner` | → 合并到 `remediation-expert` | 删除 |
| `fix-retest` | → 合并到 `remediation-expert` | 删除 |
| — | `skill-assignment-expert` | 新增 |
| — | `browser-use-expert` | 新增 |

### 11.2 模板文件操作清单

**删除（3 个）：**
- `src/templates/platforms/claude/agents/docs-research-expert.md`
- `src/templates/platforms/claude/agents/remediation-planner.md`
- `src/templates/platforms/claude/agents/fix-retest.md`

**新建（3 个）：**
- `src/templates/platforms/claude/agents/external-resource-expert.md`
- `src/templates/platforms/claude/agents/skill-assignment-expert.md`
- `src/templates/platforms/claude/agents/browser-use-expert.md`

**重写（1 个）：**
- `src/templates/platforms/claude/agents/remediation-expert.md`

### 11.3 关键注意事项

- **不修改 OpenCode/Codex 模板**：`grep` 验证时限定在 `src/templates/platforms/claude/` 和 `src/engine/` 范围
- **AGENTS.md 最终一致性**：TASK-011 执行者负责最终通读 AGENTS.md，确认所有 7 个前置 TASK 的修改整合后无冲突、无遗漏
- **删除 .claude/agents/ 下的对应文件**：从模板层删除的文件，其对应的 `.claude/agents/` 副本在 `jarvis update --workspace` 时自动同步，无需手动删除

## 12. Execution Packets

---

### task_id: TASK-001
### task_name: behavioral-guidelines 删除准则5
### requirement_ids: REQ-046
### owner: remediation-expert
### objective: 删除 behavioral-guidelines SKILL.md 中的"准则 5：读取平台规范"章节，将准则 6（注释语言约定）前移为准则 5，同步更新用户级副本。
### in_scope:
- 删除模板层 `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md` 中"准则 5：读取平台规范"整节（从 `## 准则 5：读取平台规范` 到 `---` 分隔线前）
- 将原"准则 6：注释语言约定"的标题和锚点前移为"准则 5"
- 同步删除用户级 `.claude/skills/behavioral-guidelines/SKILL.md` 中的相同内容
- 确认准则编号连续：1→2→3→4→5（注释语言约定），无跳号
### out_of_scope:
- 不修改其他 Skill 文件
- 不新增或修改准则内容（只删+重编号）
- 不修改 OpenCode/Codex 模板
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md`
- `.claude/skills/behavioral-guidelines/SKILL.md`
### forbidden_paths:
- `src/templates/platforms/claude/skills/`（除 behavioral-guidelines 外的所有 skill）
- `src/engine/`（任何引擎文件）
- `AGENTS.md`
- `.opencode/`、`.codex/`（任何其他平台目录）
### dependencies: 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `verification-before-completion`
### parallel_group: [TASK-002]
### wait_for: []
### acceptance_criteria:
1. 模板层 SKILL.md 中不存在"读取平台规范"、"准则 5：读取平台规范"、`.{platform}/rules/*.md` 相关字符串
2. 准则编号连续：准则 1（先思考再编码）→ 准则 2（简单优先）→ 准则 3（精准修改）→ 准则 4（目标驱动执行）→ 准则 5（注释语言约定），无准则 6
3. 用户级 `.claude/skills/behavioral-guidelines/SKILL.md` 与模板层内容一致（diff 零差异）
4. 相关技能引用链接（`code-simplification`/`context-engineering`/`code-standards`）保持不变
5. "生效标志"和"实施指令"章节完整保留
### test_strategy: manual_only
### handoff_notes:
- 两个文件（模板+用户级）需完全一致，建议用 `diff` 命令交叉验证
- 注意"实施指令"章节中引用"上述四项准则"的文本无需修改（准则仍为 4 条核心准则）
- 准则 5（原准则 6）内容不变，仅改编号
### escalation_rule: 如需修改非 behavioral-guidelines 的 skill 文件或引擎文件，必须回编排者

---

### task_id: TASK-002
### task_name: external-resource-expert 重命名
### requirement_ids: REQ-040
### owner: backend-dev-expert
### objective: 将 `docs-research-expert` 重命名为 `external-resource-expert`，更新所有 6 个引用文件，职责扩展为"外部资料搜索 + 开源 Skill 发现 + 版本兼容性建议"。
### in_scope:
- 删除 `src/templates/platforms/claude/agents/docs-research-expert.md`
- 新建 `src/templates/platforms/claude/agents/external-resource-expert.md`：name 改为 `external-resource-expert`，description 更新为"外部资料搜索与探索代理：通过 WebSearch/WebFetch 搜索库/框架/API 最新文档；发现可用的开源 Agent Skill；输出版本兼容性建议和安装方案"
- 更新 `src/engine/agent-registry.ts`：CATEGORY_RULES 支撑类 keys 中 `'docs-research'` → `'external-resource'`
- 更新 `src/engine/gates.ts`：GATE_AGENT_GUIDE Gate A 中 `'docs-research-expert'` → `'external-resource-expert'`
- 更新 `AGENTS.md`：探索/支撑类列表 `docs-researcher` → `external-resource-expert`
- 更新 `src/templates/platforms/claude/skills/using-agent-skills/SKILL.md`：阶段 4 表格 2 处 `docs-research-expert Agent` → `external-resource-expert Agent`
### out_of_scope:
- 不修改 OpenCode/Codex 模板中的 `docs-researcher` 或 `api-docs-worker`
- 不修改 `docs-research-expert.md` 原有的技能加载逻辑（`behavioral-guidelines`/`find-docs`/`find-skills`），只扩展职责描述
- 不新增 skills
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `src/templates/platforms/claude/agents/docs-research-expert.md`（删除）
- `src/templates/platforms/claude/agents/external-resource-expert.md`（新建）
- `src/engine/agent-registry.ts`
- `src/engine/gates.ts`
- `AGENTS.md`
- `src/templates/platforms/claude/skills/using-agent-skills/SKILL.md`
### forbidden_paths:
- `src/templates/platforms/opencode/`、`src/templates/platforms/codex/`
- `.claude/skills/`（除 behavioral-guidelines 外）
- 任何 Web 面板文件
### dependencies: 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-001]
### wait_for: []
### acceptance_criteria:
1. `docs-research-expert.md` 文件已从模板目录删除
2. `external-research-expert.md` 新建，frontmatter `name: external-resource-expert` 正确
3. `grep -r "docs-research" src/templates/platforms/claude/ src/engine/` 零命中（Claude 平台范围内）
4. `grep -r "external-resource-expert" src/engine/gates.ts` 仅在 Gate A 的 can_spawn 中命中
5. `grep -r "external-resource" src/engine/agent-registry.ts` 在 CATEGORY_RULES 支撑类 keys 中命中
6. AGENTS.md 中不再含 `docs-researcher`
7. `using-agent-skills/SKILL.md` 中不再含 `docs-research-expert`
8. 新建模板包含 `find-docs` 和 `find-skills` 技能的加载指令
### test_strategy: test_after
### handoff_notes:
- 验证时使用 `grep -rn` 而非 `grep -r` 以获得行号便于确认
- `using-agent-skills/SKILL.md` 有 2 处引用，确保全部替换
- 新建的 external-resource-expert.md 模板参考原 docs-research-expert.md 的结构，增加"发现开源 Skill"和"版本兼容性建议"职责
### escalation_rule: 如需修改 OpenCode/Codex 平台的任何文件，必须先回编排者；AGENTS.md 的修改只限 agent 清单部分，不改约束或流程章节

---

### task_id: TASK-003
### task_name: Agent 职责去重与边界清晰化
### requirement_ids: REQ-043
### owner: backend-dev-expert
### objective: 删除 `remediation-planner` 和 `fix-retest` 两个 Agent，将其能力合并到重写的 `remediation-expert`；更新所有 Claude 平台内 6+ 个引用者；同步更新引擎注册和 AGENTS.md。
### in_scope:
- **删除文件**: `remediation-planner.md`, `fix-retest.md`
- **重写**: `remediation-expert.md` — 新边界："通用修复：规划→执行→验证 一站式，不调度其他 Agent"
- **引用更新（7 个文件，共约 12 处替换）**:
  - `api-test-expert.md`: 3 处 `fix-retest` → `remediation-expert`
  - `change-review-expert.md`: 1 处 `remediation-planner` → `remediation-expert`
  - `project-review-expert.md`: 1 处 `remediation-planner` → `remediation-expert`
  - `review-fix-optimize.md`: 3 处 `remediation-planner` → `remediation-expert`
  - `security-review-expert.md`: 2 处 `remediation-planner` → `remediation-expert`
  - `review-fix.md` (command): 1 处 `remediation-planner` → `remediation-expert`
  - `AGENTS.md`: 移除 `remediation-planner` 和 `fix-retest`，更新浏览器测试工作流
- **引擎同步**:
  - `agent-registry.ts`: 确认删除文件后扫描正常；CATEGORY_RULES 中 `fix-retest` 靠 `remediation` 键匹配（去重后 remediation-expert 仍命中，无需改 key）
  - `gates.ts`: Gate C2 移除 `fix-retest`，替换为 `remediation-expert`；Gate D note 不再提及 remediation-planner
### out_of_scope:
- 不修改 OpenCode/Codex 模板中的 `remediation-planner`/`remediation-worker`/`fix-retest`
- `review-only` 和 `review-fix-optimize` 自身的边界描述不修改（仅更新它们对 remediation 的引用）
- 不改动 `.claude/agents/` 下对应文件（jarvis update 时自动同步）
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `src/templates/platforms/claude/agents/remediation-planner.md`（删除）
- `src/templates/platforms/claude/agents/fix-retest.md`（删除）
- `src/templates/platforms/claude/agents/remediation-expert.md`（重写）
- `src/templates/platforms/claude/agents/api-test-expert.md`
- `src/templates/platforms/claude/agents/change-review-expert.md`
- `src/templates/platforms/claude/agents/project-review-expert.md`
- `src/templates/platforms/claude/agents/review-fix-optimize.md`
- `src/templates/platforms/claude/agents/security-review-expert.md`
- `src/templates/platforms/claude/commands/review-fix.md`
- `src/engine/agent-registry.ts`
- `src/engine/gates.ts`
- `AGENTS.md`
- `tests/gates.test.ts`（新增 TDD 测试用例）
### forbidden_paths:
- `src/templates/platforms/opencode/`
- `src/templates/platforms/codex/`
- `.claude/agents/`（用户级 agent 副本，不直接修改）
- `web/` 任何文件
### dependencies:
- `agent-registry.ts` 当前状态（依赖 TASK-002 完成后的版本）
- `gates.ts` 当前状态（依赖 TASK-002 完成后的版本）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `test-driven-development`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: []
### wait_for: [TASK-002]
### acceptance_criteria:
1. `remediation-planner.md` 和 `fix-retest.md` 已从模板目录删除（文件不存在）
2. `remediation-expert.md` 重写完成，frontmatter description 更新为"通用修复：规划→执行→验证 一站式"
3. Claude 平台范围内 `grep -r "remediation-planner"` 和 `grep -r "fix-retest"` 零命中
4. `gates.ts` GATE_AGENT_GUIDE Gate C2 can_spawn 不含 `fix-retest`，含 `remediation-expert`
5. `agent-registry.ts` 扫描结果不含 `remediation-planner` / `fix-retest` 条目
6. 所有 TDD 测试（Red→Green→Refactor）全部通过
7. remediation-expert.md 保留原有工具集（Read/Write/Edit/Bash/Glob/Grep/Skill）和 model（deepseek-v4-flash）
### test_strategy: tdd
### handoff_notes:
- TDD Red 阶段先写 2 个测试：（1）`GATE_AGENT_GUIDE['Gate C2'].can_spawn` 不含 `fix-retest` 且含 `remediation-expert`；（2）`GATE_AGENT_GUIDE` 全文不含 `remediation-planner`
- 测试用例追加到 `tests/gates.test.ts`，不新建测试文件
- `review-fix-optimize.md` 中有 3 处 `remediation-planner` 需要替换，注意一处可能是变量名引用
- `api-test-expert.md` 中 3 处 `fix-retest` 分布在"核心约束"、"协作"、"不负责"三处
### escalation_rule: 如需修改 OpenCode/Codex 文件中任何 remediation 相关引用，必须先回编排者；若 GATE_AGENT_GUIDE 变更导致 pipeline_guide 返回错误，立即停止并报告

---

### task_id: TASK-004
### task_name: skill-assignment-expert 新增
### requirement_ids: REQ-041
### owner: backend-dev-expert
### objective: 新建 `skill-assignment-expert` Agent 模板，在 Gate C 阶段介入分配技能，同步注册到 agent-registry.ts / gates.ts / AGENTS.md。
### in_scope:
- **新建模板**: `src/templates/platforms/claude/agents/skill-assignment-expert.md`
  - `name: skill-assignment-expert`
  - `description`: "技能分配专家——在 Gate C 阶段分析任务/规划文档，为每个子 Agent 输出技能分配清单"
  - `model: deepseek-v4-flash`, `effort: max`
  - `tools: Read, Write, Bash, Glob, Grep, Skill`
  - 工作流位置：Gate C 阶段，planner 产出执行计划后
  - 输入：编排者传入完整 `@skill-name` 清单 + 任务文档 + 规划文档
  - 输出：`docs/<YYYY>-<MM>-<DD>/skills/skill-assignment.md`
  - 分配逻辑：按任务类型（DDD/TDD/直接开发）、领域（前端/后端/移动端/架构）、风险等级决定技能组合
  - `@behavioral-guidelines` 始终作为基座，不纳入分配清单
- **引擎注册**: `agent-registry.ts` CATEGORY_RULES 支撑类 keys 增加 `'skill-assignment'`
- **Gate 注册**: `gates.ts` GATE_AGENT_GUIDE Gate C 的 can_spawn 增加 `'skill-assignment-expert'`，note 更新
- **文档同步**: `AGENTS.md` 智能体体系增加条目
### out_of_scope:
- 不实现技能分配的实际逻辑（由 skill-assignment-expert 自身完成）
- 不修改其他 Agent 模板的 skills frontmatter（由 TASK-006 负责）
- 不修改 pipeline_guide MCP 工具（由 TASK-008 负责）
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `src/templates/platforms/claude/agents/skill-assignment-expert.md`（新建）
- `src/engine/agent-registry.ts`
- `src/engine/gates.ts`
- `AGENTS.md`
### forbidden_paths:
- `src/templates/platforms/opencode/`、`src/templates/platforms/codex/`
- `src/engine/server.ts`
- `web/`
- `.claude/`
### dependencies:
- `agent-registry.ts` 当前状态（依赖 TASK-003 完成后的版本）
- `gates.ts` 当前状态（依赖 TASK-003 完成后的版本）
- `AGENTS.md` 当前状态（依赖 TASK-003 完成后的版本）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-006]
### wait_for: [TASK-003]
### acceptance_criteria:
1. `skill-assignment-expert.md` 模板存在且结构完整（含 name/description/model/effort/tools + 工作流位置 + 输入输出规范）
2. `agent-registry.ts` 中 `skill-assignment-expert` 被分类为"支撑"（CATEGORY_RULES 中 `'skill-assignment'` 匹配）
3. `gates.ts` Gate C 的 `can_spawn` 包含 `'skill-assignment-expert'`
4. `gates.ts` Gate C 的 `note` 含"技能分配"描述
5. AGENTS.md 智能体体系有 `skill-assignment-expert` 条目
### test_strategy: manual_only
### handoff_notes:
- 模板需包含完整的分配逻辑表格（类似本计划文档的"技能分配规则"表），供 skill-assignment-expert 执行时参考
- Gate C note 更新为"spawn planner 产出执行计划，然后 spawn skill-assignment-expert 分配技能"
- AGENTS.md 中可放入"规划评审类"或新建小分类
### escalation_rule: 如需修改 server.ts（pipeline_guide），必须回编排者；这是 TASK-008 的职责范围

---

### task_id: TASK-005
### task_name: browser-use-expert 新增
### requirement_ids: REQ-042
### owner: backend-dev-expert
### objective: 新建 `browser-use-expert` Agent 模板，注册为独立的"浏览器"分类，集成到 Gate C2 阶段。
### in_scope:
- **新建模板**: `src/templates/platforms/claude/agents/browser-use-expert.md`
  - `name: browser-use-expert`
  - `description`: "自主探索式浏览器操作——自动发现 UI bug、探索未知页面、执行探索性测试、收集页面证据"
  - `model: deepseek-v4-pro`, `effort: max`
  - `tools: Read, Write, Edit, Bash`
  - 加载技能：`@behavioral-guidelines`、`@browser-use`、`@browser-testing`
  - 与 `browser-test-expert` 的关系：互补（browser-test-expert 结构化测试，browser-use-expert 探索式操作）
- **引擎注册**: `agent-registry.ts` CATEGORY_RULES 新增 `{ cat: '浏览器', keys: ['browser-use'] }`，插入到"移动端"之后
- **Gate 注册**: `gates.ts` GATE_AGENT_GUIDE Gate C2 的 can_spawn 增加 `'browser-use-expert'`
- **文档同步**: `AGENTS.md` 智能体体系增加 `browser-use-expert`
### out_of_scope:
- 不修改 `browser-use` skill 模板（已存在）
- 不修改 `browser-test-expert.md` 模板
- 不修改 OpenCode/Codex 平台
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `src/templates/platforms/claude/agents/browser-use-expert.md`（新建）
- `src/engine/agent-registry.ts`
- `src/engine/gates.ts`
- `AGENTS.md`
### forbidden_paths:
- `src/templates/platforms/claude/skills/browser-use/`
- `src/templates/platforms/opencode/`、`src/templates/platforms/codex/`
- `src/engine/server.ts`
- `web/`
### dependencies:
- `agent-registry.ts` 当前状态（依赖 TASK-004 完成后的版本）
- `gates.ts` 当前状态（依赖 TASK-004 完成后的版本）
- `AGENTS.md` 当前状态（依赖 TASK-004 完成后的版本）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-007]（TASK-007 与 TASK-005 共享 AGENTS.md，但 TASK-005 在 Batch 4，TASK-007 在 Batch 5——实际不并行）
### wait_for: [TASK-004]
### acceptance_criteria:
1. `browser-use-expert.md` 模板存在且结构完整
2. `agent-registry.ts` CATEGORY_RULES 含"浏览器"分类，`browser-use-expert` 正确归类
3. ICON_MAP 中 `'browser': 'globe'` 自动匹配 `browser-use-expert`（文件名含 `browser` 子串）
4. `gates.ts` Gate C2 的 `can_spawn` 包含 `'browser-use-expert'`
5. `gates.ts` Gate C2 的 `note` 增加探索式测试步骤
6. AGENTS.md 有 `browser-use-expert` 条目
### test_strategy: manual_only
### handoff_notes:
- CATEGORY_RULES 新增分类时注意插入位置：在"移动端"规则之后、"实现"规则之前
- `browser-use` 子串会匹配到 ICON_MAP 的 `'browser': 'globe'`，自动获得 globe 图标，无需修改 ICON_MAP
- Gate C2 note 当前为详细的多步骤描述（行 116），新增探索式测试为并行步骤
### escalation_rule: 如需修改 ICON_MAP 或改变现有分类排序逻辑，必须先回编排者

---

### task_id: TASK-006
### task_name: 动态 @skill-name 技能加载体系
### requirement_ids: REQ-044
### owner: remediation-expert
### objective: 为 Execution Packet 建立 `required_skills` 字段规范，从 3 个 Agent 模板中移除硬编码的 `skills:` frontmatter，改为按 Execution Packet 动态加载。
### in_scope:
- `src/templates/platforms/claude/skills/planning-and-task-breakdown/SKILL.md`：增加"Execution Packet 中 required_skills 字段"说明
- `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md`：在"对于子代理"实施指令中增加动态技能加载指令
- `.claude/skills/behavioral-guidelines/SKILL.md`：同步上述 behavioral-guidelines 变���
- `src/templates/platforms/claude/agents/api-test-expert.md`：移除 `skills:` frontmatter（当前含 `behavioral-guidelines` 和 `verification-before-completion`），增加提示文字
- `src/templates/platforms/claude/agents/test-executor.md`：移除 `skills:` frontmatter（当前含 `agent-browser` 和 `browser-testing`），增加提示文字
- `src/templates/platforms/claude/agents/test-doc-writer.md`：移除 `skills:` frontmatter（当前含 `browser-testing` 和 `source-driven-development`），增加提示文字
### out_of_scope:
- `fix-retest.md` 的 `skills:` frontmatter（已被 TASK-003 删除）
- 不修改 planner 或任何编排 Agent 的模板
- 不实现 `required_skills` 的运行时解析逻辑（由编排者引擎层实现）
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `src/templates/platforms/claude/skills/planning-and-task-breakdown/SKILL.md`
- `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md`
- `.claude/skills/behavioral-guidelines/SKILL.md`
- `src/templates/platforms/claude/agents/api-test-expert.md`
- `src/templates/platforms/claude/agents/test-executor.md`
- `src/templates/platforms/claude/agents/test-doc-writer.md`
### forbidden_paths:
- `src/engine/`（任何引擎文件）
- `src/templates/platforms/opencode/`、`src/templates/platforms/codex/`
- 以上 3 个 Agent 模板之外的其他 Agent 模板（不批量移除 skills）
- `AGENTS.md`
### dependencies:
- `behavioral-guidelines/SKILL.md` 当前状态（依赖 TASK-001 完成后的版本，准则 5 已删除）
- `api-test-expert.md` 当前状态（依赖 TASK-003 完成后的版本，fix-retest 引用已更新）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-004]
### wait_for: [TASK-001, TASK-003]
### acceptance_criteria:
1. `planning-and-task-breakdown/SKILL.md` 说明 `required_skills` 字段的用法和格式
2. `behavioral-guidelines/SKILL.md`（模板+用户级）"对于子代理"部分增加"子 Agent 启动后按 Execution Packet 的 required_skills 字段逐一调用 Skill()"
3. `api-test-expert.md` 不再包含 `skills:` frontmatter 字段，增加了动态加载提示
4. `test-executor.md` 不再包含 `skills:` frontmatter 字段，增加了动态加载提示
5. `test-doc-writer.md` 不再包含 `skills:` frontmatter 字段，增加了动态加载提示
6. 模板文件格式正确（`---` frontmatter 分隔线仍然完整）
### test_strategy: manual_only
### handoff_notes:
- 移除 `skills:` 时注意保留 `---` 分隔线完整
- 增加的提示文字示例："> 技能按 Execution Packet 的 required_skills 字段动态加载，不再硬编码于模板"
- `planning-and-task-breakdown/SKILL.md` 中已有的 Execution Packet 说明可能需要补充到对应章节
- 两份 behavioral-guidelines 文件需用 diff 确认一致
### escalation_rule: 如需修改其他 Agent 模板或引擎文件，必须先回编排者

---

### task_id: TASK-007
### task_name: visual-primitives MCP 提示全局注入
### requirement_ids: REQ-045
### owner: remediation-expert
### objective: 在 behavioral-guidelines 中新增"准则 6：多模态回退"，在 AGENTS.md 中新增第 19 条关键约束，提示纯文本模型使用 visual-primitives-mcp。
### in_scope:
- `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md`：新增"准则 6：多模态回退"
  - 内容：当任务涉及图像/截图而模型不支持多模态时，提示使用 `visual-primitives-mcp` 提供的 `visual_describe`/`visual_locate`/`visual_ocr` 工具
  - 措辞为"建议"而非"强制"
- `AGENTS.md`：关键约束章节新增第 19 条（编号 19），内容同准则 6
- 确保准则编号连续：1→2→3→4→5（注释语言）→6（多模态回退）
### out_of_scope:
- 不逐个修改 47 个 Agent 模板（通过 behavioral-guidelines 全局覆盖）
- 不修改 `.claude/skills/behavioral-guidelines/SKILL.md`（TASK-006 最后同步，本轮模板层为准）
- 不修改 OpenCode/Codex 平台
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md`
- `AGENTS.md`
### forbidden_paths:
- `src/engine/`
- `src/templates/platforms/opencode/`、`src/templates/platforms/codex/`
- 其他 skill 目录
### dependencies:
- `behavioral-guidelines/SKILL.md` 当前状态（依赖 TASK-006 完成后的版本，准则 5 是注释语言约定）
- `AGENTS.md` 当前状态（依赖 TASK-005 完成后的版本，Agent 列表已含 browser-use-expert）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-008, TASK-010]
### wait_for: [TASK-005, TASK-006]
### acceptance_criteria:
1. `behavioral-guidelines/SKILL.md`（模板层）新增准则 6（多模态回退），编号连续无跳号
2. 准则 6 措辞为建议性（"可以考虑"、"建议使用"），非强制性
3. AGENTS.md "关键约束"章节含第 19 条"visual-primitives-mcp"相关约束
4. AGENTS.md 约束编号从 18 顺延（当前第 18 条为"产物目录规范"）
5. `grep -r "准则 6" src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md` 命中且内容正确
### test_strategy: manual_only
### handoff_notes:
- AGENTS.md 修改位置在"关键约束"章节末尾（第 18 条之后），新增第 19 条
- 准则 6 放在"相关技能"章节之前、"生效标志"章节之后的位置
- 注意 AGENTS.md 已被多个前置 TASK 修改，读取时确认当前状态
### escalation_rule: 如需修改约束章节的前 18 条内容，必须先回编排者

---

### task_id: TASK-008
### task_name: Gate 流水线流程优化
### requirement_ids: REQ-047
### owner: backend-dev-expert
### objective: 全面更新 GATE_AGENT_GUIDE（5 个 Gate 的 can_spawn），在 pipeline_guide MCP 工具返回中增加 Gate C 的技能分配提示。
### in_scope:
- **GATE_AGENT_GUIDE 变更**（`src/engine/gates.ts`）:
  - Gate A: `docs-research-expert` → `external-resource-expert`；note 增加"外部资料搜索"
  - Gate C: can_spawn 增加 `'skill-assignment-expert'`；note 增加技能分配步骤
  - Gate C2: 移除 `'fix-retest'`，替换为 `'remediation-expert'`；增加 `'browser-use-expert'`；note 更新
  - Gate D: note 不再提及 remediation-planner（can_spawn 列表本身不变）
  - Gate E: can_spawn 增加 `'docs-engineer'`；note 增加"文档同步确认"
- **pipeline_guide MCP 工具**（`src/engine/server.ts` 第 632 行 return 对象）:
  - 当 `cur === 'Gate C'` 时，在返回 JSON 中增加 `skill_assignment_hint` 字段
- 验证 Gate 序列不变（PIPELINE_DEFS 未修改）
### out_of_scope:
- 不修改 PIPELINE_DEFS 中的 gates 数组
- 不修改 GATE_OPERATIONS（Gate C-impl 的 allow 操作不变）
- 不修改 GATE_CHECKS、GATE_ENTRY_CONDITIONS、MAX_RETRY
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `src/engine/gates.ts`
- `src/engine/server.ts`（仅 pipeline_guide 工具函数体，L619-645）
- `tests/gates.test.ts`（新增 TDD 测试用例）
### forbidden_paths:
- `src/engine/agent-registry.ts`
- `src/engine/db.ts`
- `src/templates/`
- `web/`
- `AGENTS.md`
### dependencies:
- `gates.ts` 当前状态（依赖 TASK-005 完成后的版本，含 browser-use-expert/browser 分类）
- `server.ts` 当前状态
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `test-driven-development`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-007, TASK-010]
### wait_for: [TASK-005]
### acceptance_criteria:
1. GATE_AGENT_GUIDE 的 5 个 Gate（A/C/C2/D/E）can_spawn 列表与需求表一致
2. `gates.ts` 中不再出现 `'docs-research-expert'`、`'remediation-planner'`、`'fix-retest'` 字符串
3. `pipeline_guide` 工具在 Gate C 时返回 `skill_assignment_hint` 字段，值为提示编排者调用 skill-assignment-expert 的文本
4. Gate 序列结构不变（PIPELINE_DEFS gates 数组未修改）
5. 所有 TDD 测试通过（Red→Green→Refactor，共 5 个 Red 用例）
### test_strategy: tdd
### handoff_notes:
- TDD Red 阶段 5 个测试：（1）Gate A can_spawn 含 external-resource-expert 不含 docs-research-expert；（2）Gate C can_spawn 含 skill-assignment-expert；（3）Gate C2 can_spawn 含 browser-use-expert 和 remediation-expert 不含 fix-retest；（4）Gate E can_spawn 含 docs-engineer；（5）pipeline_guide 在 Gate C 时返回 skill_assignment_hint
- `skill_assignment_hint` 值示例：`"Gate C 通过后请先调用 skill-assignment-expert 为各子 Agent 分配技能清单，再进入 Gate C-impl"`
- 测试追加到 `tests/gates.test.ts`
### escalation_rule: 如需修改 PIPELINE_DEFS 或 GATE_OPERATIONS，必须先回编排者确认

---

### task_id: TASK-009
### task_name: docs-engineer 角色正式化
### requirement_ids: REQ-039
### owner: backend-dev-expert
### objective: 扩展 `docs-engineer` 模板的职责描述，将其从"支撑"分类提升为独立的"文档支持"分类。
### in_scope:
- 编辑 `src/templates/platforms/claude/agents/docs-engineer.md`：
  - 职责扩展：所有实现完成后（Gate E 前）检查并同步项目级文档
  - 产出路径更新：`.jarvis/docs-sync-report.md`（可选报告）
  - 明确"直接修改根目录文档以修复不一致"
  - description 更新为体现 Gate E 介入时机
- 编辑 `src/engine/agent-registry.ts`：
  - CATEGORY_RULES 新增 `{ cat: '文档支持', keys: ['docs-engineer'] }`
  - 插入到"支撑"规则之后、"实现"规则之前
  - 确保 `docs-engineer` 不再回退到"支撑"兜底
- 编辑 `AGENTS.md`：探索/支撑类增加 docs-engineer；或增加独立"文档支持"分类
### out_of_scope:
- 不修改 docs-engineer 的工具集和 model
- 不修改 Gate E 的 GATE_AGENT_GUIDE（已由 TASK-008 完成）
- 不新增文件
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `src/templates/platforms/claude/agents/docs-engineer.md`
- `src/engine/agent-registry.ts`
- `AGENTS.md`
### forbidden_paths:
- `src/engine/gates.ts`
- `src/engine/server.ts`
- `src/templates/platforms/opencode/`、`src/templates/platforms/codex/`
- `web/`
### dependencies:
- `gates.ts` 当前状态（Gate E 已含 docs-engineer，依赖 TASK-008 完成）
- `agent-registry.ts` 当前状态（依赖 TASK-008 完成后的版本）
- `AGENTS.md` 当前状态（依赖 TASK-007 完成后的版本）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-010]
### wait_for: [TASK-008]
### acceptance_criteria:
1. `docs-engineer.md` description 包含 Gate E 介入时机和文档同步职责
2. `docs-engineer.md` 模板中产出路径含 `.jarvis/docs-sync-report.md`
3. `agent-registry.ts` 中 `docs-engineer` 被分类为"文档支持"（非兜底"支撑"）
4. AGENTS.md 智能体体系有 docs-engineer 的显式条目
5. `grep -r "文档支持" src/engine/agent-registry.ts` 命中新分类规则
### test_strategy: manual_only
### handoff_notes:
- `docs-engineer.md` 当前 template 已有完整的描述（当前 focus 在 Gate E 文档检查），新描述扩展为更明确的"完成文档同步 + 可选报告"
- CATEGORY_RULES 中新增"文档支持"规则放在"支撑"之后，"实现"之前，确保 docs-engineer 优先匹配"文档支持"而非兜底"支撑"
- AGENTS.md 中可放在"探索/支撑类"或独立分类
### escalation_rule: 如需修改 Gate E 的 GATE_AGENT_GUIDE 或其他 Gate 结构，必须先回编排者

---

### task_id: TASK-010
### task_name: Web 面板适配新流程
### requirement_ids: REQ-048
### owner: frontend-dev-expert
### objective: 更新 Web 面板的 Dashboard Gate 描述、Agents 角色匹配逻辑、流水线类型匹配逻辑，反映新增/重命名/删除的 Agent。
### in_scope:
- `web/src/pages/Dashboard.tsx` `GATE_DESCRIPTIONS` 对象（L35-46）：
  - Gate A: "至少1个需求文档..." → "至少1个需求文档，外部资料搜索与探索已完成"
  - Gate C: "计划文档含..." → "计划文档含parallel_batches+Execution Packet，技能分配已完成"
  - Gate C2: "测试全部通过..." → "测试全部通过，探索式浏览器测试已完成"
  - Gate E: "安全审计+上线..." → "安全审计+上线检查+文档同步确认+回滚预案就绪"
- `web/src/pages/Agents.tsx` `matchFunctionRole` 函数（L30-61）：
  - '测试者' case：移除 `'fix-retest'` 匹配
  - '专家' case：考虑新增 `'skill-assignment'` 匹配，或新增独立角色
  - 新增 `'browser-use-expert'` 到合适角色（如'测试者'或新建'浏览器'角色）
- `web/src/pages/matchPipelineType.ts`（全文件 L1-55）：
  - '全流程' case：`'docs-research'` → `'external-resource'`；新增 `'skill-assignment'`、`'browser-use'`
  - '轻量' case：移除 `'remediation-planner'`、`'fix-retest'`
### out_of_scope:
- 不新增路由或页面
- 不修改后端 API
- 不修改 Layout.tsx（除非需要更新静态分类标签——先读取确认后决定）
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `web/src/pages/Dashboard.tsx`
- `web/src/pages/Agents.tsx`
- `web/src/pages/matchPipelineType.ts`
- `web/src/components/Layout.tsx`（仅在需要更新静态标签时读取和修改）
### forbidden_paths:
- `src/engine/`（任何引擎文件）
- `src/templates/`（任何模板文件）
- `AGENTS.md`
- `web/src/api.ts`、`web/src/App.tsx`、`web/src/main.tsx`
### dependencies:
- Agent 列表已稳定（依赖 TASK-002/TASK-004/TASK-005 都已完成——均完成于 Batch 4 之前）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-007, TASK-008]
### wait_for: [TASK-005]
### acceptance_criteria:
1. Dashboard GATE_DESCRIPTIONS 与 `gates.ts` GATE_AGENT_GUIDE 语义一致
2. Agents 页面 `matchFunctionRole` 不将已删除 Agent（`fix-retest`）匹配到任何角色
3. Agents 页面正确显示新增 Agent（`external-resource-expert`、`skill-assignment-expert`、`browser-use-expert`）
4. `matchPipelineType` 中 `'全流程'` 类型不再含 `'docs-research'`
5. `matchPipelineType` 中 `'轻量'` 类型不再含 `'remediation-planner'`、`'fix-retest'`
6. `npm run typecheck` 通过（在 `web/` 目录执行）
7. 无新增路由
### test_strategy: test_after
### handoff_notes:
- `matchFunctionRole` 的 '专家' case 当前匹配 `idIncludes('expert')`，已自动覆盖新增 Agent（skill-assignment-expert、browser-use-expert 均含 'expert'）
- `browser-use-expert` 的 `browser` 子串可能匹配到 '测试者' case（`['test', 'browser-test', ...]`），需要确认是否需要单独处理
- `external-resource-expert` 不匹配任何现有 case，会落入 `default: true`
- 建议验证：运行 Web 面板，切换角色筛选查看新增 Agent 显示正确
### escalation_rule: 如需修改 GATE_LABELS 或 GATE_COLORS 常量，必须先回编排者；这些常量的语义变更可能影响 Dashboard 布局

---

### task_id: TASK-011
### task_name: 文档驱动的子 Agent 体系
### requirement_ids: REQ-050
### owner: remediation-expert
### objective: 在 AGENTS.md 中新增"文档驱动"章节，定义 4 类 Agent 的文档产出要求。
### in_scope:
- 编辑 `AGENTS.md`：在"技能体系"章节之后、"智能体体系"章节之前（或合适的插入位置），新增"文档驱动"章节
- 章节内容：
  1. 实现类 Agent（`-dev-expert`/`-api-expert`/`-logic-expert`/`-data-expert`/`-ui-expert`/`-state-expert`/平台全栈）：产出 `<TASK-ID>-completion.md`，含完成标准逐项核查、未覆盖边缘情况、已知技术债务
  2. 关键流程 Agent（`planner`/`task-design`/`skill-assignment-expert`/`external-resource-expert`）：产出对应阶段文档即为完成文档
  3. 审查类 Agent：产出审查报告即为完成文档
  4. 测试类 Agent：产出测试报告即为完成文档
  5. 完成文档存放路径：`docs/<YYYY>-<MM>-<DD>/<phase>/`
- 整合检查：确认前 7 个 TASK（TASK-002~009）对 AGENTS.md 的修改无冲突
### out_of_scope:
- 不创建实际的完成文档模板
- 不修改其他任何文件
- 不修改 AGENTS.md 的约束章节
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `AGENTS.md`
### forbidden_paths:
- 所有其他文件
### dependencies:
- `AGENTS.md` 当前状态（依赖 TASK-009 完成后的版本，含 docs-engineer 正式化）
- Gate 流水线已稳定（依赖 TASK-008）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: []
### wait_for: [TASK-009]
### acceptance_criteria:
1. AGENTS.md 包含"文档驱动"章节
2. 章节明确定义 4 类 Agent 的文档产出要求
3. 文档存放路径规范明确：`docs/<YYYY>-<MM>-<DD>/<phase>/`
4. 新增章节风格与 AGENTS.md 现有章节（如"技能体系"、"智能体体系"）一致
5. 确认前 7 个 TASK 对 AGENTS.md 的修改整合后无冲突（逐条验证 Agent 列表、约束编号）
### test_strategy: manual_only
### handoff_notes:
- 此为 AGENTS.md 的第 8 次串行修改（最终一致性检查由你负责）
- 验证清单：（1）Agent 列表不含旧名称；（2）约束编号 1-19 连续；（3）浏览器测试工作流不再引用 fix-retest；（4）所有新增 Agent 有对应条目
- 章节建议放在"技能体系"和"智能体体系"之间
### escalation_rule: 如发现前面 TASK 的 AGENTS.md 修改有冲突或遗漏，记录到 handoff_notes 但不自行修复——回编排者决策

---

### task_id: TASK-012
### task_name: 模板与用户级技能同步 + 发布
### requirement_ids: REQ-049
### owner: infra-deploy-expert
### objective: 版本号递增、提交打 Tag、推送触发 GitHub Actions 自动发布 npm，然后更新用户级技能和重启引擎。
### in_scope:
- 版本号递增：`package.json` version 从 `3.32.1` → `3.33.0`（minor bump，流水线+Agent 体系全面优化）
- 同步文档统计：`AGENTS.md` 和 `README.md` 中的 Agent 数量、技能数量更新
- 轮次提交和 Tag：
  ```bash
  git add <changed-files>
  git commit -m "feat: 流水线与智能体体系全面优化 — Agent去重/重命名/新增 + Gate优化 + 动态技能加载 + Web面板同步"
  git tag -a v3.33.0 -m "v3.33.0 - 流水线与智能体体系全面优化"
  git push origin main && git push origin v3.33.0
  ```
- 等待 GitHub Actions CI + Release workflow 完成
- 全局引擎更新：`npm i -g jarvis-agent-factory@latest`
- 工作区更新：`jarvis update --workspace`
- 工作区引擎重启：`jarvis engine restart`
- 验证：`npm view jarvis-agent-factory version` + `jarvis engine status` + Web 面板
### out_of_scope:
- 不手动 `npm publish`（由 GitHub Actions Release workflow 自动执行）
- 不修改 GitHub Actions workflow 文件
- 不创建新的 CHANGELOG 条目（由 release workflow 自动生成）
### input_documents:
- `E:\CodeStore\jarvis\docs\2026-05-11\requirements\REQ-pipeline-optimization.md`
- `E:\CodeStore\jarvis\docs\2026-05-11\tasks\REQ-pipeline-optimization-tasks.md`
### allowed_paths:
- `package.json`
- `AGENTS.md`（仅统计数字更新）
- `README.md`（版本号、特性列表、统计数字）
### forbidden_paths:
- `src/engine/`（任何引擎文件）
- `src/templates/`（任何模板文件）
- `web/`（任何前端文件）
- `.github/workflows/`
### dependencies: 所有 TASK-001 ~ TASK-011 全部完成
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `shipping-and-launch`
- `git-workflow-and-versioning`
- `finishing-a-development-branch`
### parallel_group: []
### wait_for: [TASK-011]
### acceptance_criteria:
1. `package.json` version 为 `3.33.0`
2. Tag `v3.33.0` 推送到 GitHub origin
3. npm publish 成功（`npm view jarvis-agent-factory version` 返回 `3.33.0`）
4. `jarvis update --workspace` 成功（`.claude/skills/behavioral-guidelines/SKILL.md` 与模板层一致）
5. `jarvis engine restart` 无错误日志
6. `jarvis engine status` 输出正常
7. Web 面板显示新增/重命名 Agent 正确
### test_strategy: manual_only
### handoff_notes:
- 提交前确认 `git status` 干净（无未暂存变更、无意外文件）
- 确认所有 test 通过（`npm test`）后再提交
- AGENTS.md 统计数字更新：Agent 总数约 47（原）- 2（删除）+ 3（新增）= 48（含重命名）
- README.md 特性列表追加"动态技能加载"、"Agent 体系优化"等条目
- 若 GitHub Actions Release 失败，检查 logs 并重试（不要手动 npm publish）
### escalation_rule: 若 GitHub Actions Release workflow 持续失败无法自动修复，回编排者决策是否手动发布

---

## 13. parallel_batches

### Batch 1（无依赖，可同时启动）
- TASK-001 → subagent_type: remediation-expert
- TASK-002 → subagent_type: backend-dev-expert

### Batch 2（依赖 Batch 1 中 TASK-002 完成）
- TASK-003 → subagent_type: backend-dev-expert

### Batch 3（依赖 TASK-001 + TASK-003 完成；可同时启动）
- TASK-004 → subagent_type: backend-dev-expert
- TASK-006 → subagent_type: remediation-expert

### Batch 4（依赖 TASK-004 完成）
- TASK-005 → subagent_type: backend-dev-expert

### Batch 5（依赖 TASK-005 + TASK-006 完成；可同时启动）
- TASK-007 → subagent_type: remediation-expert
- TASK-008 → subagent_type: backend-dev-expert
- TASK-010 → subagent_type: frontend-dev-expert

### Batch 6（依赖 TASK-008 完成）
- TASK-009 → subagent_type: backend-dev-expert

### Batch 7（依赖 TASK-009 完成）
- TASK-011 → subagent_type: remediation-expert

### Batch 8（依赖所有 TASK-001 ~ TASK-011 完成）
- TASK-012 → subagent_type: infra-deploy-expert

## 14. plan patch / contract change request 触发条件

以下情况任一发生，实现 Agent 必须立即停止并提交 plan patch：

| 触发条件 | 回退对象 |
|---------|---------|
| 文件实际路径与 allowed_paths 不一致（如模板文件在 `.claude/agents/` 而非 `src/templates/`） | 编排者 |
| `gates.ts` 中 GATE_AGENT_GUIDE 结构与预期不符（如 Gate 名称不一致、字段名不同） | 编排者 |
| TDD 测试编写时发现现有测试文件结构不支持新测试用例追加 | 编排者 |
| 删除/重命名文件后发现 OpenCode/Codex 平台有隐式依赖（需同步修改） | 编排者 |
| AGENTS.md 串行修改时发现前置 TASK 的修改与当前 TASK 冲突（需协调顺序） | 编排者 |
| `pipeline_guide` 工具返回结构变更后发现前端或其他消费者依赖旧字段 | 编排者 |
| npm publish 或 GitHub Actions Release 工作流失败且无法自动修复 | 编排者 |

## 15. 推荐的下一步

1. **编排者 spawn Batch 1**：TASK-001（remediation-expert）+ TASK-002（backend-dev-expert）并行启动
2. Batch 1 完成后，spawn **TASK-003**（backend-dev-expert，TDD 先行）
3. Batch 2 完成后，spawn **Batch 3**：TASK-004（backend-dev-expert）+ TASK-006（remediation-expert）并行
4. 依序推进至 Batch 8 完成
5. TASK-012 发布完成后，验证 Web 面板 + 引擎状态
6. 切换至 `dev` 分支继续后续开发

---

> 计划生成时间：2026-05-11 | 预计总批次数：8 | 预计总变更行数：~870 | 预计并行机会：3 处（Batch 1/3/5）
