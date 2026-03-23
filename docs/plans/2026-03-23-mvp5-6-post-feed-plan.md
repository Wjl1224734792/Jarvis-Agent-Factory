# MVP 第 5/6 迭代执行计划

## 1. 需求文档路径
- `docs/project/mvp/mvp-roadmap.md`
- `docs/project/mvp/MVP 第1-第6迭代清单.md`
- `docs/project/mvp/MVP 第1-第6迭代的每轮验收口径.md`
- `docs/project/PRDs/飞加网 - 产品需求文档 (PRD) V1.0.md`

## 2. 任务文档路径
- 当前缺失正式第 5/6 迭代任务文档。
- 建议先补：`docs/tasks/2026-03-23-mvp5-6-post-feed-tasks.md`
- 本计划基于现有需求文档和代码现状先收敛执行边界，可直接交付实现代理。

## 3. 当前轮次目标
- 在不做媒体上传、关注、消息、无限嵌套回复的前提下，完成方案 A 的最小闭环：
  - 新增独立帖子域。
  - 提供 `/home` feed，至少支持“推荐 / 最新”两个 Tab。
  - 提供帖子详情页和单层评论。
  - 提供后台基础审核闭环。
- 让第 5 轮的内容分发入口与第 6 轮的内容生产、讨论、治理共用同一套帖子契约和状态模型，避免两轮各做一半。

## 4. 当前轮次范围
### 范围内
- 新增帖子聚合根及其最小数据模型：
  - 帖子基础信息。
  - 帖子状态。
  - 帖子与作者关联。
  - 帖子与评论计数、热度排序所需字段。
  - 评论单层结构。
- 新增面向 feed、详情、评论、后台审核的共享契约、数据库结构、服务端模块和请求层封装。
- 将主站首页从当前 auth 展示页切换为真实 `/home` 内容入口。
- 在管理后台新增帖子审核最小页面，至少支持列表、状态筛选、通过、驳回、隐藏。

### 范围外
- 不做媒体上传、上传签名、对象存储接入。
- 不做关注流、消息通知、私信。
- 不做无限嵌套回复，评论只做单层。
- 不做举报体系、点赞、收藏、分享、编辑历史、批量审核。
- 不做复杂推荐，只做推荐/最新的最小排序。
- 不改现有机型点评域的业务规则，除非复用公共能力时必须做兼容性小改。

## 5. 完成标准
- `web` 存在真实 `/home` 内容流，且不再只是账号体系占位页。
- 已登录用户可发布文本帖子，帖子进入明确审核状态。
- `/posts/:id` 或等价详情路由可展示正文、作者、状态可见结果和单层评论列表。
- 已登录用户可对可见帖子发表评论。
- 后台可查看帖子审核列表，并执行最小审核动作，且结果影响前台可见性。
- feed 的“推荐 / 最新”两条读链路都可返回可消费内容。
- 共享契约、数据库结构、服务端接口、请求层、前台页面、后台页面都有对应最小验证。

## 6. 是否需要先查阅 repo_explorer
- 否。
- 原因：当前仓库边界已足够清晰。现状可直接确认：
  - 只有 `reviews` 域，没有 `posts` 域。
  - `apps/web/src/routes/home-page.tsx` 仍是 auth 占位页。
  - `apps/admin/src/features/reviews/reviews-page.tsx` 只有点评治理页。
  - `packages/db/src/schema.ts` 尚无帖子和评论结构。

## 7. 执行代理分工
- `backend_implementer`
  - 负责共享契约收口后的后端实现。
  - 负责数据库 schema、迁移、种子、服务端帖子/评论/审核模块、服务端测试。
  - 负责 feed 排序规则和审核状态流转的唯一实现。
- `frontend_implementer`
  - 负责 `apps/web` 的 `/home` feed、帖子详情、发帖入口、评论交互。
  - 负责 `apps/admin` 的帖子审核页面和最小审核操作交互。
  - 只通过 `packages/http-client` 消费接口，不绕过请求层。

## 8. 共享区域改动归属
### 唯一责任方
- `backend_implementer`

### 共享区域清单
- `packages/shared/src/index.ts`
- `packages/schemas/src/*`
- `packages/db/src/schema.ts`
- `packages/db/drizzle/*`
- `packages/db/src/seed.ts`
- `packages/http-client/src/index.ts`
- `apps/server/src/app.ts`
- `apps/server/src/modules/posts/*`（新建）
- `apps/server/tests/*` 中与帖子域相关的测试

### 归属说明
- 第 5/6 轮共用的新契约、新表结构、新路由常量、新请求客户端方法都属于共享区，必须由 `backend_implementer` 单线收口。
- `frontend_implementer` 只能在共享区冻结后开始页面实现，避免前后端同时修改同一共享区域。

## 9. 推荐顺序
1. 先补任务文档，锁定本轮最小对象模型、状态枚举、路由命名和完成口径。
2. 再由 `backend_implementer` 一次性收口共享区：
   - `packages/shared`
   - `packages/schemas`
   - `packages/db`
   - `packages/http-client`
3. 然后实现服务端帖子域：
   - feed 读接口
   - 发帖接口
   - 详情接口
   - 评论接口
   - 后台审核接口
4. 共享区和服务端接口稳定后，前后端开始并行：
   - `apps/web` 做 `/home`、帖子详情、发帖、评论。
   - `apps/admin` 做帖子审核页。
5. 最后做联调、验收文档和 `review_qa`。

## 10. 哪些工作可并行
### 必须串行
- 共享契约、数据库结构、状态机定义、请求层封装。
- 服务端帖子/评论/审核接口的路由命名与返回结构定稿。
- 审核状态枚举及 feed 可见性规则。

### 可并行
- 在共享区冻结后：
  - `frontend_implementer` 并行开发 `apps/web`。
  - `frontend_implementer` 并行开发 `apps/admin`。
- 在服务端读接口稳定后：
  - web 的 `/home` feed 和帖子详情页可以并行。
  - admin 审核页与 web 评论交互可以并行。

### 不可并行的冲突点
- 不允许两个实现代理同时修改：
  - `packages/shared`
  - `packages/schemas`
  - `packages/db`
  - `packages/http-client`
  - `apps/server/src/app.ts`

## 11. 工作区推荐
- 推荐：`worktree`
- 原因：
  - 当前工作树已存在未提交变更。
  - 第 5/6 轮同时涉及 `web / admin / server / packages/*` 多区域。
  - 前后端需要并行，但共享区必须单责任串行，适合用 worktree 隔离任务包。
  - 本轮不是小修复，而是新增帖子域的跨层实现。

## 12. 风险提醒
- 当前 PRD 的第 6 轮包含上传、回复、举报、内容安全等能力，但本轮明确裁掉这些项；如果任务文档不提前写清，会在实现阶段被重新带回范围。
- 现有代码只有“机型点评”域，容易被误复用为“帖子评论”域；两者聚合边界不同，不能直接在 `reviews` 模块上硬扩。
- `/home` 当前仍是账号体系占位页，切换为真实 feed 后会触及主路由入口和主站首屏行为，回归面大于普通页面新增。
- feed 的“推荐”如果依赖未来的点赞/收藏/关注数据，会被空数据卡住；本轮必须先用帖子状态、评论数、创建时间等现有字段给出简化排序。
- 审核状态如果既影响详情可见性又影响 feed 可见性，但没有统一规则，前后台会出现“后台已下架、前台仍可见”的回归。
- 当前工作树已脏，实施时不能误覆盖现有未提交改动。

## 13. 实现者交接信息
- 代码现状：
  - `packages/db/src/schema.ts` 只有用户、会话、机型、点评相关表。
  - `apps/server/src/modules/reviews/*` 已形成“点评 + 后台点评治理”的完整模式，可作为帖子域目录结构参考，但不能直接复用业务语义。
  - `apps/web/src/routes/model-detail-page.tsx` 已有“详情页 + 提交表单 + 列表渲染”的前端模式，可复用页面结构和请求模式。
  - `apps/admin/src/features/reviews/reviews-page.tsx` 已有最小治理页形态，可复用查询和状态切换交互骨架。
- 建议的新域边界：
  - `posts` 负责帖子、feed、审核。
  - `post-comments` 可并入 `posts` 模块先实现，不建议首轮拆成独立模块。
- 建议的最小状态：
  - 帖子：`pending` / `published` / `rejected` / `hidden`
  - 评论：`visible` / `hidden`
- 建议的最小路由集合：
  - `GET /home/feed`
  - `POST /posts`
  - `GET /posts/:id`
  - `GET /posts/:id/comments`
  - `POST /posts/:id/comments`
  - `GET /admin/posts`
  - `PUT /admin/posts/:id/status`
- 建议的最小排序：
  - 推荐：`published` 帖子按评论数、创建时间衰减排序。
  - 最新：`published` 帖子按发布时间倒序。

## 14. 验证计划
### 共享区
- `bun run --cwd packages/schemas test`
- `bun run --cwd packages/schemas typecheck`
- `bun run --cwd packages/shared typecheck`
- `bun run --cwd packages/http-client typecheck`
- `bun run --cwd packages/db typecheck`

### 服务端
- 新增帖子域测试，至少覆盖：
  - 发帖需要登录。
  - `published` 才进入 feed。
  - 审核状态更新后会影响 feed 和详情可见性。
  - 评论只允许挂在可见帖子下。
  - 未授权访问后台审核接口被拒绝。
- 运行：`bun run --cwd apps/server test`

### 前台
- `bun run --cwd apps/web typecheck`
- 补最少页面测试，至少覆盖 feed 或帖子详情的关键渲染。

### 后台
- `bun run --cwd apps/admin typecheck`
- 至少验证审核列表加载和状态切换交互。

### 总体验证
- `bun run typecheck`
- `bun run test`
- 如需收口前再做一次：`bun run build`

## 15. 建议落盘到哪些 docs 文件
- 新增 `docs/tasks/2026-03-23-mvp5-6-post-feed-tasks.md`
  - 固化任务包、优先级、DDD/TDD 分类和共享区警戒线。
- 新增 `docs/requirements/2026-03-23-mvp5-6-post-feed-requirements.md`
  - 明确方案 A 的范围裁剪，避免把上传、关注、消息、无限嵌套带回本轮。
- 新增 `docs/review/2026-03-23-mvp5-6-post-feed-closeout-review.md`
  - 作为 `review_qa` 的收口文档。
- 如实现中调整了用户可见流程，再更新 `README.md`
  - 仅记录新的开发运行和验证入口，不写实现细节。

## 16. 推荐的下一步
1. 先补 `docs/tasks/2026-03-23-mvp5-6-post-feed-tasks.md`，把本计划转成任务包。
2. 指派 `backend_implementer` 先冻结共享区和服务端帖子域接口。
3. 共享区冻结后，再并行启动 `apps/web` 与 `apps/admin` 实现。
4. 所有实现完成后，按 `docs/workflows/workflow.md` 进入 `review_qa`。
