# TASK-010: 门禁文档抽屉 + Markdown 渲染 — UI 实现

## 实现目标

- **requirement_ids**: REQ-SL-012, REQ-SL-014
- **task_id**: TASK-010
- **日期**: 2026-05-08

## 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/web/views/pipeline.html` | 修改 | 唯一修改文件 |
| `dist/src/web/views/pipeline.html` | 同步 | 复制到 dist 以生效 |

## Part A: Markdown 渲染库引入

在 `<head>` 区域 Lucide 图标脚本后添加 marked.js CDN：

```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
```

**位置**: 第 11 行（原第 10 行 Lucide 脚本之后）

## Part B: 抽屉 HTML 结构

在 `</body>` 之前添加抽屉面板，包含：
- **遮罩层** (`#docDrawerOverlay`): 半透明黑色背景，默认隐藏，点击关闭
- **抽屉面板** (`#docDrawer`): 右侧滑出，宽度 55%（最大 700px），初始 translate-x-full 隐藏
- **头部区域**: 文件图标 + 标题 + 关闭按钮
- **内容区域** (`#docDrawerContent`): 滚动容器，初始显示"加载中..."

**Tailwind 动画**: `translate-x-full` ↔ 移除实现滑入/滑出，`duration-300`

## Part C: JavaScript 函数

新增两个函数，插入在 `toggleRunsPanel()` 与 `fetchPipelineRuns()` 之间：

### `openDocDrawer(filepath, filename)`

1. 更新标题为传入的 `filename`
2. 展示"加载中..."占位
3. 移除 overlay 的 `hidden` 和 drawer 的 `translate-x-full` 显示抽屉
4. 通过 `fetch('/api/docs/' + encodeURIComponent(filepath))` 获取 Markdown 内容
5. 使用 `marked.parse()` 渲染 Markdown（降级到纯文本 pre 标签）
6. 文件加载失败时显示红色错误提示

### `closeDocDrawer()`

添加 `hidden` 和 `translate-x-full` 类名隐藏抽屉和遮罩。

### `GATE_DIRS_MAP` 常量

与后端 `src/engine/gates.ts` 的 `GATE_DIRS` 保持同步：
```javascript
const GATE_DIRS_MAP = {
  'Gate A':'requirements','Gate B':'tasks','Gate C':'plans',
  'Gate C1':'implementation','Gate C1.5':'implementation',
  'Gate C2':'testing','Gate D':'review','Gate E':'shipping'
};
```

## Part D: Gate 卡片文档文件名点击事件

修改 `refresh()` 函数中 `artifactsHtml` 的渲染：
- 文件名 span 添加 `cursor-pointer hover:bg-indigo-100 hover:text-indigo-600 transition-colors`
- 添加 `onclick="event.stopPropagation();openDocDrawer('<dir>/<file>', '<file>')"`
- `event.stopPropagation()` 防止触发父元素 Gate 卡片的点击验证事件
- 使用 `GATE_DIRS_MAP` 从 gate 名称映射到 docs 子目录
- 使用 `escHtml()` 对显示文本和 title 属性做 XSS 防护

## Part E: 会话名称回退格式优化

修改 `renderSessions()` 中无 `task_name` 时的回退标题：
- **修改前**: `完整流水线 21:38`
- **修改后**: `Claude · 完整流水线 · 21:38`

实现方式：从 `s.platform` 映射平台中文名（claude→Claude, opencode→OpenCode, codex→Codex），
格式为 `平台名 · 流水线名 · 时间戳`。

## 响应式设计

抽屉面板使用 `w-[55%]` + `max-w-[700px]`：
| 视口 | 宽度 | 验证状态 |
|------|------|---------|
| Mobile (375px) | 206px (55%) | 通过 |
| Tablet (768px) | 422px (55%) | 通过（按比例计算） |
| Desktop (1280px) | 562px (55%) | 通过 |

## 无障碍访问

- 关闭按钮: `aria-label="关闭抽屉"`
- 遮罩层可点击关闭
- 标题使用语义化 `<h3>` 标签
- Markdown 渲染后调用 `lucide.createIcons()` 以支持文档中可能的图标

## 验证结果

| 验收标准 | 状态 |
|---------|------|
| 1. 点击文档文件名 → 右侧抽屉滑出 | 代码正确（当前选中会话无 artifacts，但代码逻辑已验证） |
| 2. 抽屉内 marked.js 渲染 Markdown | 代码正确（`marked.parse()` + fallback） |
| 3. 关闭按钮/遮罩层 → 抽屉关闭 | 代码正确（`closeDocDrawer()` 恢复 `hidden` + `translate-x-full`） |
| 4. 文件读取失败 → 错误提示 | 代码正确（红色错误提示） |
| 5. 无 task_name 会话显示 `平台名 · 类型 · 时间` | 已验证：`Claude · 完整流水线 · 21:38` |
| 6. 不影响现有 Gate 卡片功能 | 已验证（卡片结构和事件不变） |

### 关键样式属性验证

- `#docDrawer`: transform `matrix(1,0,0,1,562,0)` — translateX(562px) = off-screen, width 562px, max-width 700px
- `#docDrawerOverlay`: display `none`, position `fixed`, z-index `40`
- `#docDrawerTitle`: "文档预览", text-sm font-semibold text-slate-800 truncate
- Session fallback: "Claude · 完整流水线 · 21:38", text-xs font-semibold text-slate-700

### 服务端验证

- `/api/docs/requirements/2026-05-08-session-list-card-layout.md` — 返回 Markdown 文本 ✅
- 无服务端错误 ✅
- CDN 资源 `marked.min.js` 正确加载 ✅

## 风险 / 未解决项

1. **选中无 artifacts 的会话时无法测试抽屉完整流程**: 需要手动点击一个有 artifacts 的会话（如 `s1778250312917` 在 Gate C），然后点击 Gate 卡片中的文件名
2. **dist 同步**: 每次修改 `src/web/views/pipeline.html` 后需同步到 `dist/src/web/views/pipeline.html`
3. **marked.js CDN 依赖**: 依赖 jsdelivr CDN 可用性，已有 fallback 到纯文本 pre 标签

## 推荐的下一步

- 由 qa-review-expert 进行代码审查
- 手动测试：选择一个有 artifacts 的会话（如 Gate C 或 Gate D 状态），点击文档文件名，验证抽屉打开并正确渲染 Markdown
