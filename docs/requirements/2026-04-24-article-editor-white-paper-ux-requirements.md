# Article Editor White-Paper UX Requirements

## Summary

Improve the article writing, article detail, and admin official-article creation experience so it feels like mature writing products: a clean white-paper writing surface, minimal instructional copy, clear publishing controls, and aligned media capabilities across web and admin. Image and video counts must not be limited by fixed front-end caps; if shared schemas or server validation still impose article media count caps, update them through the shared-contract path.

## Goals and Success Criteria

1. White-paper writing: the web article publish/edit page removes instructional blocks such as "writing workspace", long intro/help copy, media-list explanation, and teaching placeholders. The main editor should feel like a clean writing canvas.
2. Mature operation layout: cover, category, preview, draft status, publish/submit actions, and edit controls should be easy to find without distracting from writing.
3. Unlimited article media count: fixed image/video count caps are removed from front-end UI and validation. Single-file size, MIME type, upload policy, and security checks remain unchanged.
4. Admin parity: the admin official article create/edit page aligns with the web article editor in core capabilities: title, category, summary/content, cover, rich text, image/video insertion, preview, and submit flow.
5. Article detail UX: article detail page layout and actions are easier to use, with improved hierarchy for back/edit/share/like/favorite/report/delete/comment controls, author info, content typography, and media display.
6. Verification: add or update tests for no fixed media caps, removed instructional copy, helper behavior, schema/server count caps, and core editor/page behavior.

## In Scope

- Web article publish/edit: `apps/web/src/routes/publish-article-page.tsx`, `publish-article-page-helpers.ts`, `apps/web/src/components/rich-text-editor.tsx`, relevant tests.
- Web article detail: `apps/web/src/routes/post-detail-page.tsx`, related post interaction components if needed.
- Admin official article editor/list entry: `apps/admin/src/features/posts/official-article-editor-page.tsx`, `official-articles-page-content.tsx`, `official-articles-helpers.ts`, `apps/admin/src/components/admin-rich-text-editor.tsx`, relevant admin styles/tests.
- Shared/server contract where needed: `packages/schemas/src/posts.ts`, `packages/http-client/src/index.ts`, `apps/server/src/modules/posts/posts.route.ts`, `posts.service.ts`, related tests.
- UI/UX refinements: layout, spacing, concise placeholders, side publish panel, preview, desktop/mobile baseline behavior.

## Out of Scope

- No new collaborative editor, document system, or content type.
- No editor-library replacement unless the current editor cannot support the minimal experience.
- No changes to authentication, moderation flow, route prefixes, production CORS/OpenAPI defaults, upload size limits, MIME checks, or security policy.
- No unrelated redesign of other publish pages.

## Design Direction

Use a "clean writing canvas + compact publish control panel" pattern seen in mature writing tools. The writing area prioritizes title, short intro/summary, and body. Controls are concise and grouped. Media actions stay available in toolbar and cover controls, but UI must not show caps like `0/6` or `0/2`. Admin should keep its management-system tone while matching web capabilities.

## Known Code Findings

- Web media caps currently exist in `apps/web/src/routes/publish-article-page.tsx` as `ARTICLE_IMAGE_LIMIT = 6` and `ARTICLE_VIDEO_LIMIT = 2`, with UI labels `images x/6, videos x/2`.
- Shared schema caps currently exist in `packages/schemas/src/posts.ts` on `createPostInputSchema.imageIds.max(6)`, `videoIds.max(2)`, and `adminOfficialArticleUpdateInputSchema.imageIds.max(6)`, `videoIds.max(2)`.
- Moment-specific constraints must remain: moments cannot mix images/videos and support only one video. The unlimited requirement applies to article / official article media, not moment posts.
- Upload file-size and MIME policies live in `apps/server/src/modules/uploads/upload.policy.ts` and must remain unchanged.

## Confirmed Decisions

- The user confirmed a mature market-standard writing experience.
- The user confirmed removal of instructional/explanatory UI copy in favor of a blank-paper writing feel.
- The user confirmed no fixed image/video count limitation.
- The user confirmed admin official article creation/editing should align with web article capabilities.

## Gate A Check

- Goals are clear: white-paper writing UX, article detail action layout, media count removal, admin parity, verification.
- Users and scenarios are clear: web creators/readers and admin operators creating official articles.
- Scope is clear: article-related web/admin/shared/server paths only.
- Technical constraints are clear: current React editors, shared schema/server contract if needed, no editor replacement by default.
- Risks are clear: shared schema caps, server validation, upload performance, front/admin editor divergence, detail-page side effects.
