<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# tests

## Purpose
Test suites for all modules of Jarvis Agent Factory. Uses Vitest as the test runner. Each test file maps to a source module.

## Key Files

| File | Description |
|------|-------------|
| `gates.test.ts` | Gate config, FSM rules, artifact scanning (75 tests) |
| `db.test.ts` | SQLite database operations — CRUD for sessions, runs, artifacts |
| `wiki-store.test.ts` | Wiki file-based storage — lock, read/write, ingest, query |
| `server-mcp-core.test.ts` | MCP server core functionality |
| `server-error-handler.test.ts` | HTTP error handling and response formatting |
| `server-emit.test.ts` | Server event emission |
| `agent-registry.test.ts` | Agent template scanning and registry |
| `mcp-config.test.ts` | `.mcp.json` read/write and merge logic |
| `pubsub.test.ts` | EventEmitter publish/subscribe |
| `sse-broadcast.test.ts` | SSE event broadcasting |
| `quality-gate.test.ts` | Quality gate YAML loading and validation |
| `guardian.test.ts` | PID file management and restart logic |
| `commands-api.test.ts` | Command reference API endpoint |
| `docs-api.test.ts` | Document/artifact API endpoints |
| `routes-emit.test.ts` | Route event emission |
| `install-merge.test.ts` | Installer file merge logic |
| `install-section-hash.test.ts` | Section hash computation for install |
| `remove-fine-grained.test.ts` | Platform removal granularity |
| `hook-cmd.test.ts` | Hook command functionality |
| `hash-paths.test.ts` | Hash path utilities |
| `cli-scope.test.ts` | CLI scope selection |
| `mcp-platform-info.test.ts` | Platform info MCP endpoint |
| `commands-filter.test.ts` | Command filter logic |

## For AI Agents

### Working In This Directory
- Run all tests: `npm run test` (vitest run)
- Run single file: `npx vitest run tests/gates.test.ts`
- Run in watch mode: `npm run test:watch`
- Tests use `vitest` mocking (`vi.mock`, `vi.useFakeTimers`)

### Testing Requirements
- 382 tests across 23 test files — all must pass before commit
- Use `vi.mock()` for filesystem, database, and external dependencies
- File system tests use in-memory mocks via `mockFs`
