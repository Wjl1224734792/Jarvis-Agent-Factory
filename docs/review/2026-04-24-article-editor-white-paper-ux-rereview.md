# REVIEW-001 复审：文章编辑白纸式写作与详情操作体验

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

**有条件通过。**

复审结论依据：

- 上次阻塞项“详情页删除缺少确认”已解除：`apps/web/src/routes/post-detail-page.tsx` 的作者删除按钮在调用 `apiClient.deletePost` 前已加入 `window.confirm("删除后无法恢复，确定要删除这篇文章吗？")`，取消确认会直接 `return`。
- 根级 `bun run lint`、`bun run typecheck`、`bun run build` 已在实现文档 Follow-Up 中记录为通过；`bun run test` 已执行但失败点为与本需求无关的 server admin/login 401 / INVALID_CREDENTIALS 套件。
- 本需求相关的 article/schema/server/web/admin targeted tests 已记录为通过，足以支撑本轮需求相关改动进入有条件通过。
- 仍存在残余风险：根级 `bun run test` 未整体通过，TDD Red → Green 证据不完整，且手工验收主要是静态/源码验收而非完整浏览器路径验收。

## 7. 需求覆盖情况

- REQ-G1 白纸式写作：实现记录与测试证据显示 web 发布/编辑页已移除教学式文案、旧媒体计数和旧占位，白纸式写作目标覆盖；复审无新增阻塞。
- REQ-G2 成熟操作布局：发布页和详情页操作入口更集中；详情页删除确认已补齐，原阻塞项解除。
- REQ-G3 文章媒体无固定数量上限：schema、web helper、server targeted tests 均有通过证据；非文章规则保留证据仍有效。
- REQ-G4 admin parity：admin 官方文章编辑能力、helper 行为和入口检查已有 targeted tests / 静态验收记录；未发现新增阻塞。
- REQ-G5 文章详情 UX：详情页操作区前置，评论、举报、编辑、删除入口保留；删除操作现在有明确确认，覆盖结果从 fail 调整为 conditional/pass 边界。
- REQ-G6 验证：目标测试和根级 lint/typecheck/build 已补证；根级 test 失败仍作为高风险残余项记录。

## 8. 计划一致性

- `TASK-001` follow-up 范围聚焦详情页删除确认，符合上次评审打回点，没有扩大到无关 apps/packages 逻辑。
- `TASK-010` 已补充根级验证记录和失败原因说明，满足“已执行并记录”的最低复审要求，但未达到“根级 test 全绿”的理想状态。
- `TASK-008` / `TASK-009` 的 backend/schema Red 输出未保存，计划中的 TDD 证据链仍不完整；因 Green targeted tests 和根级 lint/typecheck/build 已补齐，本复审将其降级为非阻塞风险。
- 未发现 follow-up 需要修改需求、任务或计划的情况；不存在需求级模糊需要回滚主会话澄清。

## 9. 前后端边界一致性

- 共享契约：复审未发现新的 `packages/schemas`、`packages/http-client` 或共享类型变更；原媒体数量契约变更仍由计划中的 backend owner 覆盖。
- 前端边界：删除确认仅在 `apps/web/src/routes/post-detail-page.tsx` 的用户确认层增加拦截，不改变 `deletePost` API、query invalidation 或路由跳转语义。
- 后端边界：follow-up 未触碰 server 业务代码、DB schema、migration、seed、upload policy、CORS、OpenAPI 或 env。
- admin 边界：实现文档补充 active entry 静态检查；未发现新的 admin/server 契约不一致证据。
- 风险提示：`post-detail-page.tsx` diff 中可见 UTF-8 BOM 标记；当前 lint/typecheck/build 已通过，暂不阻塞，但建议后续格式化或保存时规范化编码。

## 10. 测试覆盖状态

已补充或保留的通过证据：

- `bun run lint`：通过。
- `bun run typecheck`：通过。
- `bun run build`：通过，存在既有 Vite large chunk warning。
- `bun run --cwd apps/web typecheck`：通过。
- `bunx vitest run --config ./vitest.config.ts apps/web/tests/ip-location-display-usage.test.ts apps/web/tests/article-editor-white-paper-copy.test.ts apps/web/tests/publish-article-page-deferred-editor.test.ts apps/web/tests/rich-text-editor-helpers.test.ts`：通过，4 files / 21 tests。
- `bunx vitest run --config ./vitest.config.ts apps/web/tests/publish-article-page-deferred-editor.test.ts apps/web/tests/article-editor-white-paper-copy.test.ts apps/web/tests/rich-text-editor-helpers.test.ts apps/admin/tests/official-articles-helpers.test.ts apps/admin/tests/admin-rich-text-editor-helpers.test.ts packages/schemas/tests/posts.test.ts`：通过，6 files / 41 tests。
- `bunx vitest run --config ./vitest.config.ts apps/server/tests/posts.test.ts -t "accepts article creation|accepts admin official article updates|keeps rejecting post reports"`：通过，3 tests / 55 skipped。

未全绿证据：

- `bun run test`：已执行但失败；失败原因为与本需求无关的 server admin/login 401 / INVALID_CREDENTIALS 套件。该问题不阻塞本轮需求复审，但必须作为高风险回归项单独跟踪。
- TDD Red → Green：state worker 有部分历史 Red 说明；backend/schema Red 输出未保留。复审降级为中风险非阻塞项。
- 手工验收：已有静态/源码验收说明，但缺少完整浏览器端 desktop/mobile 和 admin 创建/编辑路径截图或录屏证据。

## 11. 问题列表（阻塞 / 高 / 中 / 低）

### 阻塞

- 无。上次阻塞项“详情页删除缺少确认”已解除。

### 高

- `bun run test` 未整体通过：虽然失败套件与本需求无关，但根级测试红灯仍代表仓库级回归信号；交付前需由编排者决定单独修复、隔离或记录豁免。

### 中

- TDD Red → Green 证据不完整：backend/schema Red 输出未保留，无法完整证明 `TASK-008` / `TASK-009` 严格按 TDD 闭环执行。
- 手工验收证据不足：当前主要是静态/源码验收记录，缺少真实浏览器操作路径对 web detail、web editor、admin official editor 的完整覆盖。

### 低

- `apps/web/src/routes/post-detail-page.tsx` diff 显示 BOM 标记；当前验证通过，不影响本轮结论，但建议后续规范化编码以降低跨平台 diff 噪音。

## 12. 必须修复项

- 本轮复审无必须修复项。
- 若编排者要求最终交付必须根级 `bun run test` 全绿，则需要先修复或隔离 server admin/login 401 / INVALID_CREDENTIALS 套件后再转为“通过”。

## 13. 优化建议

- 为详情页删除确认补一条轻量单元或组件测试，验证取消 `window.confirm` 时不会调用 `deletePost`。
- 补充一次浏览器手工验收记录，覆盖 web 文章详情删除取消/确认、发布页媒体多选、admin 官方文章创建/编辑和移动端详情操作区。
- 后续 TDD 类任务保留 Red 输出日志或在实现文档中记录失败命令、失败断言和 Green 命令，避免审查阶段只能依赖回忆性说明。
- 单独归档根级 `bun run test` 的失败套件 owner、复现命令和处理决策，避免与本需求交付混淆。

## 14. 回归建议

- Web 详情页：作者视角删除取消不触发 API，确认后删除并跳转；非作者视角不显示删除，举报弹层仍可提交证据。
- Web 发布/编辑页：超过旧图片 6 张、视频 2 个的文章 payload 不被前端旧计数或旧错误文案拦截。
- Shared/server：文章/官方文章媒体数量放开，moment 混合媒体和单视频规则、举报证据 3 张上限保持不变。
- Admin：官方文章创建/编辑保留标题、分类、摘要、正文、封面、图片/视频插入、预览、提交和媒体删除能力。
- 根级验证：继续跟踪 `bun run test` 中 admin/login 401 / INVALID_CREDENTIALS 失败，避免长期红灯掩盖真实回归。

## 15. 追踪矩阵

| requirement_id | task_id | planned_owner | actual_change_files | verification | review_result |
|---|---|---|---|---|---|
| REQ-G1 白纸式写作 | TASK-002 | frontend_implementer | `apps/web/src/routes/publish-article-page.tsx`; `apps/web/src/components/rich-text-editor.tsx`; `apps/web/tests/article-editor-white-paper-copy.test.ts` | Web targeted tests passed; root lint/typecheck/build passed; manual evidence partial | conditional |
| REQ-G1 教学文案清理 | TASK-003 | frontend_implementer | `apps/web/src/routes/publish-article-page.tsx`; `apps/web/src/components/rich-text-editor.tsx`; `apps/web/tests/article-editor-white-paper-copy.test.ts` | Old copy targeted coverage passed; static acceptance notes provided | conditional |
| REQ-G2 成熟发布操作布局 | TASK-002/TASK-004 | frontend_implementer | `apps/web/src/routes/publish-article-page.tsx`; `apps/web/src/routes/publish-article-page-helpers.ts`; `apps/web/tests/publish-article-page-deferred-editor.test.ts` | Helper/editor targeted tests passed; root lint/typecheck/build passed | conditional |
| REQ-G3 文章媒体无固定上限 | TASK-004 | frontend_implementer | `apps/web/src/routes/publish-article-page.tsx`; `apps/web/src/routes/publish-article-page-helpers.ts`; `apps/web/tests/publish-article-page-deferred-editor.test.ts`; `apps/web/tests/article-editor-white-paper-copy.test.ts` | Targeted web tests passed; root lint/typecheck/build passed | pass |
| REQ-G3 共享 schema 无旧上限 | TASK-008 | backend_implementer | `packages/schemas/src/posts.ts`; `packages/schemas/tests/posts.test.ts` | Schema targeted tests passed; Red evidence missing | conditional |
| REQ-G3 服务端最终规则 | TASK-009 | backend_implementer | `apps/server/tests/posts.test.ts` | Server targeted article/report tests passed; root test failed in unrelated admin/login suites | conditional |
| REQ-G3 非文章规则保持 | TASK-008/TASK-009 | backend_implementer | `packages/schemas/src/posts.ts`; `packages/schemas/tests/posts.test.ts`; `apps/server/tests/posts.test.ts` | Moment/report constraints retained by targeted tests/static review | pass |
| REQ-G4 admin parity | TASK-005 | frontend_implementer | `apps/admin/src/features/posts/official-article-editor-page.tsx`; `apps/admin/src/styles.css`; `apps/admin/tests/admin-rich-text-editor-helpers.test.ts`; `apps/admin/tests/official-articles-helpers.test.ts` | Admin helper targeted tests passed; manual browser evidence partial | conditional |
| REQ-G4 admin entry parity | TASK-006 | frontend_state_worker | `apps/admin/src/features/posts/official-article-editor-page.tsx`; `apps/admin/src/features/posts/official-articles-helpers.ts`; `apps/admin/src/features/posts/official-articles-page.tsx`; `apps/admin/src/features/posts/official-articles-page-content.tsx` | Follow-up static entry check recorded; no old count copy found | conditional |
| REQ-G4 helper parity | TASK-007 | frontend_state_worker | `apps/admin/src/components/admin-rich-text-editor-helpers.ts`; `apps/admin/src/features/posts/official-articles-helpers.ts`; `apps/admin/tests/admin-rich-text-editor-helpers.test.ts`; `apps/admin/tests/official-articles-helpers.test.ts` | Helper tests passed; partial historical Red evidence only | conditional |
| REQ-G5 详情页操作前置 | TASK-001 | frontend_ui_worker | `apps/web/src/routes/post-detail-page.tsx` | Source review confirms actions before body; web targeted typecheck/tests passed | conditional |
| REQ-G5 删除/举报高风险操作 | TASK-001 | frontend_ui_worker | `apps/web/src/routes/post-detail-page.tsx` | Delete now gates `apiClient.deletePost` behind `window.confirm`; report sheet retained | pass |
| REQ-G6 最终验证 | TASK-010 | frontend_test_worker | `docs/implementation/2026-04-24-article-editor-white-paper-ux-implementation.md` | Root lint/typecheck/build passed; root test executed but unrelated suites failed; targeted tests passed | conditional |
| REVIEW-001 复审输出 | REVIEW-001 | review_qa | `docs/review/2026-04-24-article-editor-white-paper-ux-rereview.md` | Upstream docs and actual diff reviewed; only docs/review written | pass |

## 16. 推荐的下一步

1. 编排者可接受本轮为**有条件通过**，允许进入最终交付说明，但需明确根级 `bun run test` 红灯不是本需求引入且已单独跟踪。
2. 单独派发 server/admin-login 测试修复或隔离任务，目标是恢复根级 `bun run test` 全绿。
3. 若需要从“有条件通过”升级为“通过”，补齐浏览器手工验收证据，并保存 TDD Red → Green 或等价豁免记录。
4. 不建议回滚本轮 follow-up；详情页删除确认修复方向正确，且未改变前后端契约。
