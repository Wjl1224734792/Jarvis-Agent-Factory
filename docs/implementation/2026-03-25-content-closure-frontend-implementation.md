# 2026-03-25 Content Closure Frontend Implementation

## 1. 当前实现目标
- 调整 `apps/web` 的信息架构骨架，先把导航、发布入口、新路由和关键消费页切到新的闭环方向。
- 在不修改 `packages/*`、`apps/server/*`、`apps/admin/*` 的前提下，尽量兼容现有 API。

## 2. 输入依据
- 用户确认的“内容闭环第一阶段”方案。
- `AGENTS.md` 中关于最小闭环、前端代理职责、验证要求和不修改共享契约的约束。
- 现有 `apps/web` 路由、页面和评论/互动组件。

## 3. 工作区模式
- 当前代理仅修改前端业务代码。
- 实际写入范围：
  - `apps/web/src/**`
  - 本文档
- 未修改：
  - `packages/*`
  - `apps/server/*`
  - `apps/admin/*`

## 4. 变更文件 / 变更范围
- `apps/web/src/app.tsx`
- `apps/web/src/lib/web-routes.ts`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/features/auth/user-menu.tsx`
- `apps/web/src/features/posts/post-interaction-bar.tsx`
- `apps/web/src/features/posts/post-comment-thread.tsx`
- `apps/web/src/features/posts/inline-comment-composer.tsx`
- `apps/web/src/routes/circle-page.tsx`
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/routes/rankings-page.tsx`
- `apps/web/src/routes/models-page.tsx`
- `apps/web/src/routes/publish-article-page.tsx`
- `apps/web/src/routes/publish-moment-page.tsx`
- `apps/web/src/routes/publish-aircraft-page.tsx`
- `apps/web/src/routes/ranking-detail-page.tsx`
- `apps/web/src/routes/ranking-item-detail-page.tsx`

## 5. 实现说明
- 顶部导航改为新的前端闭环骨架：
  - 发布入口改成 `+` 按钮和悬浮/点击下拉菜单。
  - 下拉包含文章、动态、飞行器、榜单创建四个入口。
  - 侧边导航只保留首页、飞友圈、飞行器库、榜单。
  - 头部移除了个人中心 / 设置 / 消息入口。
- 路由骨架已补齐：
  - `/publish/article`
  - `/publish/moment`
  - `/publish/aircraft`
  - `/rankings/:id`
  - `/ranking-items/:id`
  - 原 `/compose` 现在重定向到文章发布页。
- 新发布页已落地基础 UI：
  - 文章发布页：有分类 fallback、标题、摘要、正文、预览，发布时暂复用 `createPost`。
  - 动态发布页：轻量文本发布，暂复用 `createPost`。
  - 飞行器发布页：按申请页结构做了前端骨架，但按钮禁用，等待投稿接口。
- 榜单链路已改为只读总览 + 详情骨架：
  - 榜单总览移除快速评分区。
  - 榜单卡片改为跳转榜单详情和榜单项详情。
  - 榜单详情页、榜单项详情页已建立 fallback 页面，现阶段复用 `listRankings()` 数据。
- 飞友圈已从旧的弹层详情流改成独立动态流骨架：
  - 去掉旧 modal 详情。
  - 当前先点进现有帖子详情页，等待后端 `moment` 类型和专属详情接口。
- 飞行器库卡片已重排：
  - 更突出图片。
  - 只显示名称、品牌、星级评分和动力类型。
  - 去圆角。
  - 使用 `auto-fit + minmax` 保证至少两列。
- 互动与评论输入统一：
  - `post-interaction-bar` 改为 icon + 数字表现。
  - 新增 `InlineCommentComposer` 单行评论输入组件。
  - `post-comment-thread` 改成根评论 + 默认折叠回复的前端线程展示，并在回复时预填 `@用户名`。

## 6. 测试和验证结果
- 已运行：
  - `bun run --cwd apps/web build`
- 结果：
  - 构建通过。
- 未运行：
  - 前端自动化 UI 测试。
  - `typecheck`，原因是仓库现有 `ignoreDeprecations` 配置问题会导致无效校验。

## 7. 边界和异常处理
- 榜单详情和榜单项详情在后端接口未完成前，使用现有 `listRankings()` 做 fallback。
- 文章发布 / 动态发布当前仍复用旧的 `createPost()`，未真正写入 `article` / `moment` 类型。
- 飞行器发布页只提供前端结构，不执行真实提交。
- 评论折叠与 `@某人` 回复先在前端层模拟，旧后端树形评论接口仍可兼容使用。

## 8. 风险 / 未解决项
- 当前新路由使用 `apps/web` 局部常量，等待共享 `APP_ROUTES` 正式补齐后需要统一。
- 榜单详情 / 榜单项详情目前是前端 fallback，不是最终接口形态。
- 首页还未切到后端真实文章分类接口，仍需后端落地内容分类后再改成动态 tab。
- 动态详情仍复用文章详情页，不是最终形态。

## 9. 需要 backend_implementer 配合的点
- 为文章 / 动态提供正式内容类型字段与 feed 分流接口。
- 提供文章内容分类接口，并让首页 tab 从后端返回。
- 提供飞行器投稿接口与状态结构。
- 提供榜单详情、榜单项详情、榜单评论、榜单项评分/评论接口。
- 提供新的评论线程结构：
  - 根评论
  - 回复数组
  - 回复计数
  - `replyToUser`
- 将新前端路由对应的共享路由常量补入 `packages/shared`。

## 10. 推荐的下一步
- 先由 `backend_implementer` 完成共享契约与后端接口。
- 然后回到 `apps/web`：
  - 把首页切到真实文章分类 tab。
  - 把飞友圈切到真实 `moment` feed。
  - 把榜单详情 / 榜单项详情从 fallback 切到正式 API。
  - 把飞行器发布页接入真实投稿接口。
