<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# engine

## Purpose
MCP orchestration engine core. Provides HTTP/MCP server, pipeline gate management, SQLite persistence, agent registry, wiki store, and event broadcasting.

## Key Files

| File | Description |
|------|-------------|
| `server.ts` | Engine entry point — Hono HTTP server + MCP SDK, API routes, SPA serving, guardian lifecycle |
| `db.ts` | SQLite database layer — sessions, pipeline_runs, checkpoints, agent_models, artifacts, events |
| `gates.ts` | Gate configuration — 62 gate entries in unified `GATE_CONFIG`, 9 pipeline type sequences, artifact scanning |
| `pubsub.ts` | In-process EventEmitter singleton for SSE broadcast and event-driven updates |
| `guardian.ts` | Process watchdog — PID file management, crash auto-restart (max 3, exponential backoff) |
| `agent-registry.ts` | Agent discovery — scans template directories, builds agent list and file mappings |
| `agent-fs.ts` | Agent file sync — writes model/effort preferences back to template `.md`/`.toml` files |
| `wiki-store.ts` | Wiki persistence — file-based Markdown + YAML frontmatter storage with locking and pagination |
| `quality-gate.ts` | Quality gate — YAML config loading, condition validation, degraded fallback |
| `platform-info.ts` | Platform metadata — agent count, available models, platform features |
| `tools/` | MCP tool registration modules (see `tools/AGENTS.md`) — 7 modules |

## For AI Agents

### Working In This Directory
- Engine starts on port 3456 (HTTP) / 3457 (web proxy)
- `JARVIS_DEV=1` enables local web dist and auto-build
- MCP runs in stdio mode (Claude Code) or HTTP mode (standalone)
- Database is per-project: `<root>/.jarvis/engine.db`

### Testing Requirements
- Engine tests in `tests/server-mcp-core.test.ts`, `tests/db.test.ts`, `tests/gates.test.ts` (project root)
- Wiki tests in `tests/wiki-store.test.ts` (project root)

### Common Patterns
- All tools registered via `registerMcpTools()` → delegates to `tools/` modules
- Events flow: tool → db → pubsub → SSE → web frontend
- Artifacts stored as `.jarvis/YYYY-MM-DD/{gateSubdir}/` (date-based directories only)
