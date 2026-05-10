# REQ-WEB-SESSION：Web Dashboard 会话管理增强

> 状态：draft → 待确认
> 日期：2026-05-08
> 关联：需先合并上一任务 REQ-NPM-CLI 的 `command` 字段存储

---

## 需求概述

为 Jarvis Web Dashboard 的会话列表增加**归档/删除/置顶**三项管理操作，归档会话在专门页面查看并可恢复/删除；同时将每个会话的显示标签从抽象的"流水线类型"（全流程/轻量编排）改为**用户实际执行的指令名称**（如 `/jarvis`、`/jarvis-lite`），让用户一眼识别正在运行哪个流程。

---

## REQ-WEB-001：会话 command 字段存储与展示

**优先级：** P0（阻断——其他需求依赖此字段）

**描述：**
- 数据库 `sessions` 表新增 `command` TEXT 字段，存储用户执行的指令名称（如 `/jarvis`、`/jarvis-lite`、`/frontend`、`/backend`）
- `pipeline_runs` 表同步新增 `command` TEXT 字段
- MCP `session_join` 工具新增 `command` 参数，由编排技能传入
- 会话列表中，原 `pipeline_type` 中文标签替换为 `command` 字段值

**展示映射示例：**

| command 值 | 列表显示 | 颜色 |
|-----------|---------|------|
| `/jarvis` | `/jarvis` | 靛蓝色 |
| `/jarvis-lite` | `/jarvis-lite` | 翠绿色 |
| `/frontend` | `/frontend` | 天蓝色 |
| `/backend` | `/backend` | 紫色 |
| 自定义（opencode/codex） | 原样显示 | 灰色 |

**向后兼容：** 旧会话无 `command` 值时，根据 `pipeline_type` 回退显示：
- `full` → `/jarvis`（推断）
- `lite` → `/jarvis-lite`（推断）
- `frontend` → `/frontend`（推断）
- `backend` → `/backend`（推断）

**理由：** 当前显示"完整流水线""轻量编排"等中文名称，用户无法直观知道是哪个命令触发的。显示 `/jarvis` 等指令名一目了然。

---

## REQ-WEB-002：会话归档（软删除）

**优先级：** P0

**描述：**
- 数据库 `sessions` 表新增 `archived` INTEGER DEFAULT 0 字段
- 会话列表每个条目右侧增加 **归档按钮**（📥 图标），点击后确认弹窗 → 设置 `archived = 1`
- 已归档会话从主列表移除（`GET /api/sessions` 默认过滤 `archived = 0`）
- 新增 **归档页面**（`/dashboard?tab=archived` 或独立 Tab），只展示已归档会话
- 归档页面每个条目提供 **恢复按钮**（设置 `archived = 0`）和 **删除按钮**（永久删除）

**API 端点：**

| 方法 | 路径 | 功能 |
|------|------|------|
| `POST` | `/api/sessions/:id/archive` | 归档会话 |
| `POST` | `/api/sessions/:id/unarchive` | 取消归档（恢复） |
| `DELETE` | `/api/sessions/:id` | 永久删除会话（含关联 pipeline_runs、checkpoints） |
| `GET` | `/api/sessions?archived=1` | 查询已归档会话列表 |

**理由：** 会话越来越多时，用户需要清理不关注的会话但不想丢失数据。归档保留数据，删除彻底清除。

---

## REQ-WEB-003：会话置顶

**优先级：** P1

**描述：**
- 数据库 `sessions` 表新增 `pinned` INTEGER DEFAULT 0 字段
- 会话列表每个条目增加 **置顶按钮**（📌 图标），点击切换 `pinned` 状态
- 置顶的会话始终排在列表最前面（排序：`pinned DESC, updated_at DESC`）
- 置顶的会话不会被引擎自动标记为 `inactive`（2h 心跳超时检查跳过 pinned 会话）
- 置顶状态持久化到数据库

**API 端点：**

| 方法 | 路径 | 功能 |
|------|------|------|
| `POST` | `/api/sessions/:id/pin` | 切换置顶状态（toggle） |

**理由：** 用户有长期关注的会话（如正在开发中的项目），不希望被心跳超时自动标记为离线。

---

## REQ-WEB-004：归档页面 UI

**优先级：** P1

**描述：**
- 在 Dashboard 顶部增加 Tab 切换：**活跃会话** | **已归档**
- 归档 Tab 下的列表结构与主列表一致，但操作按钮变为：**恢复** | **永久删除**
- 归档列表为空时显示：`暂无已归档会话` 提示
- 归档 Tab 显示会话总数 badge

**理由：** 独立页面管理归档，避免主列表混杂。

---

## REQ-WEB-005：模板命令传入 command 字段

**优先级：** P1

**描述：**
更新所有平台模板中的编排技能文件，在 `session_join` 调用时传入 `command` 参数：

| 模板文件（各平台 3 份） | command 值 |
|------------------------|-----------|
| `commands/jarvis.md` | `/jarvis` |
| `commands/jarvis-lite.md` | `/jarvis-lite` |
| `commands/frontend.md` | `/frontend` |
| `commands/backend.md` | `/backend` |

涉及平台：`claude/`、`opencode/`、`codex/`，共 4 × 3 = 12 个文件

**理由：** 确保新会话自动携带正确的 command 信息，无需手动填写。

---

## 变更文件清单

### 数据库层
| 文件 | 改动 |
|------|------|
| `src/engine/db.ts` | 新增 `archived`、`pinned`、`command` 列；新增 archive/unarchive/delete/pin SQL 函数；更新 `markStaleSessions` 跳过 pinned |

### API 层
| 文件 | 改动 |
|------|------|
| `src/engine/server.ts` | `session_join` 处理器接受 `command` 参数；新增 archive/unarchive/delete/pin MCP 工具（可选） |
| `src/web/routes.ts` | 新增 5 个 REST 端点；修改 `GET /api/sessions` 支持 `?archived=` 查询参数并返回 `command`/`pinned` |

### 前端层
| 文件 | 改动 |
|------|------|
| `src/web/views/pipeline.html` | 会话列表项增加操作按钮区；`command` 替换 `pipeline_type` 显示；新增归档 Tab 页面；已归档列表渲染逻辑 |

### 模板层
| 文件 | 改动 |
|------|------|
| `src/templates/platforms/claude/commands/jarvis.md` | 传 `command: "/jarvis"` |
| `src/templates/platforms/claude/commands/jarvis-lite.md` | 传 `command: "/jarvis-lite"` |
| `src/templates/platforms/claude/commands/frontend.md` | 传 `command: "/frontend"` |
| `src/templates/platforms/claude/commands/backend.md` | 传 `command: "/backend"` |
| + opencode/codex 各 4 个对应文件（共 8 个） | 同上 |

---

## 不做的（明确排除）
- ❌ 批量归档/删除（此版本只做单条操作）
- ❌ 归档自动清理（如 30 天后自动删除，后续版本考虑）
- ❌ 会话搜索（后续版本）
- ❌ 会话重命名
