# antd v6 废弃 API 迁移修复

## 背景

项目已升级到 antd v6.3.7，但存在 4 类废弃 API 使用，控制台输出如下警告：

```
[antd: Statistic] `valueStyle` is deprecated. Please use `styles.content` instead.
[antd: Progress] `trailColor` is deprecated. Please use `railColor` instead.
[antd: Timeline] `items.children` is deprecated. Please use `items.content` instead.
[antd: Timeline] `items.dot` is deprecated. Please use `items.icon` instead.
[antd: Drawer] `width` is deprecated. Please use `size` instead.
```

## REQ 清单

### REQ-009：antd v6 废弃 API 迁移
- **类型**: 直接开发（API 重命名）
- **文件**: `web/src/pages/Dashboard.tsx`
- **内容**:
  1. `Statistic valueStyle` → `styles.content`（5 处）
  2. `Progress trailColor` → `railColor`（1 处）
  3. `Timeline items[].dot` → `items[].icon`（1 处）
  4. `Timeline items[].children` → `items[].content`（主线 1 处 + 帮助弹窗 5 处）
  5. `Drawer width` → `size`（1 处，改用数字 size 属性）
- **验收**:
  1. `npm run build:web` 构建通过
  2. 浏览器控制台无上述 4 类废弃警告
