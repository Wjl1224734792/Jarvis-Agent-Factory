---
name: Stop
description: 停止钩子——会话结束前提醒归档，确保未完成任务不被遗忘
version: "4.3.9"
updated: "2026-05-24"
---

# Stop Hook — 会话结束归档提醒

在会话停止前执行，确保工作状态被保存。

## 执行步骤

1. **检查活跃 Run**: 查询当前会话是否有 `status='active'` 的 pipeline run
2. **保存恢复数据**: 若有活跃 run → 调用 `advance_gate` 保存当前 checkpoint
3. **提醒未完成**: 若有活跃 run → 提示用户下次可调用 `pipeline_resume` 继续
4. **标记会话**: 将 session status 设为 `inactive`（而非删除）

## 非活跃超时

若会话超过 2 小时无心跳（`last_heartbeat < now - 7200000ms`），引擎自动标记为 `inactive`。下次 `session_join` 时自动恢复。

## 实现逻辑（伪代码）

```
1. 检查当前会话是否有 active run
2. 若有 → 保存 resume_data（gate/checkpoint/task_name）
3. 输出摘要: "会话已保存 — 任务「{task_name}」进行到 {current_gate}，下次恢复即可继续"
4. 若无 → 静默退出
```

## 红线
- 不自动 archive/cancel run（保留恢复能力）
- 不删除 session（下次 session_join 可恢复）
- 不强制用户确认（非阻塞提示）
