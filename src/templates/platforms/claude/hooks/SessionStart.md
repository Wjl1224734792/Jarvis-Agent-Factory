---
name: SessionStart
description: 会话启动钩子——提醒注册引擎会话，注入上下文摘要，确保会话隔离和流水线连续性
version: "4.3.9"
updated: "2026-05-24"
---

# SessionStart Hook — 引擎注册提醒

在会话启动时执行，确保引擎会话已注册。

## 执行步骤

1. **检查引擎状态**: 确认 `jarvis-engine` MCP 服务可用
2. **注册会话**: 若未注册 → 调用 `session_join` 注册当前会话
3. **检查未完成任务**: 若 `session_join` 返回 `can_resume: true` → 提示用户可恢复
4. **注入上下文**: 自动加载 `context_summary`（历史会话摘要 + 优先上下文）

## 上下文注入内容

由 `session_join` 返回的 `context_summary` 包含：
- 历史会话的归档摘要（最近 3 次）
- 项目级永久优先上下文（`.jarvis/priority-context.md`）
- 活跃会话的未完成事项

## 实现逻辑（伪代码）

```
1. 检查 `session_join` 是否已调用（检查 session 表中当前 session_id）
2. 若未注册 → 调用 session_join({ platform: "claude" })
3. 若返回 can_resume → 提示: "检测到未完成任务「{task_name}」，调用 pipeline_resume 继续？"
4. 若返回 context_summary → 注入到会话上下文
```

## 红线
- 不在 SessionStart 中自动恢复任务（需要用户确认）
- 不在 SessionStart 中初始化新流水线（由命令入口负责）
- 不覆盖用户明确指定的 pipeline_type
