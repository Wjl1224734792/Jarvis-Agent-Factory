# 2026-04-25 Admin User Management Review

## Trace Matrix

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Admin can inspect users | Admin users schemas/routes/client/page | `apps/server/tests/admin-users.test.ts`, `apps/admin/tests/admin-users-page-helpers.test.ts` |
| Admin can ban users | `usersService.banUser`, admin page ban modal | `apps/server/tests/admin-users.test.ts` |
| Ban revokes active sessions | `authRepo.revokeUserSessions` on ban | `apps/server/tests/admin-users.test.ts` |
| Banned users cannot authenticate | auth service `USER_BANNED` checks | `apps/server/tests/admin-users.test.ts` |
| Admin can unban users | `usersService.unbanUser`, admin page actions | `apps/server/tests/admin-users.test.ts` |
| Admin endpoints are documented | OpenAPI admin user paths/components | `apps/server/tests/openapi.test.ts` |
| Malformed JSON is client error | global `app.onError` JSON parse branch | `apps/server/tests/api-versioning.test.ts` |
| Admin lockout resists source-wide DoS | account + source IP failure key | `apps/server/tests/auth.test.ts` |
| Web rich text styles are constrained | `sanitizeHtml` style whitelist | `apps/web/tests/sanitize.test.ts` |
| Safe redirect return path stays on-site | `normalizeSafeRedirectFromPath` | `apps/web/tests/web-routes-safe-redirect.test.ts` |
| Admin rich text rendering is sanitized | `AdminRichTextHtml` | `apps/admin/tests/admin-rich-text-sanitize.test.ts` |

## Remaining Candidates

- Move remaining admin-local API contracts from `apps/admin/src/lib/api-client.ts` into shared schemas/http-client.
- Push admin list filters currently done in the browser down into server/http-client query contracts.
- Make admin multi-file rich-text uploads use partial-success handling and controlled concurrency.
- Consider moving shared rich-text sanitization into a package-level utility once web/admin requirements fully converge.

## Final Verification

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`

All passed. Build still reports the existing large chunk warnings from Vite.
