# Run 置顶功能 + Hash 路由支持 — 前端实现文档

## 1. 当前实现目标

- **TASK-DASH-004**: Run 置顶功能 -- 数据库迁移 + API 端点 + 前端三点菜单集成
- **TASK-DASH-005**: Hash 路由支持 -- pipeline.html 内 SPA 式面板切换 + 归档面板嵌入

## 2. 对应需求 ID / 任务 ID

| 需求 | 说明 |
|------|------|
| TASK-DASH-004 | Run 置顶功能（pin/unpin） |
| TASK-DASH-005 | Hash 路由支持（#/dashboard, #/archive, #/agents） |

## 3. 输入依据

- 编排者分配的任务描述（包含详细的代码示例）
- 已有代码：`db.ts`, `routes.ts`, `server.ts`, `pipeline.html`, `archive.html`
- DASH-001/DASH-002/DASH-003 的既有变更作为基础

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/db.ts` | 新增 | pinned 列迁移、pinRun/unpinRun 函数 |
| `src/web/routes.ts` | 新增 | pin/unpin API 端点、sessions 响应加 pinned 字段 |
| `src/web/views/pipeline.html` | 修改 | 置顶 UI、Hash 路由、归档面板嵌入 |
| `src/web/views/archive.html` | 未修改 | 保持独立页面，不需 Hash 路由 |

## 5. 实现说明

### 5.1 数据库层（db.ts）

**迁移**：在 `initSchema()` 中添加 `pinned INTEGER DEFAULT 0` 列，使用 `try/catch` 包裹确保幂等（已存在列时不报错）。

**新增函数**：
- `pinRun(db, runId)` — 设置 `pinned=1`，返回 `{ ok: boolean }`
- `unpinRun(db, runId)` — 设置 `pinned=0`，返回 `{ ok: boolean }`

两个函数与已有的 `archiveRun/unarchiveRun/deleteRun` 保持一致的风格：参数校验 + 单条 SQL + 变更行数判断。

### 5.2 API 层（routes.ts）

**新增端点**：
- `POST /api/pipeline-runs/:id/pin` → 置顶 run
- `POST /api/pipeline-runs/:id/unpin` → 取消置顶 run
- 均返回 `{ ok: true }` 或 `{ ok: false, error: "Run not found: ..." }` (404)

**pinned 字段传递**：在 `broadcastSSE()` 和 `/api/sessions` 响应中，为每个会话附加 `pinned: run?.pinned || 0`，使前端能获取当前活跃 run 的置顶状态。

**导入新增**：从 db.js 额外导入 `pinRun, unpinRun`。

### 5.3 前端 — 置顶 UI（pipeline.html）

**renderSessions() 重写**：
1. 使用 `filtered.slice().sort()` 按 `pinned` 字段排序，置顶会话排在最前面
2. 置顶会话行添加 `border-t-2 border-t-amber-400` 金色顶部边框
3. 置顶会话行标题前显示 📌 图标（`<span class="text-amber-500">📌</span>`）
4. ES5 兼容写法（`var`/`function`），避免箭头函数

**三点菜单扩展**：
- 原菜单：归档 | 删除
- 新菜单：**置顶/取消置顶** | 归档 | 删除
- 菜单最小宽度从 `min-w-[96px]` 调整为 `min-w-[112px]` 以容纳"取消置顶"文字

**togglePin(runId, pinned)**：
- 判断当前状态调用 `/api/pipeline-runs/:id/pin` 或 `/unpin`
- 成功后调用 `refresh()` 刷新会话列表

### 5.4 前端 — Hash 路由（pipeline.html）

**侧边栏导航改造**：
- 所有 `<a>` 链接添加 `class="nav-link"` 和 `data-hash="#/xxx"` 属性
- `<nav>` 元素添加 `id="sidebarNav"`
- 新增"归档记录"导航项（`#/archive`）
- "智能体配置"使用 `onclick="window.location.href='/agents'"`（完整页面跳转）

**页面面板结构**：
```html
<main>
  <div id="panel-dashboard" class="page-panel">
    <!-- 原有流水线看板内容 -->
  </div>
  <div id="panel-archive" class="page-panel hidden">
    <!-- 归档面板：搜索框 + 分组列表 + 恢复/删除按钮 -->
  </div>
</main>
```

**handleRoute() 函数**：
- 读取 `window.location.hash`，默认为 `#/dashboard`
- 隐藏所有 `.page-panel`，显示对应面板
- `#/archive` → 调用 `showArchivePanel()` 加载归档数据
- `#/agents` → `window.location.href = '/agents'`（完整跳转）
- 其他 → `showDashboardPanel()`
- 调用 `updateNavActive(hash)` 更新侧边栏高亮

**updateNavActive(hash)**：
- 遍历 `.nav-link` 元素，比对 `data-hash` 属性
- 匹配时添加高亮样式（`bg-indigo-50 text-indigo-600 border-indigo-500`）
- 不匹配时恢复默认样式（`text-slate-500 border-transparent`）

**事件绑定**：
- `window.onhashchange = handleRoute` — 响应浏览器前进/后退

**归档面板 JS**：
- `loadArchivedRuns()` — 从 `/api/pipeline-runs/archived` 加载数据
- `applyArchiveFilter()` / `renderArchiveList()` — 按 task_name/session_id 搜索过滤
- `restoreFromArchive(runId)` — 调用 `/unarchive` 恢复
- `deleteFromArchive(runId)` — 调用 `DELETE` 删除（需确认）
- 列表按 session_id 分组显示，复用 COMMAND_LABELS/COMMAND_COLORS 映射

**定时刷新优化**：
- 归档面板可见时跳过 `refresh()` 调用，避免不必要的看板数据请求
- `fetchPipelineRuns()` 仅在看板面板需要时调用

### 5.5 引擎层（server.ts）

确认已有路由（无需修改）：
- `GET /` → 重定向到 `/dashboard`（line 593）
- `GET /archive` → 返回 `archive.html`（line 598-599）

## 6. 测试和验证结果

| 检查项 | 结果 |
|--------|------|
| TypeScript 编译 (`tsc --noEmit`) | 通过，零错误 |
| 构建 (`npm run build`) | 通过 |
| Lint (`npm run lint`) | 0 错误，52 警告（均为既有警告） |
| 单元测试 (`npm test`) | 2 文件 24 测试全部通过 |
| HTML 结构验证 (div 闭合) | 平衡（99 开 / 99 关） |

## 7. 边界和异常处理

| 场景 | 处理方式 |
|------|---------|
| runId 不存在 | API 返回 404 `{ ok: false, error: "Run not found: ..." }` |
| runId 为空 | DB 函数返回 `{ ok: false }` |
| 网络错误（前端） | catch 块 + toast 提示用户 |
| 重复置顶 | 幂等，`pinned=1` 多次设置无副作用 |
| 无 hash 初始加载 | 默认 `#/dashboard`，显示看板面板 |
| 归档面板搜索无结果 | 显示"未找到匹配的归档记录"空状态 |
| 归档面板无数据 | 显示"暂无归档记录"引导提示 |

## 8. 风险 / 未解决项

- **Tailwind CDN 动态类名**：`updateNavActive()` 中动态添加/移除的 Tailwind 类（如 `bg-indigo-50`）依赖 CDN 实时编译，生产环境若切换为构建时 Tailwind 需确保 safelist 包含这些类。
- **pipeline.html 文件大小**：当前文件超过 1000 行，后续可考虑拆分为独立 JS 文件。

## 9. 需要后端配合的点

- 数据库迁移 `ALTER TABLE pipeline_runs ADD COLUMN pinned INTEGER DEFAULT 0` 已在前端代码所在仓库的 db.ts 中完成，无需额外后端操作。
- API 端点已在 routes.ts 中完成注册，engine server.ts 无需修改。

## 10. 推荐的下一步

1. 启动 dev server 预览验证置顶 UI 效果和 Hash 路由切换
2. 浏览器手动测试：置顶/取消置顶 → 确认 sidebar 排序和图标
3. 浏览器手动测试：Hash 路由（前进/后退）→ 确认面板切换和导航高亮
4. 浏览器手动测试：归档面板的搜索、恢复、删除功能
5. 视口响应式验证（mobile/tablet/desktop）
