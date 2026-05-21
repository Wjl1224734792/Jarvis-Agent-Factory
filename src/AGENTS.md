<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# src

## Purpose
Application source code for the Jarvis Agent Factory CLI and MCP orchestration engine. Contains all TypeScript source across CLI tooling, engine core, shared utilities, and web/API layer.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `cli/` | CLI command handlers and argument parsing (see `cli/AGENTS.md`) |
| `deepinit/` | Hierarchical AGENTS.md documentation generator (see `deepinit/AGENTS.md`) |
| `engine/` | MCP orchestration engine: server, gates, DB, agents, wiki (see `engine/AGENTS.md`) |
| `shared/` | Shared utilities: MCP config, markdown parsing, version detection (see `shared/AGENTS.md`) |
| `web/` | Web API routes, reverse proxy, static HTML views (see `web/AGENTS.md`) |
| `templates/` | Installer templates for agents, commands, skills, memory, deepinit — copied to target projects at install time |

## For AI Agents

### Working In This Directory
- All source is TypeScript ESM (`type: "module"`)
- Target Node.js >=22.5
- Run `npx tsc --noEmit` from project root to typecheck

### Common Patterns
- Each top-level subdirectory is a self-contained module
- Shared code lives in `shared/` with zero internal dependencies
- Engine code in `engine/` must not import from `cli/` or `web/`
