# 文档目录结构规范同步 -- Skills + Agents

**日期：** 2026-05-12
**任务 ID：** TASK-013
**需求 ID：** REQ-009

---

## 1. 实现目标

将 `.claude/skills/` 和 `.claude/agents/` 中所有文件输出路径说明从旧日期格式统一为新的日期目录结构：

- **旧格式：** `docs/<subdir>/YYYY-MM-DD-<topic>-<type>.md`
- **新格式：** `docs/<YYYY>-<MM>-<DD>/<subdir>/<topic>-<type>.md`

## 2. 对应需求 / 任务

- **REQ-009：** 文档目录结构规范 -- 统一使用日期目录格式
- **TASK-013：** 文档目录结构规范同步 -- Skills + Agents

## 3. 输入依据

- 编排者 任务分配中的 Gate-subdir 映射表
- 6 个首要 Skill 文件当前路径格式
- 55 个 Agent 文件当前路径格式

## 4. 变更文件 / 变更范围

### 4.1 首要 Skill 文件（6 个）

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `spec-driven-development/SKILL.md` | 格式更新 | 6 处 `docs/requirements/YYYY-MM-DD-<topic>-requirements.md` 改为 `docs/<YYYY>-<MM>-<DD>/requirements/<topic>-requirements.md` |
| `shipping-and-launch/SKILL.md` | 格式更新 | 2 处 `docs/shipping/YYYY-MM-DD-<topic>-launch.md` 改为 `docs/<YYYY>-<MM>-<DD>/shipping/<topic>-launch.md` |
| `planning-and-task-breakdown/SKILL.md` | 添加路径说明 | 原无路径说明，新增 "产物路径" 段落：`docs/<YYYY>-<MM>-<DD>/tasks/<topic>-tasks.md` |
| `test-driven-development/SKILL.md` | 添加路径说明 | 原无路径说明，新增 "产物路径" 段落：`docs/<YYYY>-<MM>-<DD>/testing/<topic>-test-<type>.md` |
| `code-review-and-quality/SKILL.md` | 添加路径说明 | 原无路径说明，新增 "产物路径" 段落：`docs/<YYYY>-<MM>-<DD>/review/<topic>-review.md` |
| `documentation-and-adrs/SKILL.md` | 添加路径说明 | ADR 保留 `docs/adr/` 永久目录；API 文档和其他产出按日期目录格式输出 |

### 4.2 Agent 文件（55 个）

所有引用 `docs/<subdir>/YYYY-MM-DD-<topic>-<type>.md` 旧格式的 Agent 定义文件已批量更新为新格式。

### 4.3 未变更文件

- `browser-testing/SKILL.md` -- 不在本次允许路径范围内，正确保留未修改
- `docs/tmp/` 引用 -- 在所有 Agent 中正确保留未修改
- `docs/adr/` 引用 -- 在 `documentation-and-adrs/SKILL.md` 中正确保留未修改

## 5. 实现说明

### 5.1 Gate -> subdir 映射

| Gate | Subdir | 示例路径 |
|------|--------|---------|
| Gate A | `requirements/` | `docs/2026-05-12/requirements/REQ-001.md` |
| Gate B-DDD/B-BDD/B-TDD | `tasks/` | `docs/2026-05-12/tasks/user-auth-tasks.md` |
| Gate B1 | `architecture/` | `docs/2026-05-12/architecture/backend-architecture.md` |
| Gate C | `plans/` | `docs/2026-05-12/plans/user-auth-plan.md` |
| Gate C-impl/C1/C1.5 | `implementation/` | `docs/2026-05-12/implementation/user-auth-backend-implementation.md` |
| Gate C2 | `testing/` | `docs/2026-05-12/testing/user-auth-test-cases.md` |
| Gate D | `review/` | `docs/2026-05-12/review/user-auth-review.md` |
| Gate E | `shipping/` | `docs/2026-05-12/shipping/user-auth-launch.md` |

### 5.2 日期格式

- 格式：`<YYYY>-<MM>-<DD>`（模板变量）或具体日期如 `2026-05-12`
- 日期作为目录层级，位于 `docs/` 和 `subdir/` 之间
- ADR 文件例外：保留在 `docs/adr/` 永久目录，不按日期分目录

### 5.3 替换方法

Agent 文件批量替换使用 sed：
```
s|docs/\([^/]*\)/YYYY-MM-DD-\([^.]*\)\.md|docs/<YYYY>-<MM>-<DD>/\1/\2.md|g
```

Skill 文件使用精确逐文件编辑，确保精确匹配。

`e2e-test-expert.md` 中 `.spec.ts` 后缀路径额外手动修复。

## 6. 测试和验证结果

### 6.1 验证命令

```
# 检查 Agent 文件旧格式（应为 0）
grep -rn "docs/[a-z-]*/YYYY-MM-DD-" .claude/agents/ --include="*.md"

# 检查 6 个首要 Skill 文件旧格式（应为 0）
grep -rn "docs/[a-z-]*/YYYY-MM-DD-" .claude/skills/spec-driven-development/SKILL.md \
  .claude/skills/planning-and-task-breakdown/SKILL.md \
  .claude/skills/test-driven-development/SKILL.md \
  .claude/skills/code-review-and-quality/SKILL.md \
  .claude/skills/shipping-and-launch/SKILL.md \
  .claude/skills/documentation-and-adrs/SKILL.md
```

### 6.2 验证结果

| 检查项 | 结果 | 数量 |
|--------|------|------|
| Agent 文件旧格式残留 | 通过 | 0 条 |
| 6 个 Skill 文件旧格式残留 | 通过 | 0 条 |
| Agent 文件新格式应用 | 通过 | 71 处（56 个文件） |
| 6 个 Skill 文件新格式应用 | 通过 | 13 处 |
| browser-testing 未被修改 | 通过 | 保留 5 条旧格式（预期） |
| docs/tmp/ 未被修改 | 通过 | 全部正确保留 |
| docs/adr/ 未被修改 | 通过 | 全部正确保留 |

### 6.3 示例核对

选取代表性文件逐条核对：

- `spec-driven-development/SKILL.md:102` -- `docs/<YYYY>-<MM>-<DD>/requirements/<topic>-requirements.md` 正确
- `shipping-and-launch/SKILL.md:336` -- `docs/<YYYY>-<MM>-<DD>/shipping/<topic>-launch.md` 正确
- `planning-and-task-breakdown/SKILL.md:16` -- 产物路径段落正确，含具体日期示例 `docs/2026-05-12/tasks/user-auth-tasks.md`
- `backend-dev-expert.md` -- `docs/<YYYY>-<MM>-<DD>/implementation/<topic>-backend-implementation.md` 正确
- `planner.md` -- `docs/<YYYY>-<MM>-<DD>/plans/<topic>-plan.md` 正确
- `qa-review-expert.md` -- 5 处全部更新为 `docs/<YYYY>-<MM>-<DD>/<subdir>/<topic>-<type>.md` 正确

## 7. 数据与接口边界

- 本次变更仅涉及 Markdown 文档模板中的路径说明，不涉及实际文件系统操作
- 不影响现有 `docs/` 目录下已经落盘的文档（它们遵循产出时的规范）
- 新旧文档并存期间，根据日期目录的存在与否可区分格式

## 8. 风险 / 未解决项

| 风险 | 说明 | 影响 |
|------|------|------|
| browser-testing SKILL.md 未更新 | 不在本次允许路径范围 | 低风险 -- 后续单独更新 |
| .claude/ 目录 gitignore | 变更无法通过 git diff 审查 | 实际情况 -- 内容变更已通过 grep 验证 |
| ADR 路径不变 | `docs/adr/` 保持永久目录，不按日期分目录 | 预期行为 -- ADR 是跨版本持久归档 |

## 9. 需要前端配合的点

无。本次变更仅涉及 `.claude/` 下的后端 Skills 和 Agents 定义文件。

## 10. 推荐的下一步

1. 更新 `browser-testing/SKILL.md` -- 将 5 处旧格式路径更新为新格式
2. 更新 `AGENTS.md` 中如有引用旧格式的路径说明
3. 考虑在 `CLAUDE.md` 中添加文档目录结构规范的总则说明
