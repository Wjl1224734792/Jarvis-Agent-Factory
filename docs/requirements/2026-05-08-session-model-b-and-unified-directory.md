# 需求文档：Session Model B + 统一数据目录

> 日期：2026-05-08 | 状态：confirmed

---

## 背景

当前 Jarvis Engine 存在四个问题：

1. **数据目录混乱**：`engine.pid` 在 `~/.jarvis/`，`engine.db` 在 `<projectRoot>/.jarvis/`，全局安装时两处 `.jarvis` 目录造成混淆。
2. **会话模型简单**：`pipeline` 表与 `session` 一对一，每次 `/jarvis` 调用会重置流水线状态，无法追溯历史任务。
3. **FSM 会话不一致**：多会话并发时，MCP 工具因 `extra?.sessionId` 缺失回退到 `'legacy'`，导致不同会话共享同一流水线状态，Gate 推进混乱。
4. **Web 面板 MCP 状态显示错误**：`session_heartbeat` 在 stdio 传输模式下无法更新心跳，导致 Web 面板显示会话为"离线"，而实际上终端 MCP 正在活跃使用。

用户明确选择 **B 方案**：Task = Pipeline Run，每次 `/jarvis` 调用创建一个新的流水线运行记录。

---

## REQ-001：统一数据目录到 `~/.jarvis/`

### 描述

将所有 Jarvis Engine 运行时数据统一到 `~/.jarvis/` 目录下，消除当前 `~/.jarvis/engine.pid` 与 `<projectRoot>/.jarvis/engine.db` 分散的问题。

### 当前状态（存在问题）

| 文件 | 当前路径 | 问题 |
|------|---------|------|
| `engine.pid` | `~/.jarvis/engine.pid` | 位置合理 |
| `engine.db` | `<projectRoot>/.jarvis/engine.db` | 随工作目录变化，全局安装时多个项目根目录产生多个数据库 |
| `file-hashes.json` | `<platformRoot>/.jarvis/file-hashes.json` | 安装时散落在各平台目录 |

### 目标状态

| 文件 | 目标路径 | 说明 |
|------|---------|------|
| `engine.pid` | `~/.jarvis/engine.pid` | 不变 |
| `engine.db` | `~/.jarvis/engine.db` | 从项目根目录移到 home 目录 |
| `file-hashes.json` | `~/.jarvis/file-hashes.json` | 从平台目录移到统一位置 |

### 影响范围

- `src/engine/db.js`: `openDb(root)` → `openDb()` 不再依赖 `projectRoot` 参数
- `src/engine/server.js`: `startEngine()` 中 `openDb(root)` 调用改为 `openDb()`
- `src/install.js`: `loadHashes(root)` / `saveHashes(root)` 改为使用统一路径
- 数据迁移：检测旧位置 `<projectRoot>/.jarvis/engine.db`，若存在则迁移到 `~/.jarvis/engine.db`

### 验收标准

- [ ] 引擎启动后 `engine.db` 仅在 `~/.jarvis/` 下创建
- [ ] `engine.pid` 仍在 `~/.jarvis/engine.pid`
- [ ] 不存在 `<projectRoot>/.jarvis/` 目录的自动创建
- [ ] 旧数据库自动迁移到新位置（一次性）
- [ ] Web 面板正常读取会话和流水线数据

---

## REQ-002：引入 Pipeline Runs 表（Session Model B）

### 描述

新增 `pipeline_runs` 表，使每个 `/jarvis` 调用产生一条独立的流水线运行记录。`pipeline` 表保留用于存储会话当前活跃的流水线快照。

### 数据模型

```sql
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,              -- run_id: 如 "run_1715162400000" 或 UUID
  session_id TEXT NOT NULL,         -- 关联的 MCP 会话
  project TEXT NOT NULL,            -- 项目路径
  pipeline_type TEXT NOT NULL DEFAULT 'full',  -- full | frontend | backend | lite
  current_gate TEXT NOT NULL DEFAULT 'Gate A',
  status TEXT NOT NULL DEFAULT 'active',  -- active | completed | aborted
  started_at TEXT NOT NULL,
  completed_at TEXT,                -- 完成/终止时间
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### 行为变更

| 操作 | 当前行为 | 新行为 |
|------|---------|--------|
| `/jarvis` 调用 | `session_join` + `pipeline_init` 重置当前 session 的 pipeline | `session_join` 创建新 `pipeline_run`，不影响已有 run |
| `pipeline_init` | 重置当前会话流水线（覆盖旧状态） | 创建新 `pipeline_run`；若当前 session 无活跃 pipeline 则初始化 |
| `gate_enforce` | 检查当前 session 的 pipeline | 检查指定 `run_id` 的 pipeline_run |
| `advance_gate` | 更新当前 session 的 pipeline gate | 更新指定 `run_id` 的 pipeline_run gate |
| `pipeline_status` | 返回当前 session 的 pipeline | 返回当前活跃 run 或最近 run 的状态 |
| `report_status` | 返回当前 session 的 pipeline | 返回指定 `run_id` 的完整报告 |

### 向后兼容

- 旧 `pipeline` 表保留，作为当前活跃 run 的缓存/快照
- 无 `run_id` 参数时默认使用当前 session 的最新活跃 run
- 旧会话（仅有 `pipeline` 无 `pipeline_runs`）自动从 `pipeline` 数据创建首条 run 记录

### 影响范围

- `src/engine/db.js`: 新增 `pipeline_runs` 表及 CRUD 函数
- `src/engine/server.js`: 所有 Gates 工具支持 `run_id` 参数
- `src/web/routes.js`: API 返回 runs 列表
- `src/web/views/pipeline.html`: Dashboard 展示历史 runs

### 验收标准

- [ ] `pipeline_runs` 表在 `initSchema()` 中自动创建
- [ ] 每次 `session_join` 默认创建新的 `pipeline_run`
- [ ] 多次 `/jarvis` 调用产生多条独立 run 记录
- [ ] 历史 runs 可通过 API 查询
- [ ] 旧 session 数据自动迁移为首条 run

---

## REQ-003：Web Dashboard 展示 Pipeline Runs 历史

### 描述

Web Dashboard（`pipeline.html`）扩展为展示会话下的多个 pipeline runs，支持查看历史运行记录。

### 功能需求

1. 会话列表保留（左侧边栏）
2. 选中会话后，展示该会话的所有 pipeline runs（按时间倒序）
3. 每条 run 显示：pipeline_type、当前 Gate、开始时间、状态标签
4. 当前活跃 run 高亮显示
5. 历史 run 可展开查看详细 Gate 进度

### 影响范围

- `src/web/views/pipeline.html`: UI 改造，增加 runs 列表和历史视图
- `src/web/routes.js`: 新增 `/api/pipeline-runs?session_id=` 端点

### 验收标准

- [ ] Dashboard 可查看每个会话的历史 runs
- [ ] 活跃 run 有明显视觉标识
- [ ] 历史 run 的 Gate 进度可查看
- [ ] 页面不因 runs 数量增多而性能下降（前端分页/虚拟滚动）

---

## REQ-005：修复 FSM 会话不一致问题

### 描述

多会话并发时，MCP 工具的 `extra?.sessionId || 'legacy'` 回退逻辑导致所有 `sessionId` 缺失的调用共享 `'legacy'` 会话，FSM 状态互相覆盖，产生"明明在会话 A 操作却改变了会话 B 的 Gate"等不一致行为。Web API 也因默认取第一个会话而加剧此问题。

### 根因分析

**MCP 侧（`src/engine/server.js`）**：8 个工具使用 `extra?.sessionId || 'legacy'` 模式。

| 工具 | 行号 | 问题 |
|------|------|------|
| `pipeline_init` | 213 | `extra?.sessionId \|\| 'legacy'` |
| `pipeline_status` | 225 | `extra?.sessionId \|\| 'legacy'` |
| `gate_enforce` | 255 | `extra?.sessionId \|\| 'legacy'` |
| `advance_gate` | 273 | `extra?.sessionId \|\| 'legacy'` |
| `gate_jump` | 297 | `extra?.sessionId \|\| 'legacy'` |
| `report_status` | 314 | `extra?.sessionId \|\| 'legacy'` |
| `gate_check` | 339 | `extra?.sessionId \|\| 'legacy'` |
| `pipeline_guide` | 362 | `extra?.sessionId \|\| 'legacy'` |

- `StdioServerTransport` 不提供 `extra.sessionId`，所有 stdio 模式调用回退到 `'legacy'`
- 多个 Claude Code 窗口通过 stdio 各自启动引擎时，各自独立（不同进程），问题不显现
- **问题爆发场景**：HTTP 模式下，一个窗口正常获得 sessionId，但 `session_heartbeat` 依赖 `extra?.sessionId` 失败后，`markStaleSessions` 将会话标记为 inactive，后续操作的 sessionId 回退逻辑可能漂移到其他会话

**Web 侧（`src/web/routes.js`）**：

```javascript
// enforce: 取 URL 参数或第一个会话
const sid = c.req.query('session_id') || (getSessions(db)[0]?.id);
// advance: 同样逻辑
const sid = body.session_id || (getSessions(db)[0]?.id);
```

Web Dashboard 点击"推进"按钮时，若前端未传 `session_id`，默认操作第一个会话——可能与用户选中的会话不同。

### 修复方案

1. **废弃 `'legacy'` 回退**：所有工具不再使用 `|| 'legacy'`，改为：
   - 若 `extra?.sessionId` 存在 → 使用它
   - 若不存在 → 返回明确错误 `{ error: 'session_id required. Call session_join first.' }`
2. **`session_join` 是唯一会话入口**：返回的 `session_id` 由客户端（AI）在后续工具调用中携带
3. **Web API 强制 `session_id`**：移除 `|| getSessions(db)[0]?.id` 回退，缺少参数时返回 400 错误
4. **Web 前端**：确保所有 API 调用携带当前选中的 `selectedSession`

### 影响范围

- `src/engine/server.js`: 8 个工具函数签名和 sessionId 解析逻辑
- `src/web/routes.js`: enforce/advance 端点参数校验
- `src/web/views/pipeline.html`: 确保前端传递正确的 session_id

### 验收标准

- [ ] `session_join` 不再自动创建 session（仅在明确调用时创建）
- [ ] 缺少 session_id 的 Gate 操作返回明确错误而非静默操作错误会话
- [ ] 两个并发会话的 Gate 推进互不干扰
- [ ] Web 面板点击"推进"只影响当前选中会话

---

## REQ-006：修复 Web 面板 MCP 连接状态显示

### 描述

终端 MCP 正在活跃使用，但 Web 面板左侧边栏的"MCP 接入状态"显示对应平台为断开（灰色圆点）或无会话。

### 根因分析

1. **心跳链路断裂（`src/engine/server.js:180-186`）**：
   ```javascript
   server.tool('session_heartbeat', '心跳保活。', {},
     async (_args, extra) => {
       const sid = extra?.sessionId;
       if (!sid || !getSession(db, sid)) return resp({ error: 'Session not found.' });
       heartbeatSession(db, sid);
       return resp({ ok: true });
     });
   ```
   - `extra?.sessionId` 在 stdio 传输模式下为 `undefined`，心跳永远返回 `Session not found`
   - `heartbeatSession` 从未被调用，`sessions.last_heartbeat` 停留在初始值

2. **会话假死（`src/engine/db.js:164-168`）**：
   ```javascript
   export function markStaleSessions(db, timeoutMs) {
     const cutoff = Date.now() - timeoutMs;  // 600,000ms = 10分钟
     const stale = db.prepare("SELECT id FROM sessions WHERE last_heartbeat < ? AND status='active'").all(cutoff);
     for (const s of stale) db.prepare("UPDATE sessions SET status='inactive' WHERE id=?").run(s.id);
   ```
   - 10 分钟无心跳 → 标记 inactive → Web 面板认为会话断开

3. **前端判活过于严格（`pipeline.html:410`）**：
   ```javascript
   const isOnline = !isInactive && (Date.now() - s.heartbeat) < 120000; // 2分钟！
   ```
   - 只需 2 分钟内心跳未更新就显示"离线"，比服务端的 10 分钟严格 5 倍

4. **`/api/status` 只统计 active 会话（`routes.js:63`）**：
   ```javascript
   const sessions = getSessions(db, 'active');
   ```
   - 被标记 inactive 的会话不计入平台连接数

### 修复方案

1. **修复 stdio 模式心跳**：
   - `session_heartbeat` 不依赖 `extra?.sessionId`
   - 在 stdio 模式下，使用 `session_join` 返回的 session_id 作为心跳目标
   - 或者：引擎内部维护一个"最近活跃会话"映射，心跳直接更新它
2. **延长超时时间**：`SESSION_TIMEOUT` 从 10 分钟延长到 30 分钟
3. **前端判活对齐**：`isOnline` 窗口从 2 分钟改为与服务端一致的 10 分钟
4. **心跳保活频率调整**：引擎内部 `setInterval` 对当前活跃会话自动心跳

### 影响范围

- `src/engine/server.js`: `session_heartbeat` 实现、超时常量
- `src/engine/db.js`: `markStaleSessions` 超时参数
- `src/web/views/pipeline.html`: `isOnline` 判断逻辑

### 验收标准

- [ ] stdio 模式下，启动 `/jarvis` 后 Web 面板立即显示对应平台为"已连接"
- [ ] 会话在活跃使用期间不会因心跳缺失而被标记为 inactive
- [ ] Web 面板 MCP 状态与实际连接状态一致（1 分钟内同步）
- [ ] 会话闲置超过 30 分钟后正确显示为"休眠"

---

## REQ-004：版本发布 v3.23.0

### 描述

以上所有变更完成后，递增版本号到 v3.23.0，发布到 Gitee + GitHub + npm 三平台。

### 验收标准

- [ ] 版本号递增至 `3.23.0`
- [ ] `git tag v3.23.0` 并推送 Gitee + GitHub
- [ ] `npm publish` 成功
- [ ] changelog 记录本次变更

---

## 非功能性需求

- **向后兼容**：旧数据库自动迁移，不丢失数据
- **引擎重启安全**：PID 文件和数据库在同一目录，清理时不会遗漏
- **并发安全**：`pipeline_runs` 使用 WAL 模式，支持多会话并发读写
- **性能**：历史 runs 查询使用索引 `(session_id, started_at DESC)`
