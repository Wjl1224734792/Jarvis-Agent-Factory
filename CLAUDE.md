# CLAUDE.md

本文件为 Claude Code 入口。所有可执行规则以 [AGENTS.md](./AGENTS.md) 为准，本文件仅做路由。

## 加载顺序

```
CLAUDE.md (本文件) → AGENTS.md (L0–L5 规则) → .claude/CLAUDE.md (Claude 专属补充)
```

## 规则源

- **项目级规则**：[`AGENTS.md`](./AGENTS.md) — 硬约束、编码、范围、修改规则、收尾验证
- **Claude 专属补充**：[`.claude/CLAUDE.md`](./.claude/CLAUDE.md)
- **子路径规则**：任务落在 `apps/*` / `packages/*` / `docker/*` 时，加载对应目录的 `AGENTS.md`
