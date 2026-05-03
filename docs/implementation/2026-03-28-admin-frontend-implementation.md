# 2026-03-28 Admin Frontend Implementation

## 1. 当前实现目标
- 重做后台首页为运营 dashboard。
- 增加帖子审核开关的后台操作入口。
- 增加官方文章发布页面。
- 接入飞行器投稿审核入口。
- 补 admin 前端 helper 级测试。

## 2. 输入依据
- `AGENTS.md`
- `apps/admin/AGENTS.md`
- `docs/tasks/2026-03-28-web-admin-ops-closure-tasks.md`
- 主会话已确认的实现计划与约束

## 3. 工作区模式
- 仅实现 `apps/admin/**` 的前端代码。
- 共享契约、后端接口、数据库结构不在本实现范围内。

## 4. 变更文件 / 变更范围
- `apps/admin/src/app.tsx`
- `apps/admin/src/components/admin-ui.tsx`
- `apps/admin/src/features/auth/admin-overview-page.tsx`
- `apps/admin/src/features/auth/admin-overview-helpers.ts`
- `apps/admin/src/features/auth/admin-shell.tsx`
- `apps/admin/src/features/posts/official-articles-page.tsx`
- `apps/admin/src/features/posts/official-articles-helpers.ts`
- `apps/admin/src/features/submissions/aircraft-submissions-page.tsx`
- `apps/admin/src/lib/admin-routes.ts`
- `apps/admin/src/lib/api-client.ts`
- `apps/admin/src/styles.css`
- `apps/admin/tests/admin-overview-helpers.test.ts`
- `apps/admin/tests/official-articles-helpers.test.ts`

## 5. 实现说明
- 新增 app-local admin 路由，接入“官方文章”和“飞行器投稿审核”两个页面。
- 重做后台壳导航，首页把“官方文章 / 帖子审核 / 投稿审核”前置到高频入口。
- 概览页改为 dashboard，包含：
  - hero 区和快捷动作卡片
  - 指标卡
  - 7 天内容/投稿趋势图
  - 帖子审核开关卡片
  - 待办队列表
  - 最近对象表
- 官方文章页复用现有 `createPost` 和图片上传能力，提供标题、分类、正文、封面图发布能力，并展示最近官方文章。
- 飞行器投稿审核页复用现有 admin submissions 接口，提供列表与通过/驳回操作。
- 新增 `apiClient` 的 app-local 封装：
  - `listOfficialArticles`
  - `getSiteSettings`
  - `updateSiteSettings`
  - `createOfficialArticle`

## 6. 测试和验证结果
- `bun run --cwd apps/admin typecheck` 通过
- `bunx vitest run --config vitest.config.ts apps/admin/tests/admin-overview-helpers.test.ts apps/admin/tests/official-articles-helpers.test.ts` 通过
- `bun run --cwd apps/admin build` 通过

## 7. 边界和异常处理
- 帖子审核开关依赖后端 `/admin/site-settings`；当前前端已接线，接口未就绪时会显示错误提示。
- 官方文章页只做文章，不做动态。
- 官方文章发布暂时使用普通文章创建接口，是否直发由后端管理员发布逻辑决定。

## 8. 风险 / 未解决项
- admin bundle 仍有 Vite 大包 warning，本轮未处理代码分割。
- 根级 `bun run test` 目前是否纳入 `apps/admin/tests` 取决于主会话是否更新根测试入口；本实现只补了 admin 测试文件并单独验证。

## 9. 需要 backend_implementer 配合的点
- 提供 `/admin/site-settings` GET/PUT 接口。
- 保证管理员通过 `createPost` 发布 article 时可按需求直发。
- 保证 `listAdminPosts` 返回的 admin article 能作为“官方文章”被前端筛出。

## 10. 推荐的下一步
- 主会话在共享层完成后，联调 admin 审核开关和官方文章发布。
- 把 admin tests 纳入根测试链路。
- 用浏览器走一遍后台首页、官方文章发布、投稿审核三条主链路。
