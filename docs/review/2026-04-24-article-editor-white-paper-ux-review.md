# REVIEW-001 最终评审：文章编辑白纸式写作与详情操作体验

## 1. 需求文档路径

- `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`

## 2. 任务文档路径

- `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`

## 3. 计划文档路径

- `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`

## 4. 前端实现文档路径

- `docs/implementation/2026-04-24-article-editor-white-paper-ux-implementation.md`

## 5. 后端实现文档路径

- `docs/implementation/2026-04-24-article-editor-white-paper-ux-implementation.md`

## 6. 审查结论（通过 / 有条件通过 / 不通过）

**不通过。**

依据：

- 存在阻塞问题：文章详情页作者删除操作没有明确确认或弹层，违反 `TASK-001` 对删除高风险操作的完成标准。
- 关键验证证据不完整：`TASK-010` 要求根级 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build` 与手工验收记录；实现记录只提供 targeted tests、web/admin typecheck 与 `git diff --check`，缺少根级 test/build/lint 证据和手工验收记录。评审补跑后 `lint`、`typecheck`、`build` 通过，但根级 `bun run test` 在 304 秒后超时，仍不能作为通过证据。
- TDD 类任务缺少 Red → Green 证据：`TASK-008`、`TASK-009` 有新增测试和 targeted pass 记录，但没有失败先行记录，需补证据或由编排者确认接受该残余风险。

## 7. 需求覆盖情况

- REQ-G1 白纸式写作：实现移除了旧“写作工作区”、长说明、旧正文预览占位和媒体上限计数；`apps/web/src/routes/publish-article-page.tsx` 使用标题、栏目、封面、正文和右侧发布控制形成更简洁写作流。覆盖结果：**基本满足，但缺手工验收证据**。
- REQ-G2 成熟操作布局：web 发布页保留草稿、封面、栏目、预览、提交；详情页将互动、评论、举报、编辑、删除前置。覆盖结果：**部分失败**，详情删除缺少确认。
- REQ-G3 文章媒体无固定数量上限：`packages/schemas/src/posts.ts` 已移除文章 `videoIds.max(2)` 和官方文章 `imageIds.max(6)` / `videoIds.max(2)`；web 发布页已移除 `ARTICLE_IMAGE_LIMIT`、`ARTICLE_VIDEO_LIMIT` 和旧错误文案。覆盖结果：**满足**。
- REQ-G4 admin parity：admin 官方文章页具备标题、分类、摘要/正文、封面、富文本、图片/视频插入、预览、提交和媒体删除能力。覆盖结果：**基本满足，但缺创建/编辑手工验收证据**。
- REQ-G5 文章详情 UX：操作区已前置到正文之前，评论入口可滚动到评论区。覆盖结果：**失败**，删除操作未保留明确确认。
- REQ-G6 验证：新增 schema/server/web/admin targeted tests。覆盖结果：**不完整**，根级测试超时，缺手工验收与 TDD Red → Green 证据。

## 8. 计划一致性

- 串行关系：实际变更顺序从 diff 无法直接证明，但实现结果符合先共享契约、再 web/admin UI 的计划结构。
- owner 归属：实际变更文件基本落在计划 owner 范围内；`packages/schemas` 与 server tests 属 `backend_implementer`，web 发布/详情属前端 owner，admin editor/helper 属前端 owner。
- `TASK-006`：计划要求确认 admin 官方文章工作台入口/路由所有权；实现记录没有明确说明 active vs legacy entry 状态，仅说明编辑页更新。该项为中风险证据缺口。
- `TASK-010`：计划要求最终针对性测试、手工验收、根级验证并记录；实现记录未满足完整清单。评审补跑后仍缺根级 test 通过证据和手工验收记录。
- `REVIEW-001`：本评审已按需求覆盖、任务/计划一致性、实现、边界与回归风险顺序检查。

## 9. 前后端边界一致性

- 共享契约：`packages/schemas/src/posts.ts` 对文章/官方文章媒体数量放开；moment 的混图视频与单视频规则仍保留；举报证据 `imageIds.max(3)` 仍保留。
- 前端 UI：web 发布页不再做旧固定媒体数量拦截；admin 官方文章页不再显示旧固定数量上限，上传与提交 payload 使用实际媒体 ID 列表。
- 服务端最终规则：业务代码未改 `apps/server/src/modules/posts/posts.service.ts`，现有服务端仍通过归属与可绑定校验控制媒体；新增 server tests 覆盖超过旧上限的文章创建、官方文章更新，以及举报证据上限保持。
- HTTP client：计划要求核对 `packages/http-client/src/index.ts`；本轮没有实际改动。因数量规则来自 schema 且没有发现重复固定上限，暂不构成阻塞。
- 高风险共享区：未发现 DB schema、migration、seed、env、CORS、OpenAPI、upload policy、README、`.env.example` 的实际 diff。

## 10. 测试覆盖状态

上游实现记录提供的证据：

- `bunx vitest run --config ./vitest.config.ts apps/web/tests/ip-location-display-usage.test.ts`：通过，1 file / 5 tests。
- `bunx vitest run --config ./vitest.config.ts apps/web/tests/publish-article-page-deferred-editor.test.ts apps/web/tests/article-editor-white-paper-copy.test.ts apps/web/tests/rich-text-editor-helpers.test.ts apps/admin/tests/official-articles-helpers.test.ts apps/admin/tests/admin-rich-text-editor-helpers.test.ts packages/schemas/tests/posts.test.ts`：通过，6 files / 41 tests。
- `bunx vitest run --config ./vitest.config.ts apps/server/tests/posts.test.ts -t "accepts article creation|accepts admin official article updates|keeps rejecting post reports"`：通过，3 tests，55 skipped。
- `bun run --cwd apps/web typecheck`：通过。
- `bun run --cwd apps/admin typecheck`：通过。
- `git diff --check`：通过，仅既有 CRLF conversion warnings。

评审补跑证据：

- `bun run lint`：通过。
- `bun run typecheck`：通过。
- `bun run build`：通过，有既有 Vite chunk size warning。
- `bun run test`：**超时失败**，304 秒后退出，未形成根级测试通过证据。

缺失证据：

- web 新建文章、web 编辑被驳回文章、多图片、多视频、删除正文媒体、草稿恢复的手工验收记录。
- admin 创建/编辑官方文章、active vs legacy entry 状态、详情页桌面/移动端操作区的手工验收记录。
- TDD 任务 `TASK-008`、`TASK-009` 的 Red → Green 过程证据。

## 11. 问题列表（阻塞 / 高 / 中 / 低）

### 阻塞

1. **[阻塞][TASK-001][frontend_ui_worker] 删除高风险操作缺少确认**
   - 依据：`apps/web/src/routes/post-detail-page.tsx:344` 直接调用 `apiClient.deletePost(item.id)`；同文件仅有“删除”按钮文本，未发现 `confirm`、`AlertDialog`、`Dialog` 或二次确认逻辑。
   - 影响：违反 `TASK-001` 完成标准“删除/举报等高风险操作仍保留明确确认或弹层”，用户可能误删文章。
   - 建议：为删除操作补明确确认弹层或二次确认，不改变 API 与缓存更新语义；补充作者删除确认的单测或手工验证记录。

2. **[阻塞][TASK-010][frontend_test_worker] 根级测试与手工验收关键证据不足**
   - 依据：计划要求记录根级 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`；实现记录未提供 root lint/test/build，评审补跑 `bun run test` 超时。
   - 影响：不能证明本轮对 web/admin/server/schema 的组合改动没有回归；manual_only 任务不能被默认视为通过。
   - 建议：拆分并完成 `bun run test:unit`、`bun run test:server` 或定位根级 test 超时原因；补充 TASK-010 手工验收矩阵，覆盖 web/admin 创建编辑、详情页桌面/移动端和媒体删除。

### 高

1. **[高][TASK-008/TASK-009][backend_implementer] TDD Red → Green 证据缺失**
   - 依据：schema/server 新增测试存在并有 targeted pass，但实现记录没有失败先行的 Red 记录。
   - 影响：不影响当前功能判断，但不满足 TDD 任务审查证据要求。
   - 建议：补交 Red 阶段测试失败输出，或由编排者明确接受“只保留 Green targeted evidence”的风险。

### 中

1. **[中][TASK-006][frontend_state_worker] admin 官方文章入口所有权证据不足**
   - 依据：计划要求确认 active vs legacy entry 状态；实现记录只说明 editor 页面更新，没有列出 admin 导航路径或旧入口状态。
   - 影响：可能存在另一入口未对齐 admin parity。
   - 建议：补充当前可访问入口清单和手工验证路径；如存在 legacy 入口，按计划同步或说明不可达。

2. **[中][TASK-005][frontend_implementer] admin 创建模式超过旧媒体数量的服务端证据不完整**
   - 依据：server targeted test 覆盖“官方文章更新”超过旧上限；创建官方文章超过旧上限只通过共享 `createPostInputSchema` 与 UI payload 间接覆盖。
   - 影响：admin create parity 的端到端证据弱于 update。
   - 建议：补一个 admin create official article 多图片/多视频 targeted test 或手工验收记录。

### 低

1. **[低][TASK-001][frontend_ui_worker] `post-detail-page.tsx` 引入 BOM**
   - 依据：diff 首行显示 `﻿import`，实现记录称已恢复 clean UTF-8 base，但当前 diff 仍有 BOM 表现。
   - 影响：当前 lint/typecheck/build 均通过，风险较低；但可能造成后续 diff 噪音。
   - 建议：后续修复阻塞项时顺手移除 BOM，但不要单独扩大业务改动。

## 12. 必须修复项

1. `frontend_ui_worker`：为 `apps/web/src/routes/post-detail-page.tsx` 作者删除操作增加明确确认或弹层，保留现有 `deletePost`、query invalidation 和跳转语义。
2. `frontend_test_worker`：补充 TASK-010 手工验收记录，至少覆盖 web 新建、web 编辑、admin 创建、admin 编辑、详情页桌面/移动端、多图片、多视频、删除正文媒体、草稿恢复。
3. `frontend_test_worker` / 编排者：解决或拆分根级 `bun run test` 超时，产出可核对的 `test:unit` / `test:server` 或根级 test 通过证据。
4. `backend_implementer`：补充 `TASK-008`、`TASK-009` Red → Green 证据，或由编排者书面确认接受该 TDD 证据缺口。

## 13. 优化建议

- 为详情页删除确认补充测试时，同时覆盖非作者不可见、作者可见、取消不调用 API、确认后调用 API 四类行为。
- admin 官方文章创建模式建议补一个超过旧上限的 server 或集成级验证，避免只覆盖 update。
- 将 TASK-010 的手工验收结果写成可复用 checklist，后续相同 UI 改造可直接复用。
- 若根级 `bun run test` 长期超时，建议将超时原因、最小复现命令和拆分验证策略记录到实现文档或测试交接文档。

## 14. 回归建议

- 媒体契约回归：`packages/schemas/tests/posts.test.ts`，确认文章/官方文章超过旧上限通过，moment 混图视频/多视频失败，report 4 张证据图失败。
- 服务端回归：`apps/server/tests/posts.test.ts` 中超过旧上限文章创建、官方文章更新、举报证据上限三项 targeted tests。
- web 回归：发布文章创建/编辑、多图片、多视频、本地预览统一上传、删除正文媒体、草稿恢复、驳回编辑态。
- 详情页回归：作者/非作者、桌面/移动端、评论滚动、举报弹层、删除确认、点赞/收藏/分享缓存更新。
- admin 回归：官方文章创建/编辑、封面上传/更换、图片/视频插入、媒体删除同步正文、预览、提交态和 active/legacy entry。
- 根级回归：`bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`。

## 15. 追踪矩阵

| requirement_id | task_id | planned_owner | actual_change_files | verification | review_result |
|---|---|---|---|---|---|
| REQ-G1 白纸式写作 | TASK-002 | frontend_implementer | `apps/web/src/routes/publish-article-page.tsx`; `apps/web/src/components/rich-text-editor.tsx`; `apps/web/tests/article-editor-white-paper-copy.test.ts` | Targeted copy test passed; reviewer `lint`/`typecheck`/`build` passed; manual evidence missing | conditional |
| REQ-G1 教学文案清理 | TASK-003 | frontend_implementer | `apps/web/src/routes/publish-article-page.tsx`; `apps/web/src/components/rich-text-editor.tsx`; `apps/web/tests/article-editor-white-paper-copy.test.ts` | Old copy strings absent by source scan and test; manual evidence missing | conditional |
| REQ-G2 成熟发布操作布局 | TASK-002/TASK-004 | frontend_implementer | `apps/web/src/routes/publish-article-page.tsx`; `apps/web/src/routes/publish-article-page-helpers.ts`; `apps/web/tests/publish-article-page-deferred-editor.test.ts` | Helper test passed; reviewer `lint`/`typecheck`/`build` passed; manual evidence missing | conditional |
| REQ-G3 文章媒体无固定上限 | TASK-004 | frontend_implementer | `apps/web/src/routes/publish-article-page.tsx`; `apps/web/src/routes/publish-article-page-helpers.ts`; `apps/web/tests/publish-article-page-deferred-editor.test.ts`; `apps/web/tests/article-editor-white-paper-copy.test.ts` | Targeted web tests passed; source scan未发现旧上限常量/文案 | pass |
| REQ-G3 共享 schema 无旧上限 | TASK-008 | backend_implementer | `packages/schemas/src/posts.ts`; `packages/schemas/tests/posts.test.ts` | Targeted schema tests passed; Red → Green evidence missing | conditional |
| REQ-G3 服务端最终规则 | TASK-009 | backend_implementer | `apps/server/tests/posts.test.ts` | Targeted server tests passed; root `bun run test` timed out; Red → Green evidence missing | conditional |
| REQ-G3 非文章规则保持 | TASK-008/TASK-009 | backend_implementer | `packages/schemas/src/posts.ts`; `packages/schemas/tests/posts.test.ts`; `apps/server/tests/posts.test.ts` | Moment rules still in schema; report `max(3)` still in schema; targeted report test passed | pass |
| REQ-G4 admin parity | TASK-005 | frontend_implementer | `apps/admin/src/features/posts/official-article-editor-page.tsx`; `apps/admin/src/styles.css`; `apps/admin/tests/admin-rich-text-editor-helpers.test.ts`; `apps/admin/tests/official-articles-helpers.test.ts` | Helper tests passed; reviewer `typecheck`/`build` passed; admin create/edit manual evidence missing | conditional |
| REQ-G4 admin entry parity | TASK-006 | frontend_state_worker | `apps/admin/src/features/posts/official-article-editor-page.tsx`; `apps/admin/src/features/posts/official-articles-helpers.ts` | No explicit active vs legacy entry evidence | conditional |
| REQ-G4 helper parity | TASK-007 | frontend_state_worker | `apps/admin/src/components/admin-rich-text-editor-helpers.ts`; `apps/admin/src/features/posts/official-articles-helpers.ts`; `apps/admin/tests/admin-rich-text-editor-helpers.test.ts`; `apps/admin/tests/official-articles-helpers.test.ts` | Helper tests passed; no shared package boundary violation found | pass |
| REQ-G5 详情页操作前置 | TASK-001 | frontend_ui_worker | `apps/web/src/routes/post-detail-page.tsx` | Layout moved before body by source review; no manual desktop/mobile evidence | conditional |
| REQ-G5 删除/举报高风险操作 | TASK-001 | frontend_ui_worker | `apps/web/src/routes/post-detail-page.tsx` | Report keeps sheet; delete directly calls `deletePost` without confirm | fail |
| REQ-G6 最终验证 | TASK-010 | frontend_test_worker | `docs/implementation/2026-04-24-article-editor-white-paper-ux-implementation.md`; tests listed above | Targeted tests pass; reviewer `lint`/`typecheck`/`build` pass; root `bun run test` timed out; manual evidence missing | fail |
| Forbidden scope 不变 | REVIEW-001 | review_qa | No business code written by review; checked diff for `.env.example`, `README.md`, CORS/OpenAPI/upload policy/DB/docker | `git diff` for forbidden paths empty; actual changed files are in planned app/package/test/docs areas | pass |

## 16. 推荐的下一步

1. 打回 `frontend_ui_worker` 修复详情页删除确认阻塞项。
2. 打回 `frontend_test_worker` 补齐 TASK-010 手工验收与根级/拆分测试证据；根级 `bun run test` 当前超时需定位或给出可接受替代验证说明。
3. 要求 `backend_implementer` 补充 `TASK-008`、`TASK-009` Red → Green 证据，或由编排者记录豁免理由。
4. 修复后重新执行 `REVIEW-001`；在阻塞项和关键证据补齐前，不建议进入最终交付。
