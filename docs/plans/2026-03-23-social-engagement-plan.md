# 2026-03-23 社交互动层执行计划

## 1. 需求文档路径
- `docs/project/mvp/mvp-roadmap.md`
- `docs/requirements/2026-03-23-mvp5-6-post-feed-requirements.md`

## 2. 任务文档路径
- `docs/tasks/2026-03-23-mvp5-6-posts-comments-tasks.md`
- 本轮新增范围以用户明确输入为准：在 `develop` 已有 `posts/comments/feed/admin moderation` 初版上继续扩展图片上传、关注流、消息通知、点赞/收藏/分享、无限嵌套评论；不做复杂推荐算法和视频上传。

## 3. 当前轮次目标
- 基于现有帖子域，升级为可承载基础社交互动的社区主链路。
- 保持现有发帖、审核、feed、帖子详情、评论链路可用，并在其上叠加：
  - 图片上传
  - 关注流
  - 消息通知
  - 点赞、收藏、分享
  - 无限嵌套评论

## 4. 当前轮次范围
### 范围内
- 复用现有 `posts` 域，扩展帖子媒体字段、互动聚合字段、关注 feed 入口、通知读模型、递归评论结构。
- 新增最小图片上传链路，只支持图片，不支持视频。
- 新增“推荐 / 最新 / 关注”三类 feed，其中“推荐”继续使用简化排序，不做复杂推荐算法。
- 新增帖子与评论的点赞、收藏、分享计数与当前用户状态。
- 将评论从“单层回复”升级为“任意深度树形回复”。
- 为关注、评论回复、点赞等事件提供站内通知。

### 范围外
- 复杂推荐算法
- 视频上传、转码、视频封面
- 私信、群聊、推送服务、WebSocket 实时通知
- 批量审核、推荐运营位、复杂风控

## 5. 完成标准
- 现有 `feed -> post detail -> comments -> admin moderation` 主链路保持可用。
- 发帖支持上传并展示图片，帖子详情和 feed 卡片可消费图片字段。
- `/home/feed` 支持 `recommended | latest | following`。
- 用户可以关注/取关其他用户，`following` feed 仅展示被关注作者的已发布帖子。
- 帖子与评论支持点赞；帖子支持收藏、分享计数；前端可读到当前用户互动状态。
- 评论接口和详情返回结构支持无限嵌套树。
- 通知中心至少支持列表、未读计数、标记已读；关注、评论回复、点赞触发通知。
- 相关类型检查、服务端测试、共享契约测试和最终整仓检查通过，或明确记录未执行项。

## 6. 是否需要先查阅 repo_explorer
- 否，已完成。
- 已确认当前真实基线：
  - `develop` 已包含 `posts/comments/feed/admin moderation` 初版。
  - `apps/server/src/modules/posts/*` 已实现帖子、评论、举报、后台审核。
  - `apps/web/src/routes/home-page.tsx`、`apps/web/src/routes/post-detail-page.tsx` 已接入 feed 与帖子详情。
  - `apps/admin/src/features/posts/*` 已有帖子/评论审核页面。
  - `packages/db/src/schema.ts` 当前仅有帖子、评论、举报表，尚无关注、通知、互动、媒体表。

## 7. 执行代理分工
- 主代理
  - 负责共享区域收口、顺序控制、最终联调与验证。
- `backend_implementer`
  - 负责 `packages/db`、`packages/schemas`、`packages/shared`、`packages/http-client`、`apps/server` 中本轮新增社交能力。
  - 负责所有新的持久化结构、接口契约、服务端规则、种子和服务端测试。
- `frontend_implementer`
  - 在共享契约稳定后，负责 `apps/web` 和必要的 `apps/admin` 接入。
  - 只通过 `packages/http-client` 消费新接口。

## 8. 共享区域改动归属
### 唯一责任方
- 主代理先收口共享设计，实际代码由 `backend_implementer` 独占实现。

### 独占区域
- `packages/shared/src/index.ts`
- `packages/schemas/src/index.ts`
- `packages/schemas/src/posts.ts`
- 新增或变更的 `packages/schemas/src/*.ts`
- `packages/db/src/schema.ts`
- `packages/db/src/index.ts`
- `packages/db/src/seed.ts`
- `packages/db/drizzle/*`
- `packages/http-client/src/index.ts`
- `apps/server/src/app.ts`
- `apps/server/src/modules/posts/*`
- 新增 `apps/server/src/modules/follows/*`
- 新增 `apps/server/src/modules/notifications/*`
- 新增 `apps/server/src/modules/uploads/*`

### 前端可并行区域
- 仅在共享区与服务端接口冻结后：
  - `apps/web/src/routes/home-page.tsx`
  - `apps/web/src/routes/post-detail-page.tsx`
  - 新增 `apps/web/src/routes/notifications-page.tsx`
  - `apps/web/src/features/*` 中与互动、上传、关注相关的局部组件
  - `apps/admin/src/features/posts/*` 中必要的审核展示增强

## 9. 工作区推荐
- `worktree`
- 当前实际工作区：`C:\Users\12247\.codex\worktrees\62e2\feijia-social-engagement`
- 当前分支：`codex/social-engagement`
- 原因：
  - 本轮跨 `packages/* + server + web + admin`
  - 共享区改动重，且适合前后端分阶段并行
  - 需要与已有 `develop` 基线隔离验证

## 10. 风险提醒
- 评论当前 schema 和服务实现是“两层结构”；升级为无限嵌套会直接影响 `packages/schemas`、`http-client`、`server`、`web` 渲染方式，属于本轮最高风险变更。
- 现有 feed 只有 `recommended | latest`；新增 `following` 后，排序与空状态逻辑会波及首页和测试。
- 点赞、收藏、分享如果分别建表但聚合字段不同步，feed 和详情会出现计数漂移；必须在服务端统一维护读模型。
- 通知如果直接耦合在 `posts` 模块里，后续会把关注、互动、系统通知全部挤进一个模块；建议独立 `notifications` 模块，但事件写入仍由服务端业务操作同步触发。
- 图片上传涉及 MinIO/S3 抽象，但仓库当前只有 `docker/storage`，没有现成 `packages/storage` 实现；需先做最小可用封装，避免把存储逻辑散落到 `apps/server`。
- 分享能力建议先实现“站内分享计数 + Web Share/复制链接”，不要误扩成外部平台 OAuth。

## 11. 实现者交接信息
- 现有帖子域复用点：
  - `apps/server/src/modules/posts/posts.repo.ts`
  - `apps/server/src/modules/posts/posts.service.ts`
  - `apps/server/src/modules/posts/posts.route.ts`
  - `packages/schemas/src/posts.ts`
  - `packages/http-client/src/index.ts`
  - `apps/web/src/routes/home-page.tsx`
  - `apps/web/src/routes/post-detail-page.tsx`
- 本轮建议新增实体：
  - `post_images`
  - `user_follows`
  - `post_likes`
  - `comment_likes`
  - `post_favorites`
  - `post_shares`
  - `notifications`
- 评论实现建议：
  - 持久化仍使用单表自引用 `parentCommentId`
  - 仓储层返回扁平节点列表
  - 服务层统一组装递归树
  - 删除逻辑改为整棵子树级联处理
- 通知最小事件建议：
  - `followed`
  - `post_liked`
  - `comment_replied`
  - `comment_liked`
- 图片上传最小链路建议：
  - 先做服务端上传接口
  - 返回可持久化的图片元数据
  - 发帖时提交已上传图片引用

## 12. 推荐的实现顺序
1. 共享契约与数据建模
   - 扩展路由常量、feed tab、评论树 schema、互动状态 schema、通知 schema、上传 schema。
   - 设计并落库关注、互动、通知、图片表与必要索引。
2. 存储与上传底座
   - 新增最小 `packages/storage` 或同等集中封装。
   - 打通服务端图片上传接口与帖子图片关联。
3. 服务端社交规则
   - 扩展 posts repo/service：图片、互动聚合、无限嵌套评论。
   - 新增 follows/notifications 模块或由 posts 调用独立 repo。
4. Feed 与通知读模型
   - 新增 `following` feed。
   - 为详情与 feed 注入当前用户互动状态、聚合计数、通知未读数。
5. Web/Admin 接入
   - Web：上传、关注、互动、递归评论、通知中心。
   - Admin：必要时补充图片/互动/通知相关审核展示，但不扩成新后台域。
6. 联调与回归
   - 优先验证旧链路无回归，再验证新增社交链路。

## 13. 不适合并行的区域
- 不能并行：
  - `packages/shared`
  - `packages/schemas`
  - `packages/db`
  - `packages/http-client`
  - `apps/server/src/modules/posts/*`
- 原因：
  - 评论树、互动状态、feed tab、通知契约互相耦合。
  - 同一时期修改这些区域容易出现契约漂移。
- 可以并行：
  - 在服务端接口冻结后，`apps/web` 的首页/详情/通知中心分区域实现。
  - 在 Web 主链路稳定后，`apps/admin` 仅做展示增强可并行。

## 14. 每个阶段的最小验证方案
### 阶段 1：共享契约与数据建模
- `bun run --cwd packages/schemas test`
- `bun run --cwd packages/schemas typecheck`
- `bun run --cwd packages/http-client typecheck`
- `bun run --cwd packages/db typecheck`

### 阶段 2：服务端上传、关注、互动、通知、递归评论
- `bun run --cwd apps/server test`
- 补充覆盖：
  - 上传图片并发帖
  - 关注后 `following` feed 可见
  - 点赞/收藏/分享计数更新
  - 回复任意深度评论
  - 关注、点赞、回复触发通知

### 阶段 3：Web/Admin 接入
- `bun run --cwd apps/web typecheck`
- `bun run --cwd apps/admin typecheck`
- 如补 UI 测试，优先覆盖：
  - feed tab 切换
  - 递归评论渲染
  - 图片发帖
  - 通知列表与未读态

### 最终收口
- `bun run typecheck`
- `bun run test`
- `bun run build`
- 如时间允许，再执行 `bun run check`

## 15. 推荐的下一步
1. 先锁定共享契约和数据模型，不直接改前端。
2. 先由后端完成“图片 + 关注 + 互动 + 通知 + 递归评论”的服务端闭环。
3. 服务端测试通过后，再接入 Web 页面和交互。
4. 完成实现后执行 `review_qa`。
