# 2026-04-20 推荐流候选窗与分页语义实现

## 本轮目标

- 收紧 `posts` 推荐流的候选窗语义，避免 `recommended` 分页随页码扩窗后出现 `total/hasMore` 与实际可翻页结果不一致。
- 让 repo 侧推荐粗排更接近最终推荐分，减少高分享/高收藏内容在候选池外被截断的情况。

## 实现摘要

- `apps/server/src/modules/posts/posts.service.ts`
  - 新增 `resolveRecommendedCandidateWindow(limit)`，将推荐候选窗改为“只跟 `limit` 相关，不跟 `page` 扩张”。
  - `recommended` 仍先取候选池再走 `rankFeedItemsByRecommendation(...)`，但 `pagination.total` 改为排序后候选池总数，`hasMore` 基于该窗口总数计算。
- `apps/server/src/modules/posts/posts.repo.ts`
  - 将推荐粗排从 `likeCount + commentCount + time` 调整为包含 `favoriteCount`、`shareCount`、`commentCount`、`reportCount` 的加权候选分，再以发布时间和更新时间兜底。
- `apps/server/tests/posts.test.ts`
  - 新增“高分享内容进入推荐候选池”测试。
  - 新增“推荐分页与候选窗一致”测试。

## 结果

- 推荐流分页信息与可见候选池保持一致，深页不会再出现“`hasMore=true` 但下一页为空”的不稳定语义。
- 高分享内容即使 `likeCount` 不占优，也能更稳定地进入推荐候选池，再交给最终推荐分做精排。

## 验证

- `bun x vitest run apps/server/tests/posts.test.ts --maxWorkers 1`
