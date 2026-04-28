# .claude/CLAUDE.md

本文件为 Claude Code 在 `.claude/` 下的专属入口。补充规则以 [`.claude/AGENTS.md`](./AGENTS.md) 为准，本文件仅做路由。

## 规则源

- **Claude 专属规则**：[`.claude/AGENTS.md`](./AGENTS.md)
- **项目级规则**：[`AGENTS.md`](../AGENTS.md) — L0–L5 全部约束
- **子路径规则**：任务落在 `apps/*` / `packages/*` / `docker/*` 时，加载对应目录的 `AGENTS.md`

## 与 Codex 的兼容

本仓库同时支持 Claude Code（读取 `CLAUDE.md`）和 Codex（读取 `AGENTS.md`）两种模式：

| 模式 | 入口文件 | 规则加载路径 |
|------|---------|-------------|
| Claude Code | `CLAUDE.md` → `AGENTS.md` | L0–L5 + `.claude/CLAUDE.md` |
| Codex | `AGENTS.md` | L0–L5 + `.codex/AGENTS.md` |

所有可执行规则统一在 `AGENTS.md` 系列文件中维护，`CLAUDE.md` 仅做路由，不复制规则正文。
