# 会话列表 UX 修复

## 背景

Web 面板左侧会话列表存在 3 个问题：

1. **时间不显示**：`broadcastSSE()` 未包含 `heartbeat` 字段，前端 `timeStr` 始终为空
2. **排序不工作**：`broadcastSSE()` 未包含 `latest_run_started_at`，前端使用 `undefined` 排序无效
3. **标题无意义**：`session_join` 不接受 `task_name`，Agent 无法在创建会话时设置标题；默认标题仅为「项目名 · 月-日」

## REQ 清单

### REQ-010：SSE 广播补全字段
- **类型**：直接开发（Bug 修复）
- **文件**：`src/web/routes.ts:27-41`
- **内容**：
  1. `broadcastSSE()` 增加 `heartbeat` 字段（取值 `s.last_heartbeat`）
  2. `broadcastSSE()` 增加 `latest_run_started_at` 字段（取值 `s.latest_run_started_at || null`）
- **验收**：
  1. 前端会话列表每条显示 `HH:MM` 格式时间
  2. 列表按心跳时间降序排列（最近活跃在前）

### REQ-011：session_join 支持 task_name
- **类型**：直接开发
- **文件**：`src/engine/server.ts:274-279`
- **内容**：
  1. `session_join` MCP 工具增加可选 `task_name` 参数
  2. 若传入 `task_name`，创建 session 时自动调用 `setRunTaskName()`
- **验收**：
  1. Agent 调用 `session_join({ ..., task_name: "修复登录Bug" })` 后，Web 面板显示该标题
  2. 不传 `task_name` 时行为不变（自动生成默认标题）

### REQ-012：会话排序改为心跳时间
- **类型**：直接开发
- **文件**：`web/src/components/Layout.tsx:235-241`
- **内容**：
  1. 排序字段从 `latest_run_started_at` 改为 `heartbeat`
  2. 置顶 (pinned) 优先级不变，仍然排在最前
- **验收**：
  1. 最近有 MCP 调用的会话排在最前
  2. 置顶会话始终在最前，不受心跳排序影响
