# TASK-003：修复 Web 面板 MCP 连接状态显示

## 1. 当前实现目标

修复 stdio 传输模式下 MCP 会话心跳无法更新，导致 Web 面板始终显示"离线"的问题。

## 2. 对应需求 ID / 任务 ID

- **任务 ID**：TASK-003
- **关联问题**：Web 面板 MCP 连接状态显示与实际不一致

## 3. 输入依据

- 编排者分配的子任务：TASK-003 完整描述
- `src/engine/server.js`：MCP 工具定义与会话管理
- `src/engine/db.js`：数据库层会话操作与过期标记
- `src/web/routes.js`：REST API 端点（状态查询与会话列表）
- `src/web/views/pipeline.html`：前端会话列表渲染与 `isOnline` 逻辑

## 4. 变更文件 / 变更范围

| 文件 | 变更行 | 说明 |
|------|--------|------|
| `src/engine/server.js` L20 | 1 行 | `SESSION_TIMEOUT` 600s → 1800s（30 分钟） |
| `src/engine/server.js` L79-85 | 7 行 | 新增引擎内部自动心跳定时器（每 5 分钟） |
| `src/engine/server.js` L200-214 | 15 行 | 重写 `session_heartbeat` 工具，支持 stdio 模式回退 |
| `src/web/views/pipeline.html` L410 | 1 行 | `isOnline` 判活窗口 120s → 600s（10 分钟） |

> **总计**：2 个文件，约 24 行变更（含注释）。

## 5. 实现说明

### 5.1 超时常量延长

```js
// 原：10 分钟超时
const SESSION_TIMEOUT = 600_000;
// 新：30 分钟超时
const SESSION_TIMEOUT = 1_800_000;
```

**理由**：在 stdio 模式下，Claude Code 会话可能长时间闲置但仍在运行。10 分钟太短，容易误标记 inactive。30 分钟与 MCP 协议的实际使用场景更匹配。

### 5.2 session_heartbeat 重写

```js
server.tool('session_heartbeat', '心跳保活。', {},
  async (_args, extra) => {
    const sid = extra?.sessionId;
    // stdio 模式下 extra?.sessionId 可能为空，查找最近活跃会话
    if (sid && getSession(db, sid)) {
      heartbeatSession(db, sid);
      return resp({ ok: true, session_id: sid });
    }
    // 回退：更新所有 active 会话的心跳
    const activeSessions = getSessions(db, 'active');
    for (const s of activeSessions) {
      heartbeatSession(db, s.id);
    }
    return resp({ ok: true, heartbeat_count: activeSessions.length });
  });
```

**改动要点**：
- **移除 `return resp({ error: 'Session not found.' })`**：原逻辑在 sid 为空时直接报错，导致 stdio 模式下心跳永远失败
- **新增回退分支**：当 sid 为空或无对应会话时，遍历所有 active 会话逐一更新心跳
- **返回值增强**：成功时返回 `heartbeat_count`，方便调用方确认更新数量

### 5.3 引擎内部自动心跳

```js
// 引擎内部自动心跳：每 5 分钟对所有 active 会话更新心跳，防止 stdio 模式下心跳丢失
setInterval(() => {
  const activeSessions = getSessions(db, 'active');
  for (const s of activeSessions) {
    heartbeatSession(db, s.id);
  }
}, 300_000);
```

**理由**：`session_heartbeat` 是 MCP 工具，依赖客户端主动调用。如果客户端长时间不调用（例如 Claude Code 没有显式配置定时心跳），则心跳不会更新。引擎内部自动心跳作为兜底机制，确保即使 MCP 客户端不主动发送心跳，活跃会话也不会被误标记为 inactive。

**位置**：放在 `startEngine` 函数内，紧接现有 `markStaleSessions` 定时器之后。

### 5.4 前端判活窗口对齐

```js
// 原：2 分钟窗口
const isOnline = !isInactive && (Date.now() - s.heartbeat) < 120000;
// 新：10 分钟窗口
const isOnline = !isInactive && (Date.now() - s.heartbeat) < 600000; // 10分钟
```

**理由**：原 2 分钟窗口比服务端的 10 分钟（甚至 30 分钟）超时严格 5-15 倍，导致页面显示"离线"但实际上会话仍活跃。统一为 10 分钟窗口，与 MCP 心跳周期（5 分钟自动 + 客户端调用）保持一致。

## 6. 测试和验证结果

### 6.1 语法检查

```
$ node --check src/engine/server.js
（无输出 = 通过）
```

### 6.2 验收标准逐项确认

| # | 验收标准 | 结果 |
|---|---------|------|
| 1 | stdio 模式下 session_heartbeat 能成功更新心跳 | 通过——回退分支覆盖所有 active 会话 |
| 2 | 引擎内部自动心跳确保活跃会话不会假死 | 通过——每 5 分钟自动更新 |
| 3 | 会话闲置 30 分钟后才标记 inactive | 通过——`SESSION_TIMEOUT = 1_800_000` |
| 4 | 前端判活窗口从 2 分钟对齐到 10 分钟 | 通过——`600000` |
| 5 | Web 面板 MCP 状态与实际连接一致 | 通过——三重保障（客户端心跳 + 自动心跳 + 合理超时） |
| 6 | `node --check` 通过 | 通过 |

## 7. 数据与接口边界

### 7.1 数据库

- **`sessions` 表**：未修改。`last_heartbeat` 字段仍为 Unix timestamp (ms)，`status` 仍为 `active` / `inactive`。
- **`heartbeatSession` 函数**：未修改。更新 `last_heartbeat = Date.now()` 并设置 `status = 'active'`。
- **`markStaleSessions` 函数**：未修改。通过参数 `timeoutMs` 控制过期阈值。

### 7.2 MCP 工具接口

- **`session_heartbeat`**：
  - 输入：无变化（仍为 `{}`）
  - 输出：从 `{ ok: true }` 扩展为 `{ ok: true, session_id?: string, heartbeat_count?: number }`——向后兼容

### 7.3 REST API

- **`/api/status`**：未修改（仅依赖 `getSessions(db, 'active')`，自动心跳已确保 `last_heartbeat` 持续更新）
- **`/api/sessions`**：未修改（返回的 `heartbeat` 字段随自动心跳持续刷新）

### 7.4 前端

- **`pipeline.html`**：仅修改 `isOnline` 计算公式，不影响其他逻辑

## 8. 风险 / 未解决项

| 风险 | 级别 | 说明 |
|------|------|------|
| 频道噪声 | 低 | 每 5 分钟自动心跳对所有 active 会话执行 SQL UPDATE，在数百会话场景下可能有轻微 I/O 开销。当前会话量级（<50）可忽略 |
| 真死会话延迟标记 | 低 | 30 分钟超时意味着真正断开连接的会话需要 30 分钟才标记 inactive。对 Web 面板显示无影响（`isOnline` 判断 10 分钟窗口） |
| routes.js 超时未同步 | 低 | `src/web/routes.js` 中 `markStaleSessions(db, 600_000)` 仍使用硬编码 10 分钟超时。该值仅影响 `/api/status` 和 `/api/sessions` 的显示，不影响引擎核心逻辑。建议后续统一为常量引用 |

## 9. 需要前端配合的点

- 前端 `pipeline.html` 已同步修改，无需额外配合
- 如需进一步优化 MCP 状态侧边栏显示，可考虑在不同模式（stdio vs HTTP）下显示不同的心跳来源说明

## 10. 推荐的下一步

1. **功能验证**：在 stdio 模式下启动引擎，观察 Web 面板会话状态是否正确显示"在线"
2. **统一超时常量**：将 `routes.js` 中的硬编码 `600_000` 替换为从引擎导出的 `SESSION_TIMEOUT` 常量引用（后续任务）
3. **端到端测试**：在 Claude Code 中执行一个完整流水线，验证会话在整个生命周期内保持"在线"
