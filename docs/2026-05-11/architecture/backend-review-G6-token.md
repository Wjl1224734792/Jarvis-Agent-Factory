# 后端架构评审报告 -- Agent 事件追踪与 Token 可视化基础设施

> 日期: 2026-05-11 | 评审者: 后端架构师 | 来源: REQ-G6-visualization-hooks-token

---

## 1. 评审概要

| 维度 | 评分 | 说明 |
|------|------|------|
| DB Schema 设计 | 6/10 | 基础结构合理，但缺失关键字段，生成列与索引策略需修正 |
| MCP 工具 API | 7/10 | Zod schema 设计正确，但 model 字段缺失导致成本估算链路断裂 |
| REST API | 8/10 | 端点设计风格一致，SSE 扩展方案可行，但缺 POST 接收端点 |
| Plugin/Hook 架构 | 6/10 | 架构可行但核心假设未验证，备选方案路径不完整 |
| 性能 | 7/10 | 写入频率可控，但查询模式可优化，缺少清理策略 |
| 安全性 | 6/10 | 缺少归属验证，agent_id 无白名单校验，session 上下文需加固 |
| 整体可交付性 | 有条件通过 | 5 个阻塞项必须修复后方可进入实现阶段 |

---

## 2. DB Schema 设计评审

### 2.1 当前方案（来自 REQ-054）

```sql
CREATE TABLE agent_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- 'start' | 'end' | 'error'
  status TEXT,               -- 'success' | 'error' | null
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_creation_input_tokens INTEGER DEFAULT 0,
  cache_read_input_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (
    input_tokens + output_tokens + cache_creation_input_tokens + cache_read_input_tokens
  ) STORED,
  error_message TEXT,
  started_at TEXT,
  ended_at TEXT,
  duration_ms INTEGER
);
CREATE INDEX idx_agent_events_run ON agent_events(run_id, agent_id);
```

### 2.2 Findings

#### 发现 1（阻塞）：缺少 `model` 字段，成本估算链路不完整

`agent_events` 表没有 `model` 字段。REQ-054 要求"根据 Agent 配置的 `defaultModel` 查询对应模型单价"，但 `defaultModel` 只是 Agent 配置文件的静态值，不代表该次调用实际使用的模型。在 Claude Code 的 `SubagentEnd` hook 中，`token_usage` 对象通常包含 `model` 信息，应一并记录。

**影响**: `MODEL_PRICES` 硬编码表无法与实际事件关联，成本估算不可靠。

**建议修改**:
```sql
model TEXT,  -- 实际使用的模型 ID，如 'claude-sonnet-4-6'
```

同时，MODEL_PRICES 表需使用当前代码库中实际模型 ID（gates.ts 中的 `AVAILABLE_MODELS`），而非需求文档中的旧 ID：
- `claude-sonnet-4-6` (非 `claude-sonnet-4-20250514`)
- `claude-opus-4-7` (非 `claude-opus-4-20250514`)
- `claude-haiku-4-5` (非 `claude-haiku-4-20250514`)

#### 发现 2（阻塞）：`duration_ms` 与现有 `duration_seconds` 不一致

项目中已有的 `checkpoints` 表使用 `duration_seconds`（INTEGER，秒），而新表使用 `duration_ms`（毫秒）。同一数据库内两个时间单位的 duration 字段会增加理解和维护成本。现有 `pipeline_runs` 表的 `total_duration_seconds` 也是秒。

**建议**: 要么统一为 `duration_ms`（精度更高，推荐），要么保持 `duration_seconds`。选择其一后，在 ADR 中记录统一策略。建议选择 `duration_ms`，同时对已有 `duration_seconds` 保持不变（向后兼容）。

#### 发现 3（严重）：生成列 `total_tokens` 使用 `STORED` 在 SQLite 中占用额外存储

`GENERATED ALWAYS AS (...) STORED` 在 SQLite 中会将计算值物理存储在表中。对于 token 统计场景（4 个整数的和），计算成本极低，使用 `VIRTUAL` 更合适：不占用存储，查询时计算。

```sql
total_tokens INTEGER GENERATED ALWAYS AS (
  input_tokens + output_tokens + cache_creation_input_tokens + cache_read_input_tokens
) VIRTUAL
```

#### 发现 4（中危）：缺少 `created_at` 字段

现有表（`pipeline`, `checkpoints`, `artifacts`）都有时间戳字段。`agent_events` 缺少记录写入时间的字段，无法做时间范围查询和事件排序（`started_at` 是事件发生时间，不是记录写入时间）。

**建议**: 添加 `created_at TEXT DEFAULT (datetime('now'))` 或类似字段。

#### 发现 5（中危）：索引策略不完整

当前只有 `idx_agent_events_run ON (run_id, agent_id)`。

缺失的索引场景：
- **agent_status 查询**: 查找 event_type='start' 但无对应 end 的 Agent。需要 `(run_id, agent_id, event_type)` 联合索引。
- **agent_usage 查询**: 按 run_id 聚合 token 统计。`(run_id, event_type)` 可加速过滤。

**建议索引策略**:
```sql
CREATE INDEX idx_agent_events_run ON agent_events(run_id, agent_id, event_type);
CREATE INDEX idx_agent_events_lookup ON agent_events(run_id, agent_id, event_type, started_at);
```

其中 `idx_agent_events_lookup` 覆盖 `agent_status` 查询（查找 start 事件后是否有对应 end/error）。

#### 发现 6（信息）：event_type 可用 CHECK 约束加固

```sql
event_type TEXT NOT NULL CHECK(event_type IN ('start', 'end', 'error'))
```

#### 发现 7（信息）：WAL 兼容性良好

项目已使用 `PRAGMA journal_mode=WAL`，新表自动继承 WAL 模式。`node:sqlite`（DatabaseSync）原生支持 WAL。无需额外处理。

---

## 3. MCP 工具 API 设计评审

### 3.1 工具注册方案

三个工具将在 `registerMcpTools()` 中注册，遵循现有模式：
- 使用 `server.tool(name, description, schema, handler)` 注册
- 使用 `resolveSid(extra)` 获取 session 上下文
- 使用 `resp(obj)` 包装返回数据

### 3.2 Findings

#### 发现 8（阻塞）：agent_event 缺少 model 参数

`agent_event` 工具参数未包含 `model` 字段。SubagentEnd hook 的 `token_usage` 对象包含模型信息，应原样传入数据库。

**建议**: agent_event Zod schema 增加：
```typescript
model: z.string().optional().describe('实际使用的模型 ID，如 claude-sonnet-4-6')
```

#### 发现 9（严重）：agent_usage 成本估算逻辑需重构

当前方案：`server.ts` 中硬编码 `MODEL_PRICES` 表，按 `agent_id` 查 `agent_models` 表的 `model` 字段计算成本。

问题链：
1. `agent_models` 表存的是用户配置的模型，非实际调用模型
2. 一个 agent 可能在不同调用中使用不同模型（如自动切换）
3. 成本估算需要知道每条事件的实际 model

**修正方案**:
1. `agent_events` 增加 `model` 字段（发现 1）
2. `agent_usage` 查询时按 `model` 分组计算成本
3. `MODEL_PRICES` 需包含 DeepSeek 模型标记（成本为 null）：
```typescript
const MODEL_PRICES = {
  'claude-sonnet-4-6': { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30 },
  'claude-opus-4-7':  { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
  'claude-haiku-4-5': { input: 1.00, output: 5.00, cacheWrite: 1.25, cacheRead: 0.10 },
} as const;
// DeepSeek / GPT 模型不在表中 → 成本标记为 null
```

#### 发现 10（严重）：agent_status 查询逻辑需要额外处理

"查找 event_type='start' 但无对应 end 的" 是一个 correlated subquery：

```sql
SELECT * FROM agent_events ae
WHERE ae.run_id = ? AND ae.event_type = 'start'
  AND NOT EXISTS (
    SELECT 1 FROM agent_events ae2
    WHERE ae2.run_id = ae.run_id
      AND ae2.agent_id = ae.agent_id
      AND ae2.event_type IN ('end', 'error')
      AND ae2.started_at > ae.started_at
  )
```

这个查询在每次 `agent_status` 调用时执行。对于单个 run（通常 10-30 条事件），性能影响极小。但若 agent_id 相同且多次 spawn，需要 `started_at` 字段做时序判定。SQLite 对此类子查询优化良好。

#### 发现 11（信息）：end 事件 duration_ms 计算逻辑

TASK-001 要求 `agent_event` 在 end/error 事件时查找对应的 start 事件计算 `duration_ms`。实现建议：

```typescript
// 伪代码
if (event === 'end' || event === 'error') {
  const startEvent = db.prepare(
    "SELECT started_at FROM agent_events WHERE run_id=? AND agent_id=? AND event_type='start' ORDER BY started_at DESC LIMIT 1"
  ).get(runId, agentId);
  if (startEvent?.started_at) {
    durationMs = Date.parse(endedAt) - Date.parse(startEvent.started_at);
  }
}
```

**边界条件**: 若 start 事件不存在（乱序到达），duration_ms 设为 null，不报错。

#### 发现 12（信息）：参数校验模式需统一

现有 MCP 工具的 Zod schema 使用 `.optional()` 和 `.describe()`。三个新工具应保持一致风格。以 `agent_event` 为例：

```typescript
{
  event: z.enum(['start', 'end', 'error']).describe('事件类型'),
  agent_id: z.string().min(1).describe('Agent 名称/ID'),
  run_id: z.string().optional().describe('pipeline run ID，不传默认当前活跃 run'),
  session_id: z.string().optional().describe('会话 ID，不传自动解析'),
  model: z.string().optional().describe('实际使用的模型 ID'),
  input_tokens: z.number().int().min(0).optional(),
  output_tokens: z.number().int().min(0).optional(),
  cache_creation_input_tokens: z.number().int().min(0).optional(),
  cache_read_input_tokens: z.number().int().min(0).optional(),
  status: z.enum(['success', 'error']).optional(),
  error_message: z.string().optional(),
}
```

---

## 4. REST API 一致性评审

### 4.1 Findings

#### 发现 13（阻塞）：缺少 POST /api/agent-event 端点

TASK-003 的备选方案 A（"若 MCP hook 不支持，脚本调用 REST API"）需要在 TASK-002 中实现 `POST /api/agent-event` 端点。但当前 TASK-002 文件清单中未包含此端点。

**建议**: 
- 在 TASK-002 中新增 `POST /api/agent-event` 端点（约 25 行）
- 端点逻辑：接收 JSON body（与 MCP agent_event 参数一致），调用 DB 写入函数
- 需要从 HTTP 请求中解析 session/run 上下文（比 MCP 复杂——MCP 的 `extra.sessionId` 自动绑定）

**备选方案**: 如果确认 Claude Code hooks 支持 `mcp_tool` 类型，则不需要此端点。建议在执行 TASK-002 前先用最小实验验证 hook 类型可行性。

#### 发现 14（信息）：端点路径风格一致

新端点 `GET /api/agent-usage`、`GET /api/agent-status`、`GET /api/agent-events` 使用 kebab-case，与现有端点（`/api/pipeline`, `/api/sessions`, `/api/pipeline-runs`）的 plain-and-plural 风格略有差异，但作为子资源路径可接受。

#### 发现 15（信息）：SSE 扩展方案合理

`broadcastSSE()` 中扩展 `agent_status` 字段的方案与现有架构一致：
- 在 `broadcastSSE()` 的数据构造阶段增加 `agent_status` 查询
- 每 8 秒推送一次（与现有间隔一致）
- `agent_status` 仅包含活跃/最近完成 Agent 列表（不含全量事件），控制数据量

**建议**: SSE 推送的 `agent_status` 精简为仅 `active[]`（agent_id + event_type）和 `recent_completed`（最近 5 个完成的 agent_id + status），避免每次推送全量事件数据。

---

## 5. Plugin/Hook 架构评审

### 5.1 目录结构

```
.claude/plugins/jarvis-visualization/
├── plugin.json
├── hooks/
│   ├── hooks.json
│   └── scripts/
│       ├── agent-event.sh
│       └── agent-event.ps1
```

### 5.2 Findings

#### 发现 16（阻塞）：mcp_tool hook 类型可行性未验证

这是整个 Hook 体系的核心假设。Claude Code 的 hooks 系统是否支持直接调用 MCP 工具（`mcp_tool` 类型），未经证实。

**建议**: 在所有编码任务开始前，先用最小实验（手动创建 hook 配置 + 触发 SubagentStart 事件）验证：
1. `mcp_tool` 类型是否被 hooks.json 接受
2. 若支持，hook context 中能否获取到 `agent_id`、`session_id`、`run_id` 等关键变量
3. 若不支持，立即转向 command 类型 + HTTP POST 方案

#### 发现 17（中危）：HTTP POST 到 /mcp 端点需要 MCP JSON-RPC 协议

直接 HTTP POST 到 `http://localhost:3456/mcp` 不能简单发送 JSON——必须遵循 MCP JSON-RPC 2.0 协议：

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "agent_event",
    "arguments": { "event": "start", "agent_id": "xxx", ... }
  },
  "id": 1
}
```

Shell 脚本构造此格式可行但脆弱（JSON 转义、嵌套引号）。推荐使用备选方案 A（`POST /api/agent-event` REST 端点），以减少协议复杂度。

#### 发现 18（信息）：plugin.json 结构建议

```json
{
  "name": "jarvis-visualization",
  "version": "1.0.0",
  "description": "Jarvis Agent 实时可视化与 Token 追踪",
  "hooks": "hooks/hooks.json"
}
```

`.claude-plugin/marketplace.json` 目录当前不存在（`.claude-plugin/` 为空），需在 TASK-003 中创建。

#### 发现 19（信息）：Shell 脚本的环境变量依赖

`agent-event.sh` 和 `agent-event.ps1` 需要从 Claude Code hook context 中读取变量。Hook context 变量名需确认（`CLAUDE_HOOK_EVENT` 等是需求文档中的假设，实际变量名需查阅 Claude Code 文档）。

---

## 6. 性能分析

### 6.1 写入频率

- 每个子 Agent 生命周期产生 **2 条 event**（start + end/error）
- 单次 pipeline run 通常 spawn 5-15 个子 Agent
- 高峰写入：每条 `INSERT` 约 1-2ms（SQLite WAL 模式）
- 结论：无明显性能瓶颈

### 6.2 查询频率

- SSE broadcast: 每 8 秒一次，查询 `agent_status`（轻量子查询）
- Web 面板轮询: 建议与 SSE 同频（8 秒），API 查询 `agent_usage`（聚合查询）
- 查询开销：每个 run 的 agent_events 记录数通常 < 50 条，聚合查询在 SQLite 中为毫秒级

### 6.3 Findings

#### 发现 20（中危）：缺少数据清理策略

`agent_events` 表会持续增长。单次 run 约 10-50 条事件，100 次 run 后可达 5000 条。虽然 SQLite 在本地使用场景下 10 万条事件无压力，但长期积累可能影响查询性能。

**建议**: 
- 利用现有 `pipeline_runs.archived` 和 `deleteRun()` 级联删除机制
- 在 `deleteRun()` 函数中追加 `DELETE FROM agent_events WHERE run_id=?`
- 考虑保留机制：agent_events 数据量小，默认不自动清理，提供手动清理接口

#### 发现 21（信息）：SSE 数据量控制

`broadcastSSE()` 当前推送所有 session 的完整 pipeline 状态。增加 `agent_status` 后：
- 每个 session 增加约 100-300 bytes（active agents 列表）
- 通常同时有 1-3 个活跃 session
- 增量极小（约 1KB），对 8 秒间隔的 SSE 无影响

---

## 7. 安全性评审

### 7.1 Findings

#### 发现 22（严重）：agent_event 缺少归属验证

当前方案中，任何调用 `agent_event` MCP 工具或 `POST /api/agent-event` 的调用方都可以向任意 `run_id` 写入事件。没有验证调用方是否"拥有"该 run 或 session。

**现有安全机制**: MCP 工具通过 `extra.sessionId` 绑定会话，但 `run_id` 参数是调用方传入的。如果调用方传入其他 session 的 run_id，数据会跨 session 污染。

**建议**:
```typescript
// agent_event handler 中
const sid = resolveSid(extra);
if (!sid) return resp({ error: 'session_id required' });

// 若调用方传入了 run_id，验证该 run 属于当前 session
const runId = run_id || getActiveRun(db, sid)?.id;
if (run_id && runId !== run_id) {
  return resp({ error: `Run ${run_id} does not belong to current session` });
}
```

#### 发现 23（中危）：agent_id 无白名单校验

`agent_id` 参数无白名单或格式校验。恶意调用方可能：
- 传入超长字符串（存储型 DoS）
- 传入 SQL 注入 payload（虽然 prepared statement 防御了注入，但存储污染仍需考虑）

**建议**:
- `agent_id` 添加 Zod 校验：`z.string().min(1).max(128).regex(/^[a-z0-9-]+$/)`
- 或校验 agent_id 是否在 `getAgentList()` 中存在（更严格但可能影响灵活性）

#### 发现 24（信息）：SQL 注入防护依赖 Prepared Statement

`node:sqlite`（DatabaseSync）的 `db.prepare(...).run(...)` 方法使用参数化查询，天然防 SQL 注入。现有代码中所有 DB 操作均正确使用 prepared statements。新代码需保持此模式。

#### 发现 25（信息）：跨 session 数据隔离

当前 `agent_events` 表设计同时包含 `run_id` 和 `session_id`，可基于任一维度过滤。但查询函数（`getAgentUsage`, `getAgentStatus`）若仅按 `run_id` 查询，不会自然跨 session 泄露。验证通过：只要 `run_id` 归属验证到位（发现 22），数据隔离是可靠的。

---

## 8. 与现有架构的兼容性

### 8.1 现有模式匹配

| 现有模式 | 新方案匹配度 |
|---------|-----------|
| `initSchema()` 中使用 `CREATE TABLE IF NOT EXISTS` | 匹配。新表在同一函数中创建，幂等安全 |
| ALTER TABLE 迁移使用 try-catch | 匹配。新表不需要迁移（全新创建） |
| MCP 工具使用 `server.tool()` + Zod + `resp()` | 匹配 |
| REST 端点使用 Hono `app.get/post()` | 匹配 |
| DB 查询函数导出后供 web/routes.ts 使用 | 匹配。TASK-001 需导出 4 个新函数 |
| `deleteRun()` 级联删除关联数据 | 需补充：追加 `agent_events` 级联删除 |

### 8.2 现有代码需要修改的位置

| 文件 | 位置 | 修改内容 |
|------|------|---------|
| `src/engine/db.ts` | `initSchema()` 函数末尾 | 添加 `CREATE TABLE IF NOT EXISTS agent_events` |
| `src/engine/db.ts` | `deleteRun()` 函数 | 追加 `DELETE FROM agent_events WHERE run_id=?` |
| `src/engine/db.ts` | 文件末尾（新导出区） | 导出 `insertAgentEvent`, `getAgentEvents`, `getAgentUsage`, `getAgentStatus` |
| `src/engine/server.ts` | `registerMcpTools()` 末尾（`platform_info` 之后） | 添加 3 个 MCP 工具注册 |
| `src/engine/server.ts` | 顶部 `import` | 从 `db.js` 导入 4 个新函数 |
| `src/web/routes.ts` | `setupApiRoutes()` 内，SSE 路由之前 | 添加 3 个 REST 端点 |
| `src/web/routes.ts` | `broadcastSSE()` 数据构造处 | 追加 `agent_status` 查询 |

---

## 9. ADR 建议

以下 3 个决策应记录为独立 ADR：

### ADR 建议 1: Token 事件存储策略
- **决策**: 使用 SQLite `agent_events` 表 + `VIRTUAL` 生成列存储 token 数据
- **理由**: SQLite 满足本地单用户场景的性能需求；VIRTUAL 列减少存储开销
- **替代方案**: 应用层计算（增加代码复杂度）、独立的时序数据库（过度设计）

### ADR 建议 2: 成本估算策略
- **决策**: 按事件级别的 `model` 字段查 `MODEL_PRICES` 硬编码表计算成本
- **理由**: 比按 Agent 配置查价更准确（反映实际模型使用）；价格表硬编码避免外部 API 依赖
- **替代方案**: 调用外部 API 实时获取价格（延迟高，依赖外部服务）

### ADR 建议 3: Hook 通信方式
- **决策**: 优先尝试 `mcp_tool` hook 类型；失败则使用 `command` + `POST /api/agent-event` REST 端点
- **理由**: 减少 Shell 脚本的 MCP JSON-RPC 协议复杂度
- **替代方案**: 脚本直接操作 SQLite（侵入性强，不推荐）

---

## 10. 评审结论与行动项

### 10.1 阻塞项（必须在实现前修复）

| ID | 发现 | 严重度 | 修复位置 |
|----|------|--------|---------|
| F1 | agent_events 表缺少 `model` 字段 | 阻塞 | REQ-054 / TASK-001 |
| F2 | MODEL_PRICES 使用旧模型 ID，需与 gates.ts AVAILABLE_MODELS 对齐 | 阻塞 | TASK-001 |
| F3 | 缺少 `POST /api/agent-event` REST 端点（hook 备选方案依赖） | 阻塞 | TASK-002 |
| F4 | agent_event 缺少 session→run 归属验证 | 阻塞 | TASK-001 |
| F5 | mcp_tool hook 类型可行性未验证 | 阻塞 | TASK-003 前置实验 |

### 10.2 严重项（需在实现中修正）

| ID | 发现 | 严重度 | 修复位置 |
|----|------|--------|---------|
| S1 | `STORED` 生成列改为 `VIRTUAL` | 严重 | TASK-001 |
| S2 | `duration_ms` vs `duration_seconds` 不一致需在 ADR 中决策 | 严重 | TASK-001 |
| S3 | agent_usage 成本估算需按 event 级 model 计算 | 严重 | TASK-001 |
| S4 | agent_id 需添加格式校验 | 严重 | TASK-001 |

### 10.3 改进项（可在实现中按需处理）

| ID | 发现 | 严重度 |
|----|------|--------|
| I1 | 添加 `created_at` 字段 | 中危 |
| I2 | 索引策略优化（复合索引覆盖查询模式） | 中危 |
| I3 | event_type 添加 CHECK 约束 | 中危 |
| I4 | deleteRun() 级联删除 agent_events | 中危 |
| I5 | SSE agent_status 数据精简（仅 active + 最近 5 个 completed） | 信息 |
| I6 | agent_events 数据清理策略 | 信息 |

### 10.4 通过项

- WAL 兼容性：通过（现有 PRAGMA 配置自动继承）
- Prepared Statement 防注入：通过（node:sqlite 参数化查询）
- REST 端点风格一致性：通过
- SSE 扩展架构兼容性：通过
- 现有代码侵入性可控：通过（约 250 行增量，主要集中在 db.ts + server.ts）

---

## 11. 修正后的推荐 Schema

```sql
CREATE TABLE IF NOT EXISTS agent_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('start', 'end', 'error')),
  status TEXT CHECK(status IN ('success', 'error')),
  model TEXT,               -- 实际使用的模型 ID
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_creation_input_tokens INTEGER DEFAULT 0,
  cache_read_input_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (
    input_tokens + output_tokens + cache_creation_input_tokens + cache_read_input_tokens
  ) VIRTUAL,                -- 改为 VIRTUAL，减少存储开销
  error_message TEXT,
  started_at TEXT,
  ended_at TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_agent_events_run ON agent_events(run_id, agent_id, event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_lookup ON agent_events(run_id, agent_id, event_type, started_at);
```

## 12. 修正后的 MODEL_PRICES

```typescript
/** 模型单价（USD/1M tokens），与 gates.ts AVAILABLE_MODELS 对齐 */
const MODEL_PRICES: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number } | null> = {
  // Anthropic 模型 — 有明确定价
  'claude-opus-4-7':    { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
  'claude-sonnet-4-6':  { input: 3.00,  output: 15.00, cacheWrite: 3.75,  cacheRead: 0.30 },
  'claude-haiku-4-5':   { input: 1.00,  output: 5.00,  cacheWrite: 1.25,  cacheRead: 0.10 },
  // 非 Anthropic 模型 — 不追踪成本
  // deepseek-v4-pro, deepseek-v4-flash, gpt-5.5 等自动返回 null
};

function estimateCost(model: string, inputTokens: number, outputTokens: number, cacheWriteTokens: number, cacheReadTokens: number): number | null {
  const prices = MODEL_PRICES[model];
  if (!prices) return null;
  return (
    (inputTokens / 1_000_000) * prices.input +
    (outputTokens / 1_000_000) * prices.output +
    (cacheWriteTokens / 1_000_000) * prices.cacheWrite +
    (cacheReadTokens / 1_000_000) * prices.cacheRead
  );
}
```

---

## 附录 A: 与 TASK 文档的修正对照

| TASK 文档当前描述 | 建议修正 |
|-----------------|---------|
| agent_events 表 无 model 字段 | 添加 `model TEXT` |
| total_tokens 使用 STORED | 改为 VIRTUAL |
| MODEL_PRICES 使用旧模型 ID | 对齐 gates.ts AVAILABLE_MODELS |
| TASK-002 文件清单无 POST /api/agent-event | 追加该端点（或依赖 hook 验证结果决定） |
| 索引仅有 idx_agent_events_run | 扩展为复合索引 |
| agent_id 无 Zod 格式校验 | 添加 min/max/regex |

## 附录 B: 验证清单

在开始实现前，确认以下前置条件：

- [ ] F1-F5 五条阻塞项已解决或确认可接受
- [ ] mcp_tool hook 类型可行性实验已完成
- [ ] MODEL_PRICES 表模型 ID 已与实际模型 ID 对齐
- [ ] Session→Run 归属验证逻辑已设计完成
- [ ] POST /api/agent-event 端点需求已加入 TASK-002（或确认不需要）
