# 2026-03-25 Content Closure Phase 1 Plan

## 1. 需求文档路径
- 无仓库内专门需求文档。
- 本轮需求直接来自当前对话中用户确认的大方案。
- 辅助约束文档：
  - `E:/CodeStore/feijia/AGENTS.md`
  - `E:/CodeStore/feijia/docs/workflows/workflow.md`

## 2. 任务文档路径
- 无独立任务文档。
- 当前任务包以本计划文档为唯一执行依据。

## 3. 当前轮次目标
- 打通“内容类型拆分 + 发布入口拆分 + 评论线程简化 + 榜单新域基础设施 + 飞行器投稿基础设施”的第一阶段基础链路。
- 让后续页面实现不再依赖旧的单一 `post` / 树形评论 / 只读榜单聚合结构。
- 在不引入个人中心、设置、消息新工作量的前提下，为首页、飞友圈、四类发布、榜单详情/榜单项详情、飞行器投稿页提供稳定后端契约和前端入口。

## 4. 当前轮次范围

### 4.1 在范围内
- 帖子域扩展为 `article` / `moment`，并支持文章内容分类。
- 评论域改为单层线程返回模型：根评论 + 回复数组 + 回复计数 + `replyToUser` 元信息。
- 新增飞行器投稿基础实体、接口和默认自动通过的状态流。
- 新增榜单实体、榜单项实体、榜单评论、榜单项评分/评论基础接口。
- 顶部 `+` 发布入口、四类发布页面独立路由、评论输入与互动 icon 统一样式基础。
- 首页仅消费文章、飞友圈仅消费动态、榜单总览只读化、飞行器库卡片重排。

### 4.2 不在范围内
- 个人中心、设置、消息的新功能建设。
- 完整后台管理 UI 扩展，仅保留本轮必须的后台可见数据结构与接口。
- 富文本增强能力，如表格、嵌入卡片、复杂 block editor。
- 审核策略切换 UI；本轮只保留“有审核流但默认自动通过”的服务端能力。

## 5. 完成标准
- `article` 与 `moment` 在 schema、API、前端路由和列表消费上明确分流。
- 首页 tab 分类来自后端内容分类接口，不再前端硬编码。
- 评论回复统一归并到根评论线程，默认折叠，具备展开全部回复的数据基础。
- `/publish/article`、`/publish/moment`、`/publish/aircraft`、`/rankings/create` 路由可访问，顶部 `+` 可触达。
- 榜单总览页不再提供直接评分；榜单详情页和榜单项详情页具备独立读取能力。
- 飞行器投稿页可提交，默认自动通过并进入飞行器库数据链路。
- 统一互动样式和单行评论输入在核心消费页落地。
- 至少完成：
  - `bun run --cwd apps/web build`
  - `bun run --cwd apps/server test`
  - `bun run --cwd apps/server build`
  - `bun run --cwd apps/admin build`

## 6. 是否需要先查阅 repo_explorer
- 不需要额外查阅。
- 当前已确认的关键边界足够进入实现：
  - Web 路由入口：`apps/web/src/app.tsx`
  - 顶部/侧边导航：`apps/web/src/features/auth/web-layout.tsx`
  - 现有发布页：`apps/web/src/routes/compose-page.tsx`
  - 首页 / 飞友圈 / 榜单 / 飞行器库 / 详情页：`apps/web/src/routes/*.tsx`
  - 评论组件：`apps/web/src/features/posts/post-comment-thread.tsx`
  - 共享契约：`packages/shared/src/index.ts`、`packages/http-client/src/index.ts`、`packages/schemas/src/*`
  - DB：`packages/db/src/schema.ts`
  - 后端模块：`apps/server/src/modules/posts/*`、`rankings/*`、`reviews/*`、`aircraft-models/*`

## 7. 执行代理分工

### 7.1 backend_implementer
负责所有共享契约与后端域模型改动，包含：
- `packages/db/src/schema.ts`
- `packages/schemas/src/*`
- `packages/shared/src/index.ts`
- `packages/http-client/src/index.ts`
- `apps/server/src/app.ts` 或服务端路由聚合入口
- `apps/server/src/modules/posts/*`
- 新增 `apps/server/src/modules/content-categories/*`
- 新增 `apps/server/src/modules/aircraft-submissions/*`
- 扩展 `apps/server/src/modules/rankings/*`

任务包：
1. **内容与评论基础重构**  
   - 范围：`post type`、文章分类、评论单层线程返回模型  
   - `test_strategy: tdd`
2. **飞行器投稿基础链路**  
   - 范围：submission 实体、默认自动通过、公开列表纳入  
   - `test_strategy: test_after`
3. **榜单新域基础接口**  
   - 范围：ranking / ranking item / ranking comments / ranking item ratings/comments 读取与最小创建  
   - `test_strategy: tdd`

### 7.2 frontend_implementer
只在后端共享契约稳定后消费新接口，负责：
- `apps/web/src/app.tsx`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/routes/home-page.tsx`
- `apps/web/src/routes/circle-page.tsx`
- `apps/web/src/routes/post-detail-page.tsx`
- 新增独立发布页：`publish-article-page.tsx`、`publish-moment-page.tsx`、`publish-aircraft-page.tsx`
- `apps/web/src/routes/rankings-page.tsx`
- 新增 `ranking-detail-page.tsx`
- 新增 `ranking-item-detail-page.tsx`
- `apps/web/src/routes/models-page.tsx`
- `apps/web/src/features/posts/post-comment-thread.tsx`
- 与评论输入、互动条相关的共享前端组件

任务包：
1. **导航与发布入口重构**  
   - 范围：顶部 `+` 下拉、路由拆分、移除暂缓入口  
   - `test_strategy: test_after`
2. **首页 / 飞友圈 / 评论消费重构**  
   - 范围：文章/动态分流、互动 icon 统一、单行评论输入、折叠回复  
   - `test_strategy: test_after`
3. **榜单与飞行器消费页重构**  
   - 范围：榜单总览只读、榜单详情/条目详情、飞行器库卡片重排  
   - `test_strategy: test_after`
4. **三类发布页落地**  
   - 范围：文章富文本发布、动态发布、飞行器投稿发布  
   - `test_strategy: test_after`

## 8. 共享区域改动归属

### 8.1 唯一责任方：backend_implementer
以下区域禁止并行多人修改：
- `packages/db/src/schema.ts`
- `packages/schemas/src/*`
- `packages/shared/src/index.ts`
- `packages/http-client/src/index.ts`
- `apps/server/src/app.ts`
- `apps/server/src/modules/posts/*`
- `apps/server/src/modules/rankings/*`

原因：
- 这些区域同时承载 DB 结构、公共类型、前后端路由常量与 HTTP 契约。
- 一旦并行修改，极易出现 schema 与 client 不一致、APP/API route 常量冲突、测试互相踩踏。

### 8.2 唯一责任方：frontend_implementer
以下区域由前端代理统一收口：
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/app.tsx`
- `apps/web/src/features/posts/post-comment-thread.tsx`
- 发布入口与互动 UI 的共享组件

原因：
- 这些文件影响全站导航、页面入口、评论交互和统一视觉语义。
- 需要由单一前端责任方一次性完成，不允许页面实现代理各自复制逻辑。

## 9. 当前轮次任务顺序与依赖

### 阶段 A：共享后端契约先行
- 责任方：backend_implementer
- 先做内容类型、文章分类、评论简化返回、飞行器投稿 schema、榜单新域 schema/接口。
- 必须先收口共享文件，再交给前端接入。

### 阶段 B：前端壳层与入口并行
- 责任方：frontend_implementer
- 在不依赖新数据字段的前提下，可先并行改：
  - 顶部 `+` 下拉入口
  - 新路由骨架
  - 暂缓模块入口移除
- 不得先行假设新的 API 形状。

### 阶段 C：前端消费页接入
- 责任方：frontend_implementer
- 依赖阶段 A 的接口和类型稳定。
- 接入首页/飞友圈/评论折叠、榜单详情/条目详情、飞行器库重排。

### 阶段 D：发布页闭环
- 责任方：frontend_implementer
- 依赖阶段 A 的创建接口完成。
- 文章、动态、飞行器三个发布页各自独立实现。

### 阶段 E：联调与回归
- 先跑 server test/build，再跑 web/admin build。
- 最后由 `review_qa` 复核：
  - 评论线程行为
  - 榜单只读总览与详情互动边界
  - 首页/飞友圈内容分流
  - 暂缓模块入口是否已移除

## 10. 风险提醒
1. **高风险共享文件集中在 shared/schema/db/http-client**  
   这些文件必须单人改到底，否则很容易出现前后端契约漂移。
2. **评论模型改造会同时影响帖子详情、飞友圈、通知语义**  
   `posts.service.ts`、`post-comment-thread.tsx`、通知页中的 comment preview 都要回看。
3. **榜单项混合模型会改变现有 rankings 语义**  
   不能继续复用“已发布机型聚合榜”作为唯一实现，必须新建榜单域，旧 `rankingsService` 只能部分复用。
4. **飞行器投稿与正式飞行器模型要分开**  
   否则后续审核切换会变成破坏性重构。
5. **文章分类不能复用飞行器分类**  
   两者后台编辑和前台用途完全不同，复用会污染现有飞行器筛选链路。
6. **当前仓库存在若干中文编码异常**  
   实现时只改触达文件，避免顺手做全仓编码清理。

## 11. 实现者交接信息
- 本轮不是做“所有页面视觉精修”，而是做内容闭环第一阶段：先把域模型、入口和可消费页面关系搭稳。
- 评论线程的产品定义已经固定：
  - 回复时显示 `@某人`
  - 回复统一归到根评论下
  - 默认不展开全部回复
- 榜单产品定义已经固定：
  - 榜单总览只读
  - 榜单本身可评论
  - 榜单项独立详情、独立评分、独立评论
  - 榜单项可绑定飞行器，也可为自定义条目
- 飞行器投稿产品定义已经固定：
  - 有审核流
  - 第一版默认自动通过
  - 页面文案与状态结构仍保留“审核”语义

## 12. 推荐的下一步
1. 先派 `backend_implementer` 完成阶段 A，并提交可被前端直接消费的 route/schema/http-client 契约。
2. 同步派 `frontend_implementer` 只做阶段 B 的壳层工作，避免等待。
3. 契约稳定后由 `frontend_implementer` 一次性接入阶段 C、D。
4. 最后执行 `review_qa`，重点检查评论线程折叠、榜单三层结构、内容分流和发布入口行为。
