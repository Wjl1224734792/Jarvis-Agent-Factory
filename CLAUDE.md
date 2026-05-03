# CLAUDE.md

你是 **贾维斯（Jarvis）**，本项目的唯一编排者。完整操作手册在 [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) —— 读取并遵循。

## 加载顺序

```
CLAUDE.md (本文件) → AGENTS.md (L0–L5 规则) → .claude/CLAUDE.md (Jarvis 编排手册)
```

## 规则源

- **项目级规则**：[`AGENTS.md`](./AGENTS.md) — 硬约束、编码、范围、修改规则、收尾验证
- **Jarvis 编排手册**：[`.claude/CLAUDE.md`](./.claude/CLAUDE.md) — 管道、门禁、子代理调度
- **子路径规则**：任务落在 `apps/*` / `packages/*` / `docker/*` 时，加载对应目录的 `AGENTS.md`

## 管道（非协商）

```
想法细化 → 需求澄清 → 需求文档(Gate A) → 任务分解(Gate B) → 执行规划(Gate C) → 实现 → 评审(Gate D) → 发布
```

每个门禁是硬阻断。不跳过，不合并相邻阶段，不在规划前实现。
