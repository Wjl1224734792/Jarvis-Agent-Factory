# README 追加平台维护状态与产物目录规范 — 实现文档

## 1. 当前实现目标

在 README.md 中新增"平台维护状态"和"产物目录规范"两个章节，明确当前平台维护策略和流水线产物存放约定。

## 2. 对应需求 ID / 任务 ID

- **需求 ID**: REQ-029
- **任务 ID**: TASK-006

## 3. 输入依据

- 编排者分配的子任务 Execution Packet
- 项目规则文件: `CLAUDE.md`、`AGENTS.md`、`.claude/rules/通用编程规范与指南.md`
- 现有 `README.md`（16 个已有章节）
- Handoff Notes: TASK-008 将在此基础上追加流程图链接

## 4. 变更文件 / 变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `README.md` | 追加 39 行 | 在"核心特性"之后、"架构"之前插入两个新章节 |

未修改任何已有内容（0 行删除，0 行已有内容变更）。

## 5. 实现说明

### 5.1 "平台维护状态"章节

位于"核心特性"表格之后，使用表格清晰声明三平台维护状态：

- **Claude Code**：维护中，主力平台
- **OpenCode**：暂不维护，模板保留，按需启动
- **Codex**：暂不维护，模板保留，按需启动

附引用块说明配置文件（`.opencode/`、`.codex/`）仍保留在仓库中。

### 5.2 "产物目录规范"章节

位于"平台维护状态"之后，包含两部分：

1. **目录树图**：以 ASCII 树形结构展示 `docs/` 下的子目录层次
2. **对照表**：将每个子目录映射到对应的流水线 Gate 及说明

涵盖 8 个 Gate 目录 + 1 个临时目录：

| 目录 | Gate |
|------|------|
| `docs/tmp/` | 全部（临时产物） |
| `docs/requirements/` | Gate A |
| `docs/tasks/` | Gate B |
| `docs/architecture/` | Gate B1 |
| `docs/plans/` | Gate C |
| `docs/implementation/` | Gate C-impl |
| `docs/testing/` | Gate C2 |
| `docs/review/` | Gate D |
| `docs/shipping/` | Gate E |

## 6. 测试和验证结果

- **测试策略**: manual_only — 纯文档变更，人工阅读确认
- **验证方式**: `git diff README.md` 确认仅新增 39 行，零删除，零已有内容变更
- **已有结构完整性**: 架构图、CLI 命令、环境变量、轻量编排、Web 面板、MCP 配置指南、生命周期流水线、平台入口速查、统计、引擎能力矩阵、发布流程、License — 全部未变更

## 7. 数据与接口边界

无影响。纯文档变更。

## 8. 风险 / 未解决项

- README 开头描述"支持 Claude Code / OpenCode / Codex 三平台"与新增的"暂不维护 OpenCode/Codex"声明之间存在语义张力。根据任务要求仅追加不修改已有内容，暂不处理。后续 TASK 可考虑更新此处措辞。
- AGENTS.md 中也有类似的三平台统计和描述，本次任务未修改 AGENTS.md（不在 allowed_paths 中）。

## 9. 需要前端配合的点

无需前端配合。

## 10. 推荐的下一步

- TASK-008 可在此基础上叠加流程图链接
- 后续可考虑更新 README 开头描述行，使与平台维护状态声明一致
