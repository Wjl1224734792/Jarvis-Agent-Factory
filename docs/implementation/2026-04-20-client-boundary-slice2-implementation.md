# 2026-04-20 共享 Client 边界收口 Slice 2 实现说明

## 本轮目标

- 继续在 Admin 侧收口 `rankings / rating-targets` 的本地业务 client 边界。
- 尽量减少本地业务 DTO 与二次 `fetch` 包装，更多直接复用 `packages/http-client`。

## 已完成

### 1. Admin rankings 读写接口更多直接委托共享 client

- `apps/admin/src/lib/api-client.ts`
  - `listOfficialRankings()` 改为基于 `sharedClient.listAdminRankings()` 过滤 `official`
  - `listCommunityRankingsForModeration()` 改为基于 `sharedClient.listAdminRankings()` 过滤 `community`
  - `getRankingDetail()` 改为直接委托 `sharedClient.getRankingDetail()`
  - `createRanking()` 改为直接委托 `sharedClient.createRanking()`
  - `updateRanking()` 改为直接委托 `sharedClient.updateRanking()`
  - `addRankingItem()` 改为直接委托 `sharedClient.addRatingTarget()`
  - `updateRankingStatus()` 改为直接委托 `sharedClient.updateAdminRankingStatus()`

### 2. Admin 本地 ranking 业务类型开始收缩

- 本地 `AdminRankingRecord` / `AdminRankingDetailRecord` 现在直接基于共享 `RankingListItem` / `RankingDetail`
- `apps/admin/src/features/rankings/rankings-admin-helpers.ts` 不再自定义完整 ranking 业务读模型，而是基于共享 schema 类型做 UI 草稿转换

### 3. legacy 兼容逻辑退出主路径

- 本地 `legacyOfficialDefinitions` / `normalizeOfficialRankings` 不再参与当前业务路径
- 目前仅作为内部未删除的遗留函数存在，不再影响主调用链

## 本轮刻意不做

- 不重写 `rating-targets-page.tsx` 的页面逻辑
- 不处理 `listRatingTargetsForModeration()` 这个当前未被页面消费的本地聚合方法
- 不触碰 `admin messages`，因为其边界已经相对更清晰

## 收口效果

- Admin rankings 主干业务接口已更多依赖共享 client，而不是自己重造业务返回类型和 `fetch`。
- 这一切片进一步验证了“共享业务边界 + app 薄适配层”方案可以渐进迁移，而不需要一次性推翻整个 admin client。

## 仍然存在的边界问题

- `apps/admin/src/lib/api-client.ts` 里仍保留一些本地 ranking/rating-target 聚合与兼容逻辑，尚未完全清空。
- `admin messages` 已较接近目标边界，但还未做系统性盘点。
- `web` 的错误语义映射与 refresh 责任仍未收口。

## 下一步建议

1. 继续收口 `admin messages / moderation todos`
2. 再回到 `web`，把错误语义、refresh 和业务 client 边界切清
3. 完成 client 边界收口主线后，再进入推荐 / 搜索排序重构
