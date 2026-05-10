# 需求文档 — 贾维斯流水线与智能体体系全面优化

> 日期：2026-05-11 | 状态：confirmed

---

## REQ-039：文档工程师角色正式化

**问题**：`docs-engineer` 无 agent-registry 显式分类（回退为"支撑"），职责仅限核心文档同步（AGENTS/README/CLAUDE），缺乏体系化定位。

**要求**：
- docs-engineer 职责扩展：在所有实现完成后（Gate E 前）检查并同步项目级文档
- 产出：`.jarvis/docs-sync-report.md`（可选报告）
- 直接修改根目录文档以修复不一致
- agent-registry 中显式分类为"文档支持"

---

## REQ-040：external-resource-expert 重命名与职责明确

**问题**：`docs-research-expert` 名称不贴切——它负责搜索外部资料（WebSearch/WebFetch）和推荐可安装的 skill，而非仅仅"研究文档"。

**要求**：
- 重命名 `docs-research-expert` → `external-resource-expert`
- 更新所有引用该 Agent 的文件：
  - `src/templates/platforms/claude/agents/docs-research-expert.md`（重命名+重写）
  - `src/engine/agent-registry.ts`（匹配规则）
  - `src/engine/gates.ts`（GATE_AGENT_GUIDE）
  - `src/engine/server.ts`（如有引用）
  - `AGENTS.md`（Agent 清单）
  - `skills/using-agent-skills/SKILL.md`
- 职责描述更新为：搜索外部文档（库/框架/API 最新文档）+ 发现可用的开源 Agent Skill + 输出版本兼容性建议和安装方案

---

## REQ-041：skill-assignment-expert 新增

**问题**：当前子 Agent 技能加载在模板中写死（frontmatter `skills:` 字段），缺乏按任务上下文动态分配的能力。用户要求一个独立 Agent 负责分析任务/规划文档，为每个子 Agent 输出技能分配清单。

**要求**：
- 新增 `skill-assignment-expert` Agent 模板
- 位置：`src/templates/platforms/claude/agents/skill-assignment-expert.md`
- 介入时机：Gate C 阶段，planner 产出执行计划后、Gate C-impl 实现前
- 输入：编排者传入完整的 `@skill-name` 清单（除流水线基础技能外的全部可用技能）+ 任务文档 + 规划文档
- 输出：`docs/<YYYY>-<MM>-<DD>/skills/skill-assignment.md` — 按子 Agent 逐一列出应加载的 `@skill-name`
- 分配逻辑：根据任务类型（DDD/TDD/直接开发）、领域（前端/后端/移动端/架构）、风险等级决定技能组合
- 编排者在 spawn 子 Agent 时，将分配文档中的 `@skill-name` 传递给子 Agent 的提示词
- model: `deepseek-v4-flash`（轻量分析任务）

---

## REQ-042：browser-use Agent 新增

**问题**：`browser-use` skill 模板已存在于 `src/templates/platforms/claude/skills/browser-use/SKILL.md`，提供完整的 CLI 浏览器自动化能力（navigate/state/click/input/screenshot/tunnel/profile），但无 Agent 加载此 skill。

**要求**：
- 新增 `browser-use-expert` Agent 模板
- 位置：`src/templates/platforms/claude/agents/browser-use-expert.md`
- 职责：**自主探索式浏览器操作**——自动发现 UI bug、探索未知页面、执行探索性测试、收集页面证据
- 与 `browser-test-expert` 的关系：**互补**
  - `browser-test-expert`：按预定义测试用例执行验证（结构化测试）
  - `browser-use-expert`：自主决策浏览器操作（探索式 + 自愈式操作）
- 加载技能：`@behavioral-guidelines`、`@browser-use`、`@browser-testing`
- allowed-tools: Bash(browser-use:*), Read, Write, Edit
- model: `deepseek-v4-pro`（需较强自主决策能力）
- agent-registry 中注册为新分类"浏览器"

---

## REQ-043：Agent 职责去重与边界清晰化

**问题**：47 个 Agent 中存在重复职能和边界模糊问题：
- `remediation-expert` 和 `remediation-planner` 功能重叠
- `review-only` 和 `review-fix-optimize` 作为主控 Agent（调度子代理），其内部子代理流水线已固化
- `fix-retest` 作为测试修复协调者，与 `remediation-expert` 在"修复"语义上重叠
- 移动端 Agent（Android/iOS/Flutter/Taro/Expo 各 3 个）共 15 个，模式相同但代码相似度极高
- `test-doc-writer` + `test-executor` 二阶段测试流程中的 `fix-retest` 职责链

**要求**（仅 Claude 平台）：

### 去重（合并）
| 原 Agent | 合并后 | 理由 |
|---------|--------|------|
| `remediation-planner` | 合并到 `remediation-expert` | 单一修复 Agent 同时负责规划与执行，减少间接层 |
| `fix-retest` | 合并到 `remediation-expert` | 修复重测是修复的子集，无需独立 Agent |

### 边界重定义
| Agent | 新边界 |
|------|--------|
| `remediation-expert` | 通用修复：规划→执行→验证 一站式，不调度其他 Agent |
| `review-only` | 只审查模式：spawn 子审查 Agent，汇总报告，**不修改文件** |
| `review-fix-optimize` | 审查修复闭环：spawn 子审查 Agent → 调用 `remediation-expert` 修复 → 复审 |

### 保持不变（模式一致，保留）
| 平台 | Agent 组 | 保留理由 |
|------|---------|---------|
| Android/iOS/Flutter/Taro/Expo | 各 3 个（dev/ui/state） | 三层模式是架构约定，平台差异决定不能合并 |

---

## REQ-044：动态 @skill-name 技能加载体系

**问题**：当前子 Agent 模板在 frontmatter `skills:` 字段硬编码技能清单。`skill-assignment-expert` 产出分配文档后，编排者需要一种方式将技能动态传递给子 Agent。

**要求**：
- 编排者在 spawn 子 Agent 时，将 `@skill-name` 列表写入 Execution Packet 的 `required_skills` 字段
- 子 Agent 启动后，按 Execution Packet 中的 `@skill-name` 列表逐一调用 `Skill()`
- 子 Agent 模板中不再硬编码 `skills:` frontmatter（改为提示"按 Execution Packet 加载技能"）
- 特殊保留：`@behavioral-guidelines` 始终作为基座技能（所有 Agent 必加载，无需在分配文档中列出）
- `skill-assignment-expert` 产出的分配文档中，每个子 Agent 的技能清单格式为 `@skill-name` 列表

---

## REQ-045：visual-primitives MCP 提示全局注入

**问题**：纯文本模型（DeepSeek V4 等）没有多模态能力，但项目已维护 `visual-primitives-mcp` 提供视觉理解。当前只有 README.md 提到它，AGENTS.md 和所有 Agent 模板中均无提示。

**要求**：
- 在 `AGENTS.md` 的"关键约束"章节新增一条："当模型需要多模态能力（图片理解/截图分析）但模型本身不支持时，请使用 `visual-primitives-mcp` 提供的 `visual_describe`/`visual_locate`/`visual_ocr` 工具"
- 在所有 Agent 行为准则中增加类似提示（通过更新 `behavioral-guidelines` skill 实现，而非逐个修改 47 个模板）
- `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md` 新增"准则 7：多模态回退"——当任务涉及图像/截图而模型不支持多模态时，提示使用 `visual-primitives-mcp`

---

## REQ-046：behavioral-guidelines 去掉 .claude/rules/* 读取要求

**问题**：`behavioral-guidelines` 准则 5 要求"启动时自动读取 `.claude/rules/*.md`"，但 `.claude/rules/` 是默认自动加载的（Claude Code 平台特性），此要求多余且可能误导其他平台 Agent。

**要求**：
- `src/templates/platforms/claude/skills/behavioral-guidelines/SKILL.md`：删除准则 5（读取平台规范）
- 原准则 6（注释语言）前移为准则 5
- `.claude/skills/behavioral-guidelines/SKILL.md`：同步删除准则 5
- 确保其他平台模板（opencode/codex）中无此准则残留

---

## REQ-047：Gate 流水线流程优化

**问题**：当前 10-Gate 流水线缺少以下环节：
- 无独立的技能分配环节（由 REQ-041 补充）
- Gate C-impl 实现前缺少技能分配确认
- Gate E 发布前缺少文档同步确认（docs-engineer 应在此介入）
- GATE_AGENT_GUIDE 中未包含新增的 `skill-assignment-expert` 和 `browser-use-expert`

**要求**：
- GATE_AGENT_GUIDE 更新：
  - Gate A 增加 `external-resource-expert`（外部资料搜索）
  - Gate C 增加 `skill-assignment-expert`（技能分配）
  - Gate C-impl 保持现有实现 Agent 清单
  - Gate C2 增加 `browser-use-expert`（探索式浏览器测试）
  - Gate D 保持现有审查 Agent 清单
  - Gate E 增加 `docs-engineer`（文档同步确认）
- `pipeline_guide` MCP 工具返回中增加技能分配提示：Gate C 通过后提醒编排者先调用 `skill-assignment-expert`
- 不需要修改 Gate 序列本身（10 Gate 保持不变 A→B→B1→C→C-impl→C1→C1.5→C2→D→E）

---

## REQ-048：Web 面板适配新流程

**问题**：Web 面板显示的是静态的 Gate 流程和 Agent 清单，新增/重命名的 Agent 和技能分配环节需要反映在 UI 中。

**要求**：
- Dashboard.tsx 的 GATE_COLORS/GATE_LABELS/GATE_DESCRIPTIONS 常量保持与 `gates.ts` 同步
- Agents.tsx 正确显示新增 Agent（`external-resource-expert`、`skill-assignment-expert`、`browser-use-expert`）
- 移除的 Agent（`remediation-planner`、`fix-retest`、`docs-research-expert`）不在 Agent 配置页面显示
- Layout.tsx 的 Agent 角色分类标签更新
- 无新增路由，现有三页面（Dashboard/Agents/Archive）足够

---

## REQ-049：模板与用户级技能同步 + 发布

**问题**：模板层（`src/templates/platforms/claude/skills/`）和用户级（`.claude/skills/`）的 29 个技能是独立副本，存在双重维护风险。本轮变更后需要统一同步。

**要求**：
- 本轮仅优化 Claude 平台模板（`src/templates/platforms/claude/`）
- 合并到 main、打 tag、发布 release
- 全局引擎更新：`npm i -g jarvis-agent-factory@latest`
- 工作区更新：`jarvis update --workspace`
- 工作区引擎重启：`jarvis engine start`
- 切换到 dev 分支继续后续开发

---

## REQ-050：文档驱动的子 Agent 体系

**问题**：用户要求所有写代码的实现 Agent 都要有审查报告和完成文档，关键 Agent 也需要完成文档。

**要求**：
- 实现类 Agent（`-dev-expert`/`-api-expert`/`-logic-expert`/`-data-expert`/`-ui-expert`/`-state-expert`/平台全栈）：完成后产出 `<TASK-ID>-completion.md`（自查报告），含完成标准逐项核查、未覆盖边缘情况、已知技术债务
- 关键流程 Agent（`planner`/`task-design`/`skill-assignment-expert`/`external-resource-expert`）：完成后产出对应阶段文档即为完成文档（无需额外报告）
- 审查类 Agent：产出审查报告即为完成文档
- 测试类 Agent：产出测试报告即为完成文档
- 完成文档存放路径：`docs/<YYYY>-<MM>-<DD>/<phase>/`
- 在 AGENTS.md 中增加"文档驱动"章节，定义各类型 Agent 的文档产出要求

---

## 优先级排序

| 优先级 | REQ | 理由 |
|--------|-----|------|
| P0 | REQ-046 | 准则 5 是错误指令，必须纠正 |
| P0 | REQ-040 | Agent 重命名影响所有引用者，先行 |
| P0 | REQ-043 | 去重影响 Agent 模板数量和引用链 |
| P1 | REQ-041 | 新增 skill-assignment-expert，依赖 P0 完成后稳定 Agent 清单 |
| P1 | REQ-042 | 新增 browser-use-expert |
| P1 | REQ-044 | 动态加载体系，依赖 REQ-041 |
| P1 | REQ-045 | visual-primitives 全局注入 |
| P1 | REQ-047 | Gate 流程优化，依赖新增 Agent |
| P2 | REQ-039 | docs-engineer 职责正式化 |
| P2 | REQ-048 | Web 面板同步 |
| P2 | REQ-050 | 文档驱动体系说明 |
| P2 | REQ-049 | 发布同步（最后执行） |

---

## 变更影响范围估算

| 类别 | 涉及文件数 | 预估总变更行数 |
|------|---------|--------------|
| Agent 模板（新增+修改+删除） | ~20 | ~800 |
| Skill 模板（修改） | ~10 | ~200 |
| 引擎核心（gate.ts/server.ts/registry.ts） | 3 | ~150 |
| Web 面板（Dashboard/Agents/Layout） | 3 | ~80 |
| AGENTS.md | 1 | ~100 |
| 文档体系（新增文档） | ~8 | ~600 |

> **总预估: ~35 文件, ~1930 行变更。单轮次，但文件间有依赖关系（如 Agent 重命名影响 GATE_AGENT_GUIDE 引用）。**
