# Article Editor White-Paper UX Stage-3 Plan

## 1. 需求文档路径

- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`

## 2. 规划前 Gate B 检查

Gate B 通过，可以进入执行规划。

- 任务 ID 完整：`TASK-001` 至 `TASK-010` 均为 `TASK-XXX` 格式。
- 任务名称完整：每个任务均有明确名称。
- 类型完整：前端、后端/测试、共享/测试、测试均已标注。
- 优先级完整：`P0` / `P1` 均已标注。
- 完成标准完整：任务表每行均有可验收完成标准。
- DDD 分类完整：任务表和 DDD 分类章节均已标注。
- TDD / test_after / manual_only 分类完整：任务表和测试分类章节均已标注。
- 风险任务已标注：`TASK-004`、`TASK-006`、`TASK-007`、`TASK-008`、`TASK-009`、`TASK-010` 已列出风险和处理要求。
- 文件所有权 / 共享路径提醒已写明：任务文档第 7 节已列出关键文件与共享路径风险。

## 3. 当前轮次目标

本轮交付文章编辑、详情和 admin 官方文章编辑的成熟写作产品体验：先解除文章/官方文章媒体数量共享契约和服务端旧上限，再改造 web 白纸式编辑、文章详情操作区、admin 官方文章创建/编辑能力，并以针对性测试、根级验证和 `review_qa` 评审收口。

## 4. 当前轮次范围

### In Scope

- `TASK-008`：移除文章/官方文章 schema 固定媒体数量上限，保留非文章规则。
- `TASK-009`：同步 server posts 模块最终媒体数量校验和测试。
- `TASK-004`：移除 web 文章编辑前端图片/视频数量上限、旧计数文案和旧错误文案。
- `TASK-002`、`TASK-003`：web 文章编辑页回归白纸式写作并清理教学式文案/占位。
- `TASK-001`：优化文章详情页操作布局，不改变交互 API 和缓存语义。
- `TASK-005`：admin 官方文章编辑页与 web 文章编辑核心能力对齐。
- `TASK-006`：确认并同步 admin 官方文章工作台兼容入口。
- `TASK-007`：对齐 web/admin 富文本媒体 helper 行为，必要时由唯一 owner 抽取纯函数。
- `TASK-010`：执行最终验证清单并形成可交接记录。
- `REVIEW-001`：所有有意义变更完成后由 `review_qa` 评审。

### Out of Scope

- 不新增内容类型、协作编辑器、文档系统或编辑器库替换。
- 不改认证、鉴权、审核流、路由前缀、CORS / OpenAPI 默认行为。
- 不改上传大小、MIME、安全策略；`apps/server/src/modules/uploads/upload.policy.ts` 保持不变。
- 不改 DB schema、migration、seed；如实现发现必须修改 DB，停止并回退主会话确认。
- 不恢复或创建 `apps/mobiles`。
- 不顺手重构其它发布页，例如 `publish-moment-page.tsx`、`publish-aircraft-page.tsx`。

## 5. 完成标准

- 文章与官方文章请求 schema 不再包含旧固定图片 `6`、视频 `2` 数量上限。
- Moment 专属规则保持不变：不能图视频混用，视频最多 1 个。
- server 创建/编辑用户文章与 admin 官方文章能接受超过旧上限的媒体 ID，同时仍拒绝非法归属、非法封面、动态媒体违规。
- web 文章编辑页不再显示“工作区”、教学说明、媒体数量 `0/6` / `0/2`、旧“最多插入”错误。
- web 文章编辑页保留必要错误、草稿状态、登录提示、驳回原因和提交操作。
- admin 官方文章创建/编辑页具备标题、分类、摘要/正文、封面、富文本、图片/视频插入、预览、提交与媒体删除能力。
- 文章详情页操作区在桌面端和移动端均可访问，且不遮挡正文；删除/举报仍有确认或弹层。
- 针对性测试通过，并记录根级 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build` 结果。
- `review_qa` 完成需求一致性、共享契约、前后端回归和风险项评审。

## 6. 是否需要先查阅 repo_explorer / docs_researcher

- 不需要先查阅 `repo_explorer`：用户已提供关键本地代码发现，任务文档列出了相关路径，本次只需 implementation agents 在各自执行前按 Execution Packet 读取对应文件。
- 不需要先查阅 `docs_researcher`：本轮不引入新第三方 API，不替换编辑器库，不涉及外部文档决策。
- 条件触发：若 `TASK-006` 执行时无法确认 admin 官方文章入口路由所有权，应停止该任务并回编排者；编排者可单独安排只读 `repo_explorer`。

## 7. 执行代理分工

| 任务 | owner | 分工说明 |
|---|---|---|
| `TASK-008` | `backend_implementer` | 共享 schema / http-client 契约与 schema 测试，作为媒体数量共享契约唯一责任方。 |
| `TASK-009` | `backend_implementer` | server posts 路由/服务/测试，延续同一 owner，确保共享契约和服务端最终规则一致。 |
| `TASK-004` | `frontend_implementer` | web 文章编辑媒体数量前端上限移除，依赖 `TASK-008`、`TASK-009`。 |
| `TASK-002` | `frontend_implementer` | web 文章编辑白纸式写作布局，与 `TASK-003` 同 owner 避免同文件冲突。 |
| `TASK-003` | `frontend_implementer` | web 教学式文案/占位清理，与 `TASK-002` 串行完成。 |
| `TASK-001` | `frontend_ui_worker` | web 文章详情操作布局优化，不触碰发布页。 |
| `TASK-005` | `frontend_implementer` | admin 官方文章编辑页能力对齐。 |
| `TASK-006` | `frontend_state_worker` | admin 官方文章工作台入口/路由所有权确认与同步。 |
| `TASK-007` | `frontend_state_worker` | web/admin 富文本媒体 helper 对齐；如抽取共享纯函数，由该任务唯一负责。 |
| `TASK-010` | `frontend_test_worker` | 最终测试与手工验收清单记录。 |
| `REVIEW-001` | `review_qa` | 实现完成后的独立评审。 |

## 8. 共享区域改动归属

- `packages/schemas/src/posts.ts`：唯一 owner 为 `TASK-008` / `backend_implementer`。
- `packages/schemas/tests/posts.test.ts`：唯一 owner 为 `TASK-008` / `backend_implementer`。
- `packages/http-client/src/index.ts`：唯一 owner 为 `TASK-008` / `backend_implementer`，只做 schema parse / 类型引用核对，不重复定义数量规则。
- `apps/server/src/modules/posts/posts.route.ts`、`apps/server/src/modules/posts/posts.service.ts`、`apps/server/src/modules/posts/posts.repo.ts`：唯一 owner 为 `TASK-009` / `backend_implementer`。
- `apps/server/tests/posts.test.ts`：唯一 owner 为 `TASK-009` / `backend_implementer`。
- `apps/web/src/routes/publish-article-page.tsx`：唯一 owner 为 `TASK-004`、`TASK-002`、`TASK-003` 的同一个 `frontend_implementer`，按序修改。
- `apps/web/src/components/rich-text-editor.tsx`：`TASK-003` 可改文案/占位；`TASK-007` 可改 helper 接入；两者必须串行。
- `apps/web/src/components/rich-text-editor-helpers.ts` 与 admin 对应 helper：唯一 owner 为 `TASK-007` / `frontend_state_worker`。
- `packages/shared/src/index.ts` 或新增 `packages/shared/src/*`：默认禁止修改；只有 `TASK-007` 证明需要抽取跨 web/admin 纯函数时可提交 plan patch，获批后由 `TASK-007` 唯一负责。
- `apps/admin/src/styles.css`：唯一 owner 为 `TASK-005` / `frontend_implementer`，`TASK-006` 不得并行修改。
- `.env.example`、根 `README.md`、CORS / OpenAPI、上传 policy、DB 结构：本轮默认禁止修改；如确需修改，触发 contract change request。

## 9. 并行 / 串行策略

### 严格串行主链

1. `TASK-008` 先完成 schema / http-client 契约和 schema TDD。
2. `TASK-009` 基于 `TASK-008` 完成 server 最终规则和 server TDD。
3. `TASK-004` 基于 `TASK-008`、`TASK-009` 移除 web 前端媒体数量旧上限。
4. `TASK-002` 基于 `TASK-004` 改造 web 白纸式编辑布局。
5. `TASK-003` 基于 `TASK-002` 清理 web 教学式文案/占位。
6. `TASK-005` 基于共享契约完成 admin 官方文章编辑页能力对齐。
7. `TASK-006` 基于 `TASK-005` 确认并同步 admin 工作台入口。
8. `TASK-007` 在 web/admin 行为稳定后对齐 helper，避免抽取时反复冲突。
9. `TASK-010` 最终验证。
10. `REVIEW-001` 最终评审。

### 可并行窗口

- `TASK-001` 可在 `TASK-008` / `TASK-009` 完成后与 `TASK-004` 并行，因为它只触碰文章详情路径，不触碰发布页和共享契约。
- `TASK-005` 可在 `TASK-004` 完成且 `TASK-002` 开始后准备，但不得与 `TASK-006` 并行修改 admin 官方文章入口/样式文件。
- 除上述窗口外，不建议并行，原因是 `publish-article-page.tsx`、admin editor、rich-text helper 和共享契约均是高冲突文件。

## 10. 风险提醒

- 当前工作树已有未提交/未跟踪变更，包括需求文档和任务文档；所有实现代理不得 revert、覆盖或格式化无关既有改动。
- 最大风险是只移除前端上限但 schema/server 仍拒绝超过旧上限；因此 `TASK-008`、`TASK-009` 必须在 `TASK-004` 前完成。
- `.max()` 移除必须只针对文章和官方文章；moment、举报证据、机型图库等非文章数量规则不得放开。
- 后端不得绕过文件归属、可绑定状态、封面校验和现有安全策略。
- 白纸式 UI 清理不得删除错误提示、无障碍标签、登录提示、驳回原因、草稿状态和危险操作确认。
- admin 可能存在多个官方文章入口；未确认路由所有权前不得删除入口。
- helper 抽取不得让 `packages/*` 依赖 `apps/*`，也不得把应用私有 UI 逻辑塞进共享包。

## 11. 实现者交接信息

- 所有实现代理开工前必须输出 Execution Acknowledgement，明确只实现本 packet、不会修改 forbidden_paths、已读取上游文档和本计划。
- 所有实现代理必须读取对应路径下的 `AGENTS.md`：根 L0-L5、`apps/AGENTS.md`、进入 web/admin/server 时对应 app `AGENTS.md`、改 `packages/*` 时 `packages/AGENTS.md`。
- 实现代理只允许修改 Execution Packet 的 `allowed_paths`；发现需要触碰 forbidden_paths 或其它共享区域时停止并回编排者。
- 测试优先级：TDD 任务先写失败测试，再实现；其它任务先做局部验证，再由 `TASK-010` 跑全局验证。
- 所有实现交接给 `review_qa` 时必须列出变更文件、测试命令、手工验收结果、风险和未解决项。

## 12. Execution Packets

## Execution Packet

### task_id
TASK-008

### task_name
schemas/http-client 媒体数量契约评估

### owner
backend_implementer

### objective
用 TDD 明确文章与官方文章不再使用固定图片/视频数量 `.max()`，并保持非文章媒体数量规则不变。

### in_scope
- 在 `packages/schemas/src/posts.ts` 移除文章创建和 admin 官方文章更新的旧图片 `6`、视频 `2` 固定数量上限。
- 保留 moment 不能图视频混用、moment 视频最多 1 个、举报证据图上限等非文章规则。
- 核对 `packages/http-client/src/index.ts` 是否只消费更新后的 schema，不重复定义媒体数量规则。
- 在 `packages/schemas/tests/posts.test.ts` 先补失败测试，再实现通过。

### out_of_scope
- 不修改 server posts 模块业务规则，交给 `TASK-009`。
- 不修改 web/admin 页面或 UI 文案。
- 不修改上传大小、MIME、CORS、OpenAPI、DB、env。
- 不放开 moment、举报、机型图库等非文章数量规则。

### input_documents
- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`

### allowed_paths
- `packages/schemas/src/posts.ts`
- `packages/schemas/tests/posts.test.ts`
- `packages/http-client/src/index.ts`
- `packages/AGENTS.md` only read

### forbidden_paths
- `apps/server/**`
- `apps/web/**`
- `apps/admin/**`
- `packages/db/**`
- `.env.example`
- `README.md`
- `apps/server/src/modules/uploads/upload.policy.ts`

### dependencies
- Root `AGENTS.md` L0-L3 and `packages/AGENTS.md`.
- Existing `Post` / official article schema shape in `packages/schemas/src/posts.ts`.
- Must complete before `TASK-009` and `TASK-004`.

### acceptance_criteria
- Tests prove article create input accepts more than 6 image IDs and more than 2 video IDs.
- Tests prove admin official article update input accepts more than 6 image IDs and more than 2 video IDs.
- Tests prove moment media rules still reject mixed image/video and more than 1 video.
- `packages/http-client/src/index.ts` has no duplicated hard-coded article media count limit.
- No upload policy, DB, env, CORS or OpenAPI behavior changes.

### test_strategy
tdd

### handoff_notes
- Report exact schema fields changed and tests added.
- Tell `TASK-009` whether server already relied solely on schema or has additional service-level count checks.

### escalation_rule
If removing article/official article `.max()` requires changing DB, route prefixes, env, upload policy, or non-article contracts, stop and return a contract change request to the orchestrator.

## Execution Packet

### task_id
TASK-009

### task_name
server 文章媒体数量校验一致性

### owner
backend_implementer

### objective
让 server posts 模块与更新后的文章/官方文章媒体数量契约一致，同时保留归属、封面和非文章规则。

### in_scope
- 检查 `apps/server/src/modules/posts/posts.route.ts` 的 schema 使用和路由校验路径。
- 检查 `apps/server/src/modules/posts/posts.service.ts` 的文章、编辑、官方文章媒体数量和绑定逻辑。
- 必要时检查 `apps/server/src/modules/posts/posts.repo.ts` 的媒体归属/可绑定查询调用，不绕过现有校验。
- 在 `apps/server/tests/posts.test.ts` 或相邻测试中先补失败测试，再实现通过。

### out_of_scope
- 不修改 `packages/schemas/src/posts.ts`，除非 `TASK-008` 未完成且编排者重新分配。
- 不修改 web/admin UI。
- 不修改上传大小、MIME、鉴权、CORS、OpenAPI、DB。
- 不改变 moment 规则、举报规则、文件归属规则、封面合法性规则。

### input_documents
- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`
- upstream result: `TASK-008` implementation handoff

### allowed_paths
- `apps/server/src/modules/posts/posts.route.ts`
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/server/tests/posts.test.ts`
- Adjacent server posts test fixtures if already used by `apps/server/tests/posts.test.ts`

### forbidden_paths
- `packages/schemas/src/posts.ts`
- `packages/http-client/src/index.ts`
- `apps/web/**`
- `apps/admin/**`
- `apps/server/src/modules/uploads/upload.policy.ts`
- `packages/db/**`
- `.env.example`
- `README.md`

### dependencies
- `TASK-008` must be complete.
- Root `AGENTS.md` L0-L3, `apps/AGENTS.md`, `apps/server/AGENTS.md`.
- Existing posts repo ownership checks such as owned unattached/attachable image/video lookups.

### acceptance_criteria
- Server tests prove user article create/edit accepts more than old image/video caps when files are valid and owned.
- Server tests prove admin official article create/edit/update accepts more than old image/video caps where applicable.
- Server tests prove invalid file ownership, invalid cover, and moment media violations are still rejected.
- Service code does not bypass existing repo ownership and attachability checks.
- No upload policy, DB, env, CORS or OpenAPI behavior changes.

### test_strategy
tdd

### handoff_notes
- Tell frontend agents the backend no longer rejects valid article/official article media counts over the old caps.
- List any remaining server-side limits that are not count limits, such as file size, MIME, ownership and cover validity.

### escalation_rule
If server consistency requires DB migration, upload policy changes, route prefix changes, auth changes, or non-article media rule changes, stop and return a contract change request to the orchestrator.

## Execution Packet

### task_id
TASK-004

### task_name
用户端文章媒体数量前端上限移除

### owner
frontend_implementer

### objective
移除 web 文章编辑页旧固定媒体数量前端拦截和旧计数文案，保持上传、删除和提交行为稳定。

### in_scope
- 删除或停用 `apps/web/src/routes/publish-article-page.tsx` 中 `ARTICLE_IMAGE_LIMIT=6` 和 `ARTICLE_VIDEO_LIMIT=2` 的文章数量拦截。
- 移除 `0/6`、`0/2`、`最多插入` 等旧上限 UI/错误文案。
- 保留文件类型、上传失败、删除同步正文、本地预览统一上传、草稿恢复和提交 payload 行为。
- 补充或更新 web 相关 helper/page 测试，证明文章媒体不再受旧前端数量限制。

### out_of_scope
- 不修改 shared schema、http-client 或 server，必须依赖 `TASK-008`、`TASK-009`。
- 不修改 moment 发布页、机型发布页或其它内容类型发布页。
- 不做大规模视觉重排，交给 `TASK-002`。
- 不修改 admin。

### input_documents
- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`
- upstream results: `TASK-008`, `TASK-009`

### allowed_paths
- `apps/web/src/routes/publish-article-page.tsx`
- `apps/web/src/routes/publish-article-page-helpers.ts`
- Existing adjacent web tests for publish article page/helpers
- New web tests under the existing web test convention if adjacent tests are absent

### forbidden_paths
- `packages/schemas/**`
- `packages/http-client/**`
- `apps/server/**`
- `apps/admin/**`
- `apps/web/src/routes/publish-moment-page.tsx`
- `apps/web/src/routes/publish-aircraft-page.tsx`
- `.env.example`
- `README.md`

### dependencies
- `TASK-008` and `TASK-009` must be complete.
- Root `AGENTS.md` L0-L2, `apps/AGENTS.md`, `apps/web/AGENTS.md`.
- Existing upload and media deletion behavior in `publish-article-page.tsx`.

### acceptance_criteria
- UI no longer shows image/video count caps like `0/6` or `0/2` for articles.
- Upload handlers no longer reject valid article images/videos only because count exceeds old caps.
- Old fixed-count error copy is absent.
- Existing local preview upload, media deletion from body HTML, and submit payload behavior still work.
- Moment-specific media rules are not changed.

### test_strategy
test_after

### handoff_notes
- Tell `TASK-002` / `TASK-003` which old media-count UI was removed so layout/copy cleanup does not reintroduce caps.
- Report any remaining non-count limits surfaced to the user.

### escalation_rule
If removing frontend caps requires changing schema/server/http-client or other publish pages, stop and return to the orchestrator; do not directly modify shared contract or unrelated pages.

## Execution Packet

### task_id
TASK-002

### task_name
用户端文章编辑回归白纸式写作

### owner
frontend_implementer

### objective
将 web 文章发布/编辑页改成干净连续的白纸式写作界面，同时保留必要状态和提交控制。

### in_scope
- 调整 `publish-article-page.tsx` 中标题、栏目、封面、摘要/正文、预览、草稿状态和提交区域的信息层级。
- 移除“工作区”、长 intro/guide、媒体列表说明、预览教学块等解释性 UI 区块。
- 保留必要错误提示、草稿状态、登录提示、驳回原因、提交/保存操作。
- 兼顾桌面端和移动端基础布局。

### out_of_scope
- 不修改媒体数量契约或上传策略。
- 不修改 rich text helper 行为，交给 `TASK-007`。
- 不修改 admin 和文章详情页。
- 不引入新编辑器库或新的内容类型。

### input_documents
- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`
- upstream result: `TASK-004`

### allowed_paths
- `apps/web/src/routes/publish-article-page.tsx`
- `apps/web/src/styles.css` only if existing publish/article editor classes require small scoped style adjustment
- Existing adjacent web tests or snapshots for article publish page, if present

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/admin/**`
- `apps/web/src/routes/publish-moment-page.tsx`
- `apps/web/src/routes/publish-aircraft-page.tsx`
- `apps/web/src/components/rich-text-editor-helpers.ts`
- `.env.example`
- `README.md`

### dependencies
- `TASK-004` must be complete to avoid reintroducing old media count UI.
- Root `AGENTS.md` L0-L2, `apps/AGENTS.md`, `apps/web/AGENTS.md`.

### acceptance_criteria
- Page first screen reads as a clean writing surface, not an instructional dashboard.
- Title, category, cover, summary/body, preview/draft status and publish/submit actions are easy to find.
- Removed explanatory blocks do not leave broken layout gaps.
- Necessary validation, auth, rejection and draft state messages remain visible.
- Manual checks cover desktop, mobile, empty draft and existing edit states.

### test_strategy
manual_only

### handoff_notes
- Provide before/after notes for removed explanatory sections.
- Tell `TASK-003` which remaining copy still needs placeholder/description cleanup.

### escalation_rule
If a clean writing surface requires new shared components, new routes, editor-library replacement or changes outside the article publish page, stop and request plan patch.

## Execution Packet

### task_id
TASK-003

### task_name
用户端教学式文案与占位清理

### owner
frontend_implementer

### objective
清理 web 文章编辑相关教学式 placeholder、description 和 empty state，保留必要可访问性与状态文案。

### in_scope
- 清理 `publish-article-page.tsx` 中教学式 placeholder、description、empty state。
- 清理 `rich-text-editor.tsx` 中面向文章编辑的教学式占位或说明。
- 保留字段用途型短占位或空白占位。
- 保留 `aria-label`、错误提示、登录提示、驳回原因和必要帮助文本。
- 更新相关测试，证明旧教学文案和旧媒体上限文案未出现。

### out_of_scope
- 不改富文本媒体 helper 算法，交给 `TASK-007`。
- 不改 admin 富文本编辑器。
- 不移除业务必需状态信息。
- 不改 shared schema/server/http-client。

### input_documents
- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`
- upstream results: `TASK-004`, `TASK-002`

### allowed_paths
- `apps/web/src/routes/publish-article-page.tsx`
- `apps/web/src/components/rich-text-editor.tsx`
- Existing adjacent web tests for publish article page/editor

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/admin/**`
- `apps/web/src/components/rich-text-editor-helpers.ts`
- `apps/web/src/routes/publish-moment-page.tsx`
- `.env.example`
- `README.md`

### dependencies
- `TASK-002` should be complete first.
- Root `AGENTS.md` L0-L2, `apps/AGENTS.md`, `apps/web/AGENTS.md`.

### acceptance_criteria
- Old instructional phrases such as writing workspace, intro/guide, body/media-list descriptions and “preview will show here” are removed or reduced to minimal field-purpose copy.
- No article media cap labels or old fixed-count errors reappear.
- Accessibility labels and necessary validation/status copy remain.
- Tests or documented checks assert key removed copy is absent.

### test_strategy
manual_only + test_after

### handoff_notes
- Provide a list of removed copy strings for `TASK-010` regression checks.
- Note any intentionally retained text and why it is required for accessibility or business state.

### escalation_rule
If copy cleanup requires altering shared editor behavior used by admin or other pages, stop and coordinate with `TASK-007` through orchestrator.

## Execution Packet

### task_id
TASK-001

### task_name
文章详情页操作布局优化

### owner
frontend_ui_worker

### objective
优化 web 文章详情页操作区层级和可用性，不改变现有交互 API、缓存更新和危险操作确认语义。

### in_scope
- 调整 `post-detail-page.tsx` 中返回、作者关注、编辑、删除、举报等操作的位置和层级。
- 必要时调整 `post-interaction-bar.tsx` 中点赞、收藏、分享、评论入口布局。
- 确保桌面端和移动端操作均可访问且不遮挡正文。
- 保留删除/举报确认或弹层。

### out_of_scope
- 不修改文章编辑页。
- 不修改 post API、缓存 key、请求客户端或 server。
- 不改点赞/收藏/评论业务语义。
- 不做全站详情页重设计。

### input_documents
- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`

### allowed_paths
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/features/posts/post-interaction-bar.tsx`
- `apps/web/src/styles.css` only for scoped detail/interaction layout classes if already used there
- Existing adjacent tests for post detail/interaction, if present

### forbidden_paths
- `apps/web/src/routes/publish-article-page.tsx`
- `packages/**`
- `apps/server/**`
- `apps/admin/**`
- `.env.example`
- `README.md`

### dependencies
- Can run after `TASK-008` / `TASK-009`; may run in parallel with `TASK-004` because file ownership does not overlap.
- Root `AGENTS.md` L0-L2, `apps/AGENTS.md`, `apps/web/AGENTS.md`.

### acceptance_criteria
- Back/edit/share/like/favorite/report/delete/comment controls are findable on desktop and mobile.
- Actions do not obscure article content or media.
- Existing API calls and optimistic/cache update behavior are unchanged.
- Delete/report still require explicit confirmation or modal flow.
- Manual checks cover author/non-author, desktop/mobile and comment entry visibility.

### test_strategy
manual_only + test_after

### handoff_notes
- Document whether `post-interaction-bar.tsx` was changed so review can focus on interaction count and optimistic update preservation.
- Provide manual viewport notes for `TASK-010`.

### escalation_rule
If layout optimization requires API/cache changes, route changes, or shared component extraction, stop and request plan patch.

## Execution Packet

### task_id
TASK-005

### task_name
admin 官方文章编辑页能力对齐

### owner
frontend_implementer

### objective
让 admin 官方文章创建/编辑页在核心写作、媒体、封面、预览和提交能力上与 web 文章编辑对齐。

### in_scope
- 更新 `official-article-editor-page.tsx` 的标题、分类、摘要/正文、封面、富文本、图片/视频插入、预览、提交和编辑态体验。
- 更新 `admin-rich-text-editor.tsx` 中与官方文章编辑相关的媒体插入和简洁占位体验。
- 必要时对 `apps/admin/src/styles.css` 中 admin editor/preview 相关 class 做小范围调整。
- 移除解释性运营文案，保留 Ant Design 表单校验、提交态和错误提示。
- 补充或更新 admin 相关 helper/page 测试。

### out_of_scope
- 不修改 web 发布页。
- 不修改 shared schema/server/http-client。
- 不删除 admin 官方文章工作台入口，交给 `TASK-006` 确认。
- 不改上传 policy、鉴权、路由前缀或全局 admin 设计系统。

### input_documents
- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`
- upstream results: `TASK-008`, `TASK-009`, web media/count behavior from `TASK-004`

### allowed_paths
- `apps/admin/src/features/posts/official-article-editor-page.tsx`
- `apps/admin/src/components/admin-rich-text-editor.tsx`
- `apps/admin/src/components/admin-rich-text-editor-helpers.ts` only for local admin editor integration, not cross-app extraction
- `apps/admin/src/styles.css` scoped to official article editor/preview classes
- Existing adjacent admin tests, or new tests under existing admin test convention

### forbidden_paths
- `packages/**`
- `apps/server/**`
- `apps/web/**`
- `apps/admin/src/features/posts/official-articles-page-content.tsx`
- `apps/admin/src/features/posts/official-articles-helpers.ts`
- `.env.example`
- `README.md`

### dependencies
- `TASK-008` and `TASK-009` must be complete.
- Prefer `TASK-004` complete so admin media count copy aligns with web behavior.
- Root `AGENTS.md` L0-L2, `apps/AGENTS.md`, `apps/admin/AGENTS.md`.

### acceptance_criteria
- Admin create and edit flows expose title, category, summary/content, cover, rich text, image/video insertion, preview and submit controls.
- Admin editor no longer shows fixed image/video count caps or explanatory teaching copy.
- Media deletion keeps editor content and payload consistent.
- Ant Design form validation, loading/submitting state and server error handling remain.
- Tests or manual notes cover create mode and edit mode.

### test_strategy
manual_only + test_after

### handoff_notes
- Tell `TASK-006` whether `official-articles-page-content.tsx` still links to this editor or has separate create/edit UI.
- Tell `TASK-007` which helper differences remain between admin and web editors.

### escalation_rule
If admin parity requires shared contract changes, server changes, route ownership deletion, or broad global style redesign, stop and request plan patch.

## Execution Packet

### task_id
TASK-006

### task_name
admin 官方文章工作台兼容入口同步

### owner
frontend_state_worker

### objective
确认 admin 官方文章工作台入口是否仍可访问，并使其创建/编辑入口、文案和媒体数量策略与官方文章编辑页一致。

### in_scope
- 检查 `official-articles-page-content.tsx` 当前是否承担官方文章列表、创建、编辑或跳转入口。
- 检查 `official-articles-helpers.ts` 是否包含与官方文章媒体、摘要、预览、表单 payload 相关的兼容逻辑。
- 若入口仍可访问，更新入口文案、跳转/打开编辑页逻辑和媒体数量展示，保持与 `TASK-005` 对齐。
- 若看起来是旧入口，不删除；记录路由所有权疑问并回编排者确认。

### out_of_scope
- 不删除页面或路由。
- 不修改 `official-article-editor-page.tsx` 的核心编辑能力，除非 `TASK-005` handoff 指明需要小修且编排者同意。
- 不修改 shared schema/server/http-client。
- 不修改 admin 全局样式，除非仅为入口局部 class 且不与 `TASK-005` 冲突。

### input_documents
- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`
- upstream result: `TASK-005`

### allowed_paths
- `apps/admin/src/features/posts/official-articles-page-content.tsx`
- `apps/admin/src/features/posts/official-articles-helpers.ts`
- Existing adjacent admin tests for official articles content/helpers

### forbidden_paths
- `apps/admin/src/features/posts/official-article-editor-page.tsx` unless orchestrator explicitly reassigns a small follow-up
- `apps/admin/src/components/admin-rich-text-editor.tsx`
- `apps/admin/src/styles.css` unless orchestrator explicitly approves a scoped entrance-only style adjustment
- `packages/**`
- `apps/server/**`
- `apps/web/**`
- `.env.example`
- `README.md`

### dependencies
- `TASK-005` must be complete.
- Root `AGENTS.md` L0-L2, `apps/AGENTS.md`, `apps/admin/AGENTS.md`.
- Existing admin routing/imports around official articles page.

### acceptance_criteria
- If the workbench entry is active, it routes or opens create/edit flow with capabilities aligned to `TASK-005`.
- No visible old fixed media cap copy appears in official article workbench flow.
- No route/page is deleted without explicit orchestrator approval.
- Tests or manual notes identify active vs legacy entry status.

### test_strategy
manual_only + test_after

### handoff_notes
- Provide a clear statement: active entry updated, or route ownership unclear and needs orchestrator decision.
- Give `TASK-010` exact admin navigation path(s) to verify.

### escalation_rule
If route ownership is unclear, if deletion seems necessary, or if changes require shared/server contract modification, stop and return to orchestrator.

## Execution Packet

### task_id
TASK-007

### task_name
富文本媒体 helper 对齐与复用评估

### owner
frontend_state_worker

### objective
对齐 web/admin 富文本媒体 helper 在媒体插入、删除和纯文本提取上的行为，并评估是否需要抽取共享纯函数。

### in_scope
- 对比 `apps/web/src/components/rich-text-editor-helpers.ts` 和 `apps/admin/src/components/admin-rich-text-editor-helpers.ts`。
- 对齐 `removeMediaReferenceFromHtml`、`removeMediaFromHtml`、媒体插入、纯文本提取等行为。
- 覆盖 `source` 标签、`figure[data-video-block]`、裸 `img/video` 删除场景。
- 优先用最小改动统一两端 helper；如必须抽取共享纯函数，先提交 plan patch。
- 新增或更新 web/admin helper 测试。

### out_of_scope
- 不修改页面布局和文案。
- 不修改 schema/server/http-client。
- 不修改上传 policy。
- 不把 UI 组件、应用私有逻辑或 DOM 样式约定塞进 `packages/*`。

### input_documents
- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`
- upstream results: `TASK-003`, `TASK-005`, `TASK-006`

### allowed_paths
- `apps/web/src/components/rich-text-editor-helpers.ts`
- `apps/admin/src/components/admin-rich-text-editor-helpers.ts`
- Existing web/admin rich-text helper tests
- New helper tests under existing web/admin test conventions

### forbidden_paths
- `packages/shared/src/index.ts` unless plan patch is approved
- `packages/shared/src/**` unless plan patch is approved
- `packages/schemas/**`
- `packages/http-client/**`
- `apps/server/**`
- `apps/web/src/routes/publish-article-page.tsx` unless orchestrator approves a helper integration follow-up
- `apps/admin/src/features/posts/official-article-editor-page.tsx` unless orchestrator approves a helper integration follow-up
- `.env.example`
- `README.md`

### dependencies
- `TASK-003`, `TASK-005`, `TASK-006` should be complete so helper behavior is aligned to final page needs.
- Root `AGENTS.md` L0-L3, `apps/AGENTS.md`, `apps/web/AGENTS.md`, `apps/admin/AGENTS.md`; `packages/AGENTS.md` only if an approved plan patch allows shared extraction.

### acceptance_criteria
- Web/admin helper behavior is consistent for deleting media references from `source`, `figure[data-video-block]`, bare `img` and bare `video` HTML.
- Tests cover deletion and extraction edge cases listed in the task.
- No package imports from `packages/*` to `apps/*` are introduced.
- If extraction is not performed, handoff explains why local alignment is safer for this round.

### test_strategy
test_after

### handoff_notes
- Report whether shared extraction was unnecessary, deferred, or completed through an approved plan patch.
- Provide exact helper tests run for `TASK-010` and `review_qa`.

### escalation_rule
If true reuse requires adding or changing `packages/shared` exports, changing package build config, or touching page components, stop and request plan patch before editing those paths.

## Execution Packet

### task_id
TASK-010

### task_name
白纸式编辑回归验证清单

### owner
frontend_test_worker

### objective
执行最终针对性测试、手工验收和根级验证，记录本轮是否满足白纸式编辑、媒体无固定数量上限和 admin parity。

### in_scope
- 汇总 `TASK-001` 至 `TASK-007` 的 handoff 和测试结果。
- 执行针对性测试：schema、server posts、web publish/article editor、web rich-text helper、admin official article/helper 相关测试。
- 执行手工验收清单：web 新建文章、编辑被驳回文章、多图片、多视频、删除正文媒体、草稿恢复、admin 创建/编辑官方文章、详情页移动端操作区。
- 执行根级验证：`bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`。
- 产出实现交接记录供 `review_qa` 使用。

### out_of_scope
- 不实现业务修复；发现失败只记录并回编排者分配给对应 owner。
- 不修改 schema/server/web/admin 业务文件。
- 不跳过失败命令并宣称通过。

### input_documents
- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`
- upstream results: all implementation task handoffs

### allowed_paths
- `docs/implementation/**` for validation notes if orchestrator uses implementation records
- Existing test files only if adding non-business regression assertions is explicitly requested by orchestrator

### forbidden_paths
- `packages/schemas/src/posts.ts`
- `packages/http-client/src/index.ts`
- `apps/server/src/modules/posts/**`
- `apps/web/src/routes/**`
- `apps/web/src/components/**`
- `apps/admin/src/features/**`
- `apps/admin/src/components/**`
- `apps/admin/src/styles.css`
- `.env.example`
- `README.md`

### dependencies
- `TASK-001` through `TASK-007` and `TASK-009` complete with handoff notes.
- Root `AGENTS.md` L5.

### acceptance_criteria
- Targeted tests and root validation commands are run and outputs are recorded.
- Manual checklist covers all scenarios named in `TASK-010`.
- Any failures are attributed to owning task/path and not silently fixed outside scope.
- `review_qa` receives a concise validation summary with commands, results and remaining risks.

### test_strategy
test_after + manual_only

### handoff_notes
- Include exact commands run, pass/fail status, and any environment assumptions.
- Include manual verification notes for desktop/mobile and create/edit modes.

### escalation_rule
If validation fails, stop and return failure details to orchestrator; do not modify business code unless a new execution packet is issued.

## Execution Packet

### task_id
REVIEW-001

### task_name
Article editor white-paper UX review

### owner
review_qa

### objective
独立评审本轮实现是否满足需求、计划、共享契约顺序和回归验证要求。

### in_scope
- 对照 requirements、tasks、plan 和所有 implementation handoffs 做需求一致性检查。
- 检查 schema/server/http-client 是否由唯一 owner 串行完成，且前端未绕过共享契约。
- 检查 web 白纸式编辑、详情操作布局、admin 官方文章 parity 和 helper 行为。
- 检查测试证据、根级验证和手工验收记录。

### out_of_scope
- 不编写业务代码。
- 不直接修复问题；发现问题按 owner 和路径输出审查意见。
- 不重新定义需求或扩大范围。

### input_documents
- requirements: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- tasks: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`
- implementation records: all task handoffs and `TASK-010` validation summary

### allowed_paths
- `docs/review/**` for review output if orchestrator requests a review document

### forbidden_paths
- `apps/**`
- `packages/**`
- `.env.example`
- `README.md`
- `docs/requirements/**`
- `docs/tasks/**`

### dependencies
- `TASK-010` complete.

### acceptance_criteria
- Review identifies pass/fail status for every task acceptance criterion.
- Review specifically checks non-article media rules remain unchanged.
- Review checks no forbidden paths or unrelated existing changes were reverted.
- Review outputs actionable findings with severity and owning task/agent.

### test_strategy
manual_only

### handoff_notes
- If review passes, recommend final user-facing handoff.
- If review fails, recommend targeted follow-up packets rather than broad rework.

### escalation_rule
If review discovers requirements ambiguity or necessary contract changes not covered by the plan, stop and return to orchestrator for plan patch or main-session clarification.

## 13. Plan Patch / Contract Change Request 触发条件

- 任何 agent 需要修改未列入自身 `allowed_paths` 的路径。
- 任何 agent 需要修改 `packages/schemas`、`packages/http-client`、`apps/server` 共享契约但不是 `TASK-008` / `TASK-009` owner。
- 任何 agent 发现文章/官方文章无限数量要求需要 DB schema、migration、seed 或 repo 数据结构变更。
- 任何 agent 需要修改上传大小、MIME、安全策略或 `apps/server/src/modules/uploads/upload.policy.ts`。
- 任何 agent 需要修改 `.env.example`、根 `README.md`、CORS / OpenAPI 默认行为或生产文档暴露策略。
- `TASK-006` 无法确认 admin 官方文章入口所有权，或认为应删除旧入口。
- `TASK-007` 需要新增或更改 `packages/shared` public export、package build config 或跨 app 共享 helper。
- 实现中发现任务文档与需求文档冲突，或用户确认范围不足以决定行为。
- 测试发现 moment、举报、机型图库等非文章媒体规则受影响。
- 工作树出现与当前任务无关的既有变更冲突，且无法安全区分当前 diff。

## 14. Gate C Self-Check

Gate C 通过，计划可交给实现阶段。

- 当前轮次目标已写明：见第 3 节。
- 当前轮次范围已写明：见第 4 节。
- 执行代理分工已写明：见第 7 节。
- 共享区域唯一责任方已指定：见第 8 节。
- 每个待执行任务都有 Execution Packet：见第 12 节。
- 每个任务的 `test_strategy` 已指定：见各 Execution Packet。
- 风险提醒已写明：见第 10 节和第 13 节。
- 实现者交接信息已写明：见第 11 节。

## 15. 推荐的下一步

1. 编排者先 spawn `backend_implementer` 执行 `TASK-008`，完成 schema/http-client TDD。
2. 同一 `backend_implementer` 继续执行 `TASK-009`，完成 server posts TDD。
3. spawn `frontend_implementer` 依次执行 `TASK-004`、`TASK-002`、`TASK-003`。
4. 可在 web 发布页任务期间并行 spawn `frontend_ui_worker` 执行 `TASK-001`。
5. spawn `frontend_implementer` 执行 `TASK-005`，随后 spawn `frontend_state_worker` 执行 `TASK-006` 和 `TASK-007`。
6. spawn `frontend_test_worker` 执行 `TASK-010` 验证清单。
7. 最后 spawn `review_qa` 执行 `REVIEW-001`。

