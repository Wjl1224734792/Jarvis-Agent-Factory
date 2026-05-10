# Run 归档功能实现文档

## 1. 当前实现目标

实现 TASK-DASH-003：Run 归档功能，包括数据库 migrated column、4 个 REST API 端点、归档页面、菜单入口。

## 2. 对应需求 ID / 任务 ID

- 需求: REQ-DASH-003
- 任务: TASK-DASH-003

## 3. 输入依据

- 上游编排者分配的子任务
- 现有代码: `src/engine/db.ts`, `src/web/routes.ts`, `src/engine/server.ts`, `src/web/views/pipeline.html`
- 项目约束: AGENTS.md, CLAUDE.md, 通用编程规范与指南.md

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/db.ts` | 修改 | 新增 `archived` 列迁移、4 个函数，修改 `getActiveRun` 排除归档 run |
| `src/web/routes.ts` | 修改 | 新增 4 个归档 API 端点，SSE/会话 API 增加 `run_id` 字段 |
| `src/engine/server.ts` | 修改 | `startWeb()` 新增 `/archive` 路由 |
| `src/web/views/pipeline.html` | 修改 | 会话卡片新增三点菜单（归档/删除），新增 JS 函数 |
| `src/web/views/archive.html` | 新增 | 归档记录独立页面，含搜索/恢复/删除功能 |

## 5. 实现说明

### 5.1 数据库层 (`src/engine/db.ts`)

**迁移:**
```sql
ALTER TABLE pipeline_runs ADD COLUMN archived INTEGER DEFAULT 0;
```

**修改 `getActiveRun`:** 增加 `AND archived=0` 条件，使归档 run 不再作为活跃 run 返回。

**新增函数:**

| 函数 | 说明 |
|------|------|
| `archiveRun(db, runId)` | 设置 archived=1 |
| `unarchiveRun(db, runId)` | 设置 archived=0 |
| `getArchivedRuns(db)` | 查询所有 archived=1 的 run，按 session_id + started_at 排序 |
| `deleteRun(db, runId)` | 硬删除 (DELETE FROM pipeline_runs WHERE id=?) |

### 5.2 API 路由 (`src/web/routes.ts`)

新增 4 个端点:

```
POST   /api/pipeline-runs/:id/archive    → { ok: true }  | 404 { ok: false, error }
POST   /api/pipeline-runs/:id/unarchive  → { ok: true }  | 404 { ok: false, error }
GET    /api/pipeline-runs/archived       → { runs: [...], count: N }
DELETE /api/pipeline-runs/:id            → { ok: true }  | 404 { ok: false, error }
```

SSE 广播和 `/api/sessions` 响应新增 `run_id` 字段，供前端三点菜单使用。

### 5.3 Web 面板路由 (`src/engine/server.ts`)

在 `startWeb()` 中新增:
```js
app.get('/archive', (c) =>
    c.html(readFileSync(resolve(viewsDir, 'archive.html'), 'utf-8')));
```

### 5.4 会话列表三点菜单 (`src/web/views/pipeline.html`)

在 `renderSessions()` 中，每个有活跃 run 的会话卡片右上角新增三点菜单按钮:
- 使用 lucide `more-vertical` 图标
- 点击展开下拉菜单（含"归档"和"删除"选项）
- "归档"：POST archive API，成功后刷新列表
- "删除"：点击弹出 `confirm('确认永久删除该运行记录？此操作不可恢复。')`，确认后 DELETE
- 点击页面其他区域自动关闭菜单

新增 JS 函数:
- `toggleRunMenu(event, runId)` — 切换下拉菜单显示
- `archiveRunFromMenu(runId)` — 调用归档 API
- `deleteRunFromMenu(runId)` — 确认后调用删除 API
- 全局 `document.addEventListener('click', ...)` — 关闭所有菜单

### 5.5 归档页面 (`src/web/views/archive.html`)

风格与 `pipeline.html` 一致（Tailwind CDN + Inter 字体 + lucide 图标）:
- 左侧边栏：导航（流水线看板 / 智能体配置 / 归档记录高亮）
- 主内容：
  - 页面标题 + "已归档运行"标签
  - 搜索框（按 task_name 过滤）
  - 按 session_id 分组的运行列表，每条显示：task_name、指令标签、流水线类型、Run ID、归档时间、状态
  - 操作按钮：恢复（unarchive）/ 删除（带 confirm）
  - 空状态："暂无归档记录"（带引导文字）
  - 搜索无结果："未找到匹配的归档记录"

## 6. 测试和验证结果

### 自动化测试

```
npm run typecheck  → 通过（零类型错误）
npm run test       → 24 passed（零回归）
npm run lint       → 无新增错误（仅预存 unused-vars warning）
npm run build      → 成功
```

### API 手动验证

```
# 归档 run
POST /api/pipeline-runs/run_xxx/archive  → {"ok":true}

# 查询归档列表
GET /api/pipeline-runs/archived  → {"runs":[{...archived:1}],"count":1}

# 取消归档
POST /api/pipeline-runs/run_xxx/unarchive  → {"ok":true}

# 删除不存在的 run
DELETE /api/pipeline-runs/nonexistent_run  → {"ok":false,"error":"Run not found: nonexistent_run"}
```

### UI 验证

- Dashboard 页面：有活跃 run 的会话卡片显示三点菜单按钮（"运行操作"）
- 归档页面：正常加载、显示已归档 run 含 task_name "给web增加归档功能"、恢复/删除按钮可用
- 归档后空状态：无归档 run 时显示"暂无归档记录"

## 7. 边界和异常处理

| 场景 | 处理方式 |
|------|---------|
| 归档不存在的 run | API 返回 404 `{ ok: false, error: "Run not found: ..." }` |
| 取消归档不存在的 run | 同上 |
| 删除不存在的 run | 同上 |
| 无归档记录 | 归档页面显示空状态提示 |
| 搜索无匹配 | 归档页面显示"未找到匹配的归档记录" |
| 网络错误 | 前端 catch 后显示 toast 提示 |
| build 后 HTML 文件位置 | 需手动复制 `src/web/views/archive.html` 到 `dist/src/web/views/`（与现有 pipeline.html/agents.html 一致） |

## 8. 风险 / 未解决项

1. **build 后 HTML 同步**: `tsc` 不会复制 `.html` 文件到 `dist/`。项目原有 `pipeline.html` 和 `agents.html` 在 `dist/` 中存在（来自此前手动复制或构建脚本），新增的 `archive.html` 需同样处理。**建议**: 在 build 脚本中增加 `cp src/web/views/*.html dist/src/web/views/`。
2. **`getActiveRun` 修改影响面**: 所有调用 `getActiveRun` 的 MCP 工具均受影响——归档后的 run 不再被视为活跃 run。这是符合预期的行为（归档 = 不再活跃）。
3. **菜单入口仅在有活跃 run 时显示**: 部分 session 没有活跃 run（run_id: null），不显示三点菜单。这是正确的行为——没有可归档的 run。

## 9. 需要后端配合的点

无。本任务为纯前端实现（DB 层 + API + 页面），数据库迁移已内置于 `initSchema()` 中。

## 10. 推荐的下一步

1. 在 `package.json` 的 `build` 脚本中增加 HTML 文件复制步骤
2. 可考虑为归档页面添加分页（当归档记录很多时）
3. 可考虑在 sidebar 导航中为归档链接添加未读计数（显示当前归档数量）
