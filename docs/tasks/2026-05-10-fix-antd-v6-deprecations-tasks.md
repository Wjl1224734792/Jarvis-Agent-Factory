# antd v6 废弃 API 迁移 — 任务分解

## TASK-009：Dashboard.tsx 废弃 API 迁移
- **REQ**: REQ-009
- **类型**: 直接开发
- **文件**: `web/src/pages/Dashboard.tsx`
- **内容**：5 类 API 重命名
  1. `valueStyle` → `styles.content`（5 处 Statistic）
  2. `trailColor` → `railColor`（1 处 Progress）
  3. `dot` → `icon`（1 处 Timeline items）
  4. `children` → `content`（Timeline items: 主线 1 处 + 帮助弹窗 5 处）
  5. `width={560}` → `size={560}`（1 处 Drawer）
- **验收**: 构建通过 + 控制台无废弃警告
