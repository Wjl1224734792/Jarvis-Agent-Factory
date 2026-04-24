# Home/Circle Cursor Feed Frontend Implementation

## 1. 当前实现目标

- 将 `apps/web` 中 `home` 与 `circle` 的 `recommended`、`latest`、`following` 三条 feed 统一为 cursor/infinite 消费语义。
- 让 `latest`、`following` 与现有 `recommended` 一样支持“加载更多”。
- 保持前端缓存补丁对新的 infinite query 数据形状可用，同时在上游类型尚未完全切换时做最小兼容。

## 2. 输入依据

- 用户任务说明：仅修改 `apps/web`，不改 `packages` 或 `server`。
- 上游假设：backend/shared 将三条 feed 统一成 `cursor + limit -> items + nextCursor + hasMore`。
- 现状代码：
  - `apps/web/src/routes/home-page.tsx`
  - `apps/web/src/routes/circle-page.tsx`
  - `apps/web/src/routes/circle-page-feed.tsx`
  - `apps/web/src/features/posts/post-query-cache.ts`
- 现有 `packages/http-client` 已支持 `listHomeFeed` / `listCircleFeed` 的 cursor 入参，但返回类型仍保留旧的 `pagination.hasMore` 过渡结构。

## 3. 工作区模式

- 直接在当前分支工作区实现。
- 未创建额外 worktree。
- 变更范围限制在 `apps/web` 与本次实现文档。

## 4. 变更文件 / 变更范围

- `E:\CodeStore\feijia\apps\web\src\routes\home-page.tsx`
- `E:\CodeStore\feijia\apps\web\src\routes\circle-page.tsx`
- `E:\CodeStore\feijia\apps\web\src\routes\circle-page-feed.tsx`
- `E:\CodeStore\feijia\apps\web\src\features\posts\post-query-cache.ts`
- `E:\CodeStore\feijia\apps\web\src\lib\feed-pagination.ts`
- `E:\CodeStore\feijia\apps\web\tests\post-query-cache.test.ts`
- `E:\CodeStore\feijia\apps\web\tests\feed-pagination.test.ts`

## 5. 实现说明

### Home

- 将首页 feed 查询收敛为单个 `useInfiniteQuery`。
- query key 统一为 `["home-shell-feed", tab, categorySlug|null]`。
- `recommended`、`latest`、`following`、分类推荐全部走同一套 `cursor + limit` 请求。
- 页面只消费 `pages.flatMap(items)`、`hasNextPage`、`fetchNextPage`，不再使用 `page/total` 控制 UI。
- “加载更多”按钮根据当前 tab 展示对应文案。

### Circle

- 将圈子页 feed 查询收敛为单个 `useInfiniteQuery`，覆盖三条 tab。
- `latest`、`following` 与 `recommended` 一样通过 `fetchNextPage` 获取后续数据。
- 列表组件 `CirclePageFeed` 继续只接收扁平化后的 `posts` 和统一的 infinite 状态，不感知旧分页字段。
- refetch footer 在 `fetchNextPage` 时不重复显示，避免与底部按钮同时表现为加载中。

### Cursor 兼容适配

- 新增 `apps/web/src/lib/feed-pagination.ts`。
- 优先读取新契约的顶层 `hasMore`。
- 若上游类型仍处于过渡期，则回退读取 `pagination.hasMore`。
- 该兼容只留在查询层的 `getNextPageParam` 中，页面 UI 不再直接读取旧分页字段。

### 缓存补丁

- `post-query-cache.ts` 明确接受 infinite page 形状，保留 `items` 之外的 `nextCursor`、`hasMore`、`pageParams`。
- `patchPostViewCount`、`patchPostAuthorFollowState` 等补丁继续能批量更新 `home-shell-feed` 与 `circle-feed` 的 infinite cache。

## 6. 测试和验证结果

- `bun vitest run --config ./vitest.config.ts apps/web/tests/post-query-cache.test.ts apps/web/tests/feed-pagination.test.ts`
  - 结果：2 个测试文件通过，4 个测试通过。
- `bun run --cwd apps/web lint`
  - 结果：通过。
- `bun run --cwd apps/web typecheck`
  - 结果：通过。
- `bun run --cwd apps/web build`
  - 结果：通过。

## 7. 边界和异常处理

- 上游若已返回顶层 `hasMore`，前端直接按新契约工作。
- 上游若暂时仍只暴露 `pagination.hasMore`，前端仍可计算 `getNextPageParam`，但兼容读取只保留在查询适配层。
- 若 `nextCursor` 为空或 `hasMore` 为假，前端不会继续暴露“加载更多”。
- 缓存补丁对普通 `{ items }` 数据和 infinite `{ pages, pageParams }` 数据都保持兼容。

## 8. 风险 / 未解决项

- `packages/http-client` / `packages/schemas` 的返回类型仍未完全切到顶层 `hasMore`，因此当前前端保留了过渡性适配。
- `circle-page-feed.tsx` 存在历史编码噪声，本次已在重写文件时收敛到稳定的 ASCII + Unicode escape 形式；后续若仓库统一编码策略，可再做单独整理。

## 9. 需要后端配合的点

- 最终将 `home feed` 与 `circle feed` 的返回类型统一为：
  - `items`
  - `nextCursor`
  - `hasMore`
- 同步移除旧的 `pagination.hasMore` 过渡字段后，前端可以删除 `resolveFeedNextCursor` 中的兼容分支。

## 10. 推荐的下一步

- 上游完成 shared/http-client 类型切换后，删除 `pagination.hasMore` 兼容逻辑并补一轮全量联调。
- 如需进一步稳固行为，可补 `home-page` / `circle-page` 的 query hook 层单测，覆盖 tab 切换和 `fetchNextPage` 场景。
