# 架构评审类 Agent 角色描述更新

## 修复目标

在 4 个架构评审类 Agent 模板的 `description` 字段中，明确提及"在 Gate B1 架构评审阶段由编排者 spawn"，使角色定位与流水线编排设计一致。

## 对应 finding / task ID

- 流水线 Gate 重构配套变更：将架构评审类 agent 从之前的"按需调用"模式迁移到 Gate B1 阶段由编排者 spawn 的模式。

## 变更文件 / 变更范围

以下 4 个文件，每文件仅修改 YAML frontmatter 的 `description` 字段（第 3 行）：

| 文件 | 修改前关键词 | 修改后关键词 |
|------|------------|------------|
| `src/templates/platforms/claude/agents/frontend-architect.md` | "在规划阶段或架构评审时按需调用" | "在规划阶段或 Gate B1 架构评审时由编排者 spawn" |
| `src/templates/platforms/claude/agents/backend-architect.md` | "在规划阶段或架构评审时按需调用" | "在规划阶段或 Gate B1 架构评审时由编排者 spawn" |
| `src/templates/platforms/claude/agents/database-architect.md` | "负责数据库架构设计..." | "在 Gate B1 架构评审阶段由编排者 spawn（当有 Schema 变更时）；负责数据库架构设计..." |
| `src/templates/platforms/claude/agents/algorithm-expert.md` | "在规划阶段或实现阶段按需调用" | "在规划阶段或 Gate B1 架构评审时由编排者 spawn（当涉及复杂算法/计算密集型模块时）" |

未修改：文件名、id、tools、effort、model 等 frontmatter 字段，以及文件正文内容。

## 修复说明

每个文件的 `description` 字段调整如下：

1. **frontend-architect.md** — 将"在规划阶段或架构评审时按需调用"替换为"在规划阶段或 Gate B1 架构评审时由编排者 spawn"，其余职责描述不变。
2. **backend-architect.md** — 同上替换。
3. **database-architect.md** — 原描述缺少 spawn 条件。新增"在 Gate B1 架构评审阶段由编排者 spawn（当有 Schema 变更时）"前缀，与原职责合并。
4. **algorithm-expert.md** — 将"在规划阶段或实现阶段按需调用"替换为"在规划阶段或 Gate B1 架构评审时由编排者 spawn（当涉及复杂算法/计算密集型模块时）"，其余职责描述不变。

所有修改均保持 YAML 双引号字符串格式一致，无语法破坏。

## 验证命令与结果

4 个文件已通过 git diff 确认修改内容准确：

```
$ git diff -- src/templates/platforms/claude/agents/frontend-architect.md
-description: "前端架构师：在规划阶段或架构评审时按需调用；..."
+description: "前端架构师：在规划阶段或 Gate B1 架构评审时由编排者 spawn；..."

$ git diff -- src/templates/platforms/claude/agents/backend-architect.md
-description: "后端架构师：在规划阶段或架构评审时按需调用；..."
+description: "后端架构师：在规划阶段或 Gate B1 架构评审时由编排者 spawn；..."

$ git diff -- src/templates/platforms/claude/agents/database-architect.md
-description: "数据库专项专家：负责数据库架构设计..."
+description: "数据库专项专家：在 Gate B1 架构评审阶段由编排者 spawn（当有 Schema 变更时）；负责数据库架构设计..."

$ git diff -- src/templates/platforms/claude/agents/algorithm-expert.md
-description: "算法专家：在规划阶段或实现阶段按需调用；..."
+description: "算法专家：在规划阶段或 Gate B1 架构评审时由编排者 spawn（当涉及复杂算法/计算密集型模块时）；..."
```

逐文件读取前 5 行确认 YAML frontmatter 解析正常，无格式破坏。

## 未处理风险

- 这些 Agent 模板正文中的"工作流编排位置"章节仍保留旧的编排描述（如"上游：规划阶段由 planner 或编排者 在涉及前端架构决策时调用"），未同步更新。这是独立于 `description` 字段的正文内容，不在本次修改范围内。建议后续统一更新。

## 推荐的下一步

1. 同步更新各 Agent 模板正文中"工作流编排位置"章节的上游描述，使其与 `description` 字段的 Gate B1 spawn 模型一致。
2. 检查其他 Agent 模板（`change-review-expert.md`、`fix-retest.md` 等）是否已完成类似的 Gate 归属描述更新。
