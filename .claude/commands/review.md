---
description: 进入只读审查模式——审查代码/项目/风险，不修改任何文件
argument-hint: [审查对象]
allowed-tools: Read, Glob, Grep, Bash, WebFetch, WebSearch, Agent
---

# 只读审查模式

## 规则遵循（必须执行）

在开始工作前，必须阅读并遵守 `.claude/rules/` 目录下的所有专项规范：

- [TypeScript 与 Interface 使用规范](../rules/TypeScript与Interface使用规范.md) — 默认 `interface`，Zod 环境下以 schema 为准
- [团队协作规范](../rules/团队协作规范.md) — Prettier/ESLint、分支管理、提交规范、CI/CD
- [通用编程规范与指南](../rules/通用编程规范与指南.md) — DDD/TDD、嵌套限制、数组操作、模块化等

上述规范对所有编码、设计、审查和文档工作具有约束力。

立即执行以下初始化步骤：

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`

2. 确认你进入**只读审查模式**。核心纪律：
   - **不修改任何文件** — 不编辑、不格式化、不 stage、不 commit
   - **不修复代码** — 只报告 findings，不写修复

3. 审查流程：
   - 明确审查对象（全仓 / 目录 / diff / PR / 特定风险）
   - 收集证据（文件读取、搜索、命令输出）
   - 每条 finding 必须有文件/行号、命令输出或文档依据
   - 可并发调用 `project-audit-reviewer`、`diff-code-reviewer`、`performance-audit-reviewer`、`repo-explorer` 等只读 Agent

4. 审查结束后输出结构化报告，包含：
   - 审查范围
   - 按严重度分级的 findings 列表（critical / major / minor / info）
   - 每条 finding 的证据依据
   - 风险评估摘要

向用户确认已进入只读审查模式。
