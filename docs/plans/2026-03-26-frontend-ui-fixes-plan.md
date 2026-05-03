# 2026-03-26 Frontend UI Fixes Plan

## 1. 需求文档路径
- 已有等效明确输入：当前主会话已与用户对齐本轮前端目标，未额外落新的 requirement 文档。
- 关联上轮需求文档：
  - [docs/requirements/2026-03-26-platform-closure-and-compact-feed-requirements.md](/E:/CodeStore/feijia/docs/requirements/2026-03-26-platform-closure-and-compact-feed-requirements.md)

## 2. 任务文档路径
- 关联任务文档：
  - [docs/tasks/2026-03-26-platform-closure-and-compact-feed-tasks.md](/E:/CodeStore/feijia/docs/tasks/2026-03-26-platform-closure-and-compact-feed-tasks.md)
- 本轮是在既有 `W1` / `W2` 范围内收敛到更具体的 UI 修补项，不需要重新做 task_design。

## 3. 当前轮次目标
- 修复登录后默认跳转到未注册路由导致的 404。
- 调整飞友圈弹窗详情布局，使评论区和评论输入都收敛在右侧内容列底部，而不是横跨整个弹窗底部。
- 修正飞友圈弹窗头部交互冲突：保留右上角关闭入口，移除与其冲突的关注按钮，并在用户名旁补头像。
- 将首页信息流卡片改成白底，并增加明确但克制的 hover 颜色变化。
- 将榜单页卡片改成白底紧凑卡片，排行项左侧显示图片，右侧显示名字和星级分数。
- 将榜单详情页顶部改成“左图右文”结构，去掉右侧说明卡，把标题、描述、星级和分数放到图片右侧。

## 4. 当前轮次范围
- 包含：
  - 登录页默认重定向修补。
  - 飞友圈弹窗详情页的头部、评论区、底部输入区布局调整。
  - 首页文章信息流卡片背景和 hover 视觉调整。
  - 榜单页官方卡片与社区卡片的列表项结构调整。
  - 榜单详情页顶部区域结构调整。
- 不包含：
  - 新增个人中心或设置页展示。
  - 互动功能闭环、浏览量真实落库。
  - 后端接口变更、schema 变更、seed 变更。
  - 额外全站视觉重做。

## 5. 完成标准
- 登录成功后不会跳转到未注册路由；默认返回可访问页面。
- 飞友圈弹窗详情页满足：
  - 顶部用户名旁有头像。
  - 不再显示与关闭按钮冲突的关注按钮。
  - 评论列表和评论输入框都位于右侧内容区内部底部。
- 首页信息流卡片为白底，hover 时有清晰但不过度的悬浮/描边/背景变化。
- 榜单页每张卡片为白底，前三个排行项均展示缩略图、名称、星级和分数。
- 榜单详情页顶部不再出现独立右侧说明卡，标题/描述/评分信息与封面图并列展示。
- 受影响页面可通过 `typecheck`、`build`，并完成手工浏览验证。

## 6. 是否需要先查阅 repo_explorer
- 不需要。
- 当前入口和对应文件已明确，代码结构足够清晰，可直接交付实现。

## 7. 执行代理分工
- `frontend_implementer`
  - 负责本轮全部实现。
  - 任务包 A：登录后 404 最小路由/跳转修补。
  - 任务包 B：飞友圈弹窗详情页布局修补。
  - 任务包 C：首页信息流视觉修补。
  - 任务包 D：榜单页卡片结构修补。
  - 任务包 E：榜单详情页顶部结构修补。
- `review_qa`
  - 在实现完成后评审回归风险与视觉要求是否对齐。

## 8. 共享区域改动归属
- 唯一责任方：`frontend_implementer`
- 本轮禁止并行改动的共享区域：
  - `apps/web/src/app.tsx`
  - `apps/web/src/features/auth/login-page.tsx`
  - `apps/web/src/routes/circle-page.tsx`
  - `apps/web/src/routes/home-page.tsx`
  - `apps/web/src/routes/rankings-page.tsx`
  - `apps/web/src/routes/ranking-detail-page.tsx`
  - 如需复用图片/头像工具：`apps/web/src/lib/aviation-media.ts`
- 顺序要求：
  1. 先修登录跳转，消除功能性阻塞。
  2. 再改飞友圈弹窗布局，避免与其它页面样式调整混在一起。
  3. 最后处理首页、榜单页、榜单详情页的视觉与结构调整。

## 9. 风险提醒
- `login-page.tsx` 当前默认重定向使用 `APP_ROUTES.webProfile`，而该路由未注册；修补时应优先回到已存在页面，而不是新增展示页。
- 飞友圈弹窗是带遮罩的固定层，评论输入区从整窗底部收回到右侧列后，要同时检查滚动区域高度和移动端溢出。
- 首页、榜单页、榜单详情页都在现有视觉体系内；只允许做定点收紧和结构调整，不要扩散成全站换肤。
- 榜单页卡片结构调整会同时影响官方卡片与社区卡片，两者必须统一节奏，避免一套有图一套无图的断裂感。

## 10. 实现者交接信息
- 任务包 A：登录后 404
  - 文件：
    - `apps/web/src/features/auth/login-page.tsx`
    - 视情况少量查看 `apps/web/src/app.tsx`
  - 目标：
    - 将默认 `redirectTo` 改为已注册页面，例如 `APP_ROUTES.feedHome`。
    - 仅做最小路由/跳转修补，不新增 `/me` 展示入口。
  - `test_strategy`: `test_after`
  - 验证：
    - 登录后不出现 404。
    - `bun run typecheck`

- 任务包 B：飞友圈弹窗详情页
  - 文件：
    - `apps/web/src/routes/circle-page.tsx`
    - 如需复用头像组件，允许读 `apps/web/src/components/ui/avatar.tsx`
  - 目标：
    - 头部加入头像。
    - 去掉关注按钮。
    - 保留关闭按钮。
    - 让评论区和评论输入区都位于右侧栏底部。
  - `test_strategy`: `test_after`
  - 验证：
    - 手工打开弹窗检查右侧列滚动、评论区位置、关闭按钮可用。
    - `bun run typecheck`

- 任务包 C：首页信息流
  - 文件：
    - `apps/web/src/routes/home-page.tsx`
  - 目标：
    - 信息流卡片改白底。
    - 增加 hover 颜色变化和轻微悬浮反馈。
  - `test_strategy`: `test_after`
  - 验证：
    - 手工检查 hover 状态、白底层级、可读性。
    - `bun run build`

- 任务包 D：榜单页
  - 文件：
    - `apps/web/src/routes/rankings-page.tsx`
    - 如需图片兜底，允许读 `apps/web/src/lib/aviation-media.ts`
  - 目标：
    - 卡片改白底。
    - 每条排行项左图右文，右侧为名称和星级分数。
  - `test_strategy`: `test_after`
  - 验证：
    - 手工检查官方/社区卡片都满足结构要求。
    - `bun run typecheck`

- 任务包 E：榜单详情页
  - 文件：
    - `apps/web/src/routes/ranking-detail-page.tsx`
  - 目标：
    - 去掉右侧说明卡。
    - 顶部改为“左图右文”，右文包含标题、描述、评分。
  - `test_strategy`: `test_after`
  - 验证：
    - 手工检查顶部结构与截图要求对齐。
    - `bun run build`

## 11. 推荐的下一步
- 将本计划直接交给 `frontend_implementer` 执行。
- 实现完成后运行：
  - `bun run typecheck`
  - `bun run build`
- 再由 `review_qa` 做一次针对 UI 细节的回归评审。
