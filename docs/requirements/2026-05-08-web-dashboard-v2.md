# REQ-DASH-001: Web Dashboard 会话管理 v2

> 状态：draft
> 日期：2026-05-08
> 领域：Web Dashboard + Engine API

---

## 背景

当前 Web Dashboard（`src/web/views/pipeline.html`）的会话列表仅显示 session ID 截断文本 + pipeline_type 中文标签。缺乏：
- 会话任务名（用户无法一眼看出哪个会话在做什么）
- 归档/删除管理能力
- 会话置顶功能

---

## 需求清单

### REQ-DASH-001：会话命名（MCP 工具 + 数据库）

**优先级：** P0

**描述：**
新增 MCP 工具 `session_set_name`，允许调用方为当前会话设置一个人类可读的任务名称。

**数据模型变更：** 在 `pipeline_runs` 表新增 `task_name TEXT` 字段。

```sql
ALTER TABLE pipeline_runs ADD COLUMN task_name TEXT;
```

**MCP 工具定义：**
```
session_set_name(name: string) → { ok: true, task_name: "xxx" }
```
- 设置当前 run 的 task_name
- 空字符串或纯空白视为清除名称
- 如果当前没有活跃 run，返回错误

**API 路由：**
```
PATCH /api/pipeline-runs/:id/name  { task_name: string }
```

**设计说明：** task_name 存在 `pipeline_runs` 表而非 `sessions` 表，因为：
- 每个 `/jarvis` 调用是一个独立任务，名称与其绑定
- 同一会话的不同 run 可各自命名
- 归档粒度与 run 一致

---

### REQ-DASH-002：会话列表显示指令名而非流水线名

**优先级：** P0

**描述：**
Web Dashboard 会话列表卡片中，将会话 ID 替换为 task_name（有则显示 task_name，无则回退显示 pipeline_type 中文名 + 时间戳）。
移除 pipeline_type 的「完整流水线/前端流水线/后端流水线/轻量流水线」标签，改为显示实际触发指令名（如 `/jarvis`、`/jarvis-lite`）。

**前端变更：**
- `renderSessions()` 函数中的 session ID 截断文本替换为 task_name
- pipeline_type 标签替换为清晰的指令标识
- 列表项布局调整为：`[task_name] [command_tag] [gate_badge] [status_dot]`

**指令映射：**
```javascript
const COMMAND_LABELS = {
  'full':     { label: '/jarvis',       color: 'indigo' },
  'frontend': { label: '/jarvis-fe',    color: 'blue' },
  'backend':  { label: '/jarvis-be',    color: 'green' },
  'lite':     { label: '/jarvis-lite',  color: 'amber' },
};
```

---

### REQ-DASH-003：Run 归档功能

**优先级：** P1

**描述：**
Run 级别归档。每个 `/jarvis` 调用完成后可归档，从主会话列表移除但在归档页面可查看。

**数据模型变更：** 在 `pipeline_runs` 表新增 `archived INTEGER DEFAULT 0` 字段。

**API 路由：**
```
POST   /api/pipeline-runs/:id/archive    → { ok: true }
POST   /api/pipeline-runs/:id/unarchive  → { ok: true }
GET    /api/pipeline-runs/archived       → { runs: [...] }
DELETE /api/pipeline-runs/:id            → { ok: true }  (硬删除，需确认)
```

**前端变更：**
- 会话列表卡片右上角添加三点菜单（⋮），含「归档」「删除」选项
- 归档后卡片从主列表消失，出现在 `/archive` 页面
- 删除弹出确认对话框，防止误操作

**归档页面（`src/web/views/archive.html`，新建）：**
- 按 session 分组的归档 run 列表
- 每个 run 显示：task_name、pipeline_type 指令标签、归档时间
- 操作按钮：「恢复」「删除」
- 支持按 task_name 搜索

---

### REQ-DASH-004：Run 置顶功能

**优先级：** P2

**描述：**
允许将重要 run 置顶，固定在会话列表顶部。

**数据模型变更：** 在 `pipeline_runs` 表新增 `pinned INTEGER DEFAULT 0` 字段。

**API 路由：**
```
POST /api/pipeline-runs/:id/pin   → { ok: true }
POST /api/pipeline-runs/:id/unpin → { ok: true }
```

**前端变更：**
- 置顶 run 在列表顶部显示，带图钉图标（📌）
- 三点菜单中切换「置顶/取消置顶」

---

### REQ-DASH-005：前端路由支持

**优先级：** P1

**描述：**
Web Dashboard 增加 Hash 路由，支持以下页面：
- `#/dashboard` → 活跃会话看板（默认）
- `#/archive` → 归档会话页面
- `#/agents` → 智能体配置页面（已有）

**实现方式：**
最简单的 hash-based SPA 路由，无需引入额外框架。在 `pipeline.html` 中添加 `window.onhashchange` 监听，根据 hash 切换显示 panel。

**引擎 Web 面板（`src/engine/server.ts`）变更：**
- `GET /archive` → 提供 `archive.html`
- API 代理路由不变

---

### REQ-DASH-006：跨平台兼容性设计

**优先级：** P2（当前实现 Claude Code，预留接口）

**描述：**
当前通过 MCP 工具 `session_set_name` 触发命名（Claude Code）。设计确保后续 OpenCode / Codex 可通过各自机制调用同一 REST API：

| 平台 | 触发机制 | 调用方式 |
|------|---------|---------|
| Claude Code | MCP 工具 | `mcp__jarvis-engine__session_set_name` |
| OpenCode | Agent 切换插件 | HTTP `PATCH /api/pipeline-runs/:id/name` |
| Codex | Skill 定义 | HTTP `PATCH /api/pipeline-runs/:id/name` |

REST API 是平台无关的统一入口，各平台只需添加各自的调用包装。
