# 2026-03-28 Admin 闭环与富文本统一需求

## 1. 需求来源
- 本轮主会话与用户已完成对齐。

## 2. 目标
- 将 `apps/web` 文章发布页与 `apps/admin` 官方文章页统一到更完善的 `Tiptap` 富文本方案。
- 将 admin 从当前暗色视觉切换为浅色专业蓝绿主题。
- 修复 admin 侧边栏在 `/admin` 及其子路由下可能同时高亮多个入口的问题。
- 将 admin 补齐为可直接做最终测试的闭环，范围包含：
  - 官方文章完整 CRUD。
  - 内容分类管理页面与侧边栏入口。

## 3. 成功标准
- `apps/web/src/components/rich-text-editor.tsx` 与 `apps/admin/src/components/admin-rich-text-editor.tsx` 都使用 Tiptap，且编辑能力基线一致。
- admin 官方文章支持创建、查看列表、加载详情编辑、更新、删除，并保持封面与正文媒体一致性。
- admin 侧边栏任意时刻仅有一个逻辑激活入口；`/admin` 只在概览页高亮。
- admin 新主题在 `antd` token 和手写 CSS 两层都完成浅色化，不再残留暗色底板。
- `APP_ROUTES.adminContentCategories` 有对应页面和入口，支持列表、创建、编辑、启停闭环。
- 相关验证保持通过：`bun run test`、`bun run build`、`bun run --cwd apps/admin typecheck`。

## 4. 范围内
- `apps/web` 发布文章页编辑器与预览接入。
- `apps/admin` 官方文章页、内容分类页、导航、主题。
- `packages/shared`、`packages/schemas`、`packages/http-client`、`apps/server` 中支撑官方文章 CRUD 的共享契约与后端接口。

## 5. 范围外
- 不新增新的 workspace UI 包。
- 不重做 admin 信息架构；仅在现有导航中补入口和修激活逻辑。
- 不扩展到官方文章之外的其他后台 CRUD 新需求。

## 6. 关键约束
- 保持最小正确改动，优先复用现有页面模式与接口模式。
- 共享契约、路由常量、服务端 posts 模块为高风险共享边界，必须串行规划与实现。
- Tailwind 约束仅适用于 web 侧 TSX 内联类名；admin 现有 `styles.css` 继续作为样式承载。
