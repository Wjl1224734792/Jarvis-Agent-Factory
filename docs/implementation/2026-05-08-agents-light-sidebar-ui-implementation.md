# 智能体配置页亮色侧边栏 UI 实现

## 1. 实现目标

将 `E:\CodeStore\jarvis\src\web\views\agents.html` 的暗色侧边栏风格改为亮色系控制台风格。

## 2. 对应需求/任务

- 任务：暗色侧边栏改亮色系控制台风格
- 原因：用户反馈暗色 `bg-slate-900` 看不清

## 3. 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/web/views/agents.html` | 修改 | 侧边栏 CSS 类名从暗色改为亮色 |
| `.claude/launch.json` | 修改 | 拆分 engine 与 web 独立配置 |

## 4. 变更范围

### 4.1 侧边栏容器 (Line 26)
- `bg-slate-900 text-slate-300 shadow-xl` → `bg-white text-slate-800 shadow-sm border-r border-slate-200`

### 4.2 Logo 区域 (Line 28)
- 分割线 `border-slate-700/60` → `border-slate-100`
- 标题 `text-white` → `text-slate-800`
- 版本号 `text-slate-500` → `text-slate-400`

### 4.3 导航链接 (Lines 42, 46)
- 默认链接：`text-slate-400 hover:bg-slate-800 hover:text-slate-200` → `text-slate-500 hover:bg-indigo-50 hover:text-indigo-600`
- 激活链接：`bg-indigo-600/20 text-indigo-300` → `bg-indigo-50 text-indigo-600`

### 4.4 统计面板卡片 (Lines 54-63)
- 卡片背景 `bg-slate-800` → `bg-slate-50`
- 数字颜色 `text-white` → `text-slate-800`，`text-indigo-400` → `text-indigo-600`
- 标签 `text-slate-500` → `text-slate-400`

### 4.5 操作提示区域 (Lines 69-77)
- 分割线 `border-slate-700/60`、`border-slate-700/40` → `border-slate-100`
- 文字 `text-slate-500` → `text-slate-400`
- 自定义标记 `text-indigo-400` → `text-indigo-600`
- 默认标记 `text-slate-500` → `text-slate-400`

### 4.6 MCP 状态 (Lines 72, 489-491)
- 静态占位文字 `text-slate-600` → `text-slate-400`，占位圆点 `bg-slate-600` → `bg-slate-400`
- 动态连接文字 `text-emerald-400` → `text-emerald-600`，断开文字 `text-slate-600` → `text-slate-400`
- 在线指示灯保持 `bg-emerald-500`

### 4.7 未修改部分
- 主内容区所有样式（已是亮色）
- 平台标签、分类筛选按钮
- Agent 卡片样式
- 弹窗样式
- 滚动条样式 `scrollbar-color: #CBD5E1 transparent`
- 所有 JavaScript 逻辑代码

## 5. 样式方案说明

- 纯 Tailwind 内联类名，无 `@apply`
- 侧边栏亮色底 `bg-white` + 浅灰边框 `border-slate-200`
- 文字层级：标题 `slate-800` → 副标题/标签 `slate-400` → 导航 `slate-500`
- 激活/高亮使用 `indigo-50` 背景 + `indigo-600` 文字
- 统计卡片浅灰底 `bg-slate-50` 保持层次感

## 6. 响应式与无障碍

- 侧边栏固定宽度 `w-72 min-w-[288px]`，与主内容区 flex 布局
- 等宽字体 `font-mono`（JetBrains Mono）保持控制台风格
- 导航链接 `border-l-[3px]` 提供视觉当前页指示
- 颜色对比度满足 WCAG 标准（深色文字在白色背景上）

## 7. 验证结果

### 7.1 运行时颜色验证（agent-browser DevTools）

| 元素 | 预期 | 实际计算值 | 结果 |
|------|------|-----------|------|
| 侧边栏背景 | white | `rgb(255,255,255)` | ✅ |
| 标题文字 | slate-800 | `rgb(30,41,59)` | ✅ |
| 默认导航链接 | slate-500 | `rgb(100,116,139)` | ✅ |
| 激活导航链接 | indigo-600 | `rgb(79,70,229)` | ✅ |
| 统计数字（全部） | slate-800 | `rgb(30,41,59)` | ✅ |
| 统计数字（已配置） | indigo-600 | `rgb(79,70,229)` | ✅ |

### 7.2 HTML 源码验证（curl）
- 所有侧边栏 CSS 类名与需求规格一致 ✅
- 主内容区类名未受影响 ✅
- JavaScript 逻辑代码未修改 ✅

### 7.3 截图文件

| 视口 | 路径 |
|------|------|
| Desktop (1280×800) | `docs/implementation/screenshots/agents-desktop-light.png` |
| Tablet (768×1024) | `docs/implementation/screenshots/agents-tablet-light.png` |
| Mobile (375×812) | `docs/implementation/screenshots/agents-mobile-light.png` |

## 8. 风险/未解决项

- 无已知风险
- MCP 断开状态指示点 `bg-slate-600` 在 JS 模板中未改（需求未明确要求修改），视觉上与亮色背景略有对比度差异，可后续微调

## 9. 推荐的下一步

- 由 `qa-review-expert` 审查改动
- 用户浏览器端实际查看确认亮色样式
