# TASK-004：统一 agents.html 侧边栏导航

## 1. 当前实现目标

在 `agents.html` 侧边栏补充"归档记录"链接，与 `pipeline.html` 的 3 项导航一致（看板 / 归档 / 智能体）。

## 2. 对应需求 ID / 任务 ID

- 任务 ID: TASK-004
- 需求: 用户从智能体配置页面无法到达归档面板

## 3. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/web/views/agents.html` | 修改 | 在侧边栏 `<nav>` 中插入"归档记录"链接 |

**仅修改了 `<nav>` 元素内的 9 行**，不涉及其他任何代码。

## 4. 组件结构与布局说明

agents.html 侧边栏导航结构（修改后）：

```
<aside>
  ├── Logo 区域 (Jarvis Engine)
  ├── <nav> 导航
  │   ├── <a href="/dashboard"> 流水线看板 (非活跃态)
  │   ├── <a href="/dashboard#/archive"> 归档记录 (新增，非活跃态)
  │   └── <a href="/agents"> 智能体配置 (当前页，活跃态高亮)
  ├── 统计概览
  └── MCP 接入状态
</aside>
```

3 项导航与 `pipeline.html` 一致，顺序: 流水线看板 -> 归档记录 -> 智能体配置。

## 5. 样式方案说明

新增的归档记录链接样式：

- 默认态: `text-slate-500` + `border-l-[3px] border-transparent`
- hover 态: `hover:bg-indigo-50` + `hover:text-indigo-600`
- 图标: `data-lucide="archive"` (Lucide archive 图标)
- 完全遵循 pipeline.html 中同项链接的样式，使用 Tailwind 内联类名

## 6. 响应式与无障碍说明

- 侧边栏宽度固定 `w-72`，3 项导航垂直排列无溢出
- 链接使用语义化 `<a>` 标签，可键盘聚焦
- 图标使用 Lucide SVG 仅装饰，文本提供语义内容
- 所有样式使用 Tailwind 内联类名，无 `@apply`

## 7. 测试和验证结果

### 7.1 快照验证

agent-browser 在 `/agents` 页面的快照确认 3 项导航：

```
- link "流水线看板"
- link "归档记录"     ← 新增
- link "智能体配置"
```

### 7.2 HTML 属性验证 (curl)

```
<a href="/dashboard#/archive" class="flex items-center gap-2.5 px-3 py-2.5 
   rounded-lg text-sm font-medium text-slate-500 hover:bg-indigo-50 
   hover:text-indigo-600 border-l-[3px] border-transparent transition-colors">
  <i data-lucide="archive" class="w-4 h-4"></i>
  归档记录
</a>
```

### 7.3 多视口截图

| 视口 | 截图路径 | 状态 |
|------|---------|------|
| Desktop (1280x800) | `docs/tmp/screenshots/agents-archive-nav-desktop.png` | 已截图 |
| Tablet (768x1024) | `docs/tmp/screenshots/agents-archive-nav-tablet.png` | 已截图 |
| Mobile (375x812) | `docs/tmp/screenshots/agents-archive-nav-mobile.png` | 已截图 |

### 7.4 服务器日志

- jarvis-web 服务器无错误日志输出

## 8. 风险 / 未解决项

- 无。变更范围精确，仅修改 agents.html 的 `<nav>` 区域，不影响其他文件

## 9. 推荐的下一步

- 由 qa-review-expert 评审视觉一致性和功能正确性
- 确认从 `/agents` 页面点击"归档记录"能正确跳转到 `/dashboard#/archive`
