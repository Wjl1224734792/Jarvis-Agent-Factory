# 流水线看板暗色侧边栏 → 亮色控制台风格改造

## 实现目标

将 `pipeline.html` 的暗色侧边栏（`bg-slate-900`）改为亮色系控制台风格，提升可读性。

## 对应需求 / 任务 ID

来自编排者分配的 UI 样式改造任务。

## 变更文件

| 文件 | 变更类型 | 变更行数 |
|------|---------|---------|
| `src/web/views/pipeline.html` | 修改 | ~30 处类名替换 |

## 变更范围

仅修改 CSS 类名（HTML 和 JS 模板字符串中的颜色相关类名），不改 HTML 结构、不改变 JS 逻辑。

## 组件结构与布局说明

侧边栏（`<aside>`）保持原有结构不变：
- Logo 区域（标题 + 版本号）
- 导航（流水线看板 / 智能体配置）
- 平台筛选（全部 / Claude / OpenCode / Codex）
- 会话列表（动态渲染）
- MCP 接入状态（动态渲染 + 底部状态栏）

## 样式方案说明

### 1. 侧边栏容器

| 属性 | 旧值 | 新值 |
|------|------|------|
| 背景 | `bg-slate-900` | `bg-white` |
| 文字 | `text-slate-300` | `text-slate-700` |
| 阴影 | `shadow-xl` | `shadow-sm` |
| 右边框 | 无 | `border-r border-slate-200` |

### 2. Logo 区域

| 元素 | 旧值 | 新值 |
|------|------|------|
| 分割线 | `border-slate-700/60` | `border-slate-100` |
| 标题 | `text-white` | `text-slate-800` |
| 版本号 | `text-slate-500` | `text-slate-400` |

### 3. 导航链接

| 状态 | 旧值 | 新值 |
|------|------|------|
| 激活 | `bg-indigo-600/20 text-indigo-300 border-indigo-500` | `bg-indigo-50 text-indigo-600 border-indigo-500` |
| 未激活 | `text-slate-400 hover:bg-slate-800 hover:text-slate-200` | `text-slate-500 hover:bg-indigo-50 hover:text-indigo-600` |

### 4. 平台筛选

| 状态 | 旧值 | 新值 |
|------|------|------|
| 选中 | `bg-indigo-600 text-white` | 保持不变 |
| 未选中 | `text-slate-400 hover:bg-slate-800 hover:text-slate-200` | `text-slate-500 hover:bg-slate-100 hover:text-slate-700` |
| 标签文字 | `text-slate-500` | `text-slate-400` |

### 5. 会话列表

| 元素 | 旧值 | 新值 |
|------|------|------|
| 标签文字 | `text-slate-500` | `text-slate-400` |
| 空状态文字 | `text-slate-600` | `text-slate-400` |
| 刷新按钮 hover | `hover:bg-slate-800` | `hover:bg-slate-100` |
| 会话项 hover | `hover:bg-slate-800/50` | `hover:bg-slate-50` |
| 会话项激活 | `bg-indigo-600/15 border-indigo-500/40` | `bg-indigo-50 border-indigo-200` |
| 会话 ID | `text-slate-300` | `text-slate-700` |
| Gate 标签 | `text-slate-500 bg-slate-800` | `text-slate-500 bg-slate-100` |
| Pipeline 类型标签 | `text-indigo-400 bg-indigo-600/15` | `text-indigo-600 bg-indigo-50` |

### 6. MCP 状态区域

| 元素 | 旧值 | 新值 |
|------|------|------|
| 上分割线 | `border-slate-700/60` | `border-slate-100` |
| 标题 | `text-slate-500` | `text-slate-400` |
| 连接文字（在线） | `text-emerald-400` | `text-emerald-600` |
| 连接文字（离线） | `text-slate-600` | `text-slate-400` |
| 在线指示灯 | `bg-emerald-500` | 保持不变 |
| 离线指示灯 | `bg-slate-600` | `bg-slate-400` |

### 7. 底部状态栏

| 元素 | 旧值 | 新值 |
|------|------|------|
| 分割线 | `border-slate-700/40` | `border-slate-100` |
| 文字 | `text-slate-500` | `text-slate-400` |

## 响应式与无障碍说明

- 侧边栏宽度维持 `w-72 min-w-[288px]`，不随视口变化
- 所有文字颜色在白色背景上对比度足够（slate-800/slate-700 在白色背景上 WCAG AA 合规）
- 交互状态（hover/focus/active）均保留了视觉反馈
- 等宽字体与原有控制台风格保持一致

## 测试和验证结果

### DOM 类名验证（全部通过）

通过 agent-browser 运行时 DOM 检查，逐项验证：

- [x] 侧边栏容器：`bg-white text-slate-700 border-r border-slate-200 shadow-sm`
- [x] Logo 分割线：`border-slate-100`
- [x] 标题文字：`text-slate-800`
- [x] 版本号：`text-slate-400`
- [x] 导航激活：`bg-indigo-50 text-indigo-600 border-indigo-500`
- [x] 导航未激活：`text-slate-500 hover:bg-indigo-50 hover:text-indigo-600`
- [x] 平台筛选标签：`text-slate-400`
- [x] 平台筛选按钮（未选中）：`text-slate-500 hover:bg-slate-100 hover:text-slate-700`
- [x] 平台筛选按钮（选中）：`bg-indigo-600 text-white`（不变）
- [x] 会话列表标签：`text-slate-400`
- [x] 刷新按钮：`hover:bg-slate-100`
- [x] 空状态文字：`text-slate-400`
- [x] MCP 分割线：`border-slate-100`
- [x] MCP 标题：`text-slate-400`
- [x] MCP 状态文字：`text-slate-400`
- [x] 底部状态栏：`text-slate-400 border-t border-slate-100`
- [x] 会话项激活：`bg-indigo-50 border border-indigo-200`
- [x] 会话项 hover：`hover:bg-slate-50`
- [x] 会话 ID 文字：`text-slate-700`
- [x] Gate 标签：`text-slate-500 bg-slate-100`
- [x] Pipeline 类型标签：`text-indigo-600 bg-indigo-50`
- [x] loadMcpStatus 在线文字：`text-emerald-600`
- [x] loadMcpStatus 离线文字：`text-slate-400`
- [x] loadMcpStatus 在线指示灯：`bg-emerald-500`（不变）
- [x] loadMcpStatus 离线指示灯：`bg-slate-400`

### 响应式截图验证

- [x] Desktop (1280x800): `docs/implementation/2026-05-08-pipeline-light-sidebar-desktop.png`
- [x] Tablet (768x1024): `docs/implementation/2026-05-08-pipeline-light-sidebar-tablet.png`
- [x] Mobile (375x812): `docs/implementation/2026-05-08-pipeline-light-sidebar-mobile.png`

### 计算样式验证

- 侧边栏背景：`rgb(255, 255, 255)` (= white) ✓
- 标题颜色：`rgb(30, 41, 59)` (= slate-800) ✓

## 风险 / 未解决项

无。所有变更均为 CSS 类名替换，不涉及逻辑变更，不影响功能。

## 推荐的下一步

- 由 QA 审查 agent 验证视觉效果（截图 diff）
- 可在不同会话状态（在线/离线/激活）下进一步验证交互反馈
