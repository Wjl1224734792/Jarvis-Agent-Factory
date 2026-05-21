<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# shared

## Purpose
Shared utility modules with zero internal dependencies. Used by CLI, engine, and web layers. Must remain lightweight — no heavy imports.

## Key Files

| File | Description |
|------|-------------|
| `mcp-config.ts` | Read/write `.mcp.json` — MCP server configuration with smart merge and whitelist protection |
| `markdown-utils.ts` | YAML frontmatter parsing, markdown section splitting, SHA256 section hashing |
| `package-version.ts` | Read `package.json` version at runtime |

## For AI Agents

### Working In This Directory
- These modules are imported by both CLI and engine code
- Do NOT add dependencies on `engine/`, `cli/`, or `web/` here
- Keep functions pure and testable
- Frontmatter parsing supports array values `[a, b]` and quoted strings

### Testing Requirements
- `mcp-config.ts` → `tests/mcp-config.test.ts`
- `markdown-utils.ts` → tested indirectly via agent registry and wiki tests
