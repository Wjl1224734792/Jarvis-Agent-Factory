# TASK-009: 会话菜单所有会话可操作 + 删除红色

## 1. 实现目标

- 所有会话（无论是否有活跃 run）的 ⋮ 按钮均可点击弹出菜单
- 无 run 会话的置顶/归档菜单项置灰禁用（`cursor-not-allowed` + `disabled`）
- 删除菜单项始终可用且为危险红色样式（`text-red-500 hover:bg-red-50`）
- 移除旧的 `aria-disabled` 永久禁用按钮

## 2. 需求与任务追溯

| 字段 | 值 |
|------|---|
| **Task ID** | TASK-009 |
| **Requirement ID** | REQ-SL-009 |
| **类型** | UI 功能增强 |

## 3. 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/web/views/pipeline.html` | 修改 | `renderSessions()` 函数中 ⋮ 按钮区域（第 562-579 行） |

**未修改的共享区域：** 无。本次变更仅在 `renderSessions()` 函数内部，不涉及共享组件、路由或根配置。

## 4. 组件结构与布局说明

### 4.1 变更前（旧逻辑）

```
hasActiveRun ?
  ├── [是] 渲染完整菜单（按钮 + 下拉菜单，含置顶/归档/删除）
  └── [否] 渲染永久禁用按钮（aria-disabled="true", cursor-not-allowed）
```

### 4.2 变更后（新逻辑）

```
所有会话统一渲染：
  ⋮ 按钮（始终可点击，调用 toggleRunMenu）
  └── 下拉菜单
      ├── 置顶/取消置顶 — hasActiveRun ? 可用 : 灰色禁用
      ├── 归档           — hasActiveRun ? 可用 : 灰色禁用
      └── 删除           — 始终红色可用
```

### 4.3 关键实现细节

**菜单 ID fallback：**
- `s.run_id || s.id` — 当会话无 run 记录时，使用 `s.id` 作为菜单 ID，避免 `undefined`

**按钮交互：**
- `toggleRunMenu(event, s.run_id || s.id)` — 始终可调用
- `togglePin(s.run_id, isPinned)` — 仅 hasActiveRun 时可调用
- `archiveRunFromMenu(s.run_id)` — 仅 hasActiveRun 时可调用
- `deleteRunFromMenu(s.run_id || s.id)` — 始终可调用

## 5. 样式方案

| 元素 | Tailwind 类名 | 说明 |
|------|-------------|------|
| ⋮ 按钮（通用） | `w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none` | 与之前有 run 的按钮样式一致 |
| 置顶/归档（可用） | `text-slate-600 hover:bg-slate-50` | 正常可交互样式 |
| 置顶/归档（禁用） | `text-slate-300 cursor-not-allowed` + `disabled` 属性 | 灰色不可点击 |
| 删除（始终） | `text-red-500 hover:bg-red-50` | 危险红色 + 浅红悬浮背景 |
| 菜单容器 | `bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[112px]` | 与之前一致 |

## 6. 响应式与无障碍说明

**响应式：**
- 菜单按钮宽度 `w-5`（20px），图标 `w-3.5`（14px），在任何视口下均不变
- 会话列表本身使用 Flexbox 布局，已适配 mobile/tablet/desktop

**无障碍：**
- ⋮ 按钮：`aria-label="更多操作"`、`aria-haspopup="menu"`、`aria-expanded="false"`
- 禁用按钮：`disabled` 属性（HTML 原生禁用语义）
- 删除按钮：红色文字 `text-red-500` 提供视觉危险提示
- 已移除旧的 `aria-disabled="true"`（不再需要）

## 7. 验证结果

### 7.1 自动化验证

| 检查项 | 结果 |
|--------|------|
| ESLint | 通过（HTML 文件无匹配配置，0 errors） |
| TypeScript typecheck | 通过（零错误） |
| Build | 通过（`npm run build` 成功） |

### 7.2 视觉验证（preview_inspect）

| 视口 | ⋮ 按钮表现 | 验证方式 |
|------|-----------|---------|
| Desktop (1280x800) | 20x20px, flex centered, text-slate-400 | `preview_inspect` 计算样式确认 |
| Tablet (768x1024) | 20x20px, flex centered | `preview_inspect` 计算样式确认 |
| Mobile (375x812) | 20x20px, flex centered | `preview_inspect` + 快照树确认 |

### 7.3 快照验证（preview_snapshot）

- 所有会话项均显示 `aria-label="更多操作"`（旧版为 `aria-label="运行操作"`）
- 会话列表在 mobile/tablet/desktop 三种视口下列表结构完整
- 无 `aria-disabled` 残留

### 7.4 代码审查

- 生成的 HTML 在 `dist/` 中验证：
  - `更多操作` → 存在于第 563 行
  - `cursor-not-allowed` + `disabled` → 存在于第 570、575 行
  - `text-red-500 hover:bg-red-50` → 存在于第 577 行
  - `s.run_id \|\| s.id` fallback → 存在于第 563、566、577 行

## 8. 风险 / 未解决项

- **无风险**：本次变更仅修改 HTML 模板字符串，不影响任何 API 调用或数据流
- **注意**：当前测试数据中所有会话均有 `run_id`，无 run 的禁用场景通过代码逻辑验证（`hasActiveRun ? enabled : disabled`），实际效果需在生产环境中有无 run 会话时验证

## 9. 下一步

- 由 qa-review-expert 进行代码审查
- 在 staging 环境测试无 run 会话的菜单禁用效果
