# 修复会话列表更多按钮事件冒泡

> REQ-001: 点击会话 item 的"···"更多按钮不应触发主内容区域跳转

**Bug**: Ant Design Dropdown 组件内部事件冒泡穿透 Button 的 `stopPropagation`，触发父元素 `div.onClick` → `navigate('/')` 路由跳转。

**Fix**: Dropdown+Button 外层包裹 `<span onClick={e => e.stopPropagation()}>` 阻断事件冒泡。

**改动**: `web/src/components/Layout.tsx` 第 189-195 行，1 行变更。
