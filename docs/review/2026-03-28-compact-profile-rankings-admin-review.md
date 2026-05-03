# 紧凑资料页、去评分与 admin 路由修复审查

## 1. 需求文档
- 路径：`docs/requirements/2026-03-28-compact-profile-rankings-admin-requirements.md`

## 2. 任务文档
- 路径：`docs/tasks/2026-03-28-compact-profile-rankings-admin-tasks.md`

## 3. 计划文档
- 路径：`docs/plans/2026-03-28-compact-profile-rankings-admin-plan.md`

## 4. 前端实现文档
- 路径：未提供

## 5. 后端实现文档
- 路径：未提供

## 6. 审查结论
- 不通过

## 7. 需求覆盖情况
- 已覆盖：
  - 个人资料新增头像 / 显示名 / 简介的读写链路，`/users/me/profile` 已接通，web 侧头像与资料入口已接入。
  - 消息、个人中心、设置页整体布局明显收紧，`常驻机场` 已从主要资料编辑入口移除。
  - 飞友圈 / 飞行器库 / 榜单 skeleton 与实际列表布局已开始复用同一组 grid class。
  - 机型评论前端与共享 reviews 契约已改成纯评论模型。
  - 发布飞行器页封面图 / 视频已做互斥，发布文章页补了独立封面上传。
  - admin `/` 与通配路由已补跳转兜底。
- 未覆盖或覆盖不完整：
  - 榜单链路仍未完成“热门 / 最新 + 官方仅标签 + 去评分”的共享契约、后端和测试收敛。
  - 机型评论数据库层仍保留 `rating` 字段和 seed 数据，未完成需求中的“数据模型去评分化”。
  - 面向用户的开发占位解释仍残留在设置页和评论区。

## 8. 计划一致性
- 与计划一致的部分：
  - FE1 / FE2 / FE3 / FE4 / FE6 / FE7 大部分方向已落地。
  - SC1 / BE1 已基本完成。
  - SC2 / BE2 已完成到契约 / 后端 / 前端主链，但 DB2 未做干净。
- 与计划不一致的部分：
  - SC3 / BE3 未按计划落地。当前榜单仍使用 `official/community`、评分、`ratingBreakdown`、`itemRatings` 路由和对应测试基线。
  - DB2 只做了 `DROP NOT NULL`，没有按计划清理评分字段和 seed。
  - `tdd` 任务在当前输入里看不到可核对的 Red -> Green 证据。

## 9. 前后端边界一致性
- 用户资料边界基本一致：`packages/schemas/src/auth.ts`、`packages/schemas/src/social.ts`、`packages/http-client/src/index.ts`、`apps/server/src/modules/social/*` 与 web 侧已接通 `avatarUrl` / `displayName` / `bio`。
- 机型评论边界基本一致：`reviews` 契约和 web 交互已改为纯评论，但数据库仍保留 `rating`，属于边界下层未收口。
- 榜单边界不一致：
  - web 列表页把旧的 `official/community` 响应在前端本地合并成 `hot/latest`。
  - web 条目详情提交评论时仍强行带 `rating: 5`。
  - shared schema、server service、admin client、测试仍以旧评分模型为准。

## 10. 测试覆盖状态
- 用户提供的整体验证结果：
  - `bun run test` 通过
  - `bun run typecheck` 通过
  - `bun run build` 通过
- 审查结论里的测试信号：
  - 机型评论相关测试已更新到无评分模型。
  - 榜单相关测试仍断言 `official/community`、`averageScore`、`ratingBreakdown`、`rating`，说明测试基线仍停留在旧需求。
  - 对 `tdd` 任务，当前输入中缺少明确的 Red -> Green 失败 / 通过证据。

## 11. 问题列表
### 阻塞
- 榜单链路仍是旧契约和旧后端，未满足“热门 / 最新、官方仅标签、榜单条目详情不显示评分星星”的需求主链。
  - 证据：
    - `packages/schemas/src/rankings.ts` 仍定义 `rankingTypeSchema = z.enum(["official", "community"])`、`rankingsResponseSchema = { official, community }`、`averageScore`、`myRating`、`ratingBreakdown`、`submitRankingItemRatingInputSchema`、`submitRankingItemReviewInputSchema.rating`。
    - `apps/server/src/modules/rankings/rankings.service.ts` 仍按 `official/community` 输出，并保留 `averageScore`、`ratingBreakdown`、`submitRankingItemReview(rating)`、`submitRankingItemRating()`。
    - `apps/server/src/modules/rankings/rankings.route.ts` 仍暴露 `itemRatings` 路由。
    - `apps/web/src/routes/rankings-page.tsx` 只是把旧响应在前端本地排序成 `hot/latest`，不是按新契约消费后端结果。
    - `apps/web/src/routes/ranking-item-detail-page.tsx` 提交评论时仍写死 `rating: 5`。
    - `apps/server/tests/rankings.test.ts`、`packages/schemas/tests/rankings.test.ts` 仍断言旧模型。

### 高
- 机型评论数据库层没有真正去评分化，`rating` 只变成可空，seed 仍持续写入评分值，和 DB2 / 需求不一致。
  - 证据：
    - `packages/db/src/schema.ts` 仍保留 `aircraft_reviews.rating`。
    - `packages/db/drizzle/0009_breezy_profile_review_cleanup.sql` 只执行 `ALTER COLUMN "rating" DROP NOT NULL`。
    - `packages/db/src/seed.ts` 仍向 `aircraft_reviews.rating` 写入 `reviewSeeds` 的评分。

### 中
- 开发占位解释仍暴露给用户，未完全满足“删掉开发占位解释”。
  - 证据：
    - `apps/web/src/routes/settings-page.tsx` 仍显示“账号注销仍停留在前端确认流程”“注销仍然只是前端确认”。
    - `apps/web/src/features/auth/profile-settings-state.ts` 仍返回“请在后端能力上线后继续完成”。
    - `apps/web/src/routes/model-detail-page.tsx` 仍显示“提交时会兼容旧接口”。
    - `apps/web/src/routes/user-profile-page.tsx` 仍显示“关注功能后续接入”。

### 低
- admin 评论治理页出现明显文案回归，`作者名 路 评论内容` 是错误文案。
  - 证据：
    - `apps/admin/src/features/reviews/reviews-page.tsx` 第 29 行。

## 12. 必须修复项
- 完成 SC3 / BE3：
  - shared `rankings` schema 改成需求中的“热门 / 最新”语义。
  - server `rankings` 输出、路由、测试同步迁移。
  - 移除榜单条目评分依赖与 `itemRatings` 路由，不能再靠前端 `rating: 5` 兼容。
  - admin 端消费模型和测试基线同步迁移。
- 完成 DB2：
  - 清理 `aircraft_reviews.rating` 字段及其 seed / 迁移策略，而不是仅允许空值。
- 删除面向用户的剩余开发占位 / 技术解释文案，至少先收掉设置页和评论区里的残留。
- 修正 admin 评论治理页的错误文案。

## 13. 优化建议
- 榜单页“热门”排序不要继续在前端用 `commentCount * 4 + itemCount * 2` 的临时公式兜底，应该由后端明确排序语义并输出。
- 为资料持久化补浏览器级回归验证，确认保存后刷新、重新登录、个人中心、顶部菜单、公开资料页完全一致。
- 清理 `rankings` / `reviews` 相关遗留命名，减少“评论已去评分，但类型 / 路由仍叫 rating”的长期混乱。

## 14. 回归建议
- 回归榜单：
  - 榜单列表默认 tab、切换 tab、官方标签显示。
  - 榜单详情与榜单条目详情均不再出现星级、评分、`ratingBreakdown` 派生 UI。
  - 榜单评论 / 条目评论提交后不再向后端写任何评分值。
- 回归机型评论：
  - 新建评论、覆盖评论、评论回复、管理端隐藏 / 恢复。
  - DB migration 后旧数据可读，且不会再生成新的评分数据。
- 回归资料页：
  - 设置页上传头像、改昵称、改简介后刷新和重新登录回显一致。
  - 个人中心、用户菜单、公开资料页、通知头像展示一致。
- 回归发布页与 admin：
  - 飞行器封面图片 / 视频互斥在重选、删除、提交失败后重试场景下仍成立。
  - admin `/` 和未知路径在登录态 / 未登录态下都不会落到默认 404。

## 15. 推荐的下一步
1. 先回到主会话补齐榜单 SC3 / BE3 的需求实现，不要继续维持前端临时兼容。
2. 补做 DB2 真正的 schema / migration / seed 清理。
3. 清理剩余占位文案并修正 admin 评论页文案回归。
4. 重新运行与榜单 / 评论相关的最小测试集，并补充可核对的 TDD Red -> Green 证据。

## 审查文档路径
- `docs/review/2026-03-28-compact-profile-rankings-admin-review.md`
