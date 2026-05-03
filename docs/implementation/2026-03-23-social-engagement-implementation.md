# 2026-03-23 Social Engagement Implementation

## Scope

This iteration extends the existing post/feed baseline with:

- image upload for posts
- following relationships and a following feed tab
- in-app notifications
- post like / favorite / share interactions
- infinitely nested comments

Out of scope:

- complex recommendation algorithms
- video upload

## Backend and Shared Contracts

The shared route and schema packages now expose:

- `recommended | latest | following` feed tabs
- post image metadata and post engagement state
- recursive comment trees
- social notification payloads
- upload, follow, notification, and interaction API routes

Database changes are captured in `packages/db/drizzle/0004_greedy_psylocke.sql` and add:

- `post_images`
- `user_follows`
- `post_interactions`
- `notifications`
- `posts.like_count / favorite_count / share_count`

## Web Integration

`apps/web` now supports:

- image upload and preview in the post composer
- following tab on the home feed
- follow, like, favorite, and share actions on feed cards and post detail
- recursive comment rendering with reply-at-any-depth
- notifications page with unread badge and mark-all-read

## Verification

Validated in this worktree with:

- `bun run typecheck`
- `bun x vitest run --config ./vitest.config.ts packages/schemas/tests/posts.test.ts packages/schemas/tests/social.test.ts apps/server/tests/health.test.ts apps/server/tests/auth.test.ts apps/server/tests/models.test.ts apps/server/tests/reviews.test.ts apps/server/tests/posts.test.ts`
- `bun run build`

Additionally verified after the final web fix with:

- `bun run --cwd apps/web typecheck`
- `bun run --cwd apps/web build`

## Known Tradeoffs

- Images are stored as data URLs for this MVP slice so the server can ship upload support without introducing an external object-storage package.
- That keeps implementation small but increases row and payload size, and unattached uploads are not garbage-collected yet.
- There is no dedicated frontend automation for the new UI flows yet; current verification relies on typecheck, build, and backend/API tests.
