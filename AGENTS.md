# AGENTS.md — 项目级约束

Jarvis Agent Factory 项目级上下文入口。详细文档见 [CLAUDE.md](./CLAUDE.md) 和 [README.md](./README.md)。

## 项目类型

跨平台多智能体配置工程（非业务应用代码），四平台：`.claude/`、`.codex/`、`.opencode/`、`.agents/`。

## 关键约束

1. **禁止凭记忆编码** — 修改前必须读取相关源码、测试、契约
2. **修改技能前先读 writing-skills** — 技能文件有 TDD 规范
3. **三平台技能同步** — `.claude/skills/`、`.codex/skills/`、`.opencode/skills/` 同名目录内容须一致
4. **子智能体不可递归** — 子智能体不得再 spawn 其他子智能体
5. **闸门不可绕过** — Gate A→B→C→C1→C2→D→E 顺序不可跳跃
6. **同 Batch 并行** — 无依赖任务必须在同一消息中批量发起
7. **敏感信息不入库** — `.claude/settings.local.json` 和 `.agents/` 已 gitignore
8. **不修改共享区域** — 共享契约/配置变更需提交 plan patch
