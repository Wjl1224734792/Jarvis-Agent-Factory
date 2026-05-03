# 2026-03-26 Platform Closure And Compact Feed Backend Implementation

## 1. Current Implementation Goal
- Clear the backend type blocker in `rankings`.
- Keep `db:seed` compatible while extending runtime seed outputs to PostgreSQL + MinIO + Redis.
- Introduce provider abstractions for storage (`minio|cos|oss|kodo`) and SMS (`mock|aliyun|tencent`) with minimal business coupling.

## 2. Input Basis
- Requirements: `docs/requirements/2026-03-26-platform-closure-and-compact-feed-requirements.md`
- Tasks: `docs/tasks/2026-03-26-platform-closure-and-compact-feed-tasks.md`
- Plan: `docs/plans/2026-03-26-platform-closure-and-compact-feed-plan.md`
- User supplements:
  - hot media keys for MinIO seed
  - Redis demo keys (`feed:hot-circle`, `feed:hot-models`, `feed:hot-rankings`, `feed:hero-media`)
  - bucket auto-create risk check (`STORAGE_AUTO_CREATE_BUCKET`)

## 3. Workspace Mode
- Mode: backend/shared implementation only.
- Ownership respected for:
  - `apps/server/src/modules/rankings/*`
  - `apps/server/src/modules/auth/*`
  - `apps/server/src/modules/posts/*`
  - `apps/server/tests/*` (added targeted provider test)
  - `packages/db/*`
  - `packages/shared/src/index.ts`
  - `packages/schemas/src/*`
  - `packages/http-client/src/index.ts`
  - nearby docs

## 4. Changed Files / Scope
- Backend runtime:
  - `apps/server/src/modules/rankings/rankings.repo.ts`
  - `apps/server/src/modules/rankings/rankings.service.ts`
  - `apps/server/src/modules/auth/auth.service.ts`
  - `apps/server/src/modules/auth/auth.route.ts`
  - `apps/server/src/modules/auth/sms-provider.ts` (new)
  - `apps/server/src/modules/posts/storage-provider.ts` (new)
  - `apps/server/src/modules/posts/posts.route.ts`
  - `apps/server/src/modules/posts/posts.service.ts`
  - `apps/server/package.json`
- Backend tests:
  - `apps/server/tests/provider-config.test.ts` (new, TDD)
- DB runtime seed:
  - `packages/db/src/runtime-seed.ts` (new)
  - `packages/db/src/seed.cli.ts`
  - `packages/db/src/index.ts`
  - `packages/db/package.json`
- Env example:
  - `.env.example` (provider example section appended)

## 5. Implementation Notes
- `rankings` type blocker:
  - Reworked `listRankingItems/getRankingItemById` select shape in repo to flattened nullable fields for left-join outputs.
  - Rebuilt `linkedModel` in service with explicit guard (`hasLinkedModel`) and strict reconstruction.
  - API response shape remains unchanged.
- Runtime seed extension:
  - Added `seedRuntimeArtifacts()` called by `seed.cli.ts` after existing `seedDatabase()`.
  - MinIO/S3 artifact seed:
    - seeds 7 deterministic objects under `home/hot-circle/*`.
    - respects `STORAGE_KEY_PREFIX`.
    - supports `minio|cos|oss|kodo` provider selection semantics.
    - added bucket auto-create branch controlled by `STORAGE_AUTO_CREATE_BUCKET` (default true).
  - Redis demo seed:
    - seeds `feed:hot-circle`, `feed:hot-models`, `feed:hot-rankings`, `feed:hero-media`.
    - data is deterministic and fully rebuildable on each seed run.
- Provider abstractions:
  - Storage:
    - `resolveStorageProviderConfig()` validates provider/env inputs.
    - `createStorageUploader()` provides unified S3-compatible upload entry.
    - post image upload now attempts provider upload first and falls back to prior data-url storage.
  - SMS:
    - `resolveSmsProviderConfig()` validates `mock|aliyun|tencent`.
    - `createSmsSender()` unifies send path and mock code exposure behavior.
    - `authService.requestSmsCode()` no longer hardcodes mock response in business logic.

## 6. Test And Verification Results
- Required commands:
  - `bun run db:migrate` ✅ pass
  - `bun run db:seed` ✅ pass
  - `bun run --cwd apps/server test` ✅ pass
  - `bun run typecheck` ❌ fails outside this task scope due repository TS config:
    - `tsconfig.json`: invalid `ignoreDeprecations` value / deprecated `baseUrl` handling for current TypeScript.
- Additional verification:
  - `bun run --cwd apps/server typecheck` ✅ pass
  - `bun run --cwd packages/db typecheck` ✅ pass
  - `bun run --cwd packages/shared typecheck` ✅ pass
  - `bun run --cwd packages/schemas typecheck` ✅ pass
  - `bun run --cwd packages/http-client typecheck` ✅ pass
  - Redis check (`GET feed:hot-circle`) ✅ value present
  - MinIO container FS check (`/data/feijia-media/home/hot-circle`) ✅ seeded objects present

## 7. Data And API Boundaries
- Preserved:
  - Existing auth/web/admin endpoints and response schemas.
  - Existing rankings response contract (only internal query typing changed).
  - Existing `db:seed` script name and entry.
- Added:
  - Runtime seed side effects to MinIO/Redis when `db:seed` runs.
  - Internal provider modules for storage and SMS.

## 8. Risks / Open Issues
- Root `bun run typecheck` remains blocked by global TS config compatibility (`tsconfig.json`) not by module code.
- `aliyun/tencent` SMS senders currently provide configuration routing and request-id behavior, but real cloud SDK dispatch is not yet integrated.
- Post image persistence still uses `post_images.dataUrl` column as canonical field, now filled with uploaded URL when provider upload succeeds.

## 9. Frontend Handover Points
- Frontend can now consume Redis-backed hot modules (`feed:*`) through backend integration in next phase.
- No frontend contract break introduced for rankings, posts, or auth responses.
- If frontend needs explicit provider status endpoints, that is not part of this round and should be added as a dedicated task.

## 10. Recommended Next Step
- Run `review_qa` focused on:
  - TDD evidence for provider abstraction.
  - seed runtime side effects (idempotency and first-run bucket behavior).
  - root typecheck blocker classification and follow-up owner for `tsconfig` fix.

