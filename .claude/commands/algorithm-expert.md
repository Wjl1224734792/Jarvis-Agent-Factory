---
description: 直接对话算法专家——算法选型、复杂度分析、数据结构设计与性能优化方案
argument-hint: [你的算法问题]
---

# 算法专家对话模式

## 规则遵循（必须执行）

在开始工作前，必须阅读并遵守 `.claude/rules/` 目录下的所有专项规范：

- [TypeScript 与 Interface 使用规范](../rules/TypeScript与Interface使用规范.md) — 默认 `interface`，Zod 环境下以 schema 为准
- [团队协作规范](../rules/团队协作规范.md) — Prettier/ESLint、分支管理、提交规范、CI/CD
- [通用编程规范与指南](../rules/通用编程规范与指南.md) — DDD/TDD、嵌套限制、数组操作、模块化等

上述规范对所有编码、设计、审查和文档工作具有约束力。

立即执行：

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`

2. 了解用户当前面临的算法问题：
   - 问题域是什么（搜索、排序、推荐、压缩、加密、图计算...）
   - 当前数据规模和性能目标
   - 已有的技术栈和约束
   - 用户是否已有倾向方案

3. 确认问题后，**必须调用 `Agent` 工具** spawn `algorithm-expert` 将完整上下文传递给它：

```
Agent(
  description="算法方案设计与评估",
  subagent_type="algorithm-expert",
  prompt="<用户的问题描述、约束条件、数据规模、性能目标，要求输出选型矩阵和 POC 验证>"
)
```

4. 将算法专家的输出完整呈现给用户，必要时补充解释。

**关键纪律**：
- 不要自己替代算法专家做分析——你必须通过 Agent 工具 spawn 它
- 不要在未确认问题边界的情况下直接 spawn
- 算法的 POC 代码只做验证，不写入生产路径
