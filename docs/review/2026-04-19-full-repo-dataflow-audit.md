# 2026-04-19 全仓算法与关键数据流审查

## 审查结论

- 结论：存在明显的规则散落、状态机漂移与排序语义不稳问题
- 说明：仓库中的推荐、搜索、审核、评论、消息流已经形成，但关键规则并没有稳定收敛到单一入口；多个领域都在各自 service 内平行实现审核、通知和状态处理，已经出现真实契约断裂与排序污染。

## 审查方法

- 审查 `posts / rankings / reviews / social / search / aircraft-submissions / brand-applications`
- 对比 schema、DB 约束、type guard 与 service 内本地 union / 分支
- 重点检查排序、审核状态流转、通知副作用和跨类型搜索逻辑

## 已确认问题

### 1. `[P0][审核状态]` 品牌申请状态流存在契约断裂

- 证据：
  - `packages/schemas/src/brand-applications.ts:4`
  - `packages/schemas/src/brand-applications.ts:34`
  - `apps/server/src/modules/brand-applications/brand-applications.service.ts:185`
  - `apps/server/src/modules/brand-applications/brand-applications.route.ts:95`
  - `packages/db/src/schema.ts:185`
- 事实：
  - schema、route、service 一路放开了 `hidden`
  - DB 约束仍只接受 `pending/approved/rejected`
- 影响：
  - 管理员把品牌申请改成 `hidden` 时会直接撞 DB 约束
- 建议：
  - 先统一品牌申请状态枚举，再决定是否需要 `hidden`
- 分类：
  - `confirmed`
  - 下一阶段建议：`must_tdd`

### 2. `[P0][聚合排序]` 榜单条目“评分写入”和“评论写入”被错误绑定

- 证据：
  - `apps/server/src/modules/rankings/rankings.service.ts:1326`
  - `apps/server/src/modules/rankings/rankings.service.ts:1352`
  - `apps/server/src/modules/rankings/rankings.repo.ts:769`
  - `apps/server/src/modules/rankings/rankings.repo.ts:782`
  - `apps/server/src/modules/rankings/ranking-score.ts:33`
  - 对照：`apps/server/src/modules/reviews/reviews.repo.ts:30`
- 事实：
  - 同一用户每次改分、补评、甚至纯评分，都会继续追加评论
  - 排名又把 `commentCount` 当 tie-break
- 影响：
  - 重复评论会反向污染榜单排序
  - 脏数据会越跑越歪
- 建议：
  - 尽快拆分评分和评论写入链路
  - 重算榜单排序对评论计数的依赖
- 分类：
  - `confirmed`
  - 下一阶段建议：`must_tdd`

### 3. `[P0][横切规则]` 审核、评论可见性和通知副作用在多个领域中重复实现

- 证据：
  - `apps/server/src/modules/posts/posts.service.ts:810`, `:887`, `:1024`
  - `apps/server/src/modules/rankings/rankings.service.ts:1117`, `:1553`
  - `apps/server/src/modules/reviews/reviews.service.ts:228`, `:416`, `:549`
  - `apps/server/src/modules/aircraft-models/aircraft-models.service.ts:550`, `:620`
  - 多处直接调用 `siteSettingsService.getResolvedSettings()` 与 `socialService.recordNotification()`
- 影响：
  - 同类审核和消息逻辑不易保持一致
- 建议：
  - 将审核策略和通知触发点做统一策略化
- 分类：
  - `confirmed`
  - 下一阶段建议：`needs_ddd_first`

### 4. `[P1][推荐流]` 推荐排序仍是“候选窗粗排 + 服务层复杂重排”

- 证据：
  - `apps/server/src/modules/posts/posts.repo.ts:23`
  - `apps/server/src/modules/posts/posts.service.ts:287`
  - `apps/server/src/modules/posts/posts.service.ts:333`
  - `apps/server/src/modules/posts/posts.service.ts:350`
  - `apps/server/src/modules/posts/feed-recommendation.ts:76`
  - `apps/server/src/modules/posts/feed-recommendation.ts:99`
  - `apps/server/src/modules/posts/feed-recommendation.ts:136`
- 影响：
  - 真实信号只能在候选窗内生效
  - 分页语义与推荐语义没有完全统一
- 建议：
  - 后续把候选策略、排序策略和分页语义一起重做
- 分类：
  - `confirmed`
  - 下一阶段建议：`must_tdd`

### 5. `[P1][搜索]` 站内搜索先分组截断再跨类型排序，真实匹配信号在后段被弱化

- 证据：
  - `apps/server/src/modules/search/site-search.service.ts:35`
  - `apps/server/src/modules/search/site-search.service.ts:103`
  - `apps/server/src/modules/search/site-search.service.ts:175`
  - `apps/server/src/modules/search/site-search.service.ts:293`
  - `apps/server/src/modules/search/site-search.service.ts:393`
  - `apps/server/src/modules/search/site-search.service.ts:398`
- 影响：
  - 应进全局前 N 的结果可能在分组阶段就被裁掉
  - `total` 语义也不是真实命中量
- 建议：
  - 重做跨类型排序与分组裁剪模型
- 分类：
  - `confirmed`
  - 下一阶段建议：`must_tdd`

### 6. `[P1][投稿域]` 投稿状态机与字段落库存在漂移

- 证据：
  - `packages/schemas/src/aircraft-submissions.ts:28`
  - `apps/server/src/lib/type-guards.ts:158`
  - `packages/db/src/schema.ts:670`
  - `apps/server/src/modules/aircraft-submissions/aircraft-submissions.service.ts:343`
  - `apps/server/src/modules/aircraft-submissions/aircraft-submissions.service.ts:349`
  - `apps/server/src/modules/aircraft-submissions/aircraft-submissions.repo.ts:144`
- 影响：
  - `draft/hidden/lifecycleStatus` 的语义在 schema、service 与 DB 层不一致
  - submission 快照与批准后的 model 容易分叉
- 建议：
  - 将投稿状态机单独收敛
- 分类：
  - `confirmed`
  - 下一阶段建议：`needs_ddd_first`

### 7. `[P1][导航协议]` `admin-search` 把数据流和 UI 路由协议绑死在一起

- 证据：
  - `apps/server/src/modules/search/admin-search.service.ts:49`
  - `apps/server/src/modules/search/admin-search.service.ts:54`
  - `apps/server/src/modules/search/admin-search.service.ts:685-961`
- 影响：
  - 服务端数据结果和管理端路由结构形成强耦合
- 建议：
  - 将 admin 搜索的“结果构建”和“页面落点投影”拆开
- 分类：
  - `confirmed`
  - 下一阶段建议：`plan_patch_required`

## 仅记录 / 待补证据问题

- `inferred`：`social.service.ts` 已接近社交领域总线，是否按子域拆分还需要结合更多调用统计进一步确认。

## 建议方向

- 优先修状态机断裂和会制造脏数据的链路。
- 横切规则先策略化，再做算法细化。
- 推荐、搜索、审核三类链路都适合在下一阶段按 TDD 进入实现。
