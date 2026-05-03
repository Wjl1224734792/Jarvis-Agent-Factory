# 2026-04-22 推荐流后端性能优化实现

## 1. 当前实现目标
- 在不修改 API 契约与响应结构的前提下，优化 posts 推荐流后端性能。
- 将流程调整为：先使用轻量字段完成推荐排序与分页，再仅对当前页 item 水合媒体与 cover URL。

## 2. 输入依据
- 上游约束：仅实现后端推荐流性能优化，不改前端、不改 packages、不改 DB schema/migrations/env。
- 现状问题：`recommended` 流程会先对候选集全量水合（images/videos/cover URL），再排序分页，深页会产生无效工作。
- 目标限制：保持 API 输出结构不变。

## 3. 工作区模式
- 仓库路径：`E:\CodeStore\feijia`
- 执行模式：并行实现 worker（仅后端子任务）。
- 改动策略：TDD（先加失败断言，再改实现，再回归测试）。

## 4. 变更文件 / 变更范围
- `apps/server/src/modules/posts/posts.service.ts`
  - `postsService.listFeed` 推荐流处理顺序重排。
- `apps/server/tests/posts.test.ts`
  - 增加推荐分页场景断言，验证媒体查询仅针对当前页。
- `docs/implementation/2026-04-22-recommended-feed-backend-implementation.md`
  - 本实现说明文档。

## 5. 实现说明
- 先前逻辑（性能瓶颈）：
  - `recommended` 获取候选集后，直接对候选全集执行：
    - `listPostImages/listPostVideos`
    - `buildImagesByPostId/buildVideosByPostId/buildCoversByPostId`（含 URL 解析）
  - 之后才做 `rankFeedItemsByRecommendation` 与分页切片。
- 新逻辑（本次实现）：
  1. 先取候选集、交互状态、关注关系。
  2. 使用轻量占位媒体（`cover: null`, `images: []`, `videos: []`）序列化候选并完成推荐排序。
  3. 按页切片得到当前页 item。
  4. 仅对当前页 `postIds` 执行 `listPostImages/listPostVideos` 和 `build*ByPostId` 水合。
  5. 用水合结果覆盖当前页 item 的 `cover/images/videos` 字段后返回。
- 结果：避免了深页场景对未返回 item 的媒体 URL 解析和水合开销。

## 6. 测试和验证结果
- TDD 红灯（先失败）：
  - 命令：`bun run --cwd apps/server test -- -t "aligns recommended pagination with the ranked candidate window"`
  - 失败断言：`listPostImages` 入参长度为 `70`，期望 `10`。
- 绿灯验证（实现后）：
  - 命令：`bun run --cwd apps/server test -- -t "aligns recommended pagination with the ranked candidate window"`
  - 结果：通过（1 passed）。
- 推荐流相关回归：
  - 命令：`bun run --cwd apps/server test -- -t "recommended"`
  - 结果：通过（5 passed）。

## 7. 数据与接口边界
- 未修改 API 路由、请求参数、响应结构。
- 未修改 `packages/schemas`、`packages/http-client`、`packages/shared`。
- 未修改数据库 schema/migrations/env。

## 8. 风险 / 未解决项
- 推荐排序中的媒体加权目前在 `listFeed` 路径下改为基于轻量候选（分页前不做媒体水合），可能导致个别边界样本排序细节变化。
- 当前优化重点是消除“分页后未返回数据的媒体水合”浪费；如后续需要进一步提升精度与性能，可评估引入持久化媒体计数字段用于轻量排序。

## 9. 需要前端配合的点
- 无。接口契约与返回结构保持不变。

## 10. 推荐的下一步
1. 在预发环境观察推荐流深页请求的响应耗时与文件 URL 解析次数，确认性能收益。
2. 若需要保持媒体加权精度，可在后续任务评估增加轻量媒体统计字段（非本次范围）。
