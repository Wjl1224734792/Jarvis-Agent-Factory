# 2026-03-28 机型详情、榜单与个人设置前端实现

## 1. 当前实现目标
- 重做机型详情页、榜单列表/详情/条目详情页的层级与交互，恢复真实评分展示。
- 去掉飞行器库、榜单、消息、个人中心、设置页的大标题/描述，收紧为工作区式布局。
- 将个人中心、设置页改为真实后端资料/设置驱动，移除本地伪数据页面表达。
- 接入机型互动的真实接口：想买、收藏、分享。

## 2. 输入依据
- 用户本轮明确需求。
- 主会话最终确认的实现计划。
- 当前仓库中的新共享契约：
  - `packages/schemas/src/models.ts`
  - `packages/schemas/src/social.ts`
  - `packages/http-client/src/index.ts`

## 3. 工作区模式
- 单仓库工作区。
- 前端改动范围集中在 `apps/web`。
- 与并行后端实现联调，最终以前后端新 contract 为准。

## 4. 变更文件 / 变更范围
- 页面：
  - `apps/web/src/routes/model-detail-page.tsx`
  - `apps/web/src/routes/models-page.tsx`
  - `apps/web/src/routes/notifications-page.tsx`
  - `apps/web/src/routes/ranking-detail-page.tsx`
  - `apps/web/src/routes/ranking-item-detail-page.tsx`
  - `apps/web/src/routes/rankings-page.tsx`
  - `apps/web/src/routes/settings-page.tsx`
  - `apps/web/src/routes/user-profile-page.tsx`
  - `apps/web/src/features/auth/profile-page.tsx`
- 状态与前端工具：
  - `apps/web/src/features/auth/profile-settings-state.ts`
  - `apps/web/src/routes/model-detail-helpers.ts`
  - `apps/web/src/routes/ranking-item-detail-helpers.ts`
- 测试：
  - `apps/web/tests/profile-settings-state.test.ts`
  - `apps/web/tests/model-detail-helpers.test.ts`
  - `apps/web/tests/ranking-item-detail-helpers.test.ts`

## 5. 实现说明
- 机型详情页：
  - 改成稳定双栏。
  - 左侧承载标题、图集、参数、规格、评论。
  - 右侧承载真实互动操作和热门机型列表。
  - 参数缺失统一显示“未公开”，不再落回硬编码默认值。
  - 评论区和回复区改成线性分隔样式，不再使用独立卡片。
- 机型互动：
  - 接入 `apiClient.interactModel`。
  - 支持 `interested / favorite / share` 三类动作。
  - 动作后刷新机型详情和个人内容相关 query。
- 榜单列表：
  - 去掉页头大标题和描述。
  - 榜单卡与条目预览都显示平均分、星级和评分人数。
- 榜单详情：
  - 标题、描述、统计与封面合并进主面板。
  - 完整排行列表恢复评分与星级展示。
- 榜单条目详情：
  - 显示平均分、星级、评分人数、评分分布条形图。
  - 实现单一评分入口：
    - 有文字时走 `submitRankingItemReview`
    - 无文字时走 `submitRankingItemRating`
  - 评论列表按评分评论线性展开。
- 飞行器库与消息页：
  - 移除大标题与描述。
  - 保留筛选、统计、消息流和真实动作。
- 个人中心与设置页：
  - 改为真实资料与设置接口驱动。
  - 个人中心去掉假 focus cards、假统计说明，改为真实内容流、收藏和设置摘要。
  - 设置页只保留真实可保存字段和真实动作，不再展示本地假草稿/假注销/假密码流。
- 公共个人主页：
  - 适配 `favorite-model` 新契约，修复用户内容列表渲染。

## 6. 测试和验证结果
- 已通过：
  - `bun test apps/web/tests/profile-settings-state.test.ts apps/web/tests/model-detail-helpers.test.ts apps/web/tests/ranking-item-detail-helpers.test.ts`
  - `bun run --cwd apps/web typecheck`
  - `bun run --cwd apps/web build`
  - `bun run test`
  - `bun run typecheck`
  - `bun run build`
- 额外说明：
  - 本轮没有做浏览器截图式回归验证。
  - 但 web 全量 typecheck/build 与仓库级 test/typecheck/build 已通过。

## 7. 边界和异常处理
- 机型参数缺失统一渲染为“未公开”。
- 榜单条目评分未选择星级时不提交。
- 未登录状态下的收藏、想买、分享、评分、评论都走登录提示。
- 公共个人主页在 `canViewContent=false` 时显示受限提示，不强行请求内容流。

## 8. 风险 / 未解决项
- 没有做浏览器级手动验收，因此最终视觉细节仍建议在 `/models/:slug`、`/rankings`、`/ranking-items/:id`、`/me`、`/settings` 做一次人工走查。
- 榜单与机型详情页目前都基于已有图片种子与后端数据；若真实生产图片缺失，仍会使用现有 fallback 图逻辑。

## 9. 需要 backend_implementer 配合的点
- 已联到以下新后端能力：
  - `currentUserProfile` 扩展字段
  - `listUserContent` 的 `favorite-model`
  - `getModelDetail` 的互动汇总与 viewer 状态
  - `interactModel`
- 当前前端已按这些 contract 工作；若后端字段名再变，需要同步 `profile-settings-state.ts`、`settings-page.tsx`、`profile-page.tsx`。

## 10. 推荐的下一步
- 用浏览器人工验证以下路径：
  - `/models/:slug`
  - `/rankings`
  - `/rankings/:id`
  - `/ranking-items/:id`
  - `/notifications`
  - `/me`
  - `/settings`
- 对机型详情和榜单详情补充截图式回归用例，减少后续样式回退。
