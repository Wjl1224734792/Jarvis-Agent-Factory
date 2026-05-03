# .claude/CLAUDE.md

## 规范遵循

所有工作必须遵守以下规范：

- **[TypeScript 与 Interface 使用规范](rules/TypeScript与Interface使用规范.md)** — 默认 `interface`，Zod 环境下以 schema 为准
- **[团队协作规范](rules/团队协作规范.md)** — Prettier/ESLint、分支管理、提交规范、CI/CD
- **[通用编程规范与指南](rules/通用编程规范与指南.md)** — DDD/TDD、嵌套限制、数组操作、模块化等

## 子代理

子代理定义在 `.claude/agents/`，通过 Agent 工具调度。子代理不互相调用。

## 技能

技能定义在 `.claude/skills/`，通过 Skill 工具加载。
