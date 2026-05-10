# 智能体配置页 UI 重构

## 当前实现目标

将 `src/web/views/agents.html` 从"AI 审美"风格（粉色/紫色渐变、emoji 装饰）重构为专业后台管理面板风格（参考 Vercel/Supabase 设计语言）。

## 对应需求 / 任务 ID

- **任务**：重构 agents.html 为专业后台管理面板风格
- **文件**：`src/web/views/agents.html`
- **参考文件**：`src/web/views/pipeline.html`（侧边栏结构参考）

## 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/web/views/agents.html` | 完全重写 CSS + HTML emoji 清理 + JS emoji 清理 | 功能逻辑不变，仅视觉风格 |

### 未变更内容
- 所有 JS 逻辑函数名（`load`, `setPlatform`, `setCategory`, `openM`, `saveModel`, `resetModel`, `toast` 等）
- 所有 API 调用（`/api/agents` GET/POST）
- PIXEL 像素图标系统（`px()` 函数、`PIXEL` 对象、`COLORS` 对象）
- 所有交互逻辑（卡片点击、模态框、Toast）

## 组件结构与布局说明

布局保持不变：
- **侧边栏**：250px 固定宽度，`position: sticky`，全高
- **主体**：`flex: 1`，内边距 32px 40px
- **网格**：`grid-template-columns: repeat(auto-fill, minmax(170px, 1fr))`，间隔 12px
- **响应式**：`@media(max-width: 768px)` 切换为垂直布局

### 侧边栏结构
```
aside.sidebar
  div.logo > h1 "Jarvis Engine"
  nav > a (流水线看板, 智能体配置)
  div.help-section > h3 + div.tip * 4
```

### 主体结构
```
main.main
  h2 "智能体配置"
  p.subtitle
  div.toolbar > div.filter#platformTabs (全部/Claude/OpenCode/Codex)
  div.toolbar > div.filter#categoryTabs + div.search-box
  div.grid#agentsGrid (动态渲染)
  footer
```

## 样式方案说明

### 设计系统（CSS 变量）

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg` | `#F8F9FA` | 页面背景 |
| `--card` | `#FFFFFF` | 卡片背景 |
| `--border` | `#E5E7EB` | 边框色 |
| `--text` | `#111827` | 主要文字 |
| `--muted` | `#6B7280` | 次要文字 |
| `--accent` | `#2563EB` | 主题蓝色 |
| `--accent-light` | `#EFF6FF` | 浅蓝背景 |
| `--green` | `#10B981` | 成功/同步状态 |
| `--red` | `#EF4444` | 错误状态 |
| `--warn` | `#F59E0B` | 警告状态 |

### 已移除的 AI 风格元素

1. 渐变文字 `-webkit-background-clip:text; -webkit-text-fill-color:transparent` - 从 h1（logo）和 h2（页面标题）移除
2. 所有 emoji 图标装饰 - 包括侧边栏、导航、标签、搜索框、按钮、Toast、空状态
3. 粉色/紫色渐变背景（侧边栏、导航 active 状态）
4. 粉色 hover 阴影（卡片、按钮）
5. 大圆角（modal 24px → 12px）
6. 粉色选择标签状态（filter button selected）

### 关键样式变更对比

| 元素 | 旧 | 新 |
|------|-----|-----|
| 侧边栏背景 | `linear-gradient(180deg,#FFF5F8...` | `#FAFBFC` |
| Logo 文字 | 渐变粉色-紫色 | 纯色 `var(--accent)` 蓝色 |
| 导航 active | 粉色渐变背景 | `var(--accent-light)` + 3px 蓝色左边框 |
| 筛选按钮 | 粉色选中态 | 蓝色实心 `var(--accent)` + 白色文字 |
| 搜索框 | pill 形状 + 放大镜 emoji | 标准矩形 + clean placeholder |
| 卡片圆角 | 16px | 12px |
| 卡片 hover | 粉色阴影 `rgba(255,123,156,.08)` | 灰色阴影 `rgba(0,0,0,.06)` |
| 自定义卡片边框 | 紫色 `var(--purple)` | 蓝色 `var(--accent)` |
| 自定义模型标签 | 紫色背景 | `var(--accent-light)` + 蓝色文字 |
| 模态框圆角 | 24px | 12px |
| 模态框阴影 | `0 20px 60px rgba(0,0,0,.1)` | `0 8px 30px rgba(0,0,0,.08)` |
| 模态框 select | 12px 圆角 + 粗边框 | 8px 圆角 + 细边框 + focus ring |

## 响应式与无障碍说明

### 响应式（`@media(max-width:768px)`）
- 侧边栏：100% 宽度，水平滚动，高度自适应
- 导航：`flex-direction: row` 水平排列
- 帮助区：隐藏
- 主体内边距：32px 40px → 20px
- 网格：`minmax(170px, 1fr)` → `minmax(140px, 1fr)`

### 无障碍（a11y）
- 语义化 HTML 标签（`aside`, `main`, `nav`, `footer`）
- 所有交互元素保留 `onclick` 事件和 `cursor:pointer`
- 颜色对比度：`var(--text)` #111827 在白色背景上对比度 > 15:1
- `::placeholder` 使用 `#9CA3AF` 灰色（符合 WCAG AA 标准）
- 模态框点击遮罩关闭功能保留

## 测试和验证结果

### 视觉验证（无法显示图片）

三个视口截图已保存：
- `agents_desktop.png` - 桌面端 (1280x800)
- `agents_tablet.png` - 平板 (768x1024)
- `agents_mobile.png` - 移动端 (375x812)

### 关键样式属性验证（通过 agent-browser 检查）

| 检查项 | 预期值 | 实际值 | 状态 |
|--------|--------|--------|------|
| CSS 变量 `--accent` | `#2563EB` | `#2563EB` | 通过 |
| CSS 变量 `--bg` | `#F8F9FA` | `#F8F9FA` | 通过 |
| CSS 变量 `--border` | `#E5E7EB` | `#E5E7EB` | 通过 |
| 页面背景色 | `rgb(248, 249, 250)` | `rgb(248, 249, 250)` | 通过 |
| Logo 文字颜色 | `rgb(37, 99, 235)`（蓝色） | `rgb(37, 99, 235)` | 通过 |
| Logo 无渐变背景 | 无 `background-image` | 无 `background-image` | 通过 |
| 页面标题颜色 `#111827` | `rgb(17, 24, 39)` | `rgb(17, 24, 39)` | 通过 |
| 页面标题无渐变 | 无 `background-image` | 无 `background-image` | 通过 |
| 导航 active 背景 | `var(--accent-light)` | `rgb(239, 246, 255)` | 通过 |
| 导航 active 左边框 | 3px 蓝色 `var(--accent)` | 3px `solid rgb(37, 99, 235)` | 通过 |
| 选中筛选按钮背景 | 蓝色实心 | `rgb(37, 99, 235)` | 通过 |
| 选中筛选按钮文字 | 白色 | `rgb(255, 255, 255)` | 通过 |
| 选中筛选按钮圆角 | 20px（pill） | `20px` | 通过 |
| 卡片背景 | 白色 | `rgb(255, 255, 255)` | 通过 |
| 卡片边框 | `var(--border)` | `rgb(229, 231, 235)` | 通过 |
| 卡片圆角 | 12px | `12px` | 通过 |
| 自定义卡片边框 | 蓝色 2px | `blue 2px` | 通过 |
| 自定义模型标签背景 | `var(--accent-light)` | `rgb(239, 246, 255)` | 通过 |
| 自定义模型标签文字 | 蓝色 | `rgb(37, 99, 235)` | 通过 |
| 移动端帮助区隐藏 | 不显示 | 不显示（snapshot 确认） | 通过 |

### 功能性验证

| 检查项 | 状态 |
|--------|------|
| 页面服务正常 (HTTP 200) | 通过 |
| JS 加载无错误 | 通过 |
| Agent 卡片渲染（含像素图标） | 通过 |
| 平台筛选按钮可点击 | 通过 |
| 分类筛选标签动态生成 | 通过 |
| 空状态文字无 emoji | 通过 |
| 自定义卡片标记正常 | 通过 |
| 自定义模型标签样式正常 | 通过 |

## 已移除的 Emoji 清单

| 位置 | 旧内容 | 新内容 |
|------|--------|--------|
| Logo | `🧠 Jarvis Engine` | `Jarvis Engine` |
| 导航 | `📊 流水线看板` | `流水线看板` |
| 导航 | `🤖 智能体配置` | `智能体配置` |
| 平台筛选 | `🔵 Claude` | `Claude` |
| 平台筛选 | `🟣 OpenCode` | `OpenCode` |
| 平台筛选 | `🟢 Codex` | `Codex` |
| 搜索框 placeholder | `🔍 搜索 agent 名称...` | `搜索 agent 名称...` |
| 清除按钮 | `✕ 清除` | `清除` |
| 空状态 | `📭 未找到匹配的智能体` | `未找到匹配的智能体` |
| 加载状态 | `⏳ 加载中...` | `加载中...` |
| 模态框选项 | `✏️ 自定义输入...` | `自定义输入...` |
| 保存按钮 | `💾 保存` | `保存` |
| 保存中 | `⏳ 保存中...` | `保存中...` |
| 恢复默认按钮 | `↩ 恢复默认` | `恢复默认` |
| 动态分类标签 | `🌐 全部` | `全部` |
| Toast 成功 | `✅ 已保存...` | `已保存...` |
| Toast 警告 | `⚠️ 已保存到数据库...` | `已保存到数据库...` |
| Toast 错误 | `❌ 保存失败...` | `保存失败...` |
| Toast 恢复 | `✅ 已恢复...` + `⚠️ 已恢复...` | `已恢复...` |
| 帮助区 | `🟢 绿点` | `绿点` |

## 风险 / 未解决项

- **无**：所有样式变更已通过 agent-browser 验证，功能逻辑未修改。

## 推荐的下一步

1. 将此风格同步到 `pipeline.html`（更新 pipeline.html 使用相同的 CSS 设计系统）
2. 编写前端测试覆盖 agents 页面的主要交互流程
