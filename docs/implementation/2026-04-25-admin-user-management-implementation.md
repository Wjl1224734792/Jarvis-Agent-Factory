# 2026-04-25 Admin User Management Implementation

## Scope

- Added full-chain admin user management: list, detail, ban, unban, session revocation, banned-login blocking, admin UI navigation and page.
- Completed first optimization pass in order: server, web, admin.
- Kept changes incremental and verified after each batch.

## Admin User Management

- Database: added user status and ban metadata fields, indexes/check constraint, and migration `0001_admin_user_status.sql`.
- Shared contracts: added admin user schemas, route constants, and http-client methods.
- Server: added users admin repo/route/service, mounted routes, revoked sessions on ban, blocked banned users across web/app/admin login and refresh paths.
- Admin: added `/admin/management/users`, navigation entry, user list/detail page, filters, search, pagination, ban/unban flows, and operation guards for current/admin accounts.

## Server Optimization Pass

- Added OpenAPI coverage for admin user management endpoints and schemas.
- Mapped malformed JSON request bodies to `400 BAD_REQUEST` instead of `500 INTERNAL_ERROR`.
- Scoped admin login lockout counters by account and source IP to reduce lockout DoS risk.

## Web Optimization Pass

- Restricted rich-text `style` sanitization to a small safe whitelist.
- Hardened safe-redirect return path normalization against protocol-relative and external `from` values.
- Restored missing `emailDigest` notification option so persisted settings and UI options stay aligned.

## Admin Optimization Pass

- Added a centralized `AdminRichTextHtml` renderer.
- Sanitizes scripts, event attributes, dangerous URL protocols, dangerous styles, and untrusted iframes before admin-side HTML rendering.
- Replaced scattered direct rich-text rendering in official article previews and post detail moderation view.

## Verification

- `bun run lint` passed.
- `bun run typecheck` passed.
- `bun run test` passed: 85 files, 340 tests.
- `bun run build` passed with existing Vite chunk-size warnings.
