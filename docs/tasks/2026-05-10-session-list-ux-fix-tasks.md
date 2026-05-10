# 会话列表 UX 修复 — 任务分解

## TASK-010：SSE 广播补全字段
- **REQ**: REQ-010
- **类型**: 直接开发
- **文件**: `src/web/routes.ts`
- **内容**：
  1. `broadcastSSE()` 返回对象增加 `heartbeat: s.last_heartbeat`
  2. `broadcastSSE()` 返回对象增加 `latest_run_started_at: s.latest_run_started_at || null`
- **验收**: `heartbeat` 和 `latest_run_started_at` 出现在 SSE 事件数据中

## TASK-011：session_join 支持 task_name
- **REQ**: REQ-011
- **类型**: 直接开发
- **文件**: `src/engine/server.ts`
- **内容**：
  1. `session_join` 工具 schema 增加可选 `task_name: z.string().optional()`
  2. 创建新 run 后，若传入 `task_name`，调用 `setRunTaskName(db, runId, task_name)`
- **验收**: 带 `task_name` 的 session_join 调用后，SSE 广播中 `task_name` 为传入值

## TASK-012：会话排序改为心跳时间
- **REQ**: REQ-012
- **类型**: 直接开发
- **文件**: `web/src/components/Layout.tsx`
- **内容**：
  1. 排序逻辑从比较 `latest_run_started_at` 改为比较 `heartbeat`（数字时间戳）
  2. 置顶会话优先级不变
- **验收**: 最近有 MCP 调用的会话排在前列
