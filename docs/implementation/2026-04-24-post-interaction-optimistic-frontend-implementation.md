# 帖子互动条乐观更新前端实现说明

## 1. 当前实现目标

在 `apps/web` 的帖子互动条中，将点赞、收藏、关注、分享从“等待接口成功后再更新 UI”改为成熟的乐观更新体验：

- 点击后立即更新按钮状态和计数
- 单个动作请求失败时回滚对应状态并提示错误
- 不再让整条互动栏因为一个请求进入全局阻塞
- 保持现有视觉风格与调用边界

## 2. 输入依据

- 当前任务说明
- 根 `AGENTS.md`、`apps/AGENTS.md`、`apps/web/AGENTS.md`
- `apps/web/src/features/posts/post-interaction-bar.tsx`
- `apps/web/src/features/posts/post-query-cache.ts`

## 3. 工作区模式

- 直接在当前分支工作区修改
- 未回滚或覆盖其他人的现有改动

## 4. 变更文件 / 变更范围

- 修改：`apps/web/src/features/posts/post-interaction-bar.tsx`

## 5. 实现说明

- 将原本单一的 `busyAction` 改为按动作隔离的 `pendingActions`
- 增加 `pendingActionsRef`，在同一渲染帧内也能阻止重复点击导致的并发错乱
- 增加统一的 `runOptimisticAction()`：
  - 先清理错误
  - 先标记该动作为 inflight
  - 立即执行缓存乐观 patch
  - 接口成功后仅做通知缓存失效
  - 接口失败时执行对应 rollback，并通过现有 `Alert` 样式提示错误
- 点赞 / 收藏 / 分享：
  - 直接调用现有 `patchPostInteractionState()`
  - 成功前先把 `viewer` 标志位和计数增量写入 React Query 缓存
  - 失败时用反向 delta 和原始 viewer 状态回滚
- 关注：
  - 直接调用现有 `patchPostAuthorFollowState()`
  - 成功前先更新作者关注态
  - 失败时恢复原始关注态
- 保持请求入口仍然集中在 `apiClient.toggleFollow()` 与 `apiClient.togglePostInteraction()`，未向页面层扩散请求细节

## 6. 测试和验证结果

- `bun run --cwd apps/web lint`
  - 结果：通过
- `bun run --cwd apps/web build`
  - 结果：通过
- `bun run --cwd apps/web typecheck`
  - 结果：未通过
  - 原因：存在仓库内已有的 `apps/web/tests/rich-text-toolbar-config.test.ts` 相关类型错误，与本次互动条改动无关；本次改动引入的 `Promise<void>` 类型问题已修复

## 7. 边界和异常处理

- 未改动详情页 / 圈子详情页路由层，只通过互动条自身的缓存 patch 驱动页面更新
- 每个动作只阻塞自身按钮，不阻塞其它动作
- 匿名用户仍沿用现有登录弹窗逻辑
- 分享占位按钮在未接入分享路径时，仍只展示错误提示，不发请求

## 8. 风险 / 未解决项

- 当前回滚基于点击瞬间的 props 快照；同一动作已通过 inflight guard 防止重复触发，但不处理跨标签页或外部同时修改带来的极端竞争
- `apps/web` 当前存在与本任务无关的测试/类型问题，影响整包 `typecheck` 结果

## 9. 需要后端配合的点

- 无新增后端接口需求
- 依赖现有接口持续保持以下契约：
  - `apiClient.toggleFollow(authorId)`
  - `apiClient.togglePostInteraction(postId, "like" | "favorite" | "share")`

## 10. 推荐的下一步

- 修复 `apps/web/tests/rich-text-toolbar-config.test.ts` 及相关导出漂移，恢复 `apps/web typecheck`
- 由 review/QA 在帖子详情和圈子详情分别做一次点击成功与失败回滚的交互验收
