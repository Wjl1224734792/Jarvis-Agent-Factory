## 1. 当前实现目标

- 修复 `apps/web` 中机型详情页评论区不可用问题，改为独立纯评论区，接入新的 model comments API。
- 修复榜单条目详情页评论规则，保证顶级评论必须评分、回复不带评分，并支持点赞 / 举报 / 编辑 / 删除。
- 将本轮触及页面的举报入口统一为 `ReportActionSheet`，强制填写理由并至少上传 1 张证据图。

## 2. 输入依据

- 用户最新要求：仅负责 `apps/web/**`，优先保证 `model-detail-page` 与 `ranking-item-detail-page` 可用并通过 `typecheck/build`。
- 已稳定后端契约：
  - model comments API 已提供 `list/create/update/delete/like/report`
  - `uploadReportImage` 已可用
  - 榜单条目评论规则为“顶级评论必填 rating，回复不能带 rating”

## 3. 工作区模式

- 工作区：`danger-full-access`
- 修改范围：仅 `apps/web/**` 与实现文档
- 未修改 `server/shared/http-client/admin`

## 4. 变更文件 / 变更范围

- `apps/web/src/components/report-action-sheet.tsx`
- `apps/web/src/routes/model-comments-section.tsx`
- `apps/web/src/routes/model-detail-page.tsx`
- `apps/web/src/routes/ranking-item-detail-page.tsx`
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/features/posts/post-comment-thread.tsx`
- `docs/implementation/2026-03-30-web-comments-report-frontend-implementation.md`

## 5. 实现说明

- 机型详情页：
  - 评测区保留为独立“评测”模块，不再承担评论区职责。
  - 新增独立 `ModelCommentsSection`，调用 model comments API 完成发布、回复、点赞、举报、编辑、删除。
  - “去评论区”按钮改为滚动到新的纯评论区。
  - 机型举报改为统一 `ReportActionSheet`。

- 榜单条目详情页：
  - 顶级评论发布走 `createRankingItemComment(itemId, { content, rating })`。
  - 回复评论走 `createRankingItemComment(itemId, { content, parentCommentId })`，不再携带评分。
  - 评论列表支持点赞、举报、编辑、删除，回复与顶级评论共用统一交互。
  - 条目举报改为统一 `ReportActionSheet`。

- 举报交互统一：
  - `ReportActionSheet` 统一处理理由输入、证据图片上传、数量上限与提交校验。
  - 本轮同时把帖子详情页与帖子评论线程内的旧举报按钮切到统一弹层，避免继续传旧的 `reason`-only 结构。

## 6. 测试和验证结果

- `bun run --cwd apps/web typecheck` 通过
- `bun run --cwd apps/web build` 通过

## 7. 边界和异常处理

- 举报提交前强制校验：
  - `reason` 非空
  - `imageIds.length >= 1`
  - 最多 3 张证据图
- 未登录状态下，评论、回复、点赞、举报统一走登录提示。
- 机型评论和榜单条目评论的编辑都只修改当前评论内容，不改变评分规则。

## 8. 风险 / 未解决项

- 本轮未扩展到 `apps/web` 全部业务页面，只收口了当前明确涉及的机型、榜单条目、帖子详情与帖子评论举报入口。
- 机型评论 / 榜单条目评论的最终排序与热评规则依赖后端返回顺序，前端未额外重排。

## 9. 需要 backend_implementer 配合的点

- 无新增配合项；当前实现基于已确认稳定的后端契约完成。

## 10. 推荐的下一步

- 手工回归机型详情页与榜单条目详情页的完整评论链路。
- 再做一轮 UI 文案和细节收口，尤其是旧页面中仍存在的乱码文案。
- 如果要进入部署前回归，建议补浏览器级验证脚本覆盖评论与举报主流程。
