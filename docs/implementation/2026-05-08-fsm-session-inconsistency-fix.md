# TASK-002：修复 FSM 会话不一致问题 — 后端实现

## 1. 当前实现目标

移除所有 MCP 工具和 Web API 中的 `|| 'legacy'` / `getSessions(db)[0]?.id` 回退逻辑，确保多会话并发时 Gate 操作不会错误地共享 'legacy' 会话状态。

## 2. 对应需求 ID / 任务 ID

- 需求 ID：TASK-002
- 任务描述：修复 FSM 会话不一致问题

## 3. 输入依据

- 编排者下发的 TASK-002 任务描述
- 项目根 `CLAUDE.md` 与 `AGENTS.md` 约定
- 通用编程规范与指南

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 变更行数 |
|------|---------|---------|
| `src/engine/server.js` | 8 处 `|| 'legacy'` 替换为 session_id 缺失错误返回 | ~16 行 |
| `src/web/routes.js` | 2 处 `getSessions(db)[0]?.id` 替换为 HTTP 400 错误 | ~4 行 |
| `src/web/views/pipeline.html` | 2 处 JS 函数添加 selectedSession 守卫 + URL 修复 | ~3 行 |

## 5. 实现说明

### 5.1 根因

8 个 MCP 工具在 `extra?.sessionId` 为空时静默回退到 `'legacy'` 字符串，导致所有未携带 session_id 的 MCP 客户端操作共享同一个会话状态。Web API 端 `/api/gate/:gate/enforce` 和 `POST /api/gate/advance` 使用 `getSessions(db)[0]?.id` 作为默认值，当用户未选择会话时错误地使用第一个会话。

### 5.2 MCP 工具修改（`src/engine/server.js`）

对以下 8 个工具，将：
```js
const sid = extra?.sessionId || 'legacy';
```
改为：
```js
const sid = extra?.sessionId;
if (!sid) return resp({ error: 'session_id required. Call session_join first.' });
```

修改的工具：
- `pipeline_init`（L241）
- `pipeline_status`（L254）
- `gate_enforce`（L285）
- `advance_gate`（L304）
- `gate_jump`（L329）
- `report_status`（L347）
- `gate_check`（L373）
- `pipeline_guide`（L397）

**不修改的工具：**
- `session_join`：它是创建 session_id 的唯一入口，`extra?.sessionId || s${Date.now()}` 回退是正确设计
- `session_leave`：已不存在 `|| 'legacy'`，sessionId 缺失时已安全返回 `{ ok: true }`
- `session_heartbeat`：已被 linter 重写为回退更新所有 active 会话心跳（TASK-003 负责）
- `session_list`、`agent_config`、`platform_info`：不依赖 session_id

### 5.3 Web API 修改（`src/web/routes.js`）

**`GET /api/gate/:gate/enforce`**（L112-113）：
```js
// 旧
const sid = c.req.query('session_id') || (getSessions(db)[0]?.id);
// 新
const sid = c.req.query('session_id');
if (!sid) return c.json({ error: 'session_id query parameter required' }, 400);
```

**`POST /api/gate/advance`**（L128-129）：
```js
// 旧
const sid = body.session_id || (getSessions(db)[0]?.id);
// 新
const sid = body.session_id;
if (!sid) return c.json({ error: 'session_id required in request body' }, 400);
```

### 5.4 前端修改（`src/web/views/pipeline.html`）

**`checkGate()`**（L451）：添加 selectedSession 守卫，并修复 URL 构造（`&session_id=` → `?session_id=`）：
```js
if (!selectedSession) { toast('请先选择一个会话', false); return; }
const d = await fetchAPI('/api/gate/' + gate.replace(/ /g, '_') + '/enforce?session_id=' + selectedSession);
```

**`advanceGate()`**（L462）：添加 selectedSession 守卫：
```js
if (!selectedSession) { toast('请先选择一个会话', false); return; }
```

### 5.5 额外修复

`checkGate()` 函数的 URL 构造原本使用 `&session_id=` 拼接，在无 `?` 前缀时不构成合法查询字符串。因为后端原来有回退逻辑，该 bug 被掩盖。此变更一并修正为 `?session_id=`。

## 6. 测试和验证结果

### 自动化检查

```
$ node --check src/engine/server.js
OK

$ node --check src/web/routes.js
OK
```

### 代码搜索确认

- `src/engine/server.js`：零残留 `|| 'legacy'`
- `src/web/routes.js`：零残留 `getSessions(db)[0]`
- 8 个 MCP 工具均有 `session_id required. Call session_join first.` 错误返回
- 2 个 Web API 端点均有 HTTP 400 错误返回

## 7. 数据与接口边界

### 向后兼容影响

**破坏性变更**：之前未携带 session_id 的调用将不再静默工作，而是收到明确错误：

| 调用方 | 旧行为 | 新行为 |
|--------|-------|--------|
| MCP 客户端未 join 即调用 Gate 工具 | 静默共享 'legacy' 会话 | 返回错误 `session_id required` |
| Web API 未传 session_id query | 使用第一个会话 | HTTP 400 |
| Web API 未传 session_id body | 使用第一个会话 | HTTP 400 |
| 前端未选会话点 Gate 行 | 发送空 session_id（后端回退） | Toast 提示"请先选择一个会话" |

### 数据迁移：无

不涉及数据库结构变更。

## 8. 风险 / 未解决项

| 风险 | 严重度 | 缓解措施 |
|------|-------|---------|
| 旧 MCP 客户端未适配 session_join 流程 | 中 | 错误消息包含 `Call session_join first.` 指导 |
| session_leave 已在之前修改过 — 无需额外改动 | 无 | 已确认无需修改 |

## 9. 需要前端配合的点

- 前端 `checkGate()` 和 `advanceGate()` 已添加 selectedSession 守卫，Toast 提示用户先选会话
- 前端 URL 构造已从 `&session_id=` 修正为 `?session_id=`

## 10. 推荐的下一步

- TASK-003：完善 `session_heartbeat` 心跳机制（linter 已做初步修改，需审查和测试）
- Gate C2 阶段：由 test agent 编写针对 session 隔离的测试用例
