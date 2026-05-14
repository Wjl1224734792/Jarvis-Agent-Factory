# REQ: 清理 agent_event 统计 + 修复 hook 流水线同步

## REQ-001: 删除 SubagentStart/SubagentStop hooks

`src/install.ts` 的 `installHooks()` 函数中：
- 删除 `SubagentStart` hook（第 197 行附近）
- 删除 `SubagentStop` hook（第 198 行附近）
- 保留 `PostToolUse` hooks（Gate 写代码管控）
- 保留 `Stop` hook（状态同步）

## REQ-002: 删除 agent_event hook 脚本

- 删除 `src/templates/scripts/agent-event.sh`
- 删除 `src/templates/scripts/agent-event.ps1`

## REQ-003: 删除 agent_event MCP 工具注册

`src/engine/server.ts` 第 844-914 行：
- 删除 `server.tool('agent_event', ...)` 完整注册代码
- 保留 pubsub 中 `emitEvent('agent:event', ...)` 相关逻辑（如有其他依赖则保留）

## REQ-004: 删除 Web 路由

`src/web/routes.ts`：
- 删除 `GET /api/agent-events` 路由（第 686-692 行）
- 删除 `POST /api/agent-event` 路由（第 695-750 行）
- if `pubsub.emitEvent` 仍被其他地方引用则保留 emitEvent 函数

## REQ-005: 删除 Web 前端 API 客户端代码

`web/src/api.ts`：
- 删除 `AgentEvent` 接口（第 66-70 行）
- 删除 `agentEvents()` 方法（第 178-179 行）

## REQ-006: 数据库层兼容

`src/engine/db.ts`：
- 保留 `agent_events` 表结构（不回删已有数据）
- 若 `insertAgentEvent` 等函数无调用方可保留但标记废弃

## REQ-007: 确认 PostToolUse hooks 正确触发 Gate 同步

- `PostToolUse` for Agent → jarvis hook gate-check ✅ 保留
- `PostToolUse` for Write/Edit → jarvis hook gate-check --operation write_code ✅ 保留
- `Stop` → jarvis hook status ✅ 保留
