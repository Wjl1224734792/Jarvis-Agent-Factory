<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# tools/

## Purpose

MCP tool registration modules extracted from `src/engine/server.ts`. Each module registers a logical group of MCP tools on a `McpServer` instance. The 739-line `registerMcpTools()` was split into these modules for maintainability.

## Key Files

| File | Description |
|------|-------------|
| `types.ts` | `ToolContext` interface — `resolveSid`, `resp`, `setLastSessionId` shared by all tool modules |
| `shared.ts` | Shared utilities — `sessionGates()` helper, `VALID_PIPELINE_TYPES` derived from `PIPELINE_DEFS` |
| `session-tools.ts` | 5 session lifecycle tools (join, heartbeat, list, leave, set_name) |
| `pipeline-tools.ts` | 8 pipeline management tools (init, status, gate_enforce, advance_gate, resume, gate_jump, cancel, report_status) |
| `gate-tools.ts` | 2 gate operation tools (gate_check, pipeline_guide) |
| `agent-tools.ts` | 2 agent config tools (agent_config, platform_info) |
| `flow-tools.ts` | 3 flow skill tools (session_export, flow_skill_save, flow_skill_list) |
| `wiki-tools.ts` | 7 repo wiki tools (repowiki_add, repowiki_ingest, repowiki_query, repowiki_list, repowiki_read, repowiki_delete, repowiki_lint) |

## For AI Agents

### Working In This Directory

- Each module exports a single `register<Group>Tools(server, db, root, ctx)` function
- All tool modules use `ctx.resp()` for consistent MCP response formatting
- All tool modules use `ctx.resolveSid(extra)` for session ID resolution
- Tool parameter validation uses Zod schemas with `.describe()` for documentation
- Import from `../db.js` for DB functions, `../gates.js` for gate config, `./shared.js` for common utilities

### Testing Requirements

- MCP tool tests are in `tests/server-mcp-core.test.ts`
- Platform info tests are in `tests/mcp-platform-info.test.ts`
- Run `npm test` to verify all tool registrations

### Common Patterns

- `ctx.resp(obj)` wraps any object as `{ content: [{ type: 'text', text: JSON.stringify(obj) }] }`
- `ctx.resolveSid(extra)` extracts session ID and calls `touchSession()` for activity tracking
- `ctx.setLastSessionId(sid)` is called only by `session_join` to set the stdio fallback

## Dependencies

### Internal

- `src/engine/server.ts` — dispatches to all 7 modules via the thin `registerMcpTools()`
- `src/engine/db.ts` — SQLite database operations
- `src/engine/gates.ts` — unified `GATE_CONFIG` with 62 gate entries
- `src/engine/agent-registry.ts` — agent listing and platform info
- `src/engine/wiki-store.ts` — file-based wiki storage
- `src/engine/platform-info.ts` — extracted `resolvePlatformInfo()` (was in server.ts)
- `src/engine/pubsub.ts` — event emission

### External

- `@modelcontextprotocol/sdk` — `McpServer` type
- `zod` — parameter schema validation
- `node:sqlite` — `DatabaseSync` type
