# 2026-04-22 推荐流水合优化复盘

## 本轮结论
- 推荐流现在会先完成排序与分页，再只对当前页实际返回的 item 做媒体/cover URL 水合。
- API 输出结构未变。
- 推荐多样性、深页分页与完整测试链路均保持通过。

## 优化前问题
- `recommended` feed 在 `postsService.listFeed` 中，会先把整批候选集做图片、视频、cover URL 水合，再进行排序和分页。
- 这意味着：
  - 深页推荐会对大量不会返回给当前请求的候选项做无效媒体解析
  - 对象存储 URL 解析与缓存压力被放大

## 落地改动
- [apps/server/src/modules/posts/posts.service.ts](E:/CodeStore/feijia/apps/server/src/modules/posts/posts.service.ts)
  - 先基于轻量候选数据构建 `serializedCandidates`
  - 先完成推荐排序与分页
  - 仅对 `pagedItems` 命中的 postIds 调用：
    - `postsRepo.listPostImages`
    - `postsRepo.listPostVideos`
    - `buildImagesByPostId`
    - `buildVideosByPostId`
    - `buildCoversByPostId`
- 保持 `orderedItems` 最终结构与原先一致，因此不影响前端消费

## 测试
- [apps/server/tests/posts.test.ts](E:/CodeStore/feijia/apps/server/tests/posts.test.ts)
  - 在推荐分页测试中增加 spy 断言
  - 验证第 6 页与第 7 页推荐请求只会水合 10 条当前页结果，而不是整个候选窗口

## 验证
- 通过：`bun run lint`
- 通过：`bun run typecheck`
- 通过：`bun run test`
- 通过：`bun run build`

## 剩余风险
- 这轮只是把“先排后水合”前移到了 service 层，repo 仍然会把推荐候选整批拉回内存。
- 下一阶段如果继续压缩推荐成本，最有价值的是把更多候选过滤/粗排前移到 repo / SQL 层。
