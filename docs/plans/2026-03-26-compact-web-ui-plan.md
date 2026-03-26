# 2026-03-26 Compact Web UI Plan

## 1. 需求文档路径
- [docs/requirements/2026-03-23-mvp5-6-post-feed-requirements.md](/E:/CodeStore/feijia/docs/requirements/2026-03-23-mvp5-6-post-feed-requirements.md)
- [docs/requirements/2026-03-23-phase4-rating-review-requirements.md](/E:/CodeStore/feijia/docs/requirements/2026-03-23-phase4-rating-review-requirements.md)
- 会话内需求补充：2026-03-26 当前用户消息，包含紧凑卡片、飞友圈固定 tab、管理员可配置扩展 tab、榜单详情拆分、评论折叠样式、小红书式详情弹层要求

## 2. 任务文档路径
- [docs/tasks/2026-03-23-mvp5-6-posts-comments-tasks.md](/E:/CodeStore/feijia/docs/tasks/2026-03-23-mvp5-6-posts-comments-tasks.md)
- 现有任务文档未覆盖“管理员可配置飞友圈扩展 tab”与“榜单详情页重新分层”，本轮以本计划作为直接执行依据

## 3. 当前轮次目标
- 把 `web` 端飞友圈、飞行器库、榜单链路整体收紧为密度更高的产品界面，去掉过大的卡片和多余留白。
- 将帖子详情改为小红书式弹层阅读体验，同时把评论区统一为紧凑、靠边、靠分隔线区分的样式。
- 固定飞友圈顶部主 tab 为 `推荐 / 关注 / 最新`，并补齐“管理员配置额外 tab”的最小闭环。

## 4. 当前轮次范围
- 包含：
  - `apps/web/src/routes/circle-page.tsx`
  - `apps/web/src/routes/models-page.tsx`
  - `apps/web/src/routes/post-detail-page.tsx`
  - `apps/web/src/routes/rankings-page.tsx`
  - `apps/web/src/routes/ranking-detail-page.tsx`
  - `apps/web/src/routes/ranking-item-detail-page.tsx`
  - `apps/web/src/features/posts/post-comment-thread.tsx`
  - `apps/web/src/features/posts/post-interaction-bar.tsx`
  - `apps/admin/src/app.tsx`
  - `apps/admin/src/features/*` 中新增或补充飞友圈 tab 管理页面
  - `packages/shared` / `packages/schemas` / `packages/http-client` / `apps/server` 中与飞友圈扩展 tab 配置相关的最小共享契约与接口
- 不包含：
  - 大范围重做全站视觉系统
  - 新的媒体上传链路
  - 评论无限层级
  - 榜单系统的数据模型大改

## 5. 完成标准
- 飞友圈瀑布流和飞行器库卡片尺寸明显缩小，并且每类卡片都具备稳定的 `min-width` / `max-width` 约束。
- 卡片媒体与正文区更紧凑，正文底色与区域背景保持统一，媒体圆角改为小圆角。
- 飞友圈主 tab 永远显示 `推荐 / 关注 / 最新`，扩展 tab 来自后台配置；进入页面时总能选中一个有效 tab。
- 信息流互动区移到媒体下方左侧，分享按钮在底部右侧。
- 帖子详情呈现为小红书式弹层体验，列表到详情的阅读路径更聚焦。
- 榜单详情页只负责榜单说明和排行列表，评论与星级只留在排行项目详情页。
- 评论样式统一为无卡片圆角、无块间距、边框分隔、回复默认折叠可展开。
- 相关验证完成，且保留未自动化部分的手工验证说明。

## 6. 是否需要先查阅 repo_explorer
- 需要，且本轮已查明：
  - 飞友圈卡片与 tab 由 [circle-page.tsx](/E:/CodeStore/feijia/apps/web/src/routes/circle-page.tsx) 控制。
  - 飞行器库卡片由 [models-page.tsx](/E:/CodeStore/feijia/apps/web/src/routes/models-page.tsx) 控制。
  - 帖子详情与评论分别由 [post-detail-page.tsx](/E:/CodeStore/feijia/apps/web/src/routes/post-detail-page.tsx) 和 [post-comment-thread.tsx](/E:/CodeStore/feijia/apps/web/src/features/posts/post-comment-thread.tsx) 控制。
  - 榜单总览、榜单详情、排行项目详情分别位于 [rankings-page.tsx](/E:/CodeStore/feijia/apps/web/src/routes/rankings-page.tsx)、[ranking-detail-page.tsx](/E:/CodeStore/feijia/apps/web/src/routes/ranking-detail-page.tsx)、[ranking-item-detail-page.tsx](/E:/CodeStore/feijia/apps/web/src/routes/ranking-item-detail-page.tsx)。
  - `admin` 端当前没有飞友圈 tab 配置入口；[apps/admin/src/app.tsx](/E:/CodeStore/feijia/apps/admin/src/app.tsx) 也未注册此类页面。

## 7. 执行代理分工
- `backend_implementer`
  - 负责飞友圈扩展 tab 的共享契约、接口、服务端实现。
  - 责任边界：
    - `packages/shared`
    - `packages/schemas`
    - `packages/http-client`
    - `apps/server/src/app.ts`
    - `apps/server/src/modules/*` 中与飞友圈 tab 配置相关的唯一实现目录
  - 说明：
    - 这是本轮唯一必须跨前后端共享的新增能力，必须先稳定 contract，再让两个前端面接入。

- `frontend_implementer`
  - 负责 `web` 端紧凑化改造。
  - 责任边界：
    - `apps/web/src/routes/circle-page.tsx`
    - `apps/web/src/routes/models-page.tsx`
    - `apps/web/src/routes/post-detail-page.tsx`
    - `apps/web/src/routes/rankings-page.tsx`
    - `apps/web/src/routes/ranking-detail-page.tsx`
    - `apps/web/src/routes/ranking-item-detail-page.tsx`
    - `apps/web/src/features/posts/post-comment-thread.tsx`
    - `apps/web/src/features/posts/post-interaction-bar.tsx`
    - 必要时复用现有评论/评分逻辑，但不改共享 contract

- `frontend_implementer` 第二轮或同代理串行继续
  - 负责 `admin` 端飞友圈扩展 tab 管理页。
  - 责任边界：
    - `apps/admin/src/app.tsx`
    - `apps/admin/src/features/*` 中新增的 tab 管理页面
  - 说明：
    - `admin` 页面改动与 `web` 端不共享文件，可在后端 contract 稳定后并行于 `web` UI 改造。

## 8. 共享区域改动归属
- 唯一责任方：`backend_implementer`
- 共享区域：
  - `packages/shared`
  - `packages/schemas`
  - `packages/http-client`
  - `apps/server/src/app.ts`
  - `apps/server/src/modules/*` 中新增的飞友圈 tab 配置模块
- 顺序要求：
  1. 先由 `backend_implementer` 定义扩展 tab 的读取/写入 contract。
  2. contract 稳定后，`frontend_implementer` 再接 `web` 和 `admin`。
  3. `web` 与 `admin` 不得先各自猜测字段结构并并行修改共享请求层。

## 9. 风险提醒
- “管理员可配置扩展 tab” 当前仓库没有现成能力，最小实现也可能触及一处新的服务端配置存储。若没有现成 settings 模块，可能需要新增最小数据承载。
- 小红书式详情弹层如果直接重做路由结构，容易扩大范围；本轮应优先采用“路由驱动的 modal/panel 呈现”，避免重写整体导航。
- 评论统一样式会同时影响帖子评论与排行项目评论，需复用现有评论组件思路，避免两套折叠逻辑分叉。
- 榜单详情和排行项目详情职责必须一次收清；否则会继续出现评分、评论、摘要在两个页面重复承载的问题。

## 10. 实现者交接信息
- 任务 A：飞友圈扩展 tab 后端闭环
  - 目标：
    - 固定 `推荐 / 关注 / 最新` 为前台保留 tab。
    - 追加“管理员可配置扩展 tab”接口，支持列表读取、启停、排序，返回给 `web` 用于展示。
  - 影响文件：
    - `packages/shared`
    - `packages/schemas`
    - `packages/http-client`
    - `apps/server/src/app.ts`
    - `apps/server/src/modules/*`
  - `test_strategy`: `tdd`
  - 验证：
    - 先新增/修改对应服务端测试使 contract 失败，再最小实现通过。
    - 最小命令：`bun x vitest run --root . --config vitest.config.ts apps/server/tests/posts.test.ts`
    - 若触及 shared/schema，再补 `bun run --cwd packages/schemas typecheck`

- 任务 B：`web` 飞友圈与详情链路紧凑化
  - 目标：
    - 飞友圈卡片缩小并约束宽度。
    - 互动区重排到媒体下左、分享到右下。
    - 帖子详情切成 modal/panel 弹层式阅读体验。
    - 评论统一为边线分隔、回复折叠展开。
  - 影响文件：
    - `apps/web/src/routes/circle-page.tsx`
    - `apps/web/src/routes/post-detail-page.tsx`
    - `apps/web/src/features/posts/post-comment-thread.tsx`
    - `apps/web/src/features/posts/post-interaction-bar.tsx`
  - `test_strategy`: `test_after`
  - 验证：
    - `bun run --cwd apps/web typecheck`
    - 手工检查飞友圈列表、详情弹层、评论折叠、互动布局

- 任务 C：`web` 飞行器库与榜单链路收紧
  - 目标：
    - 飞行器库卡片缩小、收紧媒体和文本区。
    - 榜单详情只保留榜单信息与排行列表。
    - 排行项目详情保留评分和评论区，并继续使用星级交互。
  - 影响文件：
    - `apps/web/src/routes/models-page.tsx`
    - `apps/web/src/routes/rankings-page.tsx`
    - `apps/web/src/routes/ranking-detail-page.tsx`
    - `apps/web/src/routes/ranking-item-detail-page.tsx`
  - `test_strategy`: `test_after`
  - 验证：
    - `bun run --cwd apps/web typecheck`
    - 手工检查榜单总览 -> 榜单详情 -> 排行项目详情的职责分层

- 任务 D：`admin` 飞友圈扩展 tab 配置页
  - 目标：
    - 在 `admin` 端提供最小可用的扩展 tab 管理入口。
    - 支持新增、编辑名称、启停、排序或权重调整。
  - 影响文件：
    - `apps/admin/src/app.tsx`
    - `apps/admin/src/features/*` 中新增页面
  - `test_strategy`: `test_after`
  - 验证：
    - `bun run --cwd apps/admin typecheck`
    - 手工检查保存后 `web` 飞友圈 tab 刷新可见

## 11. 推荐的下一步
1. 先执行任务 A，锁定飞友圈扩展 tab 的 contract 与接口。
2. contract 稳定后，并行执行任务 B 和任务 D。
3. 任务 C 可与任务 B 同属 `web` 侧，但应由同一前端实现代理串行提交，避免同时改 `apps/web/src/routes/*` 产生冲突。
4. 全部改动完成后，再由 `review_qa` 做一次收口，重点核对评论职责、榜单职责拆分和未自动化的 UI 验证证据。
