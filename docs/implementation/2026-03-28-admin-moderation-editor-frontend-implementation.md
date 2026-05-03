# 当前实现目标

- 修复 admin 中 `Space direction` 弃用告警。
- 将后台首页与四个审核页面适配为四类独立自动审核开关。
- 将官方文章发布页从纯文本输入升级为更完整的富文本编辑与预览体验。
- 适配扩展后的站点设置字段和 `pending` 审核状态。

# 输入依据

- 用户请求的 admin 前端任务包说明。
- 当前仓库中的 `AGENTS.md`、`apps/admin/AGENTS.md` 约束。
- 已确认计划：飞行器库布局、首登资料补全与全量审核扩展计划。

# 工作区模式

- 仅修改 `apps/admin/src/**` 与 `apps/admin/tests/**`。
- 未修改 backend/shared、`apps/web` 或根配置。

# 变更文件 / 变更范围

- `apps/admin/src/components/admin-moderation-card.tsx`
- `apps/admin/src/components/admin-rich-text-editor.tsx`
- `apps/admin/src/features/auth/admin-login-page.tsx`
- `apps/admin/src/features/auth/admin-overview-helpers.ts`
- `apps/admin/src/features/auth/admin-overview-page.tsx`
- `apps/admin/src/features/posts/official-articles-helpers.ts`
- `apps/admin/src/features/posts/official-articles-page.tsx`
- `apps/admin/src/features/posts/post-comments-page.tsx`
- `apps/admin/src/features/posts/posts-page.tsx`
- `apps/admin/src/features/reviews/reviews-page.tsx`
- `apps/admin/src/features/submissions/aircraft-submissions-page.tsx`
- `apps/admin/src/lib/api-client.ts`
- `apps/admin/src/styles.css`
- `apps/admin/tests/admin-overview-helpers.test.ts`
- `apps/admin/tests/official-articles-helpers.test.ts`

# 实现说明

- 登录页将 `Space direction="vertical"` 改为 `orientation="vertical"`，消除了当前已知的 antd 弃用告警。
- 后台首页的审核区域从单一帖子开关改成四类数据驱动卡片，支持帖子、评论、点评、投稿的独立自动审核切换。
- 四个审核页面都新增了“当前模式”卡片，直接展示当前自动审核状态，并可就地切换，不需要回首页。
- `admin-overview-helpers` 扩展为输出 `moderationCards`，同时统计评论/点评的 `pending` 队列。
- `api-client` 在 admin 本地层适配了扩展后的 `siteSettings` 字段，以及评论 `pending` 过滤与官方文章 `contentHtml` 提交。
- 官方文章页新增本地富文本编辑器 `AdminRichTextEditor`：
  - 支持基础块级格式、链接、图片和视频插入。
  - 支持实时 HTML / plain text 输出。
  - 支持封面图上传、右侧预览和最近文章列表。
- 由于当前共享前端层没有可直接跨应用复用的 editor 包，admin 侧落地为本地实现，但行为和前台文章编辑器对齐。
- `styles.css` 补充了审核卡片、富文本编辑器和文章预览所需样式。

# 测试和验证结果

- 已通过 `bun run --cwd apps/admin typecheck`
- 已通过 `bunx vitest run --config vitest.config.ts apps/admin/tests/admin-overview-helpers.test.ts apps/admin/tests/official-articles-helpers.test.ts`
- 已通过 `bun run --cwd apps/admin build`
- 已运行 `antd lint ./apps/admin/src --format json`
  - `deprecated: 0`
  - 仍有若干历史 `a11y/performance` warning，未在本轮扩大处理

# 边界和异常处理

- 评论、点评、投稿四类开关目前只做前端适配，依赖 backend 返回扩展后的 `siteSettings` 字段。
- 评论页对 `pending` 状态筛选使用 admin 本地 `api-client` 包装，兼容 backend 后续扩展。
- 官方文章富文本编辑器当前使用浏览器原生命令实现，避免在 admin 包外扩大依赖面。

# 风险 / 未解决项

- 若 backend 尚未落地 `commentModerationEnabled`、`reviewModerationEnabled`、`submissionModerationEnabled`，对应按钮会按默认值回退显示，但真正切换行为仍依赖后端完成。
- 若 backend 尚未为评论/点评扩展 `pending` 状态，评论页和点评页的“待审核”体验只能完成前端适配，无法端到端验证。
- `antd lint` 还有若干历史 warning，未在本轮清理全部存量问题。

# 需要 backend_implementer 配合的点

- `GET/PUT /admin/site-settings` 返回并接受四类开关字段。
- 评论状态扩展为 `pending | visible | hidden`，并支持 admin 过滤与通过/隐藏。
- 点评状态扩展为 `pending | visible | hidden`，并支持 admin 通过/隐藏。
- 投稿自动审核开关需要 backend 真正驱动 `submitted -> approved` 的自动流转。
- 官方文章创建接口继续接受 `contentHtml` 并保持管理员直发。

# 推荐的下一步

- 先由 backend 完成四类审核开关和 `pending` 状态机。
- 然后做一轮 admin + backend 联调，重点验证：
  - 首页四类开关切换
  - 评论/点评待审核队列
  - 投稿自动审核
  - 官方文章富文本发布
- 最后补一轮浏览器端到端回归。
