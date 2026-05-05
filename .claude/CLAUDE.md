# .claude/CLAUDE.md

## 规范遵循（强制）

**所有工作、所有子代理、所有技能调用，必须无条件遵守以下规范文件。不可跳过、不可简化、不可凭记忆替代。**

### 核心规范文件

子代理在开始任何工作前，必须使用 `Read` 工具读取以下规范文件：

1. **[TypeScript 与 Interface 使用规范](rules/TypeScript与Interface使用规范.md)** — 默认 `interface`，Zod 环境下以 schema 为准
2. **[团队协作规范](rules/团队协作规范.md)** — Prettier/ESLint、分支管理、提交规范、CI/CD
3. **[通用编程规范与指南](rules/通用编程规范与指南.md)** — DDD/TDD、嵌套限制、数组操作、模块化等

### 规则遵循要求

- 每个子代理启动时，必须已读取或立即读取上述三份规范文件
- 代码输出必须与规范逐条对照，违反规范即为不通过
- 规范冲突时，以 `.claude/rules/` 下的专项规范为准
- 发现规范覆盖不到的场景，不得自行假设——回退主控确认

## 模型分配规则

| 模型 | 适用场景 | 分配对象 |
|------|---------|---------|
| `mimo-v2.5-pro` | 无联网搜索，复杂任务（MAX effort） | backend-implementer, database-specialist, frontend-implementer, performance-audit-reviewer, planner, post-change-reviewer, project-audit-reviewer, remediation-planner, review-qa, task-design |
| `mimo-v2.5` | 无联网搜索，专项任务（HIGH effort） | 其余所有专项 worker（android/ios/flutter/taro/rn/frontend/backend worker 等） |
| `deepseek-v4-pro` | 需要 WebSearch/WebFetch | algorithm-expert, backend-architect, diff-code-reviewer, frontend-architect, review-fix-optimize, review-only, security-auditor |
| `deepseek-v4-flash` | 需要 WebSearch/WebFetch，轻量探索 | docs-researcher, repo-explorer |

### 核心原则

- **小米 Mimo 系列模型不用于联网搜索**（WebSearch/WebFetch），该场景统一使用 DeepSeek
- Mimo-V2.5-Pro 用于高复杂度实现与规划类 agent
- Mimo-V2.5 用于范围明确、逻辑集中的专项任务

## 子代理

子代理定义在 `.claude/agents/`，通过 Agent 工具调度。子代理不互相调用。

## 技能

技能定义在 `.claude/skills/`，通过 Skill 工具加载。
