# CLAUDE.md

## 规则加载

```
CLAUDE.md (本文件) → AGENTS.md (L0–L5 规则) → .claude/rules/ (专项规范)
```

## 规则源

- **项目级规则**：[`AGENTS.md`](./AGENTS.md) — 硬约束、编码、范围、修改规则、收尾验证
- **专项规范**：[`.claude/rules/`](./.claude/rules/) — TypeScript/Interface 规范、团队协作规范（Prettier/ESLint/提交/CI）、通用编程规范（DDD/TDD/嵌套/数组等）
- **子路径规则**：任务落在 `apps/*` / `packages/*` / `docker/*` 时，加载对应目录的 `AGENTS.md`

## 模式入口

通过 `.claude/commands/` 目录下的命令进入不同工作模式：
- `/jarvis` — 贾维斯编排模式（需求→文档→任务→计划→实现→评审→发布）
- `/review` — 只读审查模式
- `/review-fix` — 审查修复优化闭环
