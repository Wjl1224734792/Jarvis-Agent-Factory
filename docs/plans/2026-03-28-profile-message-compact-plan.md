# 个人中心、设置与消息页紧凑化实施计划

## 1. 需求文档路径
- `docs/requirements/2026-03-27-profile-settings-requirements.md`

## 2. 任务文档路径
- `docs/tasks/2026-03-28-profile-message-compact-tasks.md`

## 3. 当前轮次目标
- 将 `apps/web` 的个人中心、设置、消息页面恢复为中文站点语境，清理当前英文文案。
- 将消息、个人中心、设置入口从顶部导航移除，改为仅在登录后出现在侧边栏和移动端侧边抽屉中。
- 将消息页、个人中心页、评论区的加载态改为局部 skeleton / 局部 loading，避免整页替换和切换抖动。
- 保持发布页整页 skeleton 现状，不纳入本轮重构范围。

## 4. 当前轮次范围
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/features/auth/user-menu.tsx`
- `apps/web/src/app.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/settings-page.tsx`
- `apps/web/src/features/auth/profile-settings-state.ts`
- `apps/web/src/routes/notifications-page.tsx`
- `apps/web/src/components/page-skeletons.tsx`
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/features/posts/post-comment-thread.tsx`
- `apps/web/src/features/posts/inline-comment-composer.tsx`
- 必要时补充 `apps/web/tests/*` 中的最小相关验证

## 5. 完成标准
- 顶部导航不再出现消息、个人中心、设置入口。
- 侧边栏和移动端抽屉中，只有登录后才显示消息、个人中心、设置入口。
- 个人中心、设置、消息页面的标题、说明、按钮、空态、错误态全部为中文。
- 个人中心与设置页面的信息密度明显收紧，不再沿用当前大块留白和英文卡片表达。
- 消息页 loading 仅替换统计块和消息流，不替换整页。
- 评论区 loading 仅替换评论列表和回复区域，不替换帖子正文。
- 个人中心 tab 切换只更新内容区，不出现整页闪烁。
- 发布页整页 skeleton 不回归。

## 6. 是否需要先查阅 repo_explorer
- 不需要额外查阅。
- 依据已足够：当前结构、共享入口、骨架屏分布、评论线程加载点均已由 `repo_explorer` 确认。

## 7. 执行代理分工
### 任务包 A：共享壳层与账户页面
- 责任代理：`frontend_implementer`
- 任务顺序：`W1 -> W2 -> W3`
- 责任文件：
  - `apps/web/src/features/auth/web-layout.tsx`
  - `apps/web/src/features/auth/user-menu.tsx`
  - `apps/web/src/app.tsx`
  - `apps/web/src/features/auth/profile-page.tsx`
  - `apps/web/src/routes/settings-page.tsx`
  - `apps/web/src/features/auth/profile-settings-state.ts`
- 目标：
  - 先完成侧边栏入口收口。
  - 再完成个人中心和设置页的中文化与紧凑化。
  - 个人中心和设置共用的本地状态、中文文案、区块密度由同一代理统一处理。

### 任务包 B：消息与评论区局部加载
- 责任代理：`frontend_implementer`
- 任务顺序：`W4 -> W5`
- 前置条件：`W1` 完成后再开始，避免入口与消息页同时改动时产生判断偏差。
- 责任文件：
  - `apps/web/src/routes/notifications-page.tsx`
  - `apps/web/src/components/page-skeletons.tsx`
  - `apps/web/src/routes/post-detail-page.tsx`
  - `apps/web/src/features/posts/post-comment-thread.tsx`
  - `apps/web/src/features/posts/inline-comment-composer.tsx`
- 目标：
  - 消息页改为局部统计块 + 信息流 skeleton。
  - 评论区改为线程级、回复级的局部 loading。
  - 不改发布页 skeleton。

### 验证与评审
- 实现完成后由主会话统一执行 `W6`。
- 有意义变更完成后交由 `review_qa` 做回归评审。

## 8. 共享区域改动归属
- 唯一责任方：任务包 A
- 共享区域：
  - `apps/web/src/app.tsx`
  - `apps/web/src/features/auth/web-layout.tsx`
  - `apps/web/src/features/auth/user-menu.tsx`
  - `apps/web/src/features/auth/profile-settings-state.ts`
- 约束：
  - 任务包 B 不得修改上述文件。
  - 任务包 A 不得修改评论区和消息流骨架的局部加载文件，除非主会话重新分配所有权。

## 9. 风险提醒
- 最大风险是共享壳层回归：`web-layout.tsx` 和 `user-menu.tsx` 既管导航，也影响登录、退出、发布入口。
- 当前站点存在中英文混用，不能只改标题，必须同步清理按钮、空态、错误态、辅助说明。
- `page-skeletons.tsx` 是共享组件，不能把首页、圈子、机型、榜单的整页 skeleton 误改成更重或更抖的实现。
- 评论区加载必须与帖子正文解耦，不能因为评论刷新导致正文或整页闪烁。
- 个人中心和设置页都依赖 `profile-settings-state.ts`，如果并行改动该文件会直接冲突。
- 不引入全局 i18n 框架；本轮只做目标页面中文化，避免范围膨胀。

## 10. 实现者交接信息
### 任务包 A 交接
- 先删顶栏里的个人入口，再补侧边栏与移动端侧边抽屉分组，保证登录态前后逻辑一致。
- 紧凑化方向优先处理：
  - 头部区高度
  - 卡片间距
  - 标题与描述层级
  - 操作按钮占位
  - 右侧栏信息密度
- 不要引入新全局样式规则；保持 Tailwind 内联类名调整。
- 个人中心 tab 切换不应触发整页级 loading。

### 任务包 B 交接
- 优先新增局部 skeleton 组件，不要复用整页 `ListPageSkeleton` 去覆盖消息页和评论区。
- 消息页建议拆为：
  - 统计卡 skeleton
  - 通知条目 skeleton
- 评论区建议拆为：
  - 根评论 skeleton
  - 回复列表 skeleton
  - 回复发送中的按钮/局部忙碌态
- 评论提交后刷新要尽量局部，避免整条帖子详情重新进入整页 loading。

## 11. 推荐的下一步
1. 主会话先把任务包 A 交给 `frontend_implementer`，锁定共享壳层和账户页面。
2. 任务包 A 完成后，再启动任务包 B，处理消息页和评论区局部加载。
3. 两个任务包完成后，主会话执行 `W6`：
   - `bun run --cwd apps/web typecheck`
   - `bun run --cwd apps/web build`
   - `bunx vitest run --config vitest.config.ts apps/web/tests/**/*.test.ts`
   - `bun run dev:web` 后做浏览器 smoke：登录前后侧边栏入口、消息流 skeleton、个人中心 tab、评论区加载

## 12. 实施顺序
1. `W1` 侧边栏入口与顶部导航收口
2. `W2` 个人中心中文化与紧凑化
3. `W3` 设置页中文化与紧凑化
4. `W4` 消息页局部 skeleton
5. `W5` 评论区局部 loading
6. `W6` 回归验证与浏览器走查

## 13. 每步 test_strategy
- `W1`: `test_after`
- `W2`: `test_after`
- `W3`: `test_after`
- `W4`: `test_after`
- `W5`: `test_after`
- `W6`: `test_after`

## 14. 不可并行点
- `W1` 必须单线程执行，不能与任何页面实现并行改共享壳层。
- `W2` 和 `W3` 不能并行改 `profile-settings-state.ts`。
- `W4` 和 `W5` 不能并行改 `page-skeletons.tsx`。
- 任何任务都不要并行改 `app.tsx`、`web-layout.tsx`、`user-menu.tsx`。

## 15. 推荐验证命令
- `bun run --cwd apps/web typecheck`
- `bun run --cwd apps/web build`
- `bunx vitest run --config vitest.config.ts apps/web/tests/**/*.test.ts`
- 浏览器 smoke：
  - 未登录时侧边栏无消息/个人中心/设置入口
  - 登录后侧边栏和移动端抽屉出现入口
  - 顶栏不再出现这三类入口
  - 消息页只在列表区域显示 skeleton
  - 评论区只在评论线程区域显示 skeleton

## 16. 需要特别注意的回归风险
- 顶栏去入口后，必须保留用户头像/登录/退出的最小可用操作。
- 侧边栏新增入口后，桌面与移动端信息架构必须一致。
- 局部 skeleton 的引入不能导致 query 刷新时重复闪烁。
- 中文化不能遗漏 `aria-label`、按钮 `sr-only`、错误提示等辅助文案。
