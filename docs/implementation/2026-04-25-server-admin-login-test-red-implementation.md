# Server Admin Login Test Red Implementation Record

## Scope

- Requirement: `docs/requirements/2026-04-25-server-admin-login-test-red-requirements.md`
- Tasks: `docs/tasks/2026-04-25-server-admin-login-test-red-tasks.md`
- Plan: `docs/plans/2026-04-25-server-admin-login-test-red-plan.md`

## Diagnosis

- Previous root `bun run test` red status was concentrated around server admin authenticated routes: `401` after missing/invalid admin cookie and admin login `INVALID_CREDENTIALS`.
- Read-only exploration found the most likely cause was transient test database state from an interrupted run around `apps/server/tests/auth.test.ts`, where one test changes admin password from `Admin#123` to `Admin#456` and restores it in `finally`.
- Current server test scripts run with `--maxWorkers 1`, and each integration test profile resets database/Redis state through `apps/server/tests/test-state.ts`, so no stable production or test-code defect was reproduced after state recovered.

## Changes Applied

- No production code changes.
- No server test helper changes.
- No DB schema, migration, seed, env, CORS, OpenAPI, upload policy, `.env.example`, or root `README.md` changes.
- Added orchestration documents only for traceability.

## Validation Evidence

- `bunx vitest run --config ./vitest.config.ts apps/server/tests/search.test.ts -t "caps admin search results"` passed: 1 test, 4 skipped.
- `bunx vitest run --config ./vitest.config.ts apps/server/tests/auth.test.ts apps/server/tests/search.test.ts -t "allows admins to change password|caps admin search results"` passed: 2 tests, 21 skipped.
- `bun run --cwd apps/server test` passed: 24 files / 187 tests.
- `bun run test` passed: unit suites 75 files / 311 tests; server suites 24 files / 187 tests.
- Backend test worker performed read-only review of `apps/server/tests/auth-test-helpers.ts`, `apps/server/tests/auth.test.ts`, and `apps/server/tests/test-state.ts`; conclusion: no code patch required.

## Follow-Up Guidance

- If admin-login red status reappears after an interrupted run, first run `bun run --cwd apps/server test` or reset the test DB profile before changing auth code.
- Do not weaken admin auth or modify env/CORS/OpenAPI/upload policy for this symptom unless a new stable failing reproduction proves it is necessary.
