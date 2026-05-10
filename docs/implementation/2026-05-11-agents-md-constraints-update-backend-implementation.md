# TASK-007: AGENTS.md 关键约束更新 — 后端实现文档

## 1. 当前实现目标

在 AGENTS.md 关键约束中新增 OpenCode/Codex 不同步约束和产物目录规范两条约束，确保所有智能体启动时能获取完整的项目规范。

## 2. 对应需求 ID / 任务 ID

- 需求 ID：REQ-029
- 任务 ID：TASK-007

## 3. 输入依据

| 输入 | 路径 | 内容摘要 |
|------|------|---------|
| AGENTS.md | 项目根目录 | 现有 16 条关键约束，发布流程，技能/Agent 体系 |
| CLAUDE.md | 项目根目录 | 极简 3 行，仅指向 AGENTS.md |
| README.md | 项目根目录 | 项目全貌，无水线产物目录显式枚举 |
| docs/README.md | `docs/` | 当前产物目录结构：requirements, tasks, plans, implementation, testing, review |

## 4. 变更文件 / 变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `AGENTS.md` | 修改 | 在约束 16 之后新增约束 17、18 |
| `CLAUDE.md` | 不修改 | 已极简到仅指向 AGENTS.md，无实质内容需补充 |

**未修改文件：**
- `README.md` — 属于 TASK-006/TASK-008
- `docs/README.md` — 维护属于 TASK-006
- `src/engine/`、`web/` — Out of scope

## 5. 实现说明

### 约束 17：OpenCode/Codex 不同步约束

```markdown
17. **OpenCode/Codex 不同步约束** — 不做 OpenCode/Codex 平台的同步修改或优化，除非用户明确说明要开始维护对应平台
```

**目的：** 当前维护焦点在 Claude Code 平台（`.claude/`），避免在无用户明确指示下对 OpenCode（`.opencode/`）和 Codex（`.codex/`）平台做被动同步修改，保持各平台配置的稳定性。

### 约束 18：产物目录规范

```markdown
18. **产物目录规范** — 临时产物统一放入 `docs/tmp/`，智能体正式产出按 Gate 存入 `docs/{requirements|tasks|architecture|plans|implementation|testing|review|shipping}/`
```

**目的：** 明确流水线产物的存放规则——临时/过程产物 vs 正式交付产物的分区。与约束 15（临时文件统一存放至 `docs/tmp/`）互补，构成完整的产物管理规范。

**与 docs/README.md 的语义一致性：**

| 约束定义的目录 | docs/README.md 已记录 | 对应 Gate |
|---------------|----------------------|-----------|
| `requirements/` | 是 | Gate A |
| `tasks/` | 是 | Gate B |
| `architecture/` | 否（待补充） | Gate B1（条件性） |
| `plans/` | 是 | Gate C |
| `implementation/` | 是 | Gate C→C1 |
| `testing/` | 是 | Gate C2 |
| `review/` | 是 | Gate D |
| `shipping/` | 否（待补充） | Gate E |

`architecture/` 和 `shipping/` 为约束定义的完整流水线目录集，docs/README.md 补充属于 TASK-006 维护范围。

## 6. 测试和验证结果

**测试策略：** manual_only（纯文档任务，人工阅读确认）

**验证清单：**

| # | 检查项 | 结果 |
|---|--------|------|
| 1 | 约束 17 已添加，位于 AGENTS.md 关键约束第 17 条 | PASS |
| 2 | 约束 18 已添加，位于 AGENTS.md 关键约束第 18 条 | PASS |
| 3 | 两条约束格式与现有约束 1-16 保持一致（编号 + 粗体标题 + em-dash 分隔 + 中文描述） | PASS |
| 4 | 约束 17 语气与约束 1-16 一致，使用"不做...除非"的禁止性表述 | PASS |
| 5 | 产物目录规范包含完整目录集，与 README 语义一致 | PASS |
| 6 | CLAUDE.md 已 review，确认无需修改 | PASS |
| 7 | 未修改 AGENTS.md 现有约束 1-16 的内容 | PASS |
| 8 | 未修改 Agent 列表、技能列表、统计数字 | PASS |
| 9 | 未触及 forbidden paths | PASS |

## 7. 数据与接口边界

- **数据模型：** 无变更
- **API 接口：** 无变更
- **数据库：** 无变更
- **MCP 工具：** 无变更
- **CLI 命令：** 无变更

## 8. 风险 / 未解决项

- **无。**

## 9. 需要前端配合的点

- **无。** 纯文档类修改，不涉及前端。

## 10. 推荐的下一步

- TASK-006：同步更新 docs/README.md，补充 `architecture/` 和 `shipping/` 目录（如果已实现对应 Gate 的产出机制）
- TASK-008：更新 docs/flows/ 相关流程文档
- 如需后续启动 OpenCode/Codex 平台维护，需先与用户确认并移除约束 17
