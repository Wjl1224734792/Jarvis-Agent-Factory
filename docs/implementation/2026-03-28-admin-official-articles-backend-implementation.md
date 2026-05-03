# 2026-03-28 Admin Official Articles Backend Implementation

## 1. 当前实现目标
- 为 admin 官方文章补 dedicated API：`detail / update / delete`。
- 保持数据模型不变：官方文章仍然是 `post(type="article", author.role="admin")`。
- 扩展共享契约与 http-client：新增 `getAdminOfficialArticle`、`updateAdminOfficialArticle`、`deleteAdminOfficialArticle`。
- 在后端实现 article-only guard：非 admin 作者 article 不可通过 dedicated API 访问（返回 404）。

## 2. 输入依据
- 需求文档：[2026-03-28-admin-closure-richtext-requirements.md](/E:/CodeStore/feijia/docs/requirements/2026-03-28-admin-closure-richtext-requirements.md)
- 任务文档：[2026-03-28-admin-closure-richtext-tasks.md](/E:/CodeStore/feijia/docs/tasks/2026-03-28-admin-closure-richtext-tasks.md)
- 计划文档：[2026-03-28-admin-closure-richtext-plan.md](/E:/CodeStore/feijia/docs/plans/2026-03-28-admin-closure-richtext-plan.md)

## 3. 工作区模式
- 协作模式：并行协作，按用户确认仅推进后端/共享改动。
- 约束执行：未修改 `apps/admin` / `apps/web` 文件，不回滚他人并发变更。

## 4. 变更文件 / 变更范围
- [packages/shared/src/index.ts](/E:/CodeStore/feijia/packages/shared/src/index.ts)
- [packages/schemas/src/posts.ts](/E:/CodeStore/feijia/packages/schemas/src/posts.ts)
- [packages/http-client/src/index.ts](/E:/CodeStore/feijia/packages/http-client/src/index.ts)
- [packages/http-client/tests/posts.test.ts](/E:/CodeStore/feijia/packages/http-client/tests/posts.test.ts)
- [apps/server/src/modules/posts/posts.repo.ts](/E:/CodeStore/feijia/apps/server/src/modules/posts/posts.repo.ts)
- [apps/server/src/modules/posts/posts.service.ts](/E:/CodeStore/feijia/apps/server/src/modules/posts/posts.service.ts)
- [apps/server/src/modules/posts/posts.route.ts](/E:/CodeStore/feijia/apps/server/src/modules/posts/posts.route.ts)
- [apps/server/tests/posts.test.ts](/E:/CodeStore/feijia/apps/server/tests/posts.test.ts)

## 5. 实现说明
- Shared routes：
  - 新增 `API_ROUTES.posts.adminOfficialDetail(id)`，路径为 `/admin/official-articles/:id`。
- Schemas：
  - 新增 `adminOfficialArticleUpdateInputSchema`，复用 post 字段形状：`title/content/contentHtml/contentCategoryId/imageIds/videoIds`。
- HTTP client：
  - 新增 `getAdminOfficialArticle(id)`（GET）。
  - 新增 `updateAdminOfficialArticle(id, input)`（PUT，使用 `adminOfficialArticleUpdateInputSchema` 校验）。
  - 新增 `deleteAdminOfficialArticle(id)`（DELETE）。
- Server route：
  - 新增 dedicated 路由：
    - `GET /admin/official-articles/:id`
    - `PUT /admin/official-articles/:id`
    - `DELETE /admin/official-articles/:id`
  - 全部挂在 `requireAdmin` 下，且统一返回 schema-validated 响应。
- Server service：
  - 新增 `isOfficialArticlePost` 判定：`type === "article" && author.role === "admin"`。
  - 新增 `getAdminOfficialArticle`：返回 post detail 形状（comments 为空数组，保持兼容）。
  - 新增 `updateAdminOfficialArticle`：校验可附着媒体、更新正文和分类、替换图片/视频关联。
  - 新增 `deleteAdminOfficialArticle`：仅删除符合 official 条件的 post。
- Server repo：
  - 新增 `listOwnedAttachableImages / listOwnedAttachableVideos`：允许使用当前 post 已绑定或未绑定的媒体。
  - 新增 `replacePostImages / replacePostVideos`：更新时执行附件集合替换（解绑移除项，绑定新增项）。
  - 新增 `updateOfficialArticle`：更新 post 字段并调用附件替换逻辑。

## 6. 测试和验证结果
- Red（先失败）：
  - `bun run --cwd apps/server test -- posts.test.ts`
    - 失败点：新加 dedicated API 用例请求 detail 返回 `404`（实现前无该路由）。
  - `bunx vitest run --config E:\\CodeStore\\feijia\\vitest.config.ts packages/http-client/tests/posts.test.ts`
    - 失败点：`client.getAdminOfficialArticle is not a function`（实现前无 client 方法）。
- Green（实现后通过）：
  - `bunx vitest run --config E:\\CodeStore\\feijia\\vitest.config.ts packages/http-client/tests/posts.test.ts` 通过（4/4）。
  - `bunx vitest run --root E:\\CodeStore\\feijia --config E:\\CodeStore\\feijia\\vitest.config.ts E:\\CodeStore\\feijia\\apps\\server\\tests\\posts.test.ts` 通过（13/13）。
  - `bun run --cwd apps/server test` 全量 server tests 通过。
  - `bun run --cwd packages/shared build` 通过。
  - `bun run --cwd packages/schemas build` 通过。
  - `bun run --cwd packages/http-client build` 通过。
  - `bun run --cwd apps/server typecheck` 通过。

## 7. 数据与接口边界
- 未新增数据库表或实体，仅复用 `posts/post_images/video_assets`。
- dedicated API 边界：
  - 可访问对象：仅 `article + admin author`。
  - 不满足条件统一 `404`，避免暴露非官方文章。
- 更新接口仍使用既有 post 字段，不引入独立官方文章数据结构。

## 8. 风险 / 未解决项
- 当前 dedicated API 复用 `postDetailResponseSchema`，返回字段包含 engagement/comments 兼容信息；前端可直接复用 detail 结构，但若后续需更轻量 DTO 可再收敛。
- 媒体替换策略为“集合替换”，依赖前端在更新时传完整目标 `imageIds/videoIds`。

## 9. 需要 frontend_implementer 配合的点
- 在 admin 官方文章页面改为调用 dedicated API：
  - `getAdminOfficialArticle`
  - `updateAdminOfficialArticle`
  - `deleteAdminOfficialArticle`
- 更新保存时传完整 `imageIds/videoIds`，以匹配后端集合替换语义。
- 处理 404：当目标不是官方文章（或已删除）时提示并回退列表。

## 10. 推荐的下一步
1. 前端接入 dedicated API 并完成官方文章 CRUD 页面联调。
2. 联调完成后由主会话运行根级 `bun run test && bun run typecheck && bun run build` 做全仓闭环校验。
3. 提交前使用 `review_qa` 对本次 TDD 的 Red/Green 证据做核对。
