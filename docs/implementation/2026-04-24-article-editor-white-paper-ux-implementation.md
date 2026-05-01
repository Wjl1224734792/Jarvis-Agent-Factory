# Article Editor White-Paper UX Implementation Record

## Scope

- Requirement: `docs/requirements/2026-04-24-article-editor-white-paper-ux-requirements.md`
- Task design: `docs/tasks/2026-04-24-article-editor-white-paper-ux-tasks.md`
- Execution plan: `docs/plans/2026-04-24-article-editor-white-paper-ux-plan.md`

## Delivered Changes

### Shared Contracts and Server Tests

- Removed fixed legacy article video count validation from `packages/schemas/src/posts.ts` while preserving non-article media rules.
- Removed fixed legacy admin official article image/video count validation from `packages/schemas/src/posts.ts`.
- Added schema tests in `packages/schemas/tests/posts.test.ts` for article and admin official article payloads above legacy limits.
- Added server tests in `apps/server/tests/posts.test.ts` for article creation, admin official article update, and unchanged report evidence limits.

### Web Article Publishing and Detail UX

- Updated `apps/web/src/routes/publish-article-page.tsx` for a white-paper writing surface, removing fixed media counters and tutorial-like copy.
- Updated `apps/web/src/routes/publish-article-page-helpers.ts` and related tests to keep article media behavior uncapped at the UI validation layer.
- Updated `apps/web/src/components/rich-text-editor.tsx` to support the simplified writing surface.
- Updated `apps/web/src/routes/post-detail-page.tsx` so engagement, comment, report, edit, and delete actions sit before the article body, with the old post-body action strip removed.

### Admin Official Article Editor

- Updated `apps/admin/src/features/posts/official-article-editor-page.tsx` for a compact editor workbench aligned with web article capabilities.
- Updated `apps/admin/src/components/admin-rich-text-editor-helpers.ts` and `apps/admin/src/features/posts/official-articles-helpers.ts` so image, video, source, and `figure[data-video-block]` media removal paths stay consistent.
- Updated `apps/admin/src/styles.css` for the admin editor layout.
- Added/updated admin helper tests in `apps/admin/tests/admin-rich-text-editor-helpers.test.ts` and `apps/admin/tests/official-articles-helpers.test.ts`.

## Explicit Non-Changes

- No database schema, migration, seed, CORS, OpenAPI, upload MIME/size/security policy, or environment variable changes.
- Moment rules remain unchanged: no mixed image/video media and maximum one video.
- Report evidence rules remain unchanged: image evidence is still capped at three.
- `apps/server/src/modules/uploads/upload.policy.ts`, `.env.example`, and root `README.md` were not changed.

## Validation Evidence

- `bunx vitest run --config ./vitest.config.ts apps/web/tests/ip-location-display-usage.test.ts` passed: 1 file / 5 tests.
- `bunx vitest run --config ./vitest.config.ts apps/web/tests/publish-article-page-deferred-editor.test.ts apps/web/tests/article-editor-white-paper-copy.test.ts apps/web/tests/rich-text-editor-helpers.test.ts apps/admin/tests/official-articles-helpers.test.ts apps/admin/tests/admin-rich-text-editor-helpers.test.ts packages/schemas/tests/posts.test.ts` passed: 6 files / 41 tests.
- `bunx vitest run --config ./vitest.config.ts apps/server/tests/posts.test.ts -t "accepts article creation|accepts admin official article updates|keeps rejecting post reports"` passed: 3 tests, 55 skipped.
- `bun run --cwd apps/web typecheck` passed.
- `bun run --cwd apps/admin typecheck` passed.
- `git diff --check` passed with only existing CRLF conversion warnings.

## Notes

- A broad combined Vitest invocation timed out before output; targeted suites above passed and isolate the modified contracts/UI behavior.
- During validation, `apps/web/src/routes/post-detail-page.tsx` was restored to a clean UTF-8 base and the intended detail action layout was replayed to avoid PowerShell encoding corruption.


## Review Follow-Up

- Fixed REVIEW-001 blocker in `apps/web/src/routes/post-detail-page.tsx`: author delete now requires an explicit browser confirmation before calling `apiClient.deletePost`.
- Re-ran web detail/editor validation after the fix:
  - `bun run --cwd apps/web typecheck` passed.
  - `bunx vitest run --config ./vitest.config.ts apps/web/tests/ip-location-display-usage.test.ts apps/web/tests/article-editor-white-paper-copy.test.ts apps/web/tests/publish-article-page-deferred-editor.test.ts apps/web/tests/rich-text-editor-helpers.test.ts` passed: 4 files / 21 tests.
- Re-ran root validation after the fix:
  - `bun run lint` passed.
  - `bun run typecheck` passed.
  - `bun run build` passed with the existing Vite large chunk warning.
  - `bun run test` was run before this follow-up and failed in unrelated server suites with admin/login 401 and invalid credential failures; targeted article/server/schema tests for this change passed.
- Manual/static acceptance notes:
  - Web article detail source now places interaction/comment/report/edit/delete actions before body content and gates delete with explicit confirmation.
  - Admin official articles active entry was checked by the state worker: `apps/admin/src/features/posts/official-articles-page.tsx` exports `OfficialArticleEditorPage`, and `apps/admin/src/features/posts/official-articles-page-content.tsx` did not contain old `0/6`, `0/2`, or `最多插入` copy.
  - TDD Red→Green evidence is partially historical: the state worker reported failing helper coverage before implementation for `figure[data-video-block] > video > source`; backend/schema Red output was not preserved in the interrupted session, so targeted passing tests are retained as regression evidence.
