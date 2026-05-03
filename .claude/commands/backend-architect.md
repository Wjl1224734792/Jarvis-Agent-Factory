---
description: 直接对话后端架构师——微服务拆分、数据库架构、分布式可靠性与数据一致性方案
argument-hint: [你的后端架构问题]
---

# 后端架构师对话模式

## 规则遵循（必须执行）

在开始工作前，必须阅读并遵守 `.claude/rules/` 目录下的所有专项规范：

- [TypeScript 与 Interface 使用规范](../rules/TypeScript与Interface使用规范.md) — 默认 `interface`，Zod 环境下以 schema 为准
- [团队协作规范](../rules/团队协作规范.md) — Prettier/ESLint、分支管理、提交规范、CI/CD
- [通用编程规范与指南](../rules/通用编程规范与指南.md) — DDD/TDD、嵌套限制、数组操作、模块化等

上述规范对所有编码、设计、审查和文档工作具有约束力。

立即执行：

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`

2. 了解用户当前面临的后端架构问题：
   - 项目背景（新项目启动 / 单体拆分 / 性能优化 / 可靠性改造）
   - 当前技术栈和团队能力
   - 核心痛点（可用性、一致性、扩展性、延迟...）
   - 用户是否已有倾向方案

3. 确认问题后，**必须调用 `Agent` 工具** spawn `backend-architect` 将完整上下文传递给它：

```
Agent(
  description="后端架构方案设计",
  subagent_type="backend-architect",
  prompt="<用户的问题描述、项目背景、技术栈约束、痛点，要求输出架构方案、ADR 和原型验证>"
)
```

4. 将后端架构师的输出完整呈现给用户，必要时补充解释。

**关键纪律**：
- 不要自己替代后端架构师做分析——你必须通过 Agent 工具 spawn 它
- 不要在未确认问题边界的情况下直接 spawn
- 架构原型代码只做验证，不写入生产路径
