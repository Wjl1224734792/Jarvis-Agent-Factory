# REQ-001: 指令页面主内容区滚动修复

## 问题描述

Web 面板 `/commands` 指令列表页面主内容区无法上下滚动，当指令卡片超出视口高度时，超出部分不可见且无法访问。

## 根因分析

三层叠加导致：

### 1. Layout Content `overflow: hidden`
`Layout.tsx:538-543` — Content 外层容器设置了 `overflow: hidden`，裁剪所有溢出内容。

### 2. 来源 Tab flex 链断裂
`Commands.tsx:345` — 来源 Tabs 组件设置 `flexShrink: 0` 而非 `flex: 1`：
- 外层容器是 `height: 100%; display: flex; flexDirection: column`
- 来源 Tabs 只用 `flexShrink: 0`，不填充剩余空间
- Tabs 内容高度超出时，溢出被父容器 `overflow: hidden` 裁剪

### 3. Ant Design TabPane 非 flex 容器
`buildSourceContent()` 渲染在 `<Tabs.TabPane>` 内部：
- Ant Design 的 `.ant-tabs-tabpane` 不是 flex 容器
- 卡槽网格 div 的 `flex: 1; overflow: auto` 无父级 flex 上下文
- 该 div 高度由其内容决定，无法触发 `overflow: auto` 滚动

## 修复方案

### REQ-001-1: 修复 flex 链
- 来源 Tabs `style` 从 `flexShrink: 0` 改为 `flex: 1; minHeight: 0`
- 来源 Tabs 添加 `className` 用于 CSS 精准定位

### REQ-001-2: 补齐 Ant Design 内部 flex 链
- `.ant-tabs` → flex column 容器
- `.ant-tabs-content-holder` → `flex: 1; min-height: 0`
- `.ant-tabs-tabpane` → `height: 100%; display: flex; flex-direction: column`

### REQ-001-3: 确保卡槽网格可滚动
- `buildSourceContent` 内容包裹在 `height: 100%; display: flex; flex-direction: column` 的容器中
- 确保 `flex: 1; overflow: auto` 的卡槽网格获得正确的 flex 上下文

## 涉及文件

| 文件 | 改动类型 |
|------|---------|
| `web/src/pages/Commands.tsx` | 修改 style + className |
| `web/src/pages/Commands.css` | 新建（或追加到已有 CSS） |

## 验收标准

- [ ] 指令页面卡片内容超出视口时可正常上下滚动
- [ ] 滚动仅影响卡片区域，标题和 Tab 栏保持固定
- [ ] 分类 Tab 切换后滚动位置重置
- [ ] 来源 Tab 切换后滚动正常工作
- [ ] 不影响其他页面布局
- [ ] 响应式布局正常（移动端/平板/桌面）
