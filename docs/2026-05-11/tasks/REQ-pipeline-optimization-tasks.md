# 任务文档 -- 贾维斯流水线与智能体体系全面优化

> 日期：2026-05-11 | 源需求：[REQ-pipeline-optimization.md](../requirements/REQ-pipeline-optimization.md)

---

## 一、任务概览

| TASK | 映射 REQ | 名称 | 类型 | 优先级 | 粒度 |
|------|----------|------|------|--------|------|
| TASK-001 | REQ-046 | behavioral-guidelines 删除准则5 | 直接开发 | P0 | XS |
| TASK-002 | REQ-040 | external-resource-expert 重命名 | 直接开发 | P0 | S |
| TASK-003 | REQ-043 | Agent 职责去重与边界清晰化 | TDD | P0 | M |
| TASK-004 | REQ-041 | skill-assignment-expert 新增 | 直接开发 | P1 | M |
| TASK-005 | REQ-042 | browser-use-expert 新增 | 直接开发 | P1 | S |
| TASK-006 | REQ-044 | 动态 @skill-name 技能加载体系 | 直接开发 | P1 | S |
| TASK-007 | REQ-045 | visual-primitives MCP 全局注入 | 直接开发 | P1 | S |
| TASK-008 | REQ-047 | Gate 流水线流程优化 | TDD | P1 | M |
| TASK-009 | REQ-039 | docs-engineer 角色正式化 | 直接开发 | P2 | S |
| TASK-010 | REQ-048 | Web 面板适配新流程 | 直接开发 | P2 | M |
| TASK-011 | REQ-050 | 文档驱动的子 Agent 体系 | 直接开发 | P2 | S |
| TASK-012 | REQ-049 | 模板与用户级技能同步 + 发布 | 直接开发 | P2 | XS |

> 总计 12 个任务，覆盖 11 个 REQ，预估变更 ~1930 行，单轮次交付。

---

## 二、依赖关系与并行组

### 2.1 两条独立跟踪线

```
跟踪线 L1（行为准则）：TASK-001 → TASK-006 → TASK-007
         共享文件: behavioral-guidelines/SKILL.md (template + user-level)

跟踪线 L2（引擎核心 + AGENTS.md）：TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-008 → TASK-009 → TASK-011
         共享文件: agent-registry.ts, gates.ts, AGENTS.md

交叉依赖:
  - TASK-010（Web 面板）依赖 L2 中的 TASK-002/004/005（Agent 列表稳定）
  - TASK-012（发布）依赖所有任务完成
```

### 2.2 推荐执行批

| 批次 | 任务 | 并行？ | 理由 |
|------|------|--------|------|
| Batch 1 | TASK-001 | 与 L2 并行 | 仅改 behavioral-guidelines，不涉及引擎 |
| Batch 1 | TASK-002 | 与 L1 并行 | 仅改 agent 模板 + 引擎 + AGENTS.md |
| Batch 2 | TASK-003 | 串行（L2 内） | 依赖 TASK-002 完成后的 agent-registry.ts + gates.ts |
| Batch 3 | TASK-006 | 与 L2 并行 | 依赖 TASK-001 完成后的 behavioral-guidelines |
| Batch 3 | TASK-004 | 串行（L2 内） | 与 TASK-006 无共享文件，可并行 |
| Batch 4 | TASK-007 | 串行（L1 内） | 依赖 TASK-006 完成后的 behavioral-guidelines |
| Batch 4 | TASK-005 | 串行（L2 内） | 与 TASK-007 无共享文件，可并行 |
| Batch 5 | TASK-008 | 串行（L2 内） | 依赖 TASK-005 完成后的 agent-registry.ts + gates.ts |
| Batch 6 | TASK-009 | 串行（L2 内） | 依赖 TASK-008（Gate E 含 docs-engineer） |
| Batch 6 | TASK-010 | 并行 | 依赖 TASK-002/004/005（Agent 列表稳定），与 TASK-009 无共享文件 |
| Batch 7 | TASK-011 | 串行（L2 内） | 依赖 TASK-008（稳定流程），与 AGENTS.md 最后更新 |
| Batch 8 | TASK-012 | 最后 | 依赖所有任务完成 |

> 最优路径：L1 和 L2 并行推进，交叉依赖在 Batch 6 会合。预计 4-5 轮 Serial Batch 即可完成。

---

## 三、共享区域文件所有权与串行约束

以下文件被多个 TASK 修改，**必须严格按顺序执行**：

| 文件 | 修改顺序（按 TASK 编号） | 说明 |
|------|--------------------------|------|
| `src/engine/agent-registry.ts` | TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-009 | CATEGORY_RULES 数组逐次累加变更 |
| `src/engine/gates.ts` | TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-008 | GATE_AGENT_GUIDE 逐步替换 Agent 引用 |
| `AGENTS.md` | TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-007 → TASK-009 → TASK-011 | 7 个 TASK 修改同一文件，最后执行者负责最终一致性检查 |
| `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md` | TASK-001 → TASK-006 → TASK-007 | 准则删除→动态加载→多模态注入 |
| `.claude/skills/behavioral-guidelines/SKILL.md` | TASK-001（同步）+ TASK-006（同步） | 与模板层同步 |

---

## 四、任务详细分解

---

### TASK-001

| 属性 | 值 |
|------|-----|
| task_id | TASK-001 |
| task_name | behavioral-guidelines 删除准则5 |
| requirement_ids | [REQ-046] |
| type | 直接开发 |
| priority | P0 |
| estimated_lines | ~30 |
| test_strategy | manual_only |
| dependencies | 无 |
| parallel_group | 可与 TASK-002 并行（无共享文件） |
| risk | 低 |

**涉及文件：**

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md` | 编辑 | 删除整个"准则 5：读取平台规范"章节（从 `## 准则 5：读取平台规范` 到 `---` 前）；将原"准则 6：注释语言约定"前移为"准则 5" |
| `.claude/skills/behavioral-guidelines/SKILL.md` | 编辑 | 同步删除准则 5，准则 6 前移为准则 5 |

**完成标准：**

1. 模板层 SKILL.md 中不存在"读取平台规范"或 `.{platform}/rules/*.md` 相关内容
2. 准则编号连续：准则 1→2→3→4→5（注释语言约定），无跳号
3. 用户级 `.claude/skills/behavioral-guidelines/SKILL.md` 与模板层一致
4. OpenCode/Codex 模板中确认无此准则残留（检查不修改）

**注意事项：**
- 删除时注意保留 `---` 分隔线以及后续"生效标志"章节完整
- 准则 5（原准则 6）内容不变，只改编号
- 相关技能引用链接（`code-simplification`/`context-engineering`/`code-standards`）不在此准则范围内，保持不变

---

### TASK-002

| 属性 | 值 |
|------|-----|
| task_id | TASK-002 |
| task_name | external-resource-expert 重命名 |
| requirement_ids | [REQ-040] |
| type | 直接开发 |
| priority | P0 |
| estimated_lines | ~80 |
| test_strategy | test_after |
| dependencies | 无 |
| parallel_group | 可与 TASK-001 并行 |
| risk | 中（影响 6 个文件，含引擎核心 gates.ts + agent-registry.ts） |

**涉及文件：**

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/templates/platforms/claude/agents/docs-research-expert.md` | **删除** | 旧文件删除 |
| `src/templates/platforms/claude/agents/external-resource-expert.md` | **新建** | 从旧模板重写：`name: external-resource-expert`；description 更新为"搜索外部文档+发现开源Skill+版本兼容性建议"；更新职责描述 |
| `src/engine/agent-registry.ts` | 编辑 | CATEGORY_RULES 中 `'docs-research'` → `'external-resource'`（支撑类 keys 数组内） |
| `src/engine/gates.ts` | 编辑 | GATE_AGENT_GUIDE 中 Gate A 的 `'docs-research-expert'` → `'external-resource-expert'`；note 更新"需求澄清阶段，外部资料搜索与探索" |
| `AGENTS.md` | 编辑 | 探索/支撑类列表中 `docs-researcher` → `external-resource-expert` |
| `src/templates/platforms/claude/skills/using-agent-skills/SKILL.md` | 编辑 | 技能-加载者映射表中 `docs-research-expert Agent` → `external-resource-expert Agent`（2 处） |

**完成标准：**

1. `docs-research-expert.md` 文件已删除
2. `external-resource-expert.md` 新建，name/description 正确
3. `grep -r "docs-research" src/` 无命中（Claude 平台范围内）
4. `grep -r "external-resource-expert" src/engine/gates.ts` 有且仅有在 Gate A 的 can_spawn 中
5. `grep -r "external-resource" src/engine/agent-registry.ts` 在 CATEGORY_RULES 支撑类中匹配
6. AGENTS.md 中不再含 `docs-researcher`（Claude 平台视角）
7. `using-agent-skills/SKILL.md` 中不再含 `docs-research-expert`

**注意事项：**
- 新建的 `external-resource-expert.md` 模板需保留原有 behavior-guidelines/find-docs/find-skills 技能加载逻辑
- 职责描述显式增加"发现可用的开源 Agent Skill + 输出版本兼容性建议和安装方案"
- 不修改 OpenCode/Codex 模板中的 `docs-researcher` 或 `api-docs-worker` 引用

---

### TASK-003

| 属性 | 值 |
|------|-----|
| task_id | TASK-003 |
| task_name | Agent 职责去重与边界清晰化 |
| requirement_ids | [REQ-043] |
| type | **TDD**（gates.ts 是引擎核心，GATE_AGENT_GUIDE 变更必须验证 Gate 流程正确性） |
| priority | P0 |
| estimated_lines | ~120 |
| test_strategy | tdd |
| dependencies | [TASK-002] |
| parallel_group | L2 串行链，TASK-002 完成后执行 |
| risk | **高**（删除 2 个 Agent 模板 + 更新 6+ 个 Claude 模板引用 + 引擎文件） |

**涉及文件：**

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/templates/platforms/claude/agents/remediation-planner.md` | **删除** | 合并到 remediation-expert |
| `src/templates/platforms/claude/agents/fix-retest.md` | **删除** | 合并到 remediation-expert |
| `src/templates/platforms/claude/agents/remediation-expert.md` | **重写** | 新边界："通用修复：规划→执行→验证 一站式，不调度其他 Agent"。具备原 remediation-planner 的规划能力和 fix-retest 的修复重测能力 |
| `src/templates/platforms/claude/agents/api-test-expert.md` | 编辑 | 3 处 `fix-retest` → `remediation-expert` |
| `src/templates/platforms/claude/agents/change-review-expert.md` | 编辑 | `remediation-planner` → `remediation-expert` |
| `src/templates/platforms/claude/agents/project-review-expert.md` | 编辑 | `remediation-planner` → `remediation-expert` |
| `src/templates/platforms/claude/agents/review-fix-optimize.md` | 编辑 | 3 处 `remediation-planner` → `remediation-expert`；流程变更为：审查 → remediation-expert 一站式修复 → 复审 |
| `src/templates/platforms/claude/agents/security-review-expert.md` | 编辑 | 2 处 `remediation-planner` → `remediation-expert` |
| `src/templates/platforms/claude/commands/review-fix.md` | 编辑 | `remediation-planner` → `remediation-expert` |
| `src/engine/agent-registry.ts` | 编辑 | CATEGORY_RULES 修订：移除 `fix-retest` 相关匹配（当前靠 `remediation` 键匹配，去重后 remediation-expert 仍匹配）；确认 `fix-retest` 和 `remediation-planner` 文件删除后不会造成 registry 扫描异常 |
| `src/engine/gates.ts` | 编辑 | GATE_AGENT_GUIDE Gate C2 中移除 `'fix-retest'`，替换为 `'remediation-expert'`；Gate C2 note 更新修复步骤描述：`fix-retest` → `remediation-expert`；Gate D note 不再提及 remediation-planner |
| `AGENTS.md` | 编辑 | 测试类列表移除 `fix-retest`；审查类列表移除 `remediation-planner`；添加 `remediation-expert` 到适当分类；浏览器测试工作流中 `fix-retest` 引用更新 |

**TDD 要求：**

1. **Red**：先编写测试验证 `gates.ts` 中 `GATE_AGENT_GUIDE['Gate C2'].can_spawn` 不再包含 `'fix-retest'`，且包含 `'remediation-expert'`
2. **Red**：验证 `gates.ts` 的 `GATE_AGENT_GUIDE` 中不再出现 `'remediation-planner'` 字符串
3. **Green**：执行所有删除、重写和引用更新
4. **Refactor**：验证 `agent-registry.ts` 扫描结果中不含 `remediation-planner` 和 `fix-retest` 条目；确认 `remediation-expert` 正常扫描

**完成标准：**

1. `remediation-planner.md` 和 `fix-retest.md` 已从文件系统删除
2. `remediation-expert.md` 重写完成，包含"规划+执行+验证"一站式职责
3. Claude 平台内任一文件中 `grep "remediation-planner"` 和 `grep "fix-retest"` 均无命中（模板/commands 范围内）
4. `gates.ts` 的 `GATE_AGENT_GUIDE` Gate C2 can_spawn 中不含 `fix-retest`，含 `remediation-expert`
5. `agent-registry.ts` 的 `getAgentList()` 调用后不产生 `remediation-planner`/`fix-retest` 条目
6. TDD 测试全部通过（Red→Green→Refactor）

**注意事项：**
- 不修改 OpenCode/Codex 模板中任何 `remediation-planner`/`remediation-worker`/`fix-retest` 引用
- `remediation-expert.md` 重写时保留原有工具集（Read/Write/Edit/Bash/Glob/Grep/Skill）和 model（deepseek-v4-flash）
- `review-only` 和 `review-fix-optimize` 边界重定义体现在其自身模板中（本 TASK 负责 review-fix-optimize 中的引用更新）

---

### TASK-004

| 属性 | 值 |
|------|-----|
| task_id | TASK-004 |
| task_name | skill-assignment-expert 新增 |
| requirement_ids | [REQ-041] |
| type | 直接开发 |
| priority | P1 |
| estimated_lines | ~120 |
| test_strategy | manual_only |
| dependencies | [TASK-003] |
| parallel_group | 可与 TASK-006 并行（L2 vs L1 无共享文件） |
| risk | 中（新增 Agent 模板，需同步注册到 3 处：agent-registry.ts + gates.ts + AGENTS.md） |

**涉及文件：**

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/templates/platforms/claude/agents/skill-assignment-expert.md` | **新建** | 完整 Agent 模板：name/description/tools/model/effort + 工作流位置（Gate C 阶段）+ 输入输出规范 + 分配逻辑 |
| `src/engine/agent-registry.ts` | 编辑 | CATEGORY_RULES 中"支撑"类 keys 增加 `'skill-assignment'` 匹配规则 |
| `src/engine/gates.ts` | 编辑 | GATE_AGENT_GUIDE Gate C 的 can_spawn 增加 `'skill-assignment-expert'`；Gate C note 更新"执行规划——spawn planner 产出执行计划，然后 spawn skill-assignment-expert 分配技能" |
| `AGENTS.md` | 编辑 | 智能体体系增加 `skill-assignment-expert`（规划评审类或新建分类） |

**新建模板要求（`skill-assignment-expert.md`）：**

- `name: skill-assignment-expert`
- `description`: "技能分配专家——在 Gate C 阶段分析任务/规划文档，为每个子 Agent 输出技能分配清单"
- `model: deepseek-v4-flash`
- `effort: max`
- `tools: Read, Write, Bash, Glob, Grep, Skill`
- 介入时机：Gate C 阶段，planner 产出执行计划后
- 输入：编排者传入完整 `@skill-name` 清单 + 任务文档 + 规划文档
- 输出：`docs/<YYYY>-<MM>-<DD>/skills/skill-assignment.md`
- 分配逻辑：根据任务类型（DDD/TDD/直接开发）、领域（前端/后端/移动端/架构）、风险等级决定技能组合
- `@behavioral-guidelines` 始终作为基座，不纳入分配清单

**完成标准：**

1. `skill-assignment-expert.md` 模板文件存在且结构完整
2. `agent-registry.ts` 中 `skill-assignment-expert` 被正确分类（支撑类）
3. `gates.ts` 中 Gate C 的 `can_spawn` 包含 `'skill-assignment-expert'`
4. `gates.ts` 中 Gate C 的 `note` 描述更新
5. AGENTS.md 包含 `skill-assignment-expert` 条目

---

### TASK-005

| 属性 | 值 |
|------|-----|
| task_id | TASK-005 |
| task_name | browser-use-expert 新增 |
| requirement_ids | [REQ-042] |
| type | 直接开发 |
| priority | P1 |
| estimated_lines | ~80 |
| test_strategy | manual_only |
| dependencies | [TASK-004] |
| parallel_group | 可与 TASK-007 并行（L2 vs L1 无共享文件） |
| risk | 中（新增 Agent 模板 + 新分类"浏览器"） |

**涉及文件：**

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/templates/platforms/claude/agents/browser-use-expert.md` | **新建** | 完整 Agent 模板：name/description/tools/model/effort + 职责定位 |
| `src/engine/agent-registry.ts` | 编辑 | CATEGORY_RULES 新增"浏览器"分类规则：`{ cat: '浏览器', keys: ['browser-use'] }`，插入到"移动端"之后 |
| `src/engine/gates.ts` | 编辑 | GATE_AGENT_GUIDE Gate C2 的 can_spawn 增加 `'browser-use-expert'`；Gate C2 note 更新增加探索式测试描述 |
| `AGENTS.md` | 编辑 | 智能体体系增加 `browser-use-expert` |

**新建模板要求（`browser-use-expert.md`）：**

- `name: browser-use-expert`
- `description`: "自主探索式浏览器操作——自动发现 UI bug、探索未知页面、执行探索性测试、收集页面证据"
- `model: deepseek-v4-pro`
- `effort: max`
- `tools: Read, Write, Edit, Bash`
- `allowed-tools: Bash(browser-use:*), Read, Write, Edit`
- 加载技能：`@behavioral-guidelines`、`@browser-use`、`@browser-testing`
- 与 `browser-test-expert` 的关系说明：
  - `browser-test-expert`：按预定义测试用例执行验证（结构化测试）
  - `browser-use-expert`：自主决策浏览器操作（探索式 + 自愈式操作）

**完成标准：**

1. `browser-use-expert.md` 模板文件存在且结构完整
2. `agent-registry.ts` 中 `browser-use-expert` 被正确分类为"浏览器"
3. `gates.ts` 中 Gate C2 的 `can_spawn` 包含 `'browser-use-expert'`
4. `gates.ts` 中 Gate C2 的 `note` 增加了探索式测试步骤说明
5. AGENTS.md 包含 `browser-use-expert` 条目

**注意事项：**
- `browser-use` skill 已存在于 `src/templates/platforms/claude/skills/browser-use/SKILL.md`，本 TASK 不需要修改它
- ICON_MAP 中已有 `'browser': 'globe'` 匹配，`browser-use-expert` 自动获得 globe 图标

---

### TASK-006

| 属性 | 值 |
|------|-----|
| task_id | TASK-006 |
| task_name | 动态 @skill-name 技能加载体系 |
| requirement_ids | [REQ-044] |
| type | 直接开发 |
| priority | P1 |
| estimated_lines | ~60 |
| test_strategy | manual_only |
| dependencies | [TASK-001] |
| parallel_group | 可与 TASK-004 并行（L1 vs L2 无共享文件） |
| risk | 低 |

**涉及文件：**

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/templates/platforms/claude/skills/planning-and-task-breakdown/SKILL.md` | 编辑 | 增加"Execution Packet 中的 required_skills"字段说明：编排者 spawn 子 Agent 时，将 `@skill-name` 列表写入 Execution Packet |
| `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md` | 编辑 | 在"对于子代理"实施指令中增加："子 Agent 启动后按 Execution Packet 的 required_skills 字段逐一调用 Skill()；`@behavioral-guidelines` 作为基座技能始终自动加载" |
| `src/templates/platforms/claude/agents/api-test-expert.md` | 编辑 | 移除 frontmatter 中 `skills:` 字段，改为"按 Execution Packet 加载技能"提示 |
| `src/templates/platforms/claude/agents/test-executor.md` | 编辑 | 同上，移除 `skills:` frontmatter |
| `src/templates/platforms/claude/agents/test-doc-writer.md` | 编辑 | 同上，移除 `skills:` frontmatter |
| `.claude/skills/behavioral-guidelines/SKILL.md` | 编辑 | 同步 behavioral-guidelines 的"对于子代理"实施指令变更 |

**完成标准：**

1. `planning-and-task-breakdown/SKILL.md` 中描述了 `required_skills` 字段用法
2. `behavioral-guidelines/SKILL.md`（模板+用户级）中"对于子代理"部分增加了动态技能加载指令
3. `api-test-expert.md`、`test-executor.md`、`test-doc-writer.md` 中不再包含 `skills:` frontmatter 字段
4. 所有被移除 `skills:` 的模板中增加提示文字"按 Execution Packet 的 required_skills 字段加载技能"
5. `fix-retest.md`（已被 TASK-003 删除）的 `skills:` 不在此次范围内

**注意事项：**
- `skills:` frontmatter 移除后，原技能加载顺序（如 api-test-expert 的 code-standards + source-driven-development + test-driven-development）应在 Execution Packet 层面保持
- 子 Agent 模板中不写死 `skills:` 但可保留"建议技能：..."的注释供 skill-assignment-expert 参考
- 不修改 planner 模板所在的 OpenCode/Codex 版本

---

### TASK-007

| 属性 | 值 |
|------|-----|
| task_id | TASK-007 |
| task_name | visual-primitives MCP 提示全局注入 |
| requirement_ids | [REQ-045] |
| type | 直接开发 |
| priority | P1 |
| estimated_lines | ~30 |
| test_strategy | manual_only |
| dependencies | [TASK-006] |
| parallel_group | 可与 TASK-005 并行（L1 vs L2 无共享文件） |
| risk | 低 |

**涉及文件：**

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md` | 编辑 | 新增"准则 6：多模态回退"——当任务涉及图像/截图而模型不支持多模态时，提示使用 `visual-primitives-mcp` 提供的 `visual_describe`/`visual_locate`/`visual_ocr` 工具 |
| `AGENTS.md` | 编辑 | "关键约束"章节新增一条（编号顺延至 19）："当模型需要多模态能力（图片理解/截图分析）但模型本身不支持时，请使用 `visual-primitives-mcp` 提供的 `visual_describe`/`visual_locate`/`visual_ocr` 工具" |

**完成标准：**

1. `behavioral-guidelines/SKILL.md` 模板中包含准则 6（多模态回退）
2. 准则编号连续：1→2→3→4→5（注释语言）→6（多模态回退），无跳号
3. AGENTS.md "关键约束"章节包含第 19 条约束（visual-primitives-mcp）
4. 准则 6 内容不要求逐一修改 47 个 Agent 模板（通过 behavioral-guidelines 覆盖全局）

**注意事项：**
- 准则 6 的措辞必须是"提示/建议"而非强制，因为不是所有项目都安装 visual-primitives-mcp
- AGENTS.md 新增约束编号从 18 顺延至 19（现有 18 条约束）

---

### TASK-008

| 属性 | 值 |
|------|-----|
| task_id | TASK-008 |
| task_name | Gate 流水线流程优化 |
| requirement_ids | [REQ-047] |
| type | **TDD**（gates.ts 核心变更，pipeline_guide MCP 工具返回影响编排行为） |
| priority | P1 |
| estimated_lines | ~80 |
| test_strategy | tdd |
| dependencies | [TASK-005] |
| parallel_group | L2 串行链，TASK-005 完成后执行 |
| risk | **高**（修改 GATE_AGENT_GUIDE 影响所有流水线编排行为 + pipeline_guide 工具返回） |

**涉及文件：**

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/engine/gates.ts` | 编辑 | GATE_AGENT_GUIDE 完整更新（见下表） |

**GATE_AGENT_GUIDE 变更明细：**

| Gate | 变更前 | 变更后 |
|------|--------|--------|
| Gate A | `can_spawn: ['code-explore-expert', 'docs-research-expert']` | `can_spawn: ['code-explore-expert', 'external-resource-expert']`；note 增加"外部资料搜索" |
| Gate C | `can_spawn: ['planner']` | `can_spawn: ['planner', 'skill-assignment-expert']`；note 增加"spawn planner 产出执行计划，然后 spawn skill-assignment-expert 分配技能" |
| Gate C2 | can_spawn 含 `'fix-retest'` 等 | 移除 `'fix-retest'`，替换为 `'remediation-expert'`；增加 `'browser-use-expert'`；note 更新：探索式浏览器测试在结构化测试之后 |
| Gate D | `can_spawn: ['frontend-review-expert', ...]` | 不变（Agent 清单不变） |
| Gate E | `can_spawn: ['security-review-expert', 'infra-deploy-expert']` | `can_spawn: ['security-review-expert', 'infra-deploy-expert', 'docs-engineer']`；note 更新"文档同步确认" |

**额外要求：**

- `pipeline_guide` MCP 工具（`src/engine/server.ts` 第 619-645 行）的返回中增加技能分配提示：
  - 当 `cur === 'Gate C'` 时，在返回体中增加 `skill_assignment_hint: 'Gate C 通过后提醒编排者先调用 skill-assignment-expert 分配技能，再进入 Gate C-impl'`

**TDD 要求：**

1. **Red**：编写测试验证 `GATE_AGENT_GUIDE['Gate A'].can_spawn` 含 `'external-resource-expert'` 不含 `'docs-research-expert'`
2. **Red**：编写测试验证 `GATE_AGENT_GUIDE['Gate C'].can_spawn` 含 `'skill-assignment-expert'`
3. **Red**：编写测试验证 `GATE_AGENT_GUIDE['Gate C2'].can_spawn` 含 `'browser-use-expert'` 和 `'remediation-expert'`，不含 `'fix-retest'`
4. **Red**：编写测试验证 `GATE_AGENT_GUIDE['Gate E'].can_spawn` 含 `'docs-engineer'`
5. **Red**：编写测试验证 `pipeline_guide` 工具在 Gate C 时返回含 `skill_assignment_hint` 字段
6. **Green**：实施所有变更
7. **Refactor**：验证 Gate 序列不变（10 Gate 保持 A→B→B1→C→C-impl→C1→C1.5→C2→D→E）

**完成标准：**

1. `GATE_AGENT_GUIDE` 的 5 个 Gate（A/C/C2/D/E）can_spawn 列表与需求一致
2. `gates.ts` 中不再出现 `'docs-research-expert'`、`'remediation-planner'`、`'fix-retest'` 字符串
3. `pipeline_guide` 工具在 Gate C 时返回 `skill_assignment_hint` 字段
4. Gate 序列结构不变（PIPELINE_DEFS 中的 gates 数组未修改）
5. 所有 TDD 测试通过

---

### TASK-009

| 属性 | 值 |
|------|-----|
| task_id | TASK-009 |
| task_name | docs-engineer 角色正式化 |
| requirement_ids | [REQ-039] |
| type | 直接开发 |
| priority | P2 |
| estimated_lines | ~60 |
| test_strategy | manual_only |
| dependencies | [TASK-008] |
| parallel_group | 可与 TASK-010 并行（不同文件） |
| risk | 低 |

**涉及文件：**

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/templates/platforms/claude/agents/docs-engineer.md` | 编辑 | 职责扩展：在所有实现完成后（Gate E 前）检查并同步项目级文档；产出路径更新为 `.jarvis/docs-sync-report.md`；明确"直接修改根目录文档以修复不一致" |
| `src/engine/agent-registry.ts` | 编辑 | CATEGORY_RULES 新增"文档支持"分类：`{ cat: '文档支持', keys: ['docs-engineer'] }`，插入到"支撑"之后 |
| `AGENTS.md` | 编辑 | 探索/支撑类中增加 `docs-engineer`；增加"文档支持"独立分类（agent-registry 对应） |

**完成标准：**

1. `docs-engineer.md` 职责描述扩展，包含 Gate E 介入时机和 `.jarvis/docs-sync-report.md` 产出
2. `agent-registry.ts` 中 `docs-engineer` 被分类为"文档支持"（非兜底"支撑"）
3. AGENTS.md 的智能体体系中有 `docs-engineer` 的显式条目

**注意事项：**
- `docs-engineer` 原本已存在模板文件，本 TASK 只做职责扩展和分类修正
- ".jarvis/docs-sync-report.md" 是项目级临时目录路径，按 `docs/tmp/` 约定处理

---

### TASK-010

| 属性 | 值 |
|------|-----|
| task_id | TASK-010 |
| task_name | Web 面板适配新流程 |
| requirement_ids | [REQ-048] |
| type | 直接开发 |
| priority | P2 |
| estimated_lines | ~80 |
| test_strategy | test_after |
| dependencies | [TASK-002, TASK-004, TASK-005] |
| parallel_group | 可与 TASK-009 并行（不同文件） |
| risk | 中（3 个 React 组件文件） |

**涉及文件：**

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `web/src/pages/Dashboard.tsx` | 编辑 | GATE_DESCRIPTIONS 更新：Gate A 描述更新为含"外部资料搜索"；Gate C 描述更新为含"技能分配"；Gate C2 描述更新为含"探索式测试"；Gate E 描述更新为含"文档同步" |
| `web/src/pages/Agents.tsx` | 编辑 | `matchFunctionRole` 函数更新：新增"技能分配专家"和"浏览器专家"匹配逻辑；移除 `fix-retest` 匹配 |
| `web/src/pages/matchPipelineType.ts` | 编辑 | 新增 `skill-assignment-expert` 和 `browser-use-expert` 的流程分类匹配 |
| `web/src/components/Layout.tsx` | 编辑 | Agent 角色分类标签布局更新（如有静态分类标签） |

**各组件变更明细：**

**Dashboard.tsx:**
- `GATE_DESCRIPTIONS['Gate A']` 更新为包含"外部资料搜索与探索"
- `GATE_DESCRIPTIONS['Gate C']` 更新为包含"技能分配"
- `GATE_DESCRIPTIONS['Gate C2']` 更新为包含"探索式浏览器测试"
- `GATE_DESCRIPTIONS['Gate E']` 更新为包含"文档同步确认"

**Agents.tsx (matchFunctionRole):**
- "测试者" case 中移除 `'fix-retest'` 匹配
- 新增"技能分配"角色匹配：`idLower === 'skill-assignment-expert'`
- 新增"浏览器"角色匹配：`idLower === 'browser-use-expert'`

**matchPipelineType.ts:**
- 确认新增 Agent（`external-resource-expert`、`skill-assignment-expert`、`browser-use-expert`）在流水线类型映射中正确归类

**完成标准：**

1. Dashboard Gate 描述与 `gates.ts` 的 `GATE_AGENT_GUIDE` 一致
2. Agents 页面不再显示已删除 Agent（`docs-research-expert`、`remediation-planner`、`fix-retest`）
3. Agents 页面正确显示新增 Agent（`external-resource-expert`、`skill-assignment-expert`、`browser-use-expert`）
4. 无新增路由，现有三页面（Dashboard/Agents/Archive）功能完整
5. `npm run typecheck` 通过（web 目录）

---

### TASK-011

| 属性 | 值 |
|------|-----|
| task_id | TASK-011 |
| task_name | 文档驱动的子 Agent 体系 |
| requirement_ids | [REQ-050] |
| type | 直接开发 |
| priority | P2 |
| estimated_lines | ~100 |
| test_strategy | manual_only |
| dependencies | [TASK-008] |
| parallel_group | L2 串行链，AGENTS.md 最后更新 |
| risk | 低 |

**涉及文件：**

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `AGENTS.md` | 编辑 | 新增"文档驱动"章节，定义各类型 Agent 的文档产出要求 |

**新增"文档驱动"章节内容要求：**

1. 实现类 Agent（`-dev-expert`/`-api-expert`/`-logic-expert`/`-data-expert`/`-ui-expert`/`-state-expert`/平台全栈）：完成后产出 `<TASK-ID>-completion.md`，含完成标准逐项核查、未覆盖边缘情况、已知技术债务
2. 关键流程 Agent（`planner`/`task-design`/`skill-assignment-expert`/`external-resource-expert`）：完成后产出对应阶段文档即为完成文档
3. 审查类 Agent：产出审查报告即为完成文档
4. 测试类 Agent：产出测试报告即为完成文档
5. 完成文档存放路径：`docs/<YYYY>-<MM>-<DD>/<phase>/`

**完成标准：**

1. AGENTS.md 包含"文档驱动"章节
2. 章节中明确定义了 4 类 Agent 的文档产出要求
3. 文档存放路径规范明确

**注意事项：**
- 此 TASK 是纯文档变更，不涉及代码修改
- 章节格式与 AGENTS.md 现有风格保持一致
- 确认 AGENTS.md 中之前的各项修改（TASK-002~009）整合后无冲突

---

### TASK-012

| 属性 | 值 |
|------|-----|
| task_id | TASK-012 |
| task_name | 模板与用户级技能同步 + 发布 |
| requirement_ids | [REQ-049] |
| type | 直接开发 |
| priority | P2 |
| estimated_lines | ~30 |
| test_strategy | manual_only |
| dependencies | [TASK-001 ~ TASK-011 全部] |
| parallel_group | 最后执行 |
| risk | 中（发布流程涉及 npm/GitHub Actions） |

**执行步骤：**

1. 确认所有变更已提交，`git status` 干净
2. 更新 `package.json` version 字段（patch bump：`3.32.1` → `3.32.2` 或 minor bump 视变更规模）
3. 更新 `AGENTS.md` 中的统计数据（Agent 数量、技能数量）
4. 更新 `README.md` 的版本号、特性列表
5. 提交并打 Tag：
   ```bash
   git add <changed-files>
   git commit -m "feat: 流水线与智能体体系全面优化 — Agent去重/重命名/新增 + Gate优化 + 动态技能加载 + Web面板同步"
   git tag -a v3.33.0 -m "v3.33.0 - 流水线与智能体体系全面优化"
   git push origin main && git push origin v3.33.0
   ```
6. 等待 GitHub Actions CI + Release workflow 完成
7. 全局引擎更新：`npm i -g jarvis-agent-factory@latest`
8. 工作区更新：`jarvis update --workspace`
9. 工作区引擎重启：`jarvis engine restart`
10. 验证：
    - `npm view jarvis-agent-factory version` 确认 npm 版本
    - `jarvis engine status` 确认引擎运行正常
    - 打开 Web 面板验证新增 Agent 显示正确
11. 切换到 dev 分支继续后续开发

**完成标准：**

1. `package.json` 版本号已递增
2. Tag `v3.33.0` 已推送到 GitHub
3. npm publish 成功（通过 GitHub Actions Release workflow）
4. `jarvis update --workspace` 执行成功
5. `.claude/skills/behavioral-guidelines/SKILL.md` 与模板层一致
6. Web 面板正常显示新增/重命名 Agent
7. 引擎重启后无错误日志

---

## 五、DDD 分类

本轮无 DDD 需求。所有变更均为配置工程级别：
- 无新增聚合根/值对象/实体
- 无状态机建模
- 无跨聚合事务

---

## 六、TDD 与直接开发分类

| 分类 | TASK | 理由 |
|------|------|------|
| **TDD** | TASK-003 | gates.ts 核心变更，GATE_AGENT_GUIDE 删除/替换 Agent 引用，必须验证 Gate 流程不被破坏 |
| **TDD** | TASK-008 | gates.ts GATE_AGENT_GUIDE 全面刷新 + pipeline_guide MCP 工具返回变更，必须验证编排行为正确 |
| 直接开发 | TASK-001, -002, -004, -005, -006, -007, -009, -010, -011, -012 | 模板新建/编辑、文档同步、UI 更新，手动验证即可 |

---

## 七、风险任务汇总

| TASK | 风险等级 | 风险描述 | 缓解措施 |
|------|----------|----------|----------|
| TASK-003 | 高 | 删除 2 个 Agent 模板，修改 6+ 个 Claude 模板引用 + 引擎文件 + AGENTS.md；引用链广度大 | TDD 先行验证 gates.ts；逐文件 grep 确认无残留引用；分步提交便于回滚 |
| TASK-008 | 高 | GATE_AGENT_GUIDE 影响所有流水线编排行为；pipeline_guide MCP 工具返回变更 | TDD 先行验证每个 Gate 的 can_spawn；确认 Gate 序列不变 |
| TASK-002 | 中 | 6 个文件变更，含引擎核心文件 | 变更集中在一个 Agent 重命名，风险可控 |
| TASK-004 | 中 | 3 处注册点（模板 + registry + gates + AGENTS.md） | 新增 Agent 独立，不影响现有功能 |
| TASK-005 | 中 | 3 处注册点 + 新增分类"浏览器" | 新增分类影响 ICON_MAP 行为，需验证 icon 匹配 |
| TASK-010 | 中 | 3 个 React 组件变更 | 需运行 `npm run typecheck` 确认无类型错误 |
| TASK-012 | 中 | 发布流程依赖 GitHub Actions | 失败可重试 |

---

## 八、引用链追溯清单

### 8.1 docs-research-expert → external-resource-expert (REQ-040)

| 引用文件 | 修改方式 |
|----------|----------|
| `src/templates/platforms/claude/agents/docs-research-expert.md` | 删除后新建 `external-resource-expert.md` |
| `src/engine/agent-registry.ts` | CATEGORY_RULES 中 `'docs-research'` → `'external-resource'` |
| `src/engine/gates.ts` | GATE_AGENT_GUIDE Gate A 中重命名 |
| `AGENTS.md` | 智能体清单重命名 |
| `src/templates/platforms/claude/skills/using-agent-skills/SKILL.md` | 技能-加载者映射表更新 |

### 8.2 remediation-planner 合并 (REQ-043)

| 引用文件（Claude 平台） | 修改方式 |
|--------------------------|----------|
| `src/templates/platforms/claude/agents/remediation-planner.md` | 删除 |
| `src/templates/platforms/claude/agents/remediation-expert.md` | 重写（合并规划+修复能力） |
| `src/templates/platforms/claude/agents/change-review-expert.md` | `remediation-planner` → `remediation-expert` |
| `src/templates/platforms/claude/agents/project-review-expert.md` | 同上 |
| `src/templates/platforms/claude/agents/review-fix-optimize.md` | 同上（3 处） |
| `src/templates/platforms/claude/agents/security-review-expert.md` | 同上（2 处） |
| `src/templates/platforms/claude/commands/review-fix.md` | 同上 |
| `src/engine/gates.ts` | GATE_AGENT_GUIDE 中移除 remediation-planner 引用 |
| `AGENTS.md` | 审查类列表移除 |

### 8.3 fix-retest 合并 (REQ-043)

| 引用文件（Claude 平台） | 修改方式 |
|--------------------------|----------|
| `src/templates/platforms/claude/agents/fix-retest.md` | 删除 |
| `src/templates/platforms/claude/agents/api-test-expert.md` | `fix-retest` → `remediation-expert`（3 处） |
| `src/engine/gates.ts` | GATE_AGENT_GUIDE 中移除 fix-retest 引用 |
| `AGENTS.md` | 测试类列表移除 + 浏览器测试工作流更新 |

---

## 九、推荐交付顺序

```
Round 1: TASK-001 + TASK-002 (P0, 并行)
    ↓
Round 2: TASK-003 (P0, 去重, 依赖 Round 1)
    ↓
Round 3: TASK-006 + TASK-004 (P1, 并行: L1行为准则 + L2新增Agent)
    ↓
Round 4: TASK-007 + TASK-005 (P1, 并行: L1多模态 + L2新增Agent)
    ↓
Round 5: TASK-008 (P1, Gate优化, 依赖 Round 4)
    ↓
Round 6: TASK-009 + TASK-010 (P2, 并行: 文档正式化 + Web面板)
    ↓
Round 7: TASK-011 (P2, AGENTS.md 文档驱动章节)
    ↓
Round 8: TASK-012 (P2, 发布)
```

预计总轮次：8 轮（但 L1/L2 并行实际推进只需 6 轮次等待）。

---

## 十、推荐的下一步

1. **planner** 读取本任务文档，确认执行顺序和 Agent 分配
2. 优先执行 P0 任务（TASK-001 + TASK-002 + TASK-003）
3. P0 完成后检查 engine 状态（`jarvis engine status`）确认基础变更无回归
4. 继续 P1 任务按依赖顺序执行
5. 最终 P2 任务后执行 TASK-012 发布
