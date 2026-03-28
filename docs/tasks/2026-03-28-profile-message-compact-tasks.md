# 个人中心、设置与消息页紧凑化任务拆分

## 1. 需求文档路径
- [docs/requirements/2026-03-27-profile-settings-requirements.md](/E:/CodeStore/feijia/docs/requirements/2026-03-27-profile-settings-requirements.md)
- 当前对话补充确认：本轮额外包含 `消息页（notifications）`、评论区加载态、侧边栏入口收口与中文化。

## 2. 任务概览
- 本轮只改 `apps/web`，不新增后端接口，不改共享 schema，不做全局 i18n 框架。
- 目标是把 `个人中心 / 设置 / 消息` 统一成中文、紧凑、侧边栏可达的登录后功能区。
- skeleton 只用于 `消息流 / 个人中心信息块 / 评论区` 的局部加载，不再用整页 skeleton 处理这些页面的主要内容区。
- `发布页` 的整页 skeleton 保留，不作为本轮重构对象。

## 3. 任务分解

| 任务 ID | 名称 | 类型 | 优先级 | 依赖 | 目标文件 | 完成标准 | `test_strategy` | 前端实现 |
|---|---|---|---|---|---|---|---|---|
| W1 | 侧边栏入口与顶部导航收口 | 直接开发 | P0 | 现有 `useAuthStore`、`WebLayout`、`UserMenu`、路由常量 | `apps/web/src/features/auth/web-layout.tsx`、`apps/web/src/features/auth/user-menu.tsx`、必要时 `apps/web/src/app.tsx` | `消息 / 个人中心 / 设置` 只出现在登录后的侧边栏或移动端侧边栏分组里；顶部导航不再出现这些入口；未登录时不展示这些个人入口；现有登录、退出、发布入口不回归。 | `test_after` | 是 |
| W2 | 个人中心页中文化与紧凑重构 | 直接开发 | P0 | W1 完成后再定入口体验；现有会话态与头像素材 | `apps/web/src/features/auth/profile-page.tsx`，必要时 `apps/web/src/features/auth/profile-settings-state.ts` | 页面全部中文；标题、标签、按钮、空态文案统一；信息密度更高，卡片/栅格更紧凑；不引入整页 loading 抖动；个人中心的可用信息块保持可浏览。 | `test_after` | 是 |
| W3 | 设置页中文化与紧凑重构 | 直接开发 | P0 | W1 完成后再收入口；现有本地设置态 | `apps/web/src/routes/settings-page.tsx`，必要时 `apps/web/src/features/auth/profile-settings-state.ts` | 页面全部中文；账号、隐私、通知、安全、注销区块更紧凑；所有“保存 / 切换 / 编辑”都明确是本地态，只有真实 `logout` 走后端；不再出现英文标题和英文说明。 | `test_after` | 是 |
| W4 | 消息页中文化与局部列表 skeleton | 直接开发 | P0 | W1 完成后再改消息入口；现有 `notifications` 查询与列表渲染 | `apps/web/src/routes/notifications-page.tsx`、`apps/web/src/components/page-skeletons.tsx` | 消息页全部中文；加载时只出现消息流/统计块的局部 skeleton，不再用整页 loading 覆盖整个页面；空态、错误态、已读操作都保留；切换 tab 或刷新时不抖动。 | `test_after` | 是 |
| W5 | 评论区加载态局部化 | 直接开发 | P0 | 消息页完成后，再处理评论线程与 composer 的局部 loading | `apps/web/src/features/posts/post-detail-page.tsx`、`apps/web/src/features/posts/post-comment-thread.tsx`、`apps/web/src/features/posts/inline-comment-composer.tsx`、必要时 `apps/web/src/components/page-skeletons.tsx` | 评论区和回复区的 loading 变成局部 skeleton / 局部占位，不再把整页内容替换掉；正文和评论区加载态分离；发布页保持现状，不额外改整页 skeleton。 | `test_after` | 是 |
| W6 | 回归验证与浏览器走查 | 验证 | P0 | 前面任务完成后统一验收 | `apps/web/tests/*`（如需补测） | 侧边栏入口、中文化、消息流 skeleton、评论区局部 loading、未登录隐藏入口、登录后显示入口都完成回归确认；`typecheck`、`build`、最小相关测试通过；补一次浏览器 smoke。 | `test_after` | 是 |

## 4. DDD 分类
- `不需要 DDD`
- 原因：本轮没有新增业务域对象，也没有复杂状态机、审批链、配额或跨聚合一致性约束，核心是前端壳层、信息密度和加载态重构。

## 5. TDD 与直接开发分类

### 直接开发
- `W1` 侧边栏入口与顶部导航收口
- `W2` 个人中心页中文化与紧凑重构
- `W3` 设置页中文化与紧凑重构
- `W4` 消息页中文化与局部列表 skeleton
- `W5` 评论区加载态局部化

### 补测 / 验证
- `W6` 回归验证与浏览器走查

## 6. 风险任务
- `W1` 是共享壳层改动，容易误伤登录、退出和发布入口，必须单线程处理。
- `W4` 和 `W5` 不能再做成整页 skeleton，否则切 tab / 切加载时还是会抖动。
- `W2`、`W3` 需要彻底清掉英文文案，否则中文站点会继续出现混杂体验。
- `W6` 需要真实浏览器走查，特别是侧边栏只在登录后出现、移动端抽屉入口、未登录隐藏个人入口这三点。

## 7. 文件所有权和共享路径提醒
- 这些路径属于同一前端壳层，不能并行抢改：
- `apps/web/src/app.tsx`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/features/auth/user-menu.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/settings-page.tsx`
- `apps/web/src/routes/notifications-page.tsx`
- `apps/web/src/features/posts/post-detail-page.tsx`
- `apps/web/src/features/posts/post-comment-thread.tsx`
- `apps/web/src/features/posts/inline-comment-composer.tsx`
- `apps/web/src/components/page-skeletons.tsx`
- `packages/*` 本轮不要动，避免把前端 UI 整改扩大成共享契约改动。

## 8. 推荐交付顺序
1. 先做 `W1`，把个人入口从顶部导航移到登录后的侧边栏。
2. 再做 `W2` 和 `W3`，统一个人中心与设置页的中文和紧凑视觉语言。
3. 再做 `W4`，把消息页 loading 改成局部信息流 skeleton。
4. 再做 `W5`，把评论区和回复加载态拆成局部 skeleton。
5. 最后做 `W6`，统一回归、补测、浏览器走查。

## 9. 推荐的下一步
- 把这份拆分交给 `planner`，按 `W1 -> W2 -> W3 -> W4 -> W5 -> W6` 排期。
- 实现时优先守住三条红线：中文化、侧边栏登录后入口、局部 skeleton。
- 如果要继续压缩范围，优先保留 `W1` 和 `W4/W5`，因为它们直接影响可用性和抖动问题。
