# CLAUDE.md

## 加载链路

```
CLAUDE.md (本文件) → AGENTS.md (L0–L5 代码约束)
  → .claude/CLAUDE.md (agent 配置、模型分配、技能)
    → .claude/rules/ (专项编程规范)
      → .claude/agents/ (子代理定义)
```

## 规则源

| 层级 | 文件 | 内容 |
|------|------|------|
| 项目级约束 | [`AGENTS.md`](./AGENTS.md) | L0–L5：硬约束、编码、范围、修改规则、收尾验证 |
| Agent 配置 | [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) | 模型分配规则、规范遵循要求、技能体系 |
| 专项规范 | [`.claude/rules/`](./.claude/rules/) | TypeScript/Interface、团队协作（Prettier/ESLint/提交/CI）、通用编程规范（DDD/TDD/嵌套/数组等） |
| 子代理定义 | [`.claude/agents/`](./.claude/agents/) | 47 个专项子代理，含模型分配和规则遵循声明 |
| 子路径规则 | `apps/*/AGENTS.md` · `packages/AGENTS.md` · `docker/AGENTS.md` | 按工作目录自动加载 |

## 模式入口

通过 `.claude/commands/` 目录下的命令进入不同工作模式：
- `/jarvis` — 贾维斯编排模式（需求→文档→任务→计划→实现→评审→发布）
- `/review` — 只读审查模式
- `/review-fix` — 审查修复优化闭环
