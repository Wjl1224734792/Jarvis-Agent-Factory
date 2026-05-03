# MVP 第5/6迭代帖子与内容流收口复核

## 结论

当前按方案 A 收缩后的范围已完成：

- 独立帖子域
- `/home` 内容流，支持 `recommended` / `latest`
- 纯文本帖子
- 帖子详情
- 评论与单层回复
- 删除自己的帖子/评论
- 举报入口
- 后台帖子/评论基础审核

## 初次阻塞问题

初次 `review_qa` 发现阻塞问题：

- 后台隐藏评论后，帖子聚合 `commentCount` 未同步回收
- 导致详情页与 feed 显示错误评论数
- `recommended` 排序会继续吃到已隐藏评论带来的热度

## 修复动作

- 在 [posts.repo.ts](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/posts/posts.repo.ts) 中新增 `syncPostCommentCount()`
- 在创建评论、删除评论线程、更新评论状态时统一同步帖子聚合评论数
- 在 [posts.test.ts](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/tests/posts.test.ts) 中补充断言：
  - 隐藏评论后详情页 `commentCount = 0`
  - 隐藏评论后 feed 中该帖子 `commentCount = 0`

## 修复后验证

已执行并通过：

- `bunx vitest run --config vitest.config.ts apps/server/tests/posts.test.ts`
- `bun run check`

## 剩余风险

- 当前 `recommended` 仍是最小热度排序，只依赖评论数和发布时间，不包含点赞、收藏、关注等更完整信号
- 举报入口已打通，但后台还没有独立举报处理页，本轮只把举报计数纳入帖子聚合
- 评论层级明确限制为单层回复，符合当前范围，但与 PRD 的无限嵌套版本仍有差距
