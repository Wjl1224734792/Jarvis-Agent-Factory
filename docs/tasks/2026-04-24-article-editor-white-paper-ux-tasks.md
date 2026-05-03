# 文章编辑白纸式写作与详情操作体验任务文档

## 1. 需求文档路径

- 上游需求文档：`docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- 本任务文档：`docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- 任务设计边界：仅拆分任务，不选择执行轮次，不编写业务代码，不提交业务实现。
- 读取说明：当前工作区中的上游需求文档正文大量为 `?` 字节，仅保留部分路径、`schema / server`、`imageIds`、`videoIds`、`.max()` 等可读线索；本文档以用户本轮明确目标与可读路径为任务依据。若主会话持有更完整需求，planner 执行前应先用可读需求替换或确认本文档范围。

## 2. 任务概览

本轮围绕文章详情页操作体验、用户端文章发布/编辑页和 admin 官方文章创建/编辑页进行一致性改造。目标是让用户端文章发布/编辑回归“白纸式写作”，移除解释性文案和教学式占位；图片和视频数量不再由前端固定上限控制；admin 官方文章编辑能力与用户端对齐；必要时同步评估 `packages/schemas`、`packages/http-client`、`apps/server` 中对 `imageIds` / `videoIds` 的数量校验。

涉及模块边界：

- 用户端文章详情：`apps/web/src/routes/post-detail-page.tsx`、`apps/web/src/features/posts/post-interaction-bar.tsx`
- 用户端文章发布/编辑：`apps/web/src/routes/publish-article-page.tsx`、`apps/web/src/routes/publish-article-page-helpers.ts`
- 用户端富文本编辑器：`apps/web/src/components/rich-text-editor.tsx`、`apps/web/src/components/rich-text-editor-helpers.ts`
- admin 官方文章编辑：`apps/admin/src/features/posts/official-article-editor-page.tsx`
- admin 官方文章工作台兼容入口：`apps/admin/src/features/posts/official-articles-page-content.tsx`、`apps/admin/src/features/posts/official-articles-helpers.ts`
- admin 富文本编辑器与样式：`apps/admin/src/components/admin-rich-text-editor.tsx`、`apps/admin/src/components/admin-rich-text-editor-helpers.ts`、`apps/admin/src/styles.css`
- 共享契约：`packages/schemas/src/posts.ts`、`packages/http-client/src/index.ts`
- 后端 posts 模块：`apps/server/src/modules/posts/posts.route.ts`、`apps/server/src/modules/posts/posts.service.ts`、`apps/server/src/modules/posts/posts.repo.ts`

明确不进入本轮：

- 不新增内容类型，不改鉴权模型，不改 CORS / OpenAPI 默认行为。
- 不恢复或创建 `apps/mobiles`。
- 不做 DB schema / migration，除非 planner 证明媒体数量策略无法在现有结构下满足；如需 DB 变更，应回退主会话确认。
- 不重做全站设计系统，不顺手重构其它发布页。
- 不把应用私有逻辑塞进 `packages/*`；仅抽取跨 `web` / `admin` 都需要的纯函数或契约。

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | DDD 分类 | TDD/test_after/manual_only 分类 | 完成标准 |
|---|---|---|---|---|---|---|
| TASK-001 | 文章详情页操作布局优化 | 前端 | P0 | 不需要 DDD | manual_only + test_after | `post-detail-page.tsx` 中返回、作者关注、点赞、收藏、分享、举报、编辑、删除、评论入口的布局更集中且不遮挡正文；移动端与桌面端均可访问；不改变交互 API 与缓存更新语义；删除/举报等高风险操作仍保留明确确认或弹层。 |
| TASK-002 | 用户端文章编辑回归白纸式写作 | 前端 | P0 | 不需要 DDD | manual_only | `publish-article-page.tsx` 的标题、栏目、封面、正文形成连续写作流；去掉“工作区”“教学说明”“预览会显示在这里”等解释性区块；页面首屏更像空白稿纸，保留必要错误、草稿状态和提交操作。 |
| TASK-003 | 用户端教学式文案与占位清理 | 前端 | P0 | 不需要 DDD | manual_only + test_after | 清理 `publish-article-page.tsx`、`rich-text-editor.tsx` 中教学式 placeholder / description / empty state；占位只表达字段用途或保持空白；不移除必要的无障碍标签、错误提示、登录提示和驳回原因。 |
| TASK-004 | 用户端文章媒体数量前端上限移除 | 前端 | P0 | DDD-lite：媒体策略按内容类型区分 | test_after | 移除用户端文章编辑中的 `ARTICLE_IMAGE_LIMIT` / `ARTICLE_VIDEO_LIMIT` 固定数量拦截、`0/6`、`0/2` 计数文案和“最多插入”错误；保留文件类型、上传失败、删除同步正文、提交时本地预览统一上传等行为；不要影响飞友圈动态的媒体规则。 |
| TASK-005 | admin 官方文章编辑页能力对齐 | 前端 | P0 | 不需要 DDD | manual_only + test_after | `official-article-editor-page.tsx` 具备与用户端文章一致的富文本、图片、视频、封面、预览和删除媒体能力；创建与编辑共用一致体验；移除解释性运营文案；保留 Ant Design 表单校验和提交态。 |
| TASK-006 | admin 官方文章工作台兼容入口同步 | 前端 | P1 | 不需要 DDD | manual_only + test_after | `official-articles-page-content.tsx` 若仍为路由入口或可访问页面，其创建/编辑能力、文案和媒体数量策略与 TASK-005 对齐；若已不应使用，planner 需先确认路由所有权，不得私自删除入口。 |
| TASK-007 | 富文本媒体 helper 对齐与复用评估 | 前端/共享 | P1 | 不需要完整 DDD | test_after | 对齐 `removeMediaReferenceFromHtml`、`removeMediaFromHtml`、媒体插入、纯文本提取等 web/admin 重复逻辑；优先抽取纯函数或统一 helper，避免两端继续复制；覆盖 `source` 标签、`figure[data-video-block]`、裸 `img/video` 删除场景。 |
| TASK-008 | schemas/http-client 媒体数量契约评估 | 共享/测试 | P0 | 需要 DDD：Post 聚合媒体规则 | TDD | 在 `packages/schemas/src/posts.ts` 明确文章与官方文章不再使用固定图片/视频数量 `.max()`；保留 `moment` 不能图视频混用、动态视频最多 1 个、举报证据图上限等非文章规则；`packages/http-client/src/index.ts` 使用更新后的 schema parse，不重复定义数量规则；补齐 `packages/schemas/tests/posts.test.ts`。 |
| TASK-009 | server 文章媒体数量校验一致性 | 后端/测试 | P0 | 需要 DDD：服务端最终媒体规则 | TDD | `apps/server/src/modules/posts/*` 与 schema 的文章媒体数量规则一致；创建/编辑用户文章与 admin 官方文章能接受超过旧前端上限的图片/视频 ID；非法文件归属、动态媒体规则、封面校验仍按现有服务端规则拒绝；补齐 `apps/server/tests/posts.test.ts` 或相邻测试。 |
| TASK-010 | 白纸式编辑回归验证清单 | 测试 | P0 | 不需要 DDD | test_after + manual_only | 覆盖用户端发布新文章、编辑被驳回文章、上传多张图片、上传多个视频、删除正文媒体、草稿恢复、admin 创建官方文章、admin 编辑官方文章、详情页操作区移动端布局；记录针对性测试命令和手工验收结果。 |

## 4. DDD 分类

| 分类 | 任务 | 判断 |
|---|---|---|
| 需要 DDD | TASK-008、TASK-009 | `Post` 的媒体数量规则影响 schema、http-client、server service、admin 官方文章和用户文章的一致性；需要明确聚合边界、内容类型差异、服务端最终校验职责。 |
| DDD-lite | TASK-004 | 前端不再固定限制文章媒体数量，但仍要尊重服务端按内容类型定义的媒体策略；需避免误伤飞友圈动态规则。 |
| 不需要 DDD | TASK-001、TASK-002、TASK-003、TASK-005、TASK-006、TASK-007、TASK-010 | 主要是 UI 布局、文案、helper 复用和验证清单，不包含复杂业务状态转换或跨对象一致性规则。 |

## 5. TDD、test_after 与直接开发分类

### TDD 必须

- TASK-008：先写 schema 测试，证明文章/官方文章允许超过旧 `6` 图、`2` 视频，同时动态与举报规则不变。
- TASK-009：先写 server 行为测试，证明服务端最终规则与 schema 一致，尤其是创建、编辑、官方文章入口和旧上限回归。

### test_after

- TASK-004：实现后跑用户端相关 helper / 页面测试；重点验证提交 payload、删除媒体同步正文、无旧上限错误文案。
- TASK-005、TASK-006：实现后跑 admin 相关测试；若缺少页面级自动化测试，至少补充 helper 级测试并做手工验收。
- TASK-007：实现后跑 `apps/web/tests/rich-text-editor-helpers.test.ts` 和 admin 相邻 helper 测试；若抽取共享纯函数，新增共享测试。
- TASK-010：作为最终回归任务，执行针对性测试后再执行根级验证命令。

### manual_only / 可直接开发

- TASK-001、TASK-002、TASK-003：以布局和文案为主，可直接开发，但必须提供桌面端、移动端、空内容、已有内容、错误态的手工验收记录。
- TASK-005、TASK-006 中的视觉与文案部分可直接开发；涉及媒体数量和 helper 行为时回到 test_after 或 TDD 分类。

## 6. 风险任务

| 任务 ID | 风险 | 处理要求 |
|---|---|---|
| TASK-004 | 前端移除上限后，若 schema/server 仍限制数量，用户会在提交时失败 | 必须与 TASK-008、TASK-009 串行或同轮联动；禁止只改前端文案。 |
| TASK-006 | admin 可能存在新旧两个官方文章入口，单改一个会造成能力不一致 | planner 必须先确认当前路由所有权；若两个入口都可访问，应都对齐。 |
| TASK-007 | helper 抽取可能破坏 web/admin 构建边界 | 仅抽取纯函数到合适共享位置；禁止 `packages/*` 依赖 `apps/*`，禁止把应用私有 UI 逻辑塞进共享包。 |
| TASK-008 | 误删 `.max()` 可能放开飞友圈动态或举报证据图限制 | 只调整文章和官方文章契约；动态、举报、机型图库等其它数量规则必须保持现状并由测试锁定。 |
| TASK-009 | 服务端媒体校验涉及文件归属、附件绑定和封面逻辑 | 不得绕过 `postsRepo.listOwnedUnattachedImages/Videos`、`listOwnedAttachableImages/Videos` 等归属校验；只改数量策略。 |
| TASK-010 | 白纸式 UI 容易因只看单端而遗漏 admin 或编辑态 | 验收矩阵必须覆盖 web 创建、web 编辑、admin 创建、admin 编辑、详情页操作区和移动端。 |

## 7. 文件所有权和共享路径提醒

- `apps/web/src/routes/publish-article-page.tsx` 是用户端文章发布/编辑页面所有者；只改文章页，不顺手改 `publish-moment-page.tsx`、`publish-aircraft-page.tsx` 等其它发布页。
- `apps/web/src/components/rich-text-editor.tsx` 可能影响所有使用用户端富文本编辑器的页面；改 placeholder、工具栏、媒体上传时必须确认调用方。
- `apps/web/src/routes/post-detail-page.tsx` 与 `apps/web/src/features/posts/post-interaction-bar.tsx` 共同承载详情操作；避免重复放置同一操作导致计数和乐观更新不一致。
- `apps/admin/src/features/posts/official-article-editor-page.tsx` 与 `apps/admin/src/features/posts/official-articles-page-content.tsx` 存在共享能力风险；同轮并行修改时需要文件锁定，避免两端实现漂移。
- `apps/admin/src/styles.css` 是 admin 全局样式文件；编辑 `admin-editor__content`、`admin-article-preview`、`admin-split--wide` 时必须检查其它 admin 页面是否复用同类 class。
- `packages/schemas/src/posts.ts` 是请求/响应契约源头；改文章媒体数量后必须同步核对 `packages/http-client/src/index.ts` 和受影响 app，不得在 `apps/*` 重复定义契约规则。
- `apps/server/src/modules/posts/posts.service.ts` 是服务端最终业务规则位置；与 `posts.route.ts`、`posts.repo.ts` 的校验、绑定、序列化路径要一起核对。
- `.env.example`、根 `README.md`、CORS / OpenAPI 默认行为不属于本轮预期修改；若 planner 发现必须修改，需说明原因并回退主会话确认。

共享路径风险：`packages/schemas/src/posts.ts`、`packages/http-client/src/index.ts`、`apps/server/src/modules/posts/posts.service.ts`、`apps/web/src/routes/publish-article-page.tsx`、`apps/admin/src/features/posts/official-article-editor-page.tsx` 是高冲突文件。planner 应串行安排这些文件的写入，或明确每轮任务的文件所有权。

## 8. 推荐交付顺序

1. 执行前确认上游需求可读性：若主会话能提供可读版需求，先替换当前乱码需求文档；否则确认本文档即为 planner 输入。
2. `TASK-008`、`TASK-009`：先用 TDD 锁定文章/官方文章媒体数量契约，避免前端先放开后提交失败。
3. `TASK-004`：移除用户端文章媒体数量前端上限，并确保 payload 与服务端契约一致。
4. `TASK-002`、`TASK-003`：收敛用户端白纸式写作布局和文案，保留必要状态提示。
5. `TASK-001`：优化详情页操作区，避免与编辑页改造互相阻塞。
6. `TASK-005`、`TASK-006`：同步 admin 官方文章创建/编辑能力和兼容入口。
7. `TASK-007`：在两端行为稳定后抽取或统一 helper，降低后续漂移风险。
8. `TASK-010`：执行针对性测试、手工验收和根级验证。

## 9. 推荐的下一步

- 将本文档交给 `planner`，由 `planner` 选择执行轮次并制定实施计划。
- `planner` 执行前应读取上游需求文档、本任务文档、根 `AGENTS.md`、`apps/AGENTS.md`、进入 `apps/web` / `apps/admin` / `apps/server` 时对应的 `AGENTS.md`，以及改 `packages/*` 时的 `packages/AGENTS.md`。
- 若执行中发现必须改 DB schema / migration、上传 env、生产 CORS / OpenAPI 默认行为，必须停止并回退主会话澄清。
- 推荐第一轮只处理 P0：`TASK-008`、`TASK-009`、`TASK-004`、`TASK-002`、`TASK-003`；admin 兼容入口和 helper 抽取可放到第二轮，降低共享文件冲突。
- 收尾验证建议：先运行针对性测试，再执行 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`。
