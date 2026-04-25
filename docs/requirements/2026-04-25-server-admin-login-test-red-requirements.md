# Server Admin Login Test Red Requirements

## Background

The previous article editor UX delivery reached conditional approval because root `bun run test` was red in server suites unrelated to the editor change. Failures repeatedly showed admin authenticated endpoints returning `401` or admin login returning `INVALID_CREDENTIALS`.

## Confirmed Scope

User selected option 3: fix the `bun run test` server/admin-login red status first. DB, env, CORS, OpenAPI, upload policy, `.env.example`, and root `README.md` should only be changed if the test fix proves those files are required for consistency.

## Goals

- Restore root `bun run test` to green if failures are caused by test setup, seed, auth helper, or admin credential drift.
- Preserve production auth semantics and do not weaken admin authentication.
- Avoid unrelated DB/env/CORS/OpenAPI/upload-policy changes unless necessary and documented.
- If env/seed/README updates are necessary, keep changes minimal and synchronized per AGENTS L3/L4.

## Non-Goals

- Do not continue article editor UI work.
- Do not change CORS/OpenAPI defaults unless directly required by the admin-login test fix.
- Do not change upload file size/MIME/security rules unless directly required by the admin-login test fix.
- Do not perform broad refactors of auth, session, or server test infrastructure.

## Acceptance Criteria

- The failing server admin-login tests are diagnosed with a concrete root cause.
- A minimal fix is applied with tests proving admin login/authenticated server routes work consistently.
- `bun run test` is rerun and result recorded.
- `bun run lint`, `bun run typecheck`, and `bun run build` are rerun unless an earlier blocking failure makes them irrelevant.
- Any DB/env/CORS/OpenAPI/upload-policy/README change has an explicit rationale and matching documentation updates.
